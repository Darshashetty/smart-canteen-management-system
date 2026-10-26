const mongoose = require('mongoose');
const Order = require('../models/Order');
const CanteenSetting = require('../models/CanteenSetting');
const PickupSlotBooking = require('../models/PickupSlotBooking');
const { DEFAULT_SETTINGS, ORDER_STATUS } = require('../config/constants');

const formatTimeHHMM = (date) => {
  const d = new Date(date);
  return d.toTimeString().substring(0, 5);
};

const parseTimeToMinutes = (value) => {
  const [hours, minutes] = String(value || '').split(':').map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
};

/**
 * Validates a pickup slot label (e.g. "13:00-13:15") against the configured
 * slot interval and opening hours. Returns { valid: true } or
 * { valid: false, message } so callers can respond with 400 before any
 * stock/slot side effects happen.
 */
const validatePickupSlotLabel = (slot, settings = DEFAULT_SETTINGS) => {
  const text = String(slot || '').trim();
  const match = /^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/.exec(text);

  if (!match) {
    return {
      valid: false,
      message: `Invalid pickup slot format '${text}'. Expected HH:MM-HH:MM (24-hour).`
    };
  }

  const startMinutes = parseTimeToMinutes(`${match[1]}:${match[2]}`);
  const endHour = Number(match[3]);
  const endMin = Number(match[4]);
  const endMinutes = endHour === 24 && endMin === 0
    ? 24 * 60
    : parseTimeToMinutes(`${match[3]}:${match[4]}`);

  if (startMinutes === null || endMinutes === null) {
    return {
      valid: false,
      message: `Invalid pickup slot format '${text}'. Expected HH:MM-HH:MM (24-hour).`
    };
  }

  const interval = Number(settings.slot_interval_minutes ?? settings.slotIntervalMinutes ?? 15);

  // Pickup slots run 24/7: any interval-aligned window is accepted regardless
  // of the time of day. Only the format, length and grid alignment are checked.
  const duration = endMinutes - startMinutes;
  const alignedToGrid = startMinutes % interval === 0;

  if (duration !== interval || !alignedToGrid) {
    return {
      valid: false,
      message: `Pickup slot '${text}' is not a valid pickup window for the configured ${interval}-minute grid.`
    };
  }

  return { valid: true };
};

/**
 * Generates available 15-minute pickup slots for the rest of today
 */
const getAvailablePickupSlots = async (targetDate = new Date()) => {
  let settings = DEFAULT_SETTINGS;
  const bookingMap = {};
  const now = new Date(targetDate);
  const todayStr = now.toISOString().slice(0, 10);

  if (mongoose.connection.readyState === 1) {
    try {
      const dbSettings = await CanteenSetting.findOne();
      if (dbSettings) settings = dbSettings;
      const existingBookings = await PickupSlotBooking.find({ date: todayStr });
      existingBookings.forEach((b) => {
        bookingMap[b.slot] = b.booked_count;
      });
    } catch {}
  } else {
    // No-database fallback: read settings + booked counts from the in-memory store
    try {
      const InMemoryStore = require('./inMemoryStore');
      settings = InMemoryStore.getSettings() || settings;
      Object.assign(bookingMap, InMemoryStore.getSlotBookingMap(todayStr));
    } catch {}
  }

  const slotInterval = Number(settings.slot_interval_minutes || settings.slotIntervalMinutes || 15);
  const maxPerSlot = Number(settings.max_orders_per_slot || settings.maxOrdersPerSlot || 20);

  // 24/7 operation: offer every interval-aligned slot for the full calendar
  // day without any opening/closing window restriction.
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const slots = [];
  let currentCursor = new Date(dayStart);

  while (currentCursor < dayEnd) {
    const slotStartStr = formatTimeHHMM(currentCursor);
    const nextCursor = new Date(currentCursor.getTime() + slotInterval * 60 * 1000);
    if (nextCursor > dayEnd) break;
    const slotEndStr = nextCursor.getTime() === dayEnd.getTime()
      ? '24:00'
      : formatTimeHHMM(nextCursor);
    const slotLabel = `${slotStartStr}-${slotEndStr}`;

    const bookedCount = bookingMap[slotLabel] || 0;
    const isPast = nextCursor <= now;
    const isFull = bookedCount >= maxPerSlot;

    slots.push({
      slot: slotLabel,
      startTime: new Date(currentCursor),
      endTime: new Date(nextCursor),
      capacity: maxPerSlot,
      booked: bookedCount,
      remaining: Math.max(0, maxPerSlot - bookedCount),
      status: isPast ? 'Past' : isFull ? 'Full' : 'Available',
      selectable: !isPast && !isFull
    });

    currentCursor = nextCursor;
  }

  return slots;
};

