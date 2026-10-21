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

describe('Pickup slot label validation', () => {
  beforeAll(() => {
    // Explicit grid: 12:00-21:00 in 15-minute slots
    InMemoryStore.updateSettings({
      opening_time: '12:00',
      closing_time: '21:00',
      slot_interval_minutes: 15,
      max_orders_per_slot: 5
    });
  });

  const invalidLabels = [
    ['not-a-slot', /format/i],
    ['99:99-99:99', /format/i],
    ['12:00:12:15', /format/i],
    ['13:00-14:00', /valid pickup window/i],
    ['13:00-13:20', /valid pickup window/i],
    ['11:45-12:00', /valid pickup window/i],
    ['21:00-21:15', /valid pickup window/i],
    ['23:00-23:15', /valid pickup window/i]
  ];

  test.each(invalidLabels)('rejects pickup_slot %s with 400 and no side effects', async (slot, pattern) => {
    const token = tokenFor(SEED.customer);
    const stockBefore = InMemoryStore.getMenuItemById(ITEM_FRIES).available_quantity;
    const ordersBefore = InMemoryStore.getOrders().length;

    const res = await placeOrder(token, slot);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(pattern);
    // A rejected label must not consume stock, reserve capacity or create an order
    expect(InMemoryStore.getMenuItemById(ITEM_FRIES).available_quantity).toBe(stockBefore);
    expect(InMemoryStore.getOrders().length).toBe(ordersBefore);
    expect(InMemoryStore.getSlotBooked(today(), slot)).toBe(0);
  });

  test('accepts a label that matches the configured grid', async () => {
    const res = await placeOrder(tokenFor(SEED.customer), '12:00-12:15');
    expect(res.status).toBe(201);
    expect(res.body.data.pickup_slot).toBe('12:00-12:15');
    expect(InMemoryStore.getSlotBooked(today(), '12:00-12:15')).toBe(1);
  });

  test('rejects a malformed label when changing an existing order pickup slot', async () => {
    const created = await placeOrder(tokenFor(SEED.customer), '12:15-12:30');
    expect(created.status).toBe(201);
    const order = created.body.data;

    const res = await request(app)
      .patch(`/api/orders/${order.order_id}/pickup-time`)
      .set(authHeader(tokenFor(SEED.staff)))
      .send({ pickup_slot: 'garbage-slot' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/format/i);
    // Original reservation untouched
    const stored = InMemoryStore.getOrderById(order.order_id);
    expect(stored.pickup_slot).toBe('12:15-12:30');
    expect(InMemoryStore.getSlotBooked(today(), '12:15-12:30')).toBe(1);
  });

  test('validates the label against the configured opening hours', async () => {
    InMemoryStore.updateSettings({ opening_time: '09:00', closing_time: '10:00' });

    // Within the new window
    const ok = await placeOrder(tokenFor(SEED.customer), '09:15-09:30');
    expect(ok.status).toBe(201);

    // Previously valid 12:00-12:15 now falls outside opening hours
    const rejected = await placeOrder(tokenFor(SEED.customer), '12:00-12:15');
    expect(rejected.status).toBe(400);
    expect(rejected.body.message).toMatch(/valid pickup window/i);

    InMemoryStore.updateSettings({ opening_time: '12:00', closing_time: '21:00' });
  });
});
