const Order = require('../models/Order');
const SystemLog = require('../models/SystemLog');
const asyncHandler = require('../utils/asyncHandler');
const { ORDER_STATUS } = require('../config/constants');
const { releaseSlotForOrder } = require('../services/slotService');

const NOT_FOUND_MESSAGE =
  'No order found for the provided token, order ID, or QR code. Check the value and try again.';
const ALREADY_COLLECTED_MESSAGE = 'Order has already been collected.';

const isCollectedStatus = (status) =>
  status === ORDER_STATUS.COLLECTED || status === ORDER_STATUS.COMPLETED;

/**
 * Resolves the intended order from any scanner identifier.
 *
 * Root cause this solves: tokens are only unique *per day* (they reset daily
 * via the DailyCounter), so the same token_number can exist on many dates.
 * A naive findOne({ token_number }) returns an arbitrary (often the oldest)
 * document, so staff scanning today's C-001 could be shown yesterday's
 * Cancelled/Collected order. We therefore:
 *   1. Prefer the globally-unique order_id (QR payloads embed one).
 *   2. Fall back to the token and pick the MOST RECENT order with that token,
 *      so a stale terminal order can never shadow the live one.
 */
const resolveDbOrder = async ({ token_number, order_id, qr_payload }) => {
  let lookupOrderId = order_id;
  let lookupToken = token_number;

  if (qr_payload) {
    const parsed = JSON.parse(qr_payload);
    if (parsed.order_id) lookupOrderId = parsed.order_id;
    if (parsed.token) lookupToken = parsed.token;
  }

  if (lookupOrderId) {
    const id = String(lookupOrderId).trim();
    if (/^ORD-/i.test(id)) return Order.findOne({ order_id: id });
    if (require('mongoose').Types.ObjectId.isValid(id)) return Order.findById(id);
    return Order.findOne({ order_id: id });
  }

  if (lookupToken) {
    return Order.findOne({
      token_number: String(lookupToken).trim().toUpperCase()
    }).sort({ order_time: -1 });
  }

  return null;
};

/**
 * In-memory equivalent of resolveDbOrder (same precedence + newest-token rule).
 */
const resolveInMemoryOrder = ({ token_number, order_id, qr_payload }) => {
  const InMemoryStore = require('../services/inMemoryStore');
  let lookupOrderId = order_id;
  let lookupToken = token_number;

  if (qr_payload) {
    const parsed = JSON.parse(qr_payload);
    if (parsed.order_id) lookupOrderId = parsed.order_id;
    if (parsed.token) lookupToken = parsed.token;
  }

  if (lookupOrderId) return InMemoryStore.getOrderById(lookupOrderId);
  if (lookupToken) return InMemoryStore.getOrderByToken(lookupToken);
  return null;
};

/**
 * Verify token, QR code, or order number before collection (Criterion A4)
 * Returns 409 if already collected
 */
const verifyToken = asyncHandler(async (req, res) => {
  const { token_number, order_id, qr_payload } = req.body;

  let order = null;
  try {
    if (require('mongoose').connection.readyState !== 1) {
      order = resolveInMemoryOrder({ token_number, order_id, qr_payload });
    } else {
      order = await resolveDbOrder({ token_number, order_id, qr_payload });
    }
  } catch {
    return res.status(400).json({
      message: 'Invalid QR payload format',
      details: null
    });
  }

  if (!order) {
    return res.status(404).json({
      message: NOT_FOUND_MESSAGE,
      details: { token_number, order_id }
    });
  }

  // Criterion A4: Second attempt returns 409 "already collected"
  if (isCollectedStatus(order.order_status)) {
    return res.status(409).json({
      message: ALREADY_COLLECTED_MESSAGE,
      details: {
        tokenNumber: order.token_number,
        orderId: order.order_id,
        collectedTime: order.collected_time || order.updatedAt,
        status: order.order_status
      }
    });
  }

  const isReady = order.order_status === ORDER_STATUS.READY;
  return res.json({
    message: isReady
      ? `Token ${order.token_number} verified and ready for collection.`
      : `Order is currently in '${order.order_status}' status. Not ready for collection yet.`,
    can_collect: isReady,
    data: order
  });
});

