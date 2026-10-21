const request = require('supertest');
const app = require('../src/app');
const { SEED, tokenFor, authHeader } = require('./helpers');

const ITEM_FRIES = '64f1a2b3c4d5e6f7a8b9c002'; // Rs. 200 convenience item

const customerToken = () => tokenFor(SEED.customer);
const adminToken = () => tokenFor(SEED.admin);

const getProfile = async () => {
  const res = await request(app).get('/api/auth/me').set(authHeader(customerToken()));
  return res.body.user;
};

const getBalance = async () => (await getProfile()).smart_card_balance;

const placeOrder = (payload) =>
  request(app)
    .post('/api/orders')
    .set(authHeader(customerToken()))
    .send({ items: [{ item_id: ITEM_FRIES, quantity: 1 }], ...payload });

describe('Smart card balance (backend)', () => {
  test('the profile exposes a numeric smart card balance for customers', async () => {
    const user = await getProfile();
    expect(user.role).toBe('customer');
    expect(typeof user.smart_card_balance).toBe('number');
    expect(user.smart_card_balance).toBeGreaterThan(0);
    expect(user.passwordHash).toBeUndefined();
  });

  test('a smart_card order is Paid and debits the balance by the order total', async () => {
    const before = await getBalance();

    const res = await placeOrder({
      payment_method: 'smart_card',
      idempotency_key: `sc_paid_${Date.now()}`
    });
    expect(res.status).toBe(201);
    expect(res.body.data.payment_status).toBe('paid');
    expect(res.body.data.total_amount).toBeGreaterThan(0);

    const after = await getBalance();
    expect(before - after).toBeCloseTo(res.body.data.total_amount, 2);
  });

  test('a card order is placed as Paid without touching the smart card balance', async () => {
    const before = await getBalance();

    const res = await placeOrder({
      payment_method: 'card',
      idempotency_key: `sc_card_${Date.now()}`
    });
    expect(res.status).toBe(201);
    expect(res.body.data.payment_status).toBe('paid');

    const after = await getBalance();
    expect(after).toBeCloseTo(before, 2);
  });

  test('a cash_on_counter order is Pending and does not touch the balance', async () => {
    const before = await getBalance();

    const res = await placeOrder({
      payment_method: 'cash_on_counter',
      idempotency_key: `sc_cash_${Date.now()}`
    });
    expect(res.status).toBe(201);
    expect(res.body.data.payment_status).toBe('pending');

    const after = await getBalance();
    expect(after).toBeCloseTo(before, 2);
  });

  test('an order exceeding the smart card balance is rejected with 402 and leaves no charge', async () => {
    const customer = await getProfile();

    await request(app)
      .patch(`/api/admin/users/${customer._id}/role-status`)
      .set(authHeader(adminToken()))
      .send({ smart_card_balance: 10 })
      .expect(200);

    try {
      const res = await placeOrder({
        payment_method: 'smart_card',
        idempotency_key: `sc_insufficient_${Date.now()}`
      });
      expect(res.status).toBe(402);
      expect(res.body.details).toMatchObject({ required: 200 });

      const after = await getBalance();
      expect(after).toBe(10);
    } finally {
      await request(app)
        .patch(`/api/admin/users/${customer._id}/role-status`)
        .set(authHeader(adminToken()))
        .send({ smart_card_balance: 5000 });
    }
  });

  test('cancelling a smart_card order refunds the balance exactly once', async () => {
    const before = await getBalance();

    const created = await placeOrder({
      payment_method: 'smart_card',
      idempotency_key: `sc_refund_${Date.now()}`
    });
    expect(created.status).toBe(201);

    const orderId = created.body.data._id;
    const charged = await getBalance();
    expect(before - charged).toBeCloseTo(created.body.data.total_amount, 2);

    const cancel = await request(app)
      .post(`/api/orders/${orderId}/cancel`)
      .set(authHeader(customerToken()))
      .send({ reason: 'Automated test cancellation' });
    expect(cancel.status).toBe(200);

    const refunded = await getBalance();
    expect(refunded).toBeCloseTo(before, 2);
  });

  test('an admin can top up a customer smart card balance', async () => {
    const customer = await getProfile();

    const res = await request(app)
      .patch(`/api/admin/users/${customer._id}/role-status`)
      .set(authHeader(adminToken()))
      .send({ smart_card_balance: 75.5 });
    expect(res.status).toBe(200);

    const after = await getBalance();
    expect(after).toBeCloseTo(75.5, 2);
  });
});
