/**
 * Database-backed integration tests (opt-in: `npm run test:db`).
 *
 * These exercise the real MongoDB code paths — atomic slot reservation,
 * conditional stock decrement, the partial unique idempotency index, the
 * background monitor and slot reconciliation — which the default in-memory
 * suite cannot cover.
 *
 * They run against a disposable local database and DROP it, so they must
 * never point at production/Atlas data.
 */
const mongoose = require('mongoose');
const request = require('supertest');

const app = require('../src/app');
const User = require('../src/models/User');
const MenuItem = require('../src/models/MenuItem');
const Order = require('../src/models/Order');
const CanteenSetting = require('../src/models/CanteenSetting');
const PickupSlotBooking = require('../src/models/PickupSlotBooking');
const Notification = require('../src/models/Notification');
const { generateToken } = require('../src/middleware/auth');
const { MENU_ITEM_STATUS } = require('../src/config/constants');
const { runBackgroundChecks } = require('../src/services/cronService');
const { reconcileSlotBookings } = require('../src/services/slotService');

// These tests DROP the database in beforeAll/afterAll, so they must only ever
// run against a local throwaway MongoDB. Refuse anything else (e.g. Atlas).
const LOCAL_DB_URI = 'mongodb://127.0.0.1:27017/smart_canteen_audit_test';
const MONGO_URI = process.env.MONGO_URI || LOCAL_DB_URI;
if (!/^mongodb:\/\/(127\.0\.0\.1|localhost)[:/]/.test(MONGO_URI)) {
  throw new Error(`Refusing to run DB integration tests against a non-local MongoDB URI: ${MONGO_URI}`);
}
const today = () => new Date().toISOString().slice(0, 10);
const minutesAgo = (m) => new Date(Date.now() - m * 60 * 1000);

let customerToken;
let staffToken;
let item;

const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

const placeOrder = (slot, extra = {}) =>
  request(app)
    .post('/api/orders')
    .set(authHeader(customerToken))
    .send({ items: [{ item_id: item._id.toString(), quantity: 1 }], pickup_slot: slot, ...extra });

const setStatus = (orderId, status) =>
  request(app)
    .patch(`/api/queue/${orderId}/status`)
    .set(authHeader(staffToken))
    .send({ status });

beforeAll(async () => {
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 8000 });
  await mongoose.connection.dropDatabase();
  // Ensure the idempotency partial unique index exists before the race test
  await Promise.all([Order.init(), User.init(), MenuItem.init(), PickupSlotBooking.init()]);

  await CanteenSetting.create({});
  const customer = await User.create({ name: 'DB Customer', email: 'dbtest.customer@canteen.com', password: 'password123', role: 'customer' });
  const staff = await User.create({ name: 'DB Staff', email: 'dbtest.staff@canteen.com', password: 'password123', role: 'staff' });
  customerToken = generateToken(customer);
  staffToken = generateToken(staff);

  item = await MenuItem.create({ item_name: 'DB Fries', category: 'Fast Food', price: 200, available_quantity: 20 });
});

afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});

