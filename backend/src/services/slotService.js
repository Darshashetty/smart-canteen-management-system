const mongoose = require('mongoose');
const Order = require('../models/Order');
const CanteenSetting = require('../models/CanteenSetting');
const PickupSlotBooking = require('../models/PickupSlotBooking');
const { DEFAULT_SETTINGS, ORDER_STATUS } = require('../config/constants');

const formatTimeHHMM = (date) => {
  const d = new Date(date);
  return d.toTimeString().substring(0, 5);
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

  const slotInterval = settings.slot_interval_minutes || 15;
  const maxPerSlot = settings.max_orders_per_slot || 20;

  const [openHour, openMin] = (settings.opening_time || settings.openingTime || '12:00').split(':').map(Number);
  const [closeHour, closeMin] = (settings.closing_time || settings.closingTime || '21:00').split(':').map(Number);

  const slotStartTime = new Date(now);
  slotStartTime.setHours(openHour, openMin, 0, 0);

  const slotEndTime = new Date(now);
  slotEndTime.setHours(closeHour, closeMin, 0, 0);

  const slots = [];
  let currentCursor = new Date(slotStartTime);

  while (currentCursor < slotEndTime) {
    const slotStartStr = formatTimeHHMM(currentCursor);
    const nextCursor = new Date(currentCursor.getTime() + slotInterval * 60 * 1000);
    const slotEndStr = formatTimeHHMM(nextCursor);
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
  if (mongoose.connection.readyState !== 1) {
    return { success: false, status: 503, message: 'Pickup slot management requires an active database connection.' };
  }

  const dateStr = new Date(targetDate).toISOString().slice(0, 10);
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

  const booking = await PickupSlotBooking.findOneAndUpdate(
    { date: dateStr, slot: pickupSlot },
    { $set: { booked_count: 0 } },
    { new: true }
  );

  return {
    success: true,
    date: dateStr,
    slot: pickupSlot,
    booked: booking ? booking.booked_count : 0
  };
};

module.exports = {
  getAvailablePickupSlots,
  reserveSlotAtomic,
  releaseSlotAtomic,
  releaseSlotForOrder,
  clearSlotIfEmpty
};
