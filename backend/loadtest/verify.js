/**
 * Load-test invariant verifier — runs against the dedicated load-test DB only.
 *
 * Reads loadtest/data/manifest.json (written by setup.js) and asserts the
 * atomicity/capacity/idempotency invariants directly from MongoDB so the result
 * does not depend on interpreting k6 output.
 *
 * Usage: node verify.js
 * Exit code 0 = all invariants held, 1 = at least one invariant violated.
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const Order = require('../src/models/Order');
const MenuItem = require('../src/models/MenuItem');
const PickupSlotBooking = require('../src/models/PickupSlotBooking');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart_canteen_loadtest';
const DATA_DIR = path.join(__dirname, 'data');
const RESULTS_DIR = path.join(__dirname, 'results');

const manifest = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'manifest.json'), 'utf8'));

const results = [];
const record = (name, passed, detail) => {
  results.push({ name, passed, detail });
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const run = async () => {
  const dbName = (MONGO_URI.split('/').pop() || '').split('?')[0];
  if (!/loadtest/i.test(dbName)) {
    throw new Error(`Refusing to verify non-loadtest database "${dbName}".`);
  }

  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  console.log(`[verify] Connected to ${dbName}; scenario=${manifest.scenario}`);

  if (manifest.scenario === 'slot-capacity') {
    const orders = await Order.countDocuments({ pickup_slot: manifest.slot });
    const booking = await PickupSlotBooking.findOne({ date: manifest.date, slot: manifest.slot });
    const item = await MenuItem.findOne({ item_id: manifest.itemId });

    record(
      'slot bookings never exceed capacity',
      orders <= manifest.capacity,
      `${orders} orders / capacity ${manifest.capacity}`
    );
    record(
      'all available capacity was used',
      orders === manifest.capacity,
      `${orders} created (expected ${manifest.capacity})`
    );
    record(
      'booked_count matches created orders and capacity',
      booking && booking.booked_count === orders && booking.booked_count <= manifest.capacity,
      `booked_count=${booking ? booking.booked_count : 'n/a'}`
    );
    record(
      'stock decremented by exactly the successful orders',
      item && item.available_quantity === 100000 - orders,
      `remaining=${item ? item.available_quantity : 'n/a'}`
    );
  } else if (manifest.scenario === 'stock-race') {
    const orders = await Order.countDocuments({ 'items.item_id': new mongoose.Types.ObjectId(manifest.itemObjectId) });
    const item = await MenuItem.findOne({ item_id: manifest.itemId });

    record('single-stock item produced exactly one order', orders === 1, `${orders} orders`);
    record('single-stock item is now sold out', item && item.available_quantity === 0, `remaining=${item ? item.available_quantity : 'n/a'}`);
  } else if (manifest.scenario === 'idempotency') {
    const orders = await Order.countDocuments({ idempotency_key: manifest.idempotencyKey });
    const item = await MenuItem.findOne({ item_id: manifest.itemId });

    record('duplicate idempotency key created exactly one order', orders === 1, `${orders} orders`);
    record(
      'stock decremented exactly once',
      item && item.available_quantity === manifest.initialStock - 1,
      `remaining=${item ? item.available_quantity : 'n/a'}`
    );
  } else if (manifest.scenario === 'baseline') {
    const orders = await Order.countDocuments({});
    const item = await MenuItem.findOne({ item_id: manifest.itemId });
    record('baseline orders persisted', orders > 0, `${orders} orders created`);
    record(
      'baseline stock accounting is non-negative',
      item && item.available_quantity >= 0,
      `remaining=${item ? item.available_quantity : 'n/a'}`
    );
  }

  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const outFile = path.join(RESULTS_DIR, `verify-${manifest.scenario}.json`);
  const passed = results.every((r) => r.passed);
  fs.writeFileSync(outFile, JSON.stringify({ scenario: manifest.scenario, passed, results, generatedAt: new Date().toISOString() }, null, 2));
  console.log(`[verify] ${passed ? 'ALL INVARIANTS HELD' : 'INVARIANT VIOLATION(S) DETECTED'} -> ${outFile}`);

  await mongoose.connection.close();
  process.exit(passed ? 0 : 1);
};

run().catch(async (err) => {
  console.error('[verify] FAILED:', err.message);
  try {
    await mongoose.connection.close();
  } catch {}
  process.exit(1);
});