describe('MongoDB integration', () => {
  test('connects to the database', () => {
    expect(mongoose.connection.readyState).toBe(1);
  });

  test('parallel bookings cannot overbook a capacity-1 slot (atomic $lt/$inc)', async () => {
    await CanteenSetting.updateOne({}, { $set: { max_orders_per_slot: 1 } });

    const results = await Promise.all(
      Array.from({ length: 4 }, () => placeOrder('14:00-14:15'))
    );

    const created = results.filter((r) => r.status === 201);
    const rejected = results.filter((r) => r.status === 409);
    expect(created).toHaveLength(1);
    expect(rejected).toHaveLength(3);

    const booking = await PickupSlotBooking.findOne({ date: today(), slot: '14:00-14:15' }).lean();
    expect(booking.booked_count).toBe(1);
    const orders = await Order.countDocuments({ pickup_slot: '14:00-14:15' });
    expect(orders).toBe(1);
  });

  test('parallel orders cannot oversell the last item (conditional $inc)', async () => {
    await CanteenSetting.updateOne({}, { $set: { max_orders_per_slot: 5 } });
    await MenuItem.updateOne({ _id: item._id }, { $set: { available_quantity: 1 } });

    const slots = ['15:00-15:15', '15:15-15:30', '15:30-15:45'];
    const results = await Promise.all(slots.map((s) => placeOrder(s)));

    const created = results.filter((r) => r.status === 201);
    const rejected = results.filter((r) => r.status === 409);
    expect(created).toHaveLength(1);
    expect(rejected).toHaveLength(2);

    const stored = await MenuItem.findById(item._id).lean();
    expect(stored.available_quantity).toBe(0);
    // Never negative
    expect(stored.available_quantity).toBeGreaterThanOrEqual(0);

    // Restore stock and re-derive status (mirrors an admin restock)
    await MenuItem.updateOne(
      { _id: item._id },
      { $set: { available_quantity: 20, status: MENU_ITEM_STATUS.AVAILABLE } }
    );
  });

  test('idempotency key race creates exactly one order (unique partial index)', async () => {
    const key = `db-idem-${Date.now()}`;
    const slots = ['16:00-16:15', '16:15-16:30', '16:30-16:45'];
    const results = await Promise.all(slots.map((s) => placeOrder(s, { idempotency_key: key })));

    results.forEach((r) => expect([200, 201]).toContain(r.status));
    const duplicates = results.filter((r) => r.body.duplicate === true);
    expect(duplicates.length).toBeGreaterThanOrEqual(1);

    const count = await Order.countDocuments({ idempotency_key: key });
    expect(count).toBe(1);
  });

  test('slot labels are validated before any DB mutation', async () => {
    const stockBefore = (await MenuItem.findById(item._id).lean()).available_quantity;

    const res = await placeOrder('13:00-14:00');
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/valid pickup window/i);
    expect((await MenuItem.findById(item._id).lean()).available_quantity).toBe(stockBefore);
  });

  test('Ready -> Collected sets collected_time and releases capacity exactly once', async () => {
    const slot = '17:00-17:15';
    const created = await placeOrder(slot);
    expect(created.status).toBe(201);
    const orderId = created.body.data.order_id;

    for (const status of ['Accepted', 'Preparing', 'Ready']) {
      expect((await setStatus(orderId, status)).status).toBe(200);
    }

    const collected = await setStatus(orderId, 'Collected');
    expect(collected.status).toBe(200);
    expect(collected.body.data.collected_time).toBeTruthy();

    const stored = await Order.findOne({ order_id: orderId }).lean();
    expect(stored.collected_time).toBeTruthy();
    expect(stored.slot_released).toBe(true);

    const ownBooking = await PickupSlotBooking.findOne({ date: today(), slot: '17:00-17:15' }).lean();
    expect(ownBooking.booked_count).toBe(0);

    // Completed is reachable and final
    expect((await setStatus(created.body.data.order_id, 'Completed')).status).toBe(200);
    expect((await setStatus(created.body.data.order_id, 'Accepted')).status).toBe(409);
  });

  test('reconciliation repairs drifted slot counts without deleting orders', async () => {
    const ordersBefore = await Order.countDocuments({});

    // Inject drift: claim 99 bookings for a slot that has no live orders
    await PickupSlotBooking.updateOne(
      { date: today(), slot: '19:00-19:15' },
      { $set: { booked_count: 99, max_capacity: 5 } },
      { upsert: true }
    );

    const report = await reconcileSlotBookings({ apply: true });
    expect(report.applied).toBe(true);
    expect(report.changes.some((c) => c.slot === '19:00-19:15' && c.after === 0)).toBe(true);

    const repaired = await PickupSlotBooking.findOne({ date: today(), slot: '19:00-19:15' }).lean();
    expect(repaired.booked_count).toBe(0);
    expect(await Order.countDocuments({})).toBe(ordersBefore);
  });

  test('background monitor flags delays, times out uncollected orders and releases slots', async () => {
    await CanteenSetting.updateOne(
      {},
      { $set: { auto_delay_grace_minutes: 5, uncollected_timeout_minutes: 60 } }
    );

    // 1. overdue Accepted order -> Delayed
    const overdueRes = await placeOrder('18:00-18:15');
    expect(overdueRes.status).toBe(201);
    const overdueId = overdueRes.body.data._id;
    expect((await setStatus(overdueRes.body.data.order_id, 'Accepted')).status).toBe(200);
    await Order.updateOne({ _id: overdueId }, { $set: { estimated_ready_time: minutesAgo(10) } });

    // 2. stale Ready order -> Not Collected + slot release
    const staleRes = await placeOrder('18:15-18:30');
    expect(staleRes.status).toBe(201);
    const staleId = staleRes.body.data._id;
    for (const status of ['Accepted', 'Preparing', 'Ready']) {
      expect((await setStatus(staleRes.body.data.order_id, status)).status).toBe(200);
    }
    await Order.updateOne({ _id: staleId }, { $set: { actual_ready_time: minutesAgo(61) } });

    await runBackgroundChecks();

    const overdue = await Order.findById(overdueId).lean();
    expect(overdue.order_status).toBe('Delayed');

    const stale = await Order.findById(staleId).lean();
    expect(stale.order_status).toBe('Not Collected');
    expect(stale.slot_released).toBe(true);

    const booking = await PickupSlotBooking.findOne({ date: today(), slot: '18:15-18:30' }).lean();
    expect(booking.booked_count).toBe(0);
  });

  test('cancellation restores stock and releases the slot', async () => {
    const stockBefore = (await MenuItem.findById(item._id).lean()).available_quantity;
    const created = await placeOrder('20:00-20:15');
    expect(created.status).toBe(201);

    const stockAfterOrder = (await MenuItem.findById(item._id).lean()).available_quantity;
    expect(stockAfterOrder).toBe(stockBefore - 1);

    const cancel = await request(app)
      .post(`/api/orders/${created.body.data.order_id}/cancel`)
      .set(authHeader(customerToken))
      .send({ reason: 'DB test cancel' });

    expect(cancel.status).toBe(200);
    expect(cancel.body.data.order_status).toBe('Cancelled');

    const stockAfterCancel = (await MenuItem.findById(item._id).lean()).available_quantity;
    expect(stockAfterCancel).toBe(stockBefore);

    const booking = await PickupSlotBooking.findOne({ date: today(), slot: '20:00-20:15' }).lean();
    expect(booking.booked_count).toBe(0);
  });
});

