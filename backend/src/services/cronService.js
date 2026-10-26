const mongoose = require('mongoose');
const Order = require('../models/Order');
const CanteenSetting = require('../models/CanteenSetting');
const { ORDER_STATUS, DEFAULT_SETTINGS } = require('../config/constants');
const { notifyOrderDelayed, notifyPickupApproaching } = require('./notificationService');
const { releaseSlotForOrder } = require('./slotService');

let cronTimer = null;

/**
 * Criterion A8: Background job running every minute
 * - Marks orders Delayed when past estimate plus grace
 * - Marks Ready orders Not Collected after timeout
 * - Sends "pickup approaching" notification once per order
 */
const runInMemoryBackgroundChecks = async () => {
  const InMemoryStore = require('./inMemoryStore');
  const now = new Date();
  const settings = InMemoryStore.getSettings();
  const { getSocketIOInstance } = require('./notificationService');
  const io = getSocketIOInstance();

  const gracePeriodMinutes = Number(settings.auto_delay_grace_minutes ?? 5);
  const uncollectedTimeoutMinutes = Number(settings.uncollected_timeout_minutes ?? 60);

  const graceThreshold = new Date(now.getTime() - gracePeriodMinutes * 60 * 1000);
  const overdueOrders = InMemoryStore.getOrders().filter(
    (order) =>
      [ORDER_STATUS.ACCEPTED, ORDER_STATUS.PREPARING].includes(order.order_status) &&
      !order.is_delayed &&
      order.estimated_ready_time &&
      new Date(order.estimated_ready_time) < graceThreshold
  );

  for (const order of overdueOrders) {
    const previousStatus = order.order_status;
    order.order_status = ORDER_STATUS.DELAYED;
    order.is_delayed = true;
    order.history.push({
      from: previousStatus,
      to: ORDER_STATUS.DELAYED,
      timestamp: new Date(),
      reason: 'Kitchen preparation exceeded estimate'
    });
    await notifyOrderDelayed(order, 'Kitchen preparation has exceeded initial estimate');
    if (io) {
      io.emit('queue_updated');
      io.emit('order_status_updated', order);
    }
  }

  const uncollectedThreshold = new Date(now.getTime() - uncollectedTimeoutMinutes * 60 * 1000);
  const staleReadyOrders = InMemoryStore.getOrders().filter(
    (order) =>
      order.order_status === ORDER_STATUS.READY &&
      order.actual_ready_time &&
      new Date(order.actual_ready_time) < uncollectedThreshold
  );

  for (const order of staleReadyOrders) {
    InMemoryStore.updateOrderStatus(order._id, ORDER_STATUS.NOT_COLLECTED);
    if (io) {
      io.emit('queue_updated');
      io.emit('order_status_updated', order);
      io.emit('pickup_slots_updated');
    }
  }

  const upcomingThreshold = new Date(now.getTime() + 10 * 60 * 1000);
  const approachingOrders = InMemoryStore.getOrders().filter((order) => {
    const pickupTime = new Date(order.pickup_time);
    return (
      pickupTime >= now &&
      pickupTime <= upcomingThreshold &&
      !order.pickup_approaching_notified &&
      ![
        ORDER_STATUS.CANCELLED,
        ORDER_STATUS.REJECTED,
        ORDER_STATUS.COLLECTED,
        ORDER_STATUS.COMPLETED,
        ORDER_STATUS.NOT_COLLECTED
      ].includes(order.order_status)
    );
  });

  for (const order of approachingOrders) {
    order.pickup_approaching_notified = true;
    const minutesLeft = Math.max(
      1,
      Math.round((new Date(order.pickup_time).getTime() - now.getTime()) / 60000)
    );
    await notifyPickupApproaching(order, minutesLeft);
  }
};

