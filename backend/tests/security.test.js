const request = require('supertest');
const app = require('../src/app');
const InMemoryStore = require('../src/services/inMemoryStore');
const { SEED, tokenFor, authHeader } = require('./helpers');

const MENU_FRENCH_FRIES = '64f1a2b3c4d5e6f7a8b9c002';

const firstOrderId = () => InMemoryStore.getOrders({})[0].order_id;

describe('Security: Authentication, RBAC and IDOR/BOLA', () => {
  test('protected order route rejects missing token (401)', async () => {
    const res = await request(app).get('/api/orders');
    expect(res.status).toBe(401);
  });

  test('protected order route rejects malformed token (401)', async () => {
    const res = await request(app).get('/api/orders').set(authHeader('not.a.jwt'));
    expect(res.status).toBe(401);
  });

  test('RBAC: customer cannot change payment status of any order (403)', async () => {
    const res = await request(app)
      .patch(`/api/orders/${firstOrderId()}/payment`)
      .set(authHeader(tokenFor(SEED.customer)))
      .send({ payment_status: 'paid' });
    expect(res.status).toBe(403);
  });

  test('RBAC: customer cannot change pickup time of any order (403)', async () => {
    const res = await request(app)
      .patch(`/api/orders/${firstOrderId()}/pickup-time`)
      .set(authHeader(tokenFor(SEED.customer)))
      .send({ pickup_slot: '15:00-15:15' });
    expect(res.status).toBe(403);
  });

  test('RBAC: staff can update payment status (200)', async () => {
    const res = await request(app)
      .patch(`/api/orders/${firstOrderId()}/payment`)
      .set(authHeader(tokenFor(SEED.staff)))
      .send({ payment_status: 'Pending', payment_method: 'cash_on_counter' });
    expect(res.status).toBe(200);
  });

  test('RBAC: manager and admin can update pickup time (200)', async () => {
    for (const email of [SEED.manager, SEED.admin]) {
      const res = await request(app)
        .patch(`/api/orders/${firstOrderId()}/pickup-time`)
        .set(authHeader(tokenFor(email)))
        .send({ pickup_slot: '16:00-16:15' });
      expect(res.status).toBe(200);
    }
  });

  test('IDOR: a customer cannot read another customer order (403)', async () => {
    const email = `idor_${Date.now()}@canteen.com`;
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Other Student', email, password: 'password123' });
    const otherToken = registerRes.body.token;

    const createRes = await request(app)
      .post('/api/orders')
      .set(authHeader(otherToken))
      .send({ items: [{ item_id: MENU_FRENCH_FRIES, quantity: 1 }] });
    expect(createRes.status).toBe(201);
    const otherOrderId = createRes.body.data.order_id;

    const forbidden = await request(app)
      .get(`/api/orders/${otherOrderId}`)
      .set(authHeader(tokenFor(SEED.customer)));
    expect(forbidden.status).toBe(403);

    const allowed = await request(app)
      .get(`/api/orders/${otherOrderId}`)
      .set(authHeader(otherToken));
    expect(allowed.status).toBe(200);
  });

  test('IDOR: a customer cannot cancel another customer order (403)', async () => {
    const email = `idor_cancel_${Date.now()}@canteen.com`;
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Cancel Target', email, password: 'password123' });
    const otherToken = registerRes.body.token;

    const createRes = await request(app)
      .post('/api/orders')
      .set(authHeader(otherToken))
      .send({ items: [{ item_id: MENU_FRENCH_FRIES, quantity: 1 }] });
    const otherOrderId = createRes.body.data.order_id;

    const res = await request(app)
      .post(`/api/orders/${otherOrderId}/cancel`)
      .set(authHeader(tokenFor(SEED.customer)))
      .send({ reason: 'not mine' });
    expect(res.status).toBe(403);
  });
});