/**
 * Confirm single-use collection (Criterion A4)
 * Moves the order Ready -> Collected -> Completed once.
 * A second attempt returns 409 "already collected".
 */
const confirmCollection = asyncHandler(async (req, res) => {
  const { order_id, token_number } = req.body;

  if (require('mongoose').connection.readyState !== 1) {
    const InMemoryStore = require('../services/inMemoryStore');
    let order = resolveInMemoryOrder({ token_number, order_id });
    if (!order && req.params.id) order = InMemoryStore.getOrderById(req.params.id);

    if (!order) {
      return res.status(404).json({
        message: 'Order not found',
        details: { token_number, order_id }
      });
    }

    if (order.order_status === ORDER_STATUS.COLLECTED || order.order_status === ORDER_STATUS.COMPLETED) {
      return res.status(409).json({
        message: ALREADY_COLLECTED_MESSAGE,
        details: {
          tokenNumber: order.token_number,
          collectedTime: order.collected_time
        }
      });
    }

    if (order.order_status !== ORDER_STATUS.READY) {
      return res.status(409).json({
        message: `Invalid status transition: Order cannot be collected in '${order.order_status}' status. It must be marked 'Ready' first.`,
        details: { currentStatus: order.order_status }
      });
    }

    const updatedOrder = InMemoryStore.updateOrderStatus(order._id, ORDER_STATUS.COMPLETED);
    const { getSocketIOInstance } = require('../services/notificationService');
    const io = getSocketIOInstance();
    if (io) {
      io.emit('queue_updated');
      io.emit('order_status_updated', updatedOrder);
      // Completing a collection frees the order's reserved slot capacity
      io.emit('pickup_slots_updated');
    }

    InMemoryStore.addLog({
      userId: req.user._id,
      userName: req.user.name,
      role: req.user.role,
      action: 'ORDER_COLLECTION_COMPLETED',
      details: { token: updatedOrder.token_number, order_id: updatedOrder.order_id }
    });

    return res.json({
      message: `Token ${updatedOrder.token_number} collection confirmed. Order is Completed.`,
      data: updatedOrder
    });
  }

  let order = await resolveDbOrder({ token_number, order_id });
  if (!order && req.params.id) order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({
      message: 'Order not found',
      details: query
    });
  }

  // Criterion A4: Second collection attempt returns 409 "already collected"
  if (order.order_status === ORDER_STATUS.COLLECTED || order.order_status === ORDER_STATUS.COMPLETED) {
    return res.status(409).json({
      message: ALREADY_COLLECTED_MESSAGE,
      details: {
        tokenNumber: order.token_number,
        collectedTime: order.collected_time
      }
    });
  }

  // Must be in Ready status before collection
  if (order.order_status !== ORDER_STATUS.READY) {
    return res.status(409).json({
      message: `Invalid status transition: Order cannot be collected in '${order.order_status}' status. It must be marked 'Ready' first.`,
      details: { currentStatus: order.order_status }
    });
  }

  const now = new Date();

  // Atomic conditional update on status === READY prevents any parallel double collection
  const updatedOrder = await Order.findOneAndUpdate(
    { _id: order._id, order_status: ORDER_STATUS.READY },
    {
      $set: {
        order_status: ORDER_STATUS.COMPLETED,
        collected_time: now
      }
    },
    { new: true }
  );

  if (!updatedOrder) {
    return res.status(409).json({
      message: ALREADY_COLLECTED_MESSAGE,
      details: { tokenNumber: order.token_number }
    });
  }

  await SystemLog.create({
    user_id: req.user._id,
    user_name: req.user.name,
    role: req.user.role,
    action: 'ORDER_COLLECTION_COMPLETED',
    order_id: updatedOrder.order_id,
    token_number: updatedOrder.token_number,
    details: { collectedAt: now }
  });

  // Release reserved pickup-slot capacity exactly once for this order
  const released = await releaseSlotForOrder(updatedOrder);

  // Real-time sync for student app, staff queues and slot availability
  const { getSocketIOInstance } = require('../services/notificationService');
  const io = getSocketIOInstance();
  if (io) {
    io.emit('queue_updated');
    io.emit('order_status_updated', updatedOrder);
    if (released) io.emit('pickup_slots_updated');
  }

  return res.json({
    message: `Token ${updatedOrder.token_number} collection confirmed. Order is Completed.`,
    data: updatedOrder
  });
});

