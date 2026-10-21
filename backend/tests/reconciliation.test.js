const request = require('supertest');
const app = require('../src/app');
const InMemoryStore = require('../src/services/inMemoryStore');
const { SEED, tokenFor, authHeader } = require('./helpers');

const ITEM_FRIES = '64f1a2b3c4d5e6f7a8b9c002';
const STALE_SLOT = '11:00-11:15';
const ACTIVE_SLOT = '16:30-16:45';
const todayStr = () => new Date().toISOString().slice(0, 10);

const customerToken = () => tokenFor(SEED.customer);
const managerToken = () => tokenFor(SEED.manager);

const placeOrder = (token, slot) =>
  request(app)
    .post('/api/orders')
    .set(authHeader(token))
    .send({ items: [{ item_id: ITEM_FRIES, quantity: 1 }], pickup_slot: slot });

describe('Pickup-slot reconciliation', () => {
  test('recompute drops stale reservations but keeps active ones (no order deleted)', async () => {
    const today = todayStr();

    // A stale reservation with no active order backing it (simulates pre-fix data)
    InMemoryStore.reserveSlot(STALE_SLOT, today);
    expect(InMemoryStore.getSlotBooked(today, STALE_SLOT)).toBe(1);

    // A legitimate active order that must keep its reservation
    const active = await placeOrder(customerToken(), ACTIVE_SLOT);
    expect(active.status).toBe(201);
    expect(InMemoryStore.getSlotBooked(today, ACTIVE_SLOT)).toBe(1);

    const ordersBefore = InMemoryStore.getOrders().length;

    const result = InMemoryStore.reconcileSlotBookings({ apply: true });

    expect(InMemoryStore.getSlotBooked(today, STALE_SLOT)).toBe(0);
    expect(InMemoryStore.getSlotBooked(today, ACTIVE_SLOT)).toBe(1);
    // Reconciliation must never delete orders
    expect(InMemoryStore.getOrders().length).toBe(ordersBefore);
    expect(result.changes.some((c) => c.slot === STALE_SLOT && c.after === 0)).toBe(true);
  });

  test('is idempotent (a second run makes no further changes)', () => {
    const first = InMemoryStore.reconcileSlotBookings({ apply: true });
    const second = InMemoryStore.reconcileSlotBookings({ apply: true });
    expect(second.changes.length).toBe(0);
    expect(second.releasedFlagsFixed).toBe(0);
    expect(first.applied).toBe(true);
  });
});

describe('Configurable auto-delay / uncollected timeouts', () => {
  test('manager can update and read back the new timeout settings', async () => {
    const res = await request(app)
      .put('/api/admin/settings')
      .set(authHeader(managerToken()))
      .send({ auto_delay_grace_minutes: 12, uncollected_timeout_minutes: 90 });

    expect(res.status).toBe(200);
    expect(res.body.data.auto_delay_grace_minutes).toBe(12);
    expect(res.body.data.uncollected_timeout_minutes).toBe(90);

    const get = await request(app).get('/api/admin/settings').set(authHeader(managerToken()));
    expect(get.status).toBe(200);
    expect(get.body.data.auto_delay_grace_minutes).toBe(12);
    expect(get.body.data.uncollected_timeout_minutes).toBe(90);
  });

  test('invalid timeout values are rejected with 400', async () => {
    const res = await request(app)
      .put('/api/admin/settings')
      .set(authHeader(managerToken()))
      .send({ auto_delay_grace_minutes: -5 });
    expect(res.status).toBe(400);
  });
});

describe('Reconcile endpoint RBAC', () => {
  test('customer cannot trigger reconciliation (403)', async () => {
    const res = await request(app)
      .post('/api/admin/slots/reconcile')
      .set(authHeader(customerToken()))
      .send({});
    expect(res.status).toBe(403);
  });

  test('manager can trigger reconciliation (200)', async () => {
    const res = await request(app)
      .post('/api/admin/slots/reconcile')
      .set(authHeader(managerToken()))
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('changes');
  });
});
