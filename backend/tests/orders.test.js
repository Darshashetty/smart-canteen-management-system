const request = require('supertest');
const app = require('../src/app');
const { SEED, tokenFor, authHeader } = require('./helpers');

const ITEM_BURGER = '64f1a2b3c4d5e6f7a8b9c001';
const ITEM_FRIES = '64f1a2b3c4d5e6f7a8b9c002';
const ITEM_SHAWARMA = '64f1a2b3c4d5e6f7a8b9c005';

const customerToken = () => tokenFor(SEED.customer);
const staffToken = () => tokenFor(SEED.staff);

const placeOrder = (payload) =>
  request(app)
    .post('/api/orders')
    .set(authHeader(customerToken()))
    .send({ items: [{ item_id: ITEM_FRIES, quantity: 1 }], ...payload });

describe('Order lifecycle', () => {
  test('creates a pre-order with Placed status and pending cash payment', async () => {
    const res = await placeOrder({});
    expect(res.status).toBe(201);
    expect(res.body.data.order_status).toBe('Placed');
    expect(res.body.data.payment_status).toBe('pending');
    expect(res.body.data.token_number).toMatch(/^C-\d+$/);
    expect(res.body.eta).toBeDefined();
  });

  test('online payment starts as Paid (parity with DB path)', async () => {
    const res = await placeOrder({ payment_method: 'online' });
    expect(res.status).toBe(201);
    expect(res.body.data.payment_status).toBe('paid');
  });

  test('rejects an order exceeding available stock with 409', async () => {
    const res = await placeOrder({
      items: [{ item_id: ITEM_SHAWARMA, quantity: 20 }]
    });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/insufficient stock/i);
  });

  test('idempotency: replaying the same key returns the original order', async () => {
    const idempotency_key = `idem_${Date.now()}`;
    const first = await placeOrder({ idempotency_key });
    expect(first.status).toBe(201);

    const second = await placeOrder({ idempotency_key });
    expect(second.status).toBe(200);
    expect(second.body.duplicate).toBe(true);
    expect(second.body.data.order_id).toBe(first.body.data.order_id);
  });

  test('rejects unauthenticated order creation (401)', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({ items: [{ item_id: ITEM_FRIES, quantity: 1 }] });
    expect(res.status).toBe(401);
  });

  test('rejects invalid payload with 400 (empty items)', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set(authHeader(customerToken()))
      .send({ items: [] });
    expect(res.status).toBe(400);
  });
});

describe('Order state machine (Criterion A3)', () => {
  const transition = (orderId, status) =>
    request(app)
      .patch(`/api/queue/${orderId}/status`)
      .set(authHeader(staffToken()))
      .send({ status });

  test('allows the full valid lifecycle Placed -> ... -> Completed', async () => {
    const createRes = await placeOrder({});
    const orderId = createRes.body.data.order_id;

    for (const status of ['Accepted', 'Preparing', 'Ready', 'Collected', 'Completed']) {
      const res = await transition(orderId, status);
      expect(res.status).toBe(200);
      expect(res.body.data.order_status).toBe(status);
    }
  });

  test('rejects an invalid jump Placed -> Ready with 409', async () => {
    const createRes = await placeOrder({});
    const orderId = createRes.body.data.order_id;

    const res = await transition(orderId, 'Ready');
    expect(res.status).toBe(409);
    expect(res.body.details.allowedTransitions).toContain('Accepted');
  });

  test('rejects a replayed transition Preparing -> Ready twice', async () => {
    const createRes = await placeOrder({});
    const orderId = createRes.body.data.order_id;

    await transition(orderId, 'Accepted');
    await transition(orderId, 'Preparing');

    const first = await transition(orderId, 'Ready');
    expect(first.status).toBe(200);

    const second = await transition(orderId, 'Ready');
    expect(second.status).toBe(409);
  });
});