describe('MongoDB online payment methods (instant settlement)', () => {
  const placeOnlineOrder = (method = 'card') =>
    request(app)
      .post('/api/orders')
      .set(authHeader(customerToken))
      .send({
        items: [{ item_id: item._id.toString(), quantity: 1 }],
        payment_method: method,
        idempotency_key: `db-online-${Date.now()}-${Math.random()}`
      });

  beforeAll(async () => {
    await MenuItem.updateOne(
      { _id: item._id },
      { $set: { available_quantity: 20, status: MENU_ITEM_STATUS.AVAILABLE } }
    );
  });

  test('a card order is stored as Placed/Paid immediately', async () => {
    const res = await placeOnlineOrder('card');
    expect(res.status).toBe(201);
    expect(res.body.data.order_status).toBe('Placed');
    expect(res.body.data.payment_status).toBe('Paid');
    expect(res.body.data.payment_method).toBe('card');

    const order = await Order.findOne({ order_id: res.body.data.order_id }).lean();
    expect(order.order_status).toBe('Placed');
    expect(order.payment_status).toBe('Paid');

    const notifications = await Notification.find({ order_id: order._id }).lean();
    expect(notifications.some((n) => n.type === 'ORDER_PLACED')).toBe(true);
  });

  test('an online order cannot be paid twice / created twice for the same idempotency key', async () => {
    const key = `db-online-idem-${Date.now()}`;
    const first = await request(app)
      .post('/api/orders')
      .set(authHeader(customerToken))
      .send({
        items: [{ item_id: item._id.toString(), quantity: 1 }],
        payment_method: 'online',
        idempotency_key: key
      });
    expect(first.status).toBe(201);
    expect(first.body.data.payment_status).toBe('Paid');

    const replay = await request(app)
      .post('/api/orders')
      .set(authHeader(customerToken))
      .send({
        items: [{ item_id: item._id.toString(), quantity: 1 }],
        payment_method: 'online',
        idempotency_key: key
      });
    expect(replay.status).toBe(200);
    expect(replay.body.duplicate).toBe(true);
    expect(replay.body.data.order_id).toBe(first.body.data.order_id);
  });

  test('cancelling a paid online order marks it Refunded (DB)', async () => {
    const created = await placeOnlineOrder('online');
    expect(created.status).toBe(201);
    expect(created.body.data.payment_status).toBe('Paid');

    const cancel = await request(app)
      .post(`/api/orders/${created.body.data._id}/cancel`)
      .set(authHeader(customerToken))
      .send({ reason: 'DB online refund test' });
    expect(cancel.status).toBe(200);
    expect(cancel.body.data.order_status).toBe('Cancelled');
    expect(cancel.body.data.payment_status).toBe('Refunded');
  });
});

