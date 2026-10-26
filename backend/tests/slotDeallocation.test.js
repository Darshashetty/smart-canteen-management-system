const request = require('supertest');
const app = require('../src/app');
const InMemoryStore = require('../src/services/inMemoryStore');
const { SEED, tokenFor, authHeader } = require('./helpers');

const ITEM_FRIES = '64f1a2b3c4d5e6f7a8b9c002';
const STALE_SLOT = '10:00-10:15';
const ACTIVE_SLOT = '15:45-16:00';
const RESET_SLOT = '16:15-16:30';
const today = () => new Date().toISOString().slice(0, 10);

const customerToken = () => tokenFor(SEED.customer);
const staffToken = () => tokenFor(SEED.staff);
const managerToken = () => tokenFor(SEED.manager);

const deallocate = (token, slot) =>
  request(app)
    .post('/api/orders/pickup-slots/deallocate')
    .set(authHeader(token))
    .send({ slot });

const placeOrder = (token, slot) =>
  request(app)
    .post('/api/orders')
    .set(authHeader(token))
    .send({ items: [{ item_id: ITEM_FRIES, quantity: 1 }], pickup_slot: slot });

describe('Pickup slot deallocation', () => {
  beforeAll(() => {
    InMemoryStore.updateSettings({ max_orders_per_slot: 5 });
  });

  test('staff can release stale reservations for a slot', async () => {
    const date = today();
    InMemoryStore.reserveSlot(STALE_SLOT, date);
    InMemoryStore.reserveSlot(STALE_SLOT, date);
    expect(InMemoryStore.getSlotBooked(date, STALE_SLOT)).toBe(2);

    const res = await deallocate(staffToken(), STALE_SLOT);

    expect(res.status).toBe(200);
    expect(res.body.data.released).toBe(2);
    expect(res.body.data.booked).toBe(0);
    expect(InMemoryStore.getSlotBooked(date, STALE_SLOT)).toBe(0);
  });

  test('refuses to deallocate a slot that still has an active order', async () => {
    const date = today();
    const created = await placeOrder(customerToken(), ACTIVE_SLOT);
    expect(created.status).toBe(201);
    expect(InMemoryStore.getSlotBooked(date, ACTIVE_SLOT)).toBe(1);

    const res = await deallocate(managerToken(), ACTIVE_SLOT);

    expect(res.status).toBe(409);
    expect(res.body.details.activeOrderCount).toBe(1);
    expect(InMemoryStore.getSlotBooked(date, ACTIVE_SLOT)).toBe(1);

    const cancelled = await request(app)
      .post(`/api/orders/${created.body.data.order_id}/cancel`)
      .set(authHeader(customerToken()))
      .send({ reason: 'Test cleanup' });
    expect(cancelled.status).toBe(200);
    expect(InMemoryStore.getSlotBooked(date, ACTIVE_SLOT)).toBe(0);
  });

  test('reset clears all reservations for the day, even with active orders', async () => {
    const date = today();
    const created = await placeOrder(customerToken(), RESET_SLOT);
    expect(created.status).toBe(201);
    expect(InMemoryStore.getSlotBooked(date, RESET_SLOT)).toBe(1);

    const res = await request(app)
      .post('/api/orders/pickup-slots/reset')
      .set(authHeader(staffToken()))
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.data.slotsReset).toBeGreaterThanOrEqual(1);
    expect(res.body.data.released).toBeGreaterThanOrEqual(1);
    expect(InMemoryStore.getSlotBooked(date, RESET_SLOT)).toBe(0);

    // Cancelling afterwards must not underflow the reset ledger
    const cancelled = await request(app)
      .post(`/api/orders/${created.body.data.order_id}/cancel`)
      .set(authHeader(customerToken()))
      .send({ reason: 'Reset test cleanup' });
    expect(cancelled.status).toBe(200);
    expect(InMemoryStore.getSlotBooked(date, RESET_SLOT)).toBe(0);
  });

  test('customer cannot deallocate a slot (403)', async () => {
    const res = await deallocate(customerToken(), STALE_SLOT);
    expect(res.status).toBe(403);
  });

  test('requires a slot label (400)', async () => {
    const res = await request(app)
      .post('/api/orders/pickup-slots/deallocate')
      .set(authHeader(staffToken()))
      .send({});
    expect(res.status).toBe(400);
  });
});
