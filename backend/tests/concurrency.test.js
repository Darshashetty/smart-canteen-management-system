const request = require('supertest');
const app = require('../src/app');
const InMemoryStore = require('../src/services/inMemoryStore');
const { SEED, tokenFor, authHeader } = require('./helpers');

const ITEM_FRIES = '64f1a2b3c4d5e6f7a8b9c002';
const today = () => new Date().toISOString().slice(0, 10);

const placeOrder = (token, slot, extra = {}) =>
  request(app)
    .post('/api/orders')
    .set(authHeader(token))
    .send({ items: [{ item_id: ITEM_FRIES, quantity: 1 }], pickup_slot: slot, ...extra });

const driveToReady = async (token, slot) => {
  const createRes = await placeOrder(token, slot);
  expect(createRes.status).toBe(201);
  const order = createRes.body.data;
  for (const status of ['Accepted', 'Preparing', 'Ready']) {
    const res = await request(app)
      .patch(`/api/queue/${order.order_id}/status`)
      .set(authHeader(tokenFor(SEED.staff)))
      .send({ status });
    expect(res.status).toBe(200);
  }
  return order;
};

describe('Concurrent requests never overbook slots or oversell stock', () => {
  beforeAll(() => {
    InMemoryStore.updateSettings({ max_orders_per_slot: 1 });
  });

  test('parallel orders compete for one slot of capacity: exactly one wins', async () => {
    const slot = '14:00-14:15';
    const token = tokenFor(SEED.customer);

    const results = await Promise.all(
      Array.from({ length: 5 }, () => placeOrder(token, slot))
    );

    const created = results.filter((r) => r.status === 201);
    const rejected = results.filter((r) => r.status === 409);
    expect(created).toHaveLength(1);
    expect(rejected).toHaveLength(4);
    rejected.forEach((r) => expect(r.body.message).toMatch(/full/i));

    // Ledger agrees: one booking, one order in that slot, never more
    expect(InMemoryStore.getSlotBooked(today(), slot)).toBe(1);
    const ordersInSlot = InMemoryStore.getOrders().filter((o) => o.pickup_slot === slot);
    expect(ordersInSlot).toHaveLength(1);
  });

  test('parallel orders cannot both take the last item in stock', async () => {
    const item = InMemoryStore.getMenuItemById(ITEM_FRIES);
    const originalStock = item.available_quantity;
    InMemoryStore.updateMenuItemStock(ITEM_FRIES, 1 - originalStock);
    expect(InMemoryStore.getMenuItemById(ITEM_FRIES).available_quantity).toBe(1);

    // Distinct slots isolate stock contention from slot-capacity contention
    const slots = ['15:00-15:15', '15:15-15:30', '15:30-15:45', '15:45-16:00'];
    const token = tokenFor(SEED.customer);
    const results = await Promise.all(slots.map((s) => placeOrder(token, s)));

    const created = results.filter((r) => r.status === 201);
    const rejected = results.filter((r) => r.status === 409);
    expect(created).toHaveLength(1);
    expect(rejected).toHaveLength(3);
    rejected.forEach((r) => expect(r.body.message).toMatch(/insufficient stock/i));

    expect(InMemoryStore.getMenuItemById(ITEM_FRIES).available_quantity).toBe(0);

    InMemoryStore.updateMenuItemStock(ITEM_FRIES, originalStock);
  });

  test('parallel orders sharing an idempotency key create exactly one order', async () => {
    const key = `idem-race-${Date.now()}`;
    const slots = ['16:00-16:15', '16:15-16:30', '16:30-16:45'];
    const token = tokenFor(SEED.customer);

    const results = await Promise.all(
      slots.map((s) => placeOrder(token, s, { idempotency_key: key }))
    );
    results.forEach((r) => expect([200, 201]).toContain(r.status));

    const matching = InMemoryStore.getOrders().filter((o) => o.idempotency_key === key);
    expect(matching).toHaveLength(1);
  });

  test('parallel collection confirms hand over the order exactly once', async () => {
    const order = await driveToReady(tokenFor(SEED.customer), '18:00-18:15');

    const confirms = await Promise.all([
      request(app)
        .post('/api/collection/confirm')
        .set(authHeader(tokenFor(SEED.staff)))
        .send({ token_number: order.token_number }),
      request(app)
        .post('/api/collection/confirm')
        .set(authHeader(tokenFor(SEED.staff)))
        .send({ token_number: order.token_number })
    ]);

    const succeeded = confirms.filter((r) => r.status === 200);
    const rejected = confirms.filter((r) => r.status === 409);
    expect(succeeded).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].body.message).toMatch(/already/i);

    // Slot capacity was released exactly once, never negatively
    expect(InMemoryStore.getSlotBooked(today(), '18:00-18:15')).toBe(0);
  });

  test('parallel staff status updates move an order forward exactly once', async () => {
    const createRes = await placeOrder(tokenFor(SEED.customer), '19:00-19:15');
    expect(createRes.status).toBe(201);
    const order = createRes.body.data;
    const staff = authHeader(tokenFor(SEED.staff));

    const accepts = await Promise.all([
      request(app).patch(`/api/queue/${order.order_id}/status`).set(staff).send({ status: 'Accepted' }),
      request(app).patch(`/api/queue/${order.order_id}/status`).set(staff).send({ status: 'Accepted' })
    ]);

    const succeeded = accepts.filter((r) => r.status === 200);
    const rejected = accepts.filter((r) => r.status === 409);
    expect(succeeded).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const stored = InMemoryStore.getOrderById(order.order_id);
    expect(stored.order_status).toBe('Accepted');
    // Exactly one transition in history after Placed
    const acceptedTransitions = stored.history.filter((h) => h.to === 'Accepted');
    expect(acceptedTransitions).toHaveLength(1);
  });
});