const runBackgroundChecks = async () => {
  // Run against the in-memory store used by tests/dev when MongoDB is absent.
  if (mongoose.connection.readyState !== 1) {
    try {
      await runInMemoryBackgroundChecks();
    } catch (error) {
      console.error('[Cron Error] Failure in in-memory background monitor:', error.message);
    }
    return;
  }

  try {
    const now = new Date();
    const settings = (await CanteenSetting.findOne()) || DEFAULT_SETTINGS;
    const { getSocketIOInstance } = require('./notificationService');
    const io = getSocketIOInstance();

    const gracePeriodMinutes = Number(settings.auto_delay_grace_minutes ?? settings.autoDelayGraceMinutes ?? 5);
    const uncollectedTimeoutMinutes = Number(
      settings.uncollected_timeout_minutes ?? settings.uncollectedTimeoutMinutes ?? 60
    );

    // 1. Mark orders Delayed when past estimated ready time plus grace
    const graceThreshold = new Date(now.getTime() - gracePeriodMinutes * 60 * 1000);
    const overdueOrders = await Order.find({
      order_status: { $in: [ORDER_STATUS.ACCEPTED, ORDER_STATUS.PREPARING] },
      is_delayed: { $ne: true },
      estimated_ready_time: { $lt: graceThreshold }
    });

    for (const order of overdueOrders) {
      order.order_status = ORDER_STATUS.DELAYED;
      order.is_delayed = true;
      await order.save();
      await notifyOrderDelayed(order, 'Kitchen preparation has exceeded initial estimate');
      if (io) {
        io.emit('queue_updated');
        io.emit('order_status_updated', order);
      }
      console.log(`[Cron] Marked order ${order.token_number} (${order.order_id}) as Delayed.`);
    }

    // 2. Mark Ready orders Not Collected after timeout
    const uncollectedThreshold = new Date(now.getTime() - uncollectedTimeoutMinutes * 60 * 1000);
    const staleReadyOrders = await Order.find({
      order_status: ORDER_STATUS.READY,
      actual_ready_time: { $lt: uncollectedThreshold }
    });

    for (const order of staleReadyOrders) {
      order.order_status = ORDER_STATUS.NOT_COLLECTED;
      await order.save();
      // Terminal status: free the pickup-slot capacity exactly once
      await releaseSlotForOrder(order);
      if (io) {
        io.emit('queue_updated');
        io.emit('order_status_updated', order);
        io.emit('pickup_slots_updated');
      }
      console.log(`[Cron] Marked order ${order.token_number} as Not Collected (exceeded ${uncollectedTimeoutMinutes} mins).`);
    }

    // 3. Send "pickup approaching" notification once per order (within next 10 mins)
    const upcomingThreshold = new Date(now.getTime() + 10 * 60 * 1000);
    const approachingOrders = await Order.find({
      pickup_time: { $gte: now, $lte: upcomingThreshold },
      pickup_approaching_notified: { $ne: true },
      order_status: { $nin: [ORDER_STATUS.CANCELLED, ORDER_STATUS.REJECTED, ORDER_STATUS.COLLECTED, ORDER_STATUS.COMPLETED] }
    });

    for (const order of approachingOrders) {
      order.pickup_approaching_notified = true;
      await order.save();

      const minutesLeft = Math.max(1, Math.round((new Date(order.pickup_time).getTime() - now.getTime()) / 60000));
      await notifyPickupApproaching(order, minutesLeft);
      console.log(`[Cron] Sent pickup approaching notification for token ${order.token_number}.`);
    }
  } catch (error) {
    console.error('[Cron Error] Failure in background order monitor:', error.message);
  }
};

const startBackgroundMonitor = (intervalMs = 60000) => {
  if (cronTimer) clearInterval(cronTimer);
  cronTimer = setInterval(runBackgroundChecks, intervalMs);
  console.log(`[Cron] Background order monitor started (every ${intervalMs / 1000}s).`);
  // Run once immediately on start
  runBackgroundChecks().catch(() => {});
};

const stopBackgroundMonitor = () => {
  if (cronTimer) {
    clearInterval(cronTimer);
    cronTimer = null;
  }
};

module.exports = {
  startBackgroundMonitor,
  stopBackgroundMonitor,
  runBackgroundChecks
};
