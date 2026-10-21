const request = require('supertest');
const app = require('../src/app');
const InMemoryStore = require('../src/services/inMemoryStore');
const { SEED, tokenFor, authHeader } = require('./helpers');

const ITEM_FRIES = '64f1a2b3c4d5e6f7a8b9c002';
const today = () => new Date().toISOString().slice(0, 10);

const placeOrder = (token, slot) =>
  request(app)
    .post('/api/orders')
    .set(authHeader(token))
    .send({ items: [{ item_id: ITEM_FRIES, quantity: 1 }], pickup_slot: slot });

const setStatus = (orderId, status, token = tokenFor(SEED.staff)) =>
  request(app)
    .patch(`/api/queue/${orderId}/status`)
    .set(authHeader(token))
    .send({ status });

describe('Order status state machine and slot release parity', () => {
  beforeAll(() => {
    InMemoryStore.updateSettings({ max_orders_per_slot: 10 });
  });

  test('staff Ready -> Collected records collected_time and releases the slot', async () => {
    const slot = '14:00-14:15';
    const created = await placeOrder(tokenFor(SEED.customer), slot);
    expect(created.status).toBe(201);
    const order = created.body.data;

    for (const status of ['Accepted', 'Preparing', 'Ready']) {
      const res = await setStatus(order.order_id, status);
      expect(res.status).toBe(200);
    }
    expect(InMemoryStore.getSlotBooked(today(), slot)).toBe(1);

    const collected = await setStatus(order.order_id, 'Collected');
    expect(collected.status).toBe(200);
    expect(collected.body.data.collected_time).toBeTruthy();

    const stored = InMemoryStore.getOrderById(order.order_id);
    expect(stored.collected_time).toBeInstanceOf(Date);
    expect(stored.slot_released).toBe(true);
    expect(InMemoryStore.getSlotBooked(today(), slot)).toBe(0);
  });

  test('cannot flag Delayed from Placed via either endpoint', async () => {
    const created = await placeOrder(tokenFor(SEED.customer), '14:15-14:30');
    expect(created.status).toBe(201);
    const order = created.body.data;

    const viaStatus = await setStatus(order.order_id, 'Delayed');
    expect(viaStatus.status).toBe(409);

    const viaDelayEndpoint = await request(app)
      .patch(`/api/queue/${order.order_id}/delayed`)
      .set(authHeader(tokenFor(SEED.staff)))
      .send({ reason: 'test' });
    expect(viaDelayEndpoint.status).toBe(409);

    expect(InMemoryStore.getOrderById(order.order_id).order_status).toBe('Placed');
  });

  test('rejects invalid transitions out of Delayed', async () => {
    const created = await placeOrder(tokenFor(SEED.customer), '14:30-14:45');
    expect(created.status).toBe(201);
    const order = created.body.data;

    expect((await setStatus(order.order_id, 'Accepted')).status).toBe(200);
    const delayed = await request(app)
      .patch(`/api/queue/${order.order_id}/delayed`)
      .set(authHeader(tokenFor(SEED.staff)))
      .send({ reason: 'kitchen jam' });
    expect(delayed.status).toBe(200);
    expect(delayed.body.data.order_status).toBe('Delayed');

    // Delayed -> Collected is not an allowed transition
    const invalid = await setStatus(order.order_id, 'Collected');
    expect(invalid.status).toBe(409);
    expect(invalid.body.details.allowedTransitions).toEqual(
      expect.arrayContaining(['Preparing', 'Ready'])
    );

    // Delayed -> Preparing -> Ready is allowed
    expect((await setStatus(order.order_id, 'Preparing')).status).toBe(200);
    expect((await setStatus(order.order_id, 'Ready')).status).toBe(200);
  });

  test('terminal Completed is final', async () => {
    const created = await placeOrder(tokenFor(SEED.customer), '14:45-15:00');
    expect(created.status).toBe(201);
    const order = created.body.data;

    for (const status of ['Accepted', 'Preparing', 'Ready']) {
      expect((await setStatus(order.order_id, status)).status).toBe(200);
    }
    expect((await setStatus(order.order_id, 'Collected')).status).toBe(200);
    expect((await setStatus(order.order_id, 'Completed')).status).toBe(200);

    const reanimated = await setStatus(order.order_id, 'Accepted');
    expect(reanimated.status).toBe(409);
    expect(InMemoryStore.getOrderById(order.order_id).order_status).toBe('Completed');
  });

  test('customer cancellation is allowed before preparation and frees the slot', async () => {
    const slot = '15:00-15:15';
    const created = await placeOrder(tokenFor(SEED.customer), slot);
    expect(created.status).toBe(201);
    const order = created.body.data;
    expect(InMemoryStore.getSlotBooked(today(), slot)).toBe(1);

    const stockBefore = InMemoryStore.getMenuItemById(ITEM_FRIES).available_quantity;
    const cancel = await request(app)
      .post(`/api/orders/${order.order_id}/cancel`)
      .set(authHeader(tokenFor(SEED.customer)))
      .send({ reason: 'Changed my mind' });

    expect(cancel.status).toBe(200);
    expect(cancel.body.data.order_status).toBe('Cancelled');
    expect(InMemoryStore.getSlotBooked(today(), slot)).toBe(0);
    // Cancelling restores stock
    expect(InMemoryStore.getMenuItemById(ITEM_FRIES).available_quantity).toBe(stockBefore + 1);
  });

  test('customer cancellation is rejected once preparation starts', async () => {
    const created = await placeOrder(tokenFor(SEED.customer), '15:15-15:30');
    expect(created.status).toBe(201);
    const order = created.body.data;
    expect((await setStatus(order.order_id, 'Accepted')).status).toBe(200);
    expect((await setStatus(order.order_id, 'Preparing')).status).toBe(200);

    const cancel = await request(app)
      .post(`/api/orders/${order.order_id}/cancel`)
      .set(authHeader(tokenFor(SEED.customer)))
      .send({ reason: 'too late' });

    expect(cancel.status).toBe(409);
    expect(InMemoryStore.getOrderById(order.order_id).order_status).toBe('Preparing');
    // Slot capacity stays reserved while the order is live
    expect(InMemoryStore.getSlotBooked(today(), '15:15-15:30')).toBe(1);
  });

  test('only staff and above can drive the kitchen status machine', async () => {
    const created = await placeOrder(tokenFor(SEED.customer), '15:30-15:45');
    expect(created.status).toBe(201);
    const order = created.body.data;

    const asCustomer = await setStatus(order.order_id, 'Accepted', tokenFor(SEED.customer));
    expect(asCustomer.status).toBe(403);
    expect(InMemoryStore.getOrderById(order.order_id).order_status).toBe('Placed');

    const asStaff = await setStatus(order.order_id, 'Accepted');
    expect(asStaff.status).toBe(200);
  });
});
