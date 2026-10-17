const request = require('supertest');
const app = require('../src/app');
const InMemoryStore = require('../src/services/inMemoryStore');
const { SEED, tokenFor, authHeader } = require('./helpers');

const ITEM_FRIES = '64f1a2b3c4d5e6f7a8b9c002';
const SLOT_A = '14:00-14:15';
const SLOT_B = '15:00-15:15';
const SLOT_C = '16:00-16:15';

const customerToken = () => tokenFor(SEED.customer);
const staffToken = () => tokenFor(SEED.staff);

const registerCustomer = async (tag) => {
  const email = `${tag}_${Date.now()}@canteen.com`;
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: tag, email, password: 'password123' });
  return res.body.token;
};

const placeOrder = (token, slot) =>
  request(app)
    .post('/api/orders')
    .set(authHeader(token))
    .send({ items: [{ item_id: ITEM_FRIES, quantity: 1 }], pickup_slot: slot });

const driveToReady = async (token, slot) => {
  const createRes = await placeOrder(token, slot);
  expect(createRes.status).toBe(201);
  const order = createRes.body.data;
  for (const status of ['Accepted', 'Preparing', 'Ready']) {
    const res = await request(app)
      .patch(`/api/queue/${order.order_id}/status`)
      .set(authHeader(staffToken()))
      .send({ status });
    expect(res.status).toBe(200);
  }
  return order;
};

const getSlot = async (slotName) => {
  const res = await request(app).get('/api/orders/pickup-slots');
  expect(res.status).toBe(200);
  return res.body.data.find((s) => s.slot === slotName);
};

describe('Pickup slot capacity lifecycle (reserve -> release -> rebook)', () => {
  beforeAll(() => {
    // capacity 1 makes a "full" slot easy to reach deterministically
    InMemoryStore.updateSettings({ max_orders_per_slot: 1 });
  });

  test('booking decrements capacity, full slots are rejected, collection restores capacity', async () => {
    let slot = await getSlot(SLOT_A);
    expect(slot).toBeTruthy();
    expect(slot.booked).toBe(0);
    expect(slot.remaining).toBe(1);

    const orderA = await driveToReady(customerToken(), SLOT_A);

    slot = await getSlot(SLOT_A);
    expect(slot.booked).toBe(1);
    expect(slot.remaining).toBe(0);

    const overflow = await placeOrder(customerToken(), SLOT_A);
    expect(overflow.status).toBe(409);
    expect(overflow.body.message).toMatch(/full/i);

    const verify = await request(app)
      .post('/api/collection/verify')
      .set(authHeader(staffToken()))
      .send({ token_number: orderA.token_number });
    expect(verify.status).toBe(200);
    expect(verify.body.can_collect).toBe(true);
    expect(verify.body.data.items.length).toBeGreaterThan(0);

    const confirm = await request(app)
      .post('/api/collection/confirm')
      .set(authHeader(staffToken()))
      .send({ order_id: orderA.order_id });
    expect(confirm.status).toBe(200);
    expect(confirm.body.data.order_status).toBe('Completed');

    slot = await getSlot(SLOT_A);
    expect(slot.booked).toBe(0);
    expect(slot.remaining).toBe(1);

    // duplicate confirm is rejected and must NOT release twice (no underflow)
    const confirmAgain = await request(app)
      .post('/api/collection/confirm')
      .set(authHeader(staffToken()))
      .send({ order_id: orderA.order_id });
    expect(confirmAgain.status).toBe(409);
    slot = await getSlot(SLOT_A);
    expect(slot.booked).toBe(0);

    // another student can now book the released slot
    const otherToken = await registerCustomer('slotflow');
    const rebook = await placeOrder(otherToken, SLOT_A);
    expect(rebook.status).toBe(201);
    slot = await getSlot(SLOT_A);
    expect(slot.booked).toBe(1);
  });

  test('cancelling an order releases its reserved slot capacity', async () => {
    const createRes = await placeOrder(customerToken(), SLOT_C);
    expect(createRes.status).toBe(201);

    let slot = await getSlot(SLOT_C);
    expect(slot.booked).toBe(1);

    const cancel = await request(app)
      .post(`/api/orders/${createRes.body.data.order_id}/cancel`)
      .set(authHeader(customerToken()))
      .send({ reason: 'changed my mind' });
    expect(cancel.status).toBe(200);

    slot = await getSlot(SLOT_C);
    expect(slot.booked).toBe(0);
  });
});

describe('Scanner token resolution with cross-day token reuse', () => {
  test('a stale terminal order with the same token cannot shadow the live order', async () => {
    const live = await driveToReady(customerToken(), SLOT_B);

    // Simulate yesterday's C-001: same token, older, already Completed
    InMemoryStore.__seedOrder({
      _id: 'seed_old_' + Date.now(),
      order_id: 'ORD-OLD-0001',
      token_number: live.token_number,
      customer_id: live.customer_id,
      customer_name: 'Previous Day Student',
      items: live.items,
      total_amount: live.total_amount,
      order_time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      pickup_slot: SLOT_B,
      order_status: 'Completed',
      slot_released: true,
      collected_time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      history: []
    });

    const verify = await request(app)
      .post('/api/collection/verify')
      .set(authHeader(staffToken()))
      .send({ token_number: live.token_number });

    expect(verify.status).toBe(200);
    expect(verify.body.can_collect).toBe(true);
    expect(verify.body.data.order_id).toBe(live.order_id);
    expect(verify.body.data.order_status).toBe('Ready');
  });

  test('a genuinely completed order is still reported as already collected', async () => {
    const order = await driveToReady(customerToken(), '17:00-17:15');

    const first = await request(app)
      .post('/api/collection/confirm')
      .set(authHeader(staffToken()))
      .send({ order_id: order.order_id });
    expect(first.status).toBe(200);

    const verify = await request(app)
      .post('/api/collection/verify')
      .set(authHeader(staffToken()))
      .send({ token_number: order.token_number });
    expect(verify.status).toBe(409);
    expect(verify.body.message).toMatch(/already been collected/i);
  });
});
