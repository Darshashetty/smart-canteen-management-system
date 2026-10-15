/**
 * Load-test data setup — runs against a DEDICATED MongoDB database only.
 *
 * Safety:
 *  - Never touches the production/Atlas database. The database name is forced to
 *    contain "loadtest"; if it does not, the script refuses to run.
 *  - Documents are deleted with deleteMany() (indexes are preserved) rather than
 *    dropping the database, so the atomic-uniqueness indexes stay in place.
 *
 * Usage:
 *   node setup.js --scenario=slot-capacity
 *   node setup.js --scenario=stock-race
 *   node setup.js --scenario=idempotency
 *   node setup.js --scenario=baseline
 *
 * Environment:
 *   MONGO_URI   (default mongodb://127.0.0.1:27017/smart_canteen_loadtest)
 *   JWT_SECRET  (default loadtest_secret)
 *   LOADTEST_PORT (default 5099)
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const User = require('../src/models/User');
const MenuItem = require('../src/models/MenuItem');
const CanteenSetting = require('../src/models/CanteenSetting');
const PickupSlotBooking = require('../src/models/PickupSlotBooking');
const Order = require('../src/models/Order');
const DailyCounter = require('../src/models/DailyCounter');
const SystemLog = require('../src/models/SystemLog');
const Notification = require('../src/models/Notification');
const { MENU_ITEM_STATUS, ROLES, ACCOUNT_STATUS } = require('../src/config/constants');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart_canteen_loadtest';
const JWT_SECRET = process.env.JWT_SECRET || 'loadtest_secret';
const BASE_URL = process.env.LOADTEST_BASE_URL || `http://127.0.0.1:${process.env.LOADTEST_PORT || 5099}`;
const DATA_DIR = path.join(__dirname, 'data');

const scenario = (process.argv.find((a) => a.startsWith('--scenario=')) || '').split('=')[1] || 'slot-capacity';

const assertSafeDatabase = () => {
  const dbName = (MONGO_URI.split('/').pop() || '').split('?')[0];
  if (!/loadtest/i.test(dbName)) {
    throw new Error(
      `Refusing to run: database name "${dbName}" does not contain "loadtest". ` +
        'Point MONGO_URI at a dedicated load-test database.'
    );
  }
  return dbName;
};

const makeToken = (user) =>
  jwt.sign(
    { id: user._id.toString(), email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

const buildUsers = (count, prefix) => {
  const hash = bcrypt.hashSync('password123', 10);
  const docs = [];
  for (let i = 0; i < count; i += 1) {
    docs.push({
      _id: new mongoose.Types.ObjectId(),
      name: `LT ${prefix} ${i}`,
      email: `lt_${prefix}_${i}_${Date.now()}@loadtest.local`,
      password: hash,
      role: ROLES.CUSTOMER,
      account_status: ACCOUNT_STATUS.ACTIVE,
      phone: ''
    });
  }
  return docs;
};

const resetCollections = async () => {
  await Promise.all([
    Order.deleteMany({}),
    PickupSlotBooking.deleteMany({}),
    DailyCounter.deleteMany({}),
    SystemLog.deleteMany({}),
    Notification.deleteMany({}),
    MenuItem.deleteMany({}),
    CanteenSetting.deleteMany({}),
    User.deleteMany({})
  ]);
};

const ensureIndexes = async () => {
  // Make sure DB-enforced uniqueness (idempotency, slot booking, item_id) exists
  // before the load test relies on it.
  await Promise.all([
    User.init(),
    Order.init(),
    MenuItem.init(),
    CanteenSetting.init(),
    PickupSlotBooking.init()
  ]);
};

const seedItem = async (item_id, available_quantity, item_name) =>
  MenuItem.create({
    item_id,
    item_name,
    category: 'Load Test',
    price: 100,
    available_quantity,
    preparation_time: 2,
    status: MENU_ITEM_STATUS.AVAILABLE
  });

const writeManifest = (manifest) => {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(path.join(DATA_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
};

const run = async () => {
  const dbName = assertSafeDatabase();
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  console.log(`[setup] Connected to dedicated load-test DB: ${dbName}`);

  await ensureIndexes();
  await resetCollections();

  const manifest = { scenario, baseUrl: BASE_URL, date: new Date().toISOString().slice(0, 10) };

  if (scenario === 'slot-capacity') {
    const capacity = 5;
    const concurrency = 50;
    const slot = 'LT-SLOT-CAPACITY';
    await CanteenSetting.create({
      max_orders_per_slot: capacity,
      max_items_per_customer: 10,
      kitchen_capacity: 15,
      opening_time: '00:00',
      closing_time: '23:59'
    });
    const item = await seedItem('LT-ITEM-CAP', 100000, 'Load Test Capacity Item');
    const users = buildUsers(concurrency, 'cap');
    await User.collection.insertMany(users);
    manifest.slot = slot;
    manifest.capacity = capacity;
    manifest.itemId = item.item_id;
    manifest.itemObjectId = item._id.toString();
    manifest.concurrency = concurrency;
    manifest.tokens = users.map(makeToken);
    manifest.expected = { successes: capacity, conflicts: concurrency - capacity };
  } else if (scenario === 'stock-race') {
    const concurrency = 50;
    await CanteenSetting.create({
      max_orders_per_slot: 200,
      max_items_per_customer: 10,
      kitchen_capacity: 15,
      opening_time: '00:00',
      closing_time: '23:59'
    });
    const item = await seedItem('LT-ITEM-STOCK', 1, 'Load Test Single-Stock Item');
    const users = buildUsers(concurrency, 'stock');
    await User.collection.insertMany(users);
    manifest.itemId = item.item_id;
    manifest.itemObjectId = item._id.toString();
    manifest.initialStock = 1;
    manifest.concurrency = concurrency;
    manifest.tokens = users.map(makeToken);
    manifest.expected = { successes: 1, conflicts: concurrency - 1 };
  } else if (scenario === 'idempotency') {
    const repeats = 30;
    await CanteenSetting.create({
      max_orders_per_slot: 200,
      max_items_per_customer: 10,
      kitchen_capacity: 15,
      opening_time: '00:00',
      closing_time: '23:59'
    });
    const item = await seedItem('LT-ITEM-IDEM', 1000, 'Load Test Idempotency Item');
    const [user] = buildUsers(1, 'idem');
    await User.collection.insertMany([user]);
    manifest.itemId = item.item_id;
    manifest.itemObjectId = item._id.toString();
    manifest.initialStock = 1000;
    manifest.repeats = repeats;
    manifest.idempotencyKey = `lt-idem-${Date.now()}`;
    manifest.token = makeToken(user);
    manifest.expected = { orders: 1 };
  } else if (scenario === 'baseline') {
    const rate = Number(process.env.LOADTEST_RATE || 30);
    const duration = Number(process.env.LOADTEST_DURATION || 30);
    await CanteenSetting.create({
      max_orders_per_slot: 100000,
      max_items_per_customer: 10,
      kitchen_capacity: 15,
      opening_time: '00:00',
      closing_time: '23:59'
    });
    const item = await seedItem('LT-ITEM-BASE', 1000000, 'Load Test Baseline Item');
    const users = buildUsers(300, 'base');
    await User.collection.insertMany(users);
    manifest.itemId = item.item_id;
    manifest.itemObjectId = item._id.toString();
    manifest.rate = rate;
    manifest.duration = duration;
    manifest.tokens = users.map(makeToken);
  } else {
    throw new Error(`Unknown scenario: ${scenario}`);
  }

  writeManifest(manifest);
  console.log(`[setup] Scenario "${scenario}" ready. Manifest written to loadtest/data/manifest.json`);
  if (manifest.tokens) console.log(`[setup] Users/tokens: ${manifest.tokens.length}`);
  if (manifest.expected) console.log(`[setup] Expected: ${JSON.stringify(manifest.expected)}`);

  await mongoose.connection.close();
};

run().catch(async (err) => {
  console.error('[setup] FAILED:', err.message);
  try {
    await mongoose.connection.close();
  } catch {}
  process.exit(1);
});