describe('MongoDB smart-card and cash flows', () => {
  const CUSTOMER_ID = () => User.findOne({ email: 'dbtest.customer@canteen.com' }).lean();

  const getBalance = async () => (await CUSTOMER_ID()).smart_card_balance;

  const placePaidOrder = (paymentMethod, extra = {}) =>
    request(app)
      .post('/api/orders')
      .set(authHeader(customerToken))
      .send({
        items: [{ item_id: item._id.toString(), quantity: 1 }],
        payment_method: paymentMethod,
        idempotency_key: `db-sc-${paymentMethod}-${Date.now()}-${Math.random()}`,
        ...extra
      });

  beforeAll(async () => {
    await MenuItem.updateOne(
      { _id: item._id },
      { $set: { available_quantity: 50, status: MENU_ITEM_STATUS.AVAILABLE } }
    );
    await User.updateOne({ email: 'dbtest.customer@canteen.com' }, { $set: { smart_card_balance: 5000 } });
  });

  test('a smart_card order persists payment_method and debits the balance', async () => {
    const before = await getBalance();
    const res = await placePaidOrder('smart_card');
    expect(res.status).toBe(201);
    expect(res.body.data.payment_status).toBe('Paid');
    expect(res.body.data.total_amount).toBeGreaterThan(0);

    const order = await Order.findOne({ order_id: res.body.data.order_id }).lean();
    // Regression: payment_method must actually persist in MongoDB (enum field)
    expect(order.payment_method).toBe('smart_card');
    expect(await getBalance()).toBeCloseTo(before - res.body.data.total_amount, 2);
  });

  test('cancelling a smart_card order refunds the balance exactly once (DB)', async () => {
    const before = await getBalance();
    const created = await placePaidOrder('smart_card');
    const orderId = created.body.data.order_id;
    expect(await getBalance()).toBeCloseTo(before - created.body.data.total_amount, 2);

    const cancel = await request(app)
      .post(`/api/orders/${orderId}/cancel`)
      .set(authHeader(customerToken))
      .send({ reason: 'DB smart-card refund test' });
    expect(cancel.status).toBe(200);

    expect(await getBalance()).toBeCloseTo(before, 2);

    // A second cancel must not double-refund
    await request(app)
      .post(`/api/orders/${orderId}/cancel`)
      .set(authHeader(customerToken))
      .send({ reason: 'second cancel' });
    expect(await getBalance()).toBeCloseTo(before, 2);
  });

  test('a cash_on_counter order persists as Pending and never touches the balance', async () => {
    const before = await getBalance();
    const res = await placePaidOrder('cash_on_counter');
    expect(res.status).toBe(201);
    expect(res.body.data.payment_status).toBe('Pending');

    const order = await Order.findOne({ order_id: res.body.data.order_id }).lean();
    expect(order.payment_method).toBe('cash_on_counter');
    expect(await getBalance()).toBeCloseTo(before, 2);
  });

  test('an online method on /api/orders is placed as Paid without touching the balance', async () => {
    const before = await getBalance();
    const res = await placePaidOrder('card');
    expect(res.status).toBe(201);
    expect(res.body.data.payment_status).toBe('Paid');

    const order = await Order.findOne({ order_id: res.body.data.order_id }).lean();
    expect(order.payment_status).toBe('Paid');
    expect(await getBalance()).toBeCloseTo(before, 2);
  });
});
