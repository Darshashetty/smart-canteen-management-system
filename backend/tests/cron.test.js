const request = require('supertest');

jest.mock('../src/services/notificationService', () => {
  const fn = () => jest.fn().mockResolvedValue(undefined);
  return {
    setSocketIOInstance: jest.fn(),
    getSocketIOInstance: () => null,
    notifyUser: fn(),
    notifyOrderAccepted: fn(),
    notifyOrderPreparing: fn(),
    notifyOrderDelayed: fn(),
    notifyOrderReady: fn(),
    notifyPickupApproaching: fn(),
    notifyPickupTimeChanged: fn(),
    notifyOrderCancelled: fn()
  };
});

const app = require('../src/app');
const InMemoryStore = require('../src/services/inMemoryStore');
const { runBackgroundChecks } = require('../src/services/cronService');
const { notifyOrderDelayed, notifyPickupApproaching } = require('../src/services/notificationService');
const { SEED, tokenFor, authHeader } = require('./helpers');

const ITEM_FRIES = '64f1a2b3c4d5e6f7a8b9c002';
const today = () => new Date().toISOString().slice(0, 10);
const MINUTE = 60 * 1000;

const placeOrder = (slot) =>
  request(app)
    .post('/api/orders')
    .set(authHeader(tokenFor(SEED.customer)))
    .send({ items: [{ item_id: ITEM_FRIES, quantity: 1 }], pickup_slot: slot });

const setStatus = async (orderId, status) => {
  const res = await request(app)
    .patch(`/api/queue/${orderId}/status`)
    .set(authHeader(tokenFor(SEED.staff)))
    .send({ status });
  expect(res.status).toBe(200);
  return res.body.data;
};

const readyOrder = async (slot) => {
  const res = await placeOrder(slot);
  expect(res.status).toBe(201);
  const order = res.body.data;
  for (const status of ['Accepted', 'Preparing', 'Ready']) {
    await setStatus(order.order_id, status);
  }
  return order;
};

describe('Background monitor (no-database mode)', () => {
  beforeAll(() => {
    InMemoryStore.updateSettings({
      max_orders_per_slot: 5,
      auto_delay_grace_minutes: 5,
      uncollected_timeout_minutes: 60
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('flags an overdue Accepted order as Delayed after the grace period', async () => {
    const res = await placeOrder('14:00-14:15');
    expect(res.status).toBe(201);
    const order = res.body.data;
    await setStatus(order.order_id, 'Accepted');

    const live = InMemoryStore.getOrderById(order.order_id);
    live.estimated_ready_time = new Date(Date.now() - 10 * MINUTE);

    await runBackgroundChecks();

    const after = InMemoryStore.getOrderById(order.order_id);
    expect(after.order_status).toBe('Delayed');
    expect(after.is_delayed).toBe(true);
    expect(notifyOrderDelayed).toHaveBeenCalledTimes(1);
  });

  test('leaves an order that is still within its estimate untouched', async () => {
    const res = await placeOrder('15:00-15:15');
    expect(res.status).toBe(201);
    const order = res.body.data;
    await setStatus(order.order_id, 'Accepted');

    const live = InMemoryStore.getOrderById(order.order_id);
    live.estimated_ready_time = new Date(Date.now() + 10 * MINUTE);

    await runBackgroundChecks();

    expect(InMemoryStore.getOrderById(order.order_id).order_status).toBe('Accepted');
    expect(InMemoryStore.getOrderById(order.order_id).is_delayed).toBeFalsy();
  });

  test('marks an uncollected Ready order as Not Collected and releases its slot', async () => {
    const slot = '16:00-16:15';
    const order = await readyOrder(slot);
    expect(InMemoryStore.getSlotBooked(today(), slot)).toBe(1);

    const live = InMemoryStore.getOrderById(order.order_id);
    live.actual_ready_time = new Date(Date.now() - 61 * MINUTE);

    await runBackgroundChecks();

    const after = InMemoryStore.getOrderById(order.order_id);
    expect(after.order_status).toBe('Not Collected');
    expect(after.slot_released).toBe(true);
    // Automatic release restores capacity exactly once
    expect(InMemoryStore.getSlotBooked(today(), slot)).toBe(0);
  });

  test('sends a one-shot pickup-approaching notification', async () => {
    const res = await placeOrder('17:00-17:15');
    expect(res.status).toBe(201);
    const order = res.body.data;

    const live = InMemoryStore.getOrderById(order.order_id);
    live.pickup_time = new Date(Date.now() + 5 * MINUTE);
    expect(live.pickup_approaching_notified).toBeFalsy();

    await runBackgroundChecks();
    expect(InMemoryStore.getOrderById(order.order_id).pickup_approaching_notified).toBe(true);
    expect(notifyPickupApproaching).toHaveBeenCalledTimes(1);

    // Idempotent: the flag prevents repeated notifications
    await runBackgroundChecks();
    expect(notifyPickupApproaching).toHaveBeenCalledTimes(1);
  });

  test('does not release slot capacity for a Delayed order', async () => {
    const slot = '18:00-18:15';
    const res = await placeOrder(slot);
    expect(res.status).toBe(201);
    const order = res.body.data;
    await setStatus(order.order_id, 'Accepted');
    await setStatus(order.order_id, 'Delayed');

    expect(InMemoryStore.getSlotBooked(today(), slot)).toBe(1);
    await runBackgroundChecks();

    const after = InMemoryStore.getOrderById(order.order_id);
    expect(after.slot_released).toBeFalsy();
    expect(InMemoryStore.getSlotBooked(today(), slot)).toBe(1);
  });
});
