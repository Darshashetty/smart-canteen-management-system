const request = require('supertest');
const app = require('../src/app');
const { SEED, tokenFor, authHeader } = require('./helpers');

const ITEM_FRIES = '64f1a2b3c4d5e6f7a8b9c002';

const customerToken = () => tokenFor(SEED.customer);
const staffToken = () => tokenFor(SEED.staff);

const placeOrder = () =>
  request(app)
    .post('/api/orders')
    .set(authHeader(customerToken()))
    .send({ items: [{ item_id: ITEM_FRIES, quantity: 1 }] });

const transition = (orderId, status) =>
  request(app)
    .patch(`/api/queue/${orderId}/status`)
    .set(authHeader(staffToken()))
    .send({ status });

const driveToReady = async () => {
  const createRes = await placeOrder();
  const order = createRes.body.data;
  for (const status of ['Accepted', 'Preparing', 'Ready']) {
    const res = await transition(order.order_id, status);
    expect(res.status).toBe(200);
  }
  return order;
};

const registerCustomer = async (tag) => {
  const email = `${tag}_${Date.now()}@canteen.com`;
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: tag, email, password: 'password123' });
  return res.body.token;
};

describe('Staff collection scanner (Criterion A4)', () => {
  test('full lifecycle: verify Ready order then confirm once', async () => {
    const order = await driveToReady();

    const verify = await request(app)
      .post('/api/collection/verify')
      .set(authHeader(staffToken()))
      .send({ token_number: order.token_number });
    expect(verify.status).toBe(200);
    expect(verify.body.can_collect).toBe(true);
    expect(verify.body.data.order_id).toBe(order.order_id);

    const confirm = await request(app)
      .post('/api/collection/confirm')
      .set(authHeader(staffToken()))
      .send({ order_id: order.order_id });
    expect(confirm.status).toBe(200);
    expect(confirm.body.data.order_status).toBe('Completed');
    expect(confirm.body.data.collected_time).toBeTruthy();
  });

  test('duplicate collection is rejected with a clear 409 message', async () => {
    const order = await driveToReady();

    const first = await request(app)
      .post('/api/collection/confirm')
      .set(authHeader(staffToken()))
      .send({ token_number: order.token_number });
    expect(first.status).toBe(200);

    const second = await request(app)
      .post('/api/collection/confirm')
      .set(authHeader(staffToken()))
      .send({ token_number: order.token_number });
    expect(second.status).toBe(409);
    expect(second.body.message).toMatch(/already been collected/i);

    const verifyAgain = await request(app)
      .post('/api/collection/verify')
      .set(authHeader(staffToken()))
      .send({ token_number: order.token_number });
    expect(verifyAgain.status).toBe(409);
    expect(verifyAgain.body.message).toMatch(/already been collected/i);
  });

  test('orders not yet Ready cannot be collected and say why', async () => {
    const createRes = await placeOrder();
    const order = createRes.body.data;

    const verify = await request(app)
      .post('/api/collection/verify')
      .set(authHeader(staffToken()))
      .send({ token_number: order.token_number });
    expect(verify.status).toBe(200);
    expect(verify.body.can_collect).toBe(false);
    expect(verify.body.message).toMatch(/Placed/);

    const confirm = await request(app)
      .post('/api/collection/confirm')
      .set(authHeader(staffToken()))
      .send({ token_number: order.token_number });
    expect(confirm.status).toBe(409);
    expect(confirm.body.message).toMatch(/must be marked 'Ready' first/i);
  });

  test('invalid token returns a clear 404', async () => {
    const res = await request(app)
      .post('/api/collection/verify')
      .set(authHeader(staffToken()))
      .send({ token_number: 'C-999' });
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/No order found/i);
  });

  test('verify accepts QR payload JSON and order IDs', async () => {
    const order = await driveToReady();

    const viaQr = await request(app)
      .post('/api/collection/verify')
      .set(authHeader(staffToken()))
      .send({ qr_payload: JSON.stringify({ token: order.token_number, order_id: order.order_id }) });
    expect(viaQr.status).toBe(200);
    expect(viaQr.body.can_collect).toBe(true);

    const viaId = await request(app)
      .post('/api/collection/verify')
      .set(authHeader(staffToken()))
      .send({ order_id: order.order_id });
    expect(viaId.status).toBe(200);
    expect(viaId.body.can_collect).toBe(true);
  });
});

describe('Collection RBAC and QR access', () => {
  test('students cannot use staff collection functions (403)', async () => {
    const order = await driveToReady();

    const verify = await request(app)
      .post('/api/collection/verify')
      .set(authHeader(customerToken()))
      .send({ token_number: order.token_number });
    expect(verify.status).toBe(403);

    const confirm = await request(app)
      .post('/api/collection/confirm')
      .set(authHeader(customerToken()))
      .send({ token_number: order.token_number });
    expect(confirm.status).toBe(403);
  });

  test('owner can fetch their own QR; another student cannot (IDOR)', async () => {
    const createRes = await placeOrder();
    const order = createRes.body.data;

    const mine = await request(app)
      .get(`/api/orders/${order.order_id}/qr`)
      .set(authHeader(customerToken()));
    expect(mine.status).toBe(200);
    expect(mine.body.data.qr_code).toMatch(/^data:image/);
    expect(mine.body.data.token_number).toBe(order.token_number);

    const otherToken = await registerCustomer('qr_idor');
    const forbidden = await request(app)
      .get(`/api/orders/${order.order_id}/qr`)
      .set(authHeader(otherToken));
    expect(forbidden.status).toBe(403);
  });

  test('staff/manager can fetch any order QR', async () => {
    const createRes = await placeOrder();
    const order = createRes.body.data;
    const res = await request(app)
      .get(`/api/orders/${order.order_id}/qr`)
      .set(authHeader(staffToken()));
    expect(res.status).toBe(200);
    expect(res.body.data.qr_code).toMatch(/^data:image/);
  });
});

describe('State machine guard around collection', () => {
  test('Ready -> Completed via queue endpoint is rejected (must go through collection)', async () => {
    const order = await driveToReady();
    const res = await transition(order.order_id, 'Completed');
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/Invalid status transition/i);
  });

  test('Ready -> Not Collected is allowed and terminal', async () => {
    const order = await driveToReady();
    const notCollected = await transition(order.order_id, 'Not Collected');
    expect(notCollected.status).toBe(200);
    expect(notCollected.body.data.order_status).toBe('Not Collected');

    const recollect = await request(app)
      .post('/api/collection/confirm')
      .set(authHeader(staffToken()))
      .send({ token_number: order.token_number });
    expect(recollect.status).toBe(409);
  });
});