/**
 * Criterion A1: Atomic conditional slot capacity reservation
 * Conditional update: { booked_count: { $lt: max_capacity } }
 */
const reserveSlotAtomic = async (pickupSlot, orderTime = new Date()) => {
  let settings = await CanteenSetting.findOne();
  if (!settings) settings = DEFAULT_SETTINGS;

  const maxOrders = settings.max_orders_per_slot || 20;
  const dateStr = new Date(orderTime).toISOString().slice(0, 10);

  // Ensure record exists before conditional atomic check
  await PickupSlotBooking.findOneAndUpdate(
    { date: dateStr, slot: pickupSlot },
    { $setOnInsert: { booked_count: 0, max_capacity: maxOrders } },
    { upsert: true, new: true }
  );

  const updatedBooking = await PickupSlotBooking.findOneAndUpdate(
    { date: dateStr, slot: pickupSlot, booked_count: { $lt: maxOrders } },
    { $inc: { booked_count: 1 } },
    { new: true }
  );

  if (!updatedBooking) {
    return {
      success: false,
      message: `Pickup slot '${pickupSlot}' is completely full (capacity ${maxOrders}). Please select another slot.`
    };
  }

  return {
    success: true,
    booking: updatedBooking
  };
};

/**
 * Criterion A1: Atomic rollback of reserved slot capacity on failed order
 */
const releaseSlotAtomic = async (pickupSlot, orderTime = new Date()) => {
  if (!pickupSlot || mongoose.connection.readyState !== 1) return;
  const dateStr = new Date(orderTime).toISOString().slice(0, 10);

  await PickupSlotBooking.findOneAndUpdate(
    { date: dateStr, slot: pickupSlot, booked_count: { $gt: 0 } },
    { $inc: { booked_count: -1 } }
  );
};

/**
 * Releases the pickup-slot capacity held by a specific order, at most once.
 * Uses the order's slot_released flag with an atomic conditional update so
 * duplicate releases (double collection, cancel + not-collected races, retries)
 * can never decrement capacity twice.
 * Returns true only when this call performed the release.
 */
const releaseSlotForOrder = async (order) => {
  if (!order || !order.pickup_slot || mongoose.connection.readyState !== 1) return false;

  const Order = require('../models/Order');
  const flipped = await Order.findOneAndUpdate(
    { _id: order._id, slot_released: { $ne: true } },
    { $set: { slot_released: true } },
    { new: true }
  );

  if (!flipped) return false; // already released previously

  const dateStr = new Date(flipped.order_time || new Date()).toISOString().slice(0, 10);
  await PickupSlotBooking.findOneAndUpdate(
    { date: dateStr, slot: flipped.pickup_slot, booked_count: { $gt: 0 } },
    { $inc: { booked_count: -1 } }
  );
  return true;
};

const clearSlotIfEmpty = async (pickupSlot, targetDate = new Date()) => {
  if (!pickupSlot) {
    return { success: false, status: 400, message: 'Pickup slot is required.' };
  }

  const dateStr = new Date(targetDate).toISOString().slice(0, 10);

  if (mongoose.connection.readyState !== 1) {
    const InMemoryStore = require('./inMemoryStore');
    return InMemoryStore.clearSlotIfEmpty(pickupSlot, dateStr);
  }

  const activeStatuses = [
    ORDER_STATUS.PLACED,
    ORDER_STATUS.ACCEPTED,
    ORDER_STATUS.PREPARING,
    ORDER_STATUS.READY,
    ORDER_STATUS.DELAYED
  ];
  const activeOrderCount = await Order.countDocuments({
    pickup_slot: pickupSlot,
    order_time: {
      $gte: new Date(`${dateStr}T00:00:00.000Z`),
      $lt: new Date(`${dateStr}T23:59:59.999Z`)
    },
    order_status: { $in: activeStatuses }
  });

  if (activeOrderCount > 0) {
    return {
      success: false,
      status: 409,
      message: `Slot ${pickupSlot} still has ${activeOrderCount} active order(s). Complete or cancel them first.`,
      activeOrderCount
    };
  }

  const previousBooking = await PickupSlotBooking.findOneAndUpdate(
    { date: dateStr, slot: pickupSlot },
    { $set: { booked_count: 0 } },
    { new: false }
  );

  // Non-active orders no longer hold this capacity; repair their release flag
  // so a later status change cannot decrement the ledger again.
  await Order.updateMany(
    {
      pickup_slot: pickupSlot,
      order_time: {
        $gte: new Date(`${dateStr}T00:00:00.000Z`),
        $lt: new Date(`${dateStr}T23:59:59.999Z`)
      },
      order_status: { $nin: activeStatuses },
      slot_released: { $ne: true }
    },
    { $set: { slot_released: true } }
  );

  return {
    success: true,
    date: dateStr,
    slot: pickupSlot,
    released: previousBooking ? Number(previousBooking.booked_count || 0) : 0,
    booked: 0
  };
};