/**
 * Mark order as Not Collected
 */
const markNotCollected = asyncHandler(async (req, res) => {
  const orderId = req.params.id;

  if (require('mongoose').connection.readyState !== 1) {
    const InMemoryStore = require('../services/inMemoryStore');
    const order = InMemoryStore.getOrderById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found', details: { orderId } });
    }
    if (order.order_status !== ORDER_STATUS.READY) {
      return res.status(409).json({
        message: `Invalid transition: Only 'Ready' orders can be marked as 'Not Collected'. Current status is '${order.order_status}'.`,
        details: { currentStatus: order.order_status }
      });
    }
    const updatedOrder = InMemoryStore.updateOrderStatus(order._id, ORDER_STATUS.NOT_COLLECTED);
    InMemoryStore.addLog({
      userId: req.user._id,
      userName: req.user.name,
      role: req.user.role,
      action: 'ORDER_MARKED_NOT_COLLECTED',
      details: { order_id: updatedOrder.order_id, token: updatedOrder.token_number }
    });
    const { getSocketIOInstance } = require('../services/notificationService');
    const io = getSocketIOInstance();
    if (io) {
      io.emit('queue_updated');
      io.emit('order_status_updated', updatedOrder);
      io.emit('pickup_slots_updated');
    }
    return res.json({
      message: `Order ${updatedOrder.token_number} marked as Not Collected`,
      data: updatedOrder
    });
  }

  const order = await resolveDbOrder({ order_id: orderId });

  if (!order) {
    return res.status(404).json({
      message: 'Order not found',
      details: { orderId }
    });
  }

  if (order.order_status !== ORDER_STATUS.READY) {
    return res.status(409).json({
      message: `Invalid transition: Only 'Ready' orders can be marked as 'Not Collected'. Current status is '${order.order_status}'.`,
      details: { currentStatus: order.order_status }
    });
  }

  const updatedOrder = await Order.findOneAndUpdate(
    { _id: order._id, order_status: ORDER_STATUS.READY },
    { $set: { order_status: ORDER_STATUS.NOT_COLLECTED } },
    { new: true }
  );

  if (!updatedOrder) {
    return res.status(409).json({
      message: 'Concurrent update detected. Could not mark order as Not Collected.',
      details: null
    });
  }

  await SystemLog.create({
    user_id: req.user._id,
    user_name: req.user.name,
    role: req.user.role,
    action: 'ORDER_MARKED_NOT_COLLECTED',
    order_id: updatedOrder.order_id,
    token_number: updatedOrder.token_number,
    details: { reason: req.body.reason || 'Unclaimed after collection window' }
  });

  // Uncollected food frees the reserved pickup-slot capacity (released at most once)
  const released = await releaseSlotForOrder(updatedOrder);

  const { getSocketIOInstance } = require('../services/notificationService');
  const io = getSocketIOInstance();
  if (io) {
    io.emit('queue_updated');
    io.emit('order_status_updated', updatedOrder);
    if (released) io.emit('pickup_slots_updated');
  }

  return res.json({
    message: `Order ${updatedOrder.token_number} marked as Not Collected`,
    data: updatedOrder
  });
});

module.exports = {
  verifyToken,
  confirmCollection,
  markNotCollected
};