const ACTIVE_ORDER_STATUSES = [
  ORDER_STATUS.PLACED,
  ORDER_STATUS.ACCEPTED,
  ORDER_STATUS.PREPARING,
  ORDER_STATUS.READY,
  ORDER_STATUS.DELAYED
];

/**
 * Force-resets every pickup-slot reservation for a day. Intended for demo /
 * operational recovery (for example after a long outage); it clears the ledger
 * even when orders are still active so the slot grid becomes usable again.
 * Orders are never deleted, and their `slot_released` flag is set so a later
 * status change cannot decrement the freshly-reset ledger.
 */
const resetSlotBookings = async (targetDate = new Date()) => {
  const dateStr = new Date(targetDate).toISOString().slice(0, 10);

  if (mongoose.connection.readyState !== 1) {
    const InMemoryStore = require('./inMemoryStore');
    return InMemoryStore.resetSlotBookings(dateStr);
  }

  const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
  const dayEnd = new Date(`${dateStr}T23:59:59.999Z`);

  const bookings = await PickupSlotBooking.find({ date: dateStr })
    .select('booked_count')
    .lean();
  const released = bookings.reduce((sum, b) => sum + Number(b.booked_count || 0), 0);

  await PickupSlotBooking.updateMany(
    { date: dateStr },
    { $set: { booked_count: 0 } }
  );

  await Order.updateMany(
    {
      pickup_slot: { $nin: [null, ''] },
      order_time: { $gte: dayStart, $lte: dayEnd }
    },
    { $set: { slot_released: true } }
  );

  return {
    date: dateStr,
    slotsReset: bookings.length,
    released,
    booked: 0
  };
};

/**
 * Reconciles the PickupSlotBooking ledger with the orders that actually hold a
 * reservation. Drift can happen after crashes/restarts or historical bugs, so
 * this recomputes each (date, slot) count from live orders and repairs the
 * `slot_released` flags. It never deletes orders.
 *
 * @param {{apply?: boolean}} options apply=false performs a dry run
 */
const reconcileSlotBookings = async ({ apply = false } = {}) => {
  if (mongoose.connection.readyState !== 1) {
    const InMemoryStore = require('./inMemoryStore');
    return InMemoryStore.reconcileSlotBookings({ apply });
  }

  const orders = await Order.find({ pickup_slot: { $nin: [null, ''] } })
    .select('_id order_time pickup_slot order_status slot_released')
    .lean();

  const expected = {};
  let releasedFlagsFixed = 0;

  for (const order of orders) {
    const dateStr = new Date(order.order_time || Date.now()).toISOString().slice(0, 10);
    const key = `${dateStr}|${order.pickup_slot}`;
    const isActive = ACTIVE_ORDER_STATUSES.includes(order.order_status);

    if (isActive) {
      expected[key] = (expected[key] || 0) + 1;
      if (order.slot_released) {
        releasedFlagsFixed += 1;
        if (apply) {
          await Order.updateOne({ _id: order._id }, { $set: { slot_released: false } });
        }
      }
    } else if (order.slot_released !== true) {
      releasedFlagsFixed += 1;
      if (apply) {
        await Order.updateOne({ _id: order._id }, { $set: { slot_released: true } });
      }
    }
  }

  const bookings = await PickupSlotBooking.find({}).lean();
  const current = {};
  for (const booking of bookings) {
    current[`${booking.date}|${booking.slot}`] = booking.booked_count || 0;
  }

  const keys = new Set([...Object.keys(current), ...Object.keys(expected)]);
  const changes = [];

  for (const key of keys) {
    const [date, slot] = key.split('|');
    const before = current[key] || 0;
    const after = expected[key] || 0;
    if (before === after) continue;

    changes.push({ date, slot, before, after });
    if (apply) {
      await PickupSlotBooking.updateOne(
        { date, slot },
        { $set: { booked_count: after } },
        { upsert: true }
      );
    }
  }

  return {
    applied: Boolean(apply),
    scannedOrders: orders.length,
    releasedFlagsFixed,
    changes
  };
};

module.exports = {
  getAvailablePickupSlots,
  reserveSlotAtomic,
  releaseSlotAtomic,
  releaseSlotForOrder,
  clearSlotIfEmpty,
  resetSlotBookings,
  validatePickupSlotLabel,
  reconcileSlotBookings
};
