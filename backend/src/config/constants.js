/**
 * Smart Canteen Pre-Order & Queue Management System
 * System Constants according to Hackathon Specifications
 */

const ROLES = {
  CUSTOMER: 'customer',
  STAFF: 'staff',
  MANAGER: 'manager',
  ADMIN: 'admin'
};

const ACCOUNT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended'
};

const MENU_ITEM_STATUS = {
  AVAILABLE: 'Available',
  LIMITED: 'Limited',
  SOLD_OUT: 'Sold Out',
  TEMPORARILY_UNAVAILABLE: 'Temporarily Unavailable'
};

const ORDER_STATUS = {
  PLACED: 'Placed',
  ACCEPTED: 'Accepted',
  PREPARING: 'Preparing',
  READY: 'Ready',
  COLLECTED: 'Collected',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  REJECTED: 'Rejected',
  DELAYED: 'Delayed',
  NOT_COLLECTED: 'Not Collected'
};

const PAYMENT_STATUS = {
  PENDING: 'Pending',
  PAID: 'Paid',
  FAILED: 'Failed',
  REFUNDED: 'Refunded'
};

const PAYMENT_METHODS = {
  SMART_CARD: 'smart_card',
  CASH_ON_COUNTER: 'cash_on_counter',
  ONLINE: 'online'
};

// Online payment methods settled instantly as Paid when the order is placed
// (no external payment gateway).
const ONLINE_PAYMENT_METHODS = ['card', 'online'];

// Starting balance credited to every smart card account (in rupees).
const SMART_CARD_DEFAULT_BALANCE = 1000;

const NOTIFICATION_TYPES = {
  ORDER_ACCEPTED: 'ORDER_ACCEPTED',
  ORDER_PREPARING: 'ORDER_PREPARING',
  ORDER_DELAYED: 'ORDER_DELAYED',
  ORDER_READY: 'ORDER_READY',
  PICKUP_APPROACHING: 'PICKUP_APPROACHING',
  ORDER_CANCELLED: 'ORDER_CANCELLED',
  PICKUP_TIME_CHANGED: 'PICKUP_TIME_CHANGED',
  SYSTEM_ALERT: 'SYSTEM_ALERT'
};

const DEFAULT_SETTINGS = {
  // snake_case keys are the canonical persistence/API names
  max_orders_per_slot: 20,           // Maximum orders per 15-minute period
  max_items_per_customer: 10,        // Maximum items per single customer order
  max_scheduled_pickups_per_slot: 15, // Maximum number of scheduled pickups per slot
  slot_interval_minutes: 15,         // 15-minute slot intervals
  kitchen_capacity: 15,              // Average active orders kitchen can handle at once
  auto_delay_grace_minutes: 5,       // Grace past ETA before an order is flagged Delayed
  uncollected_timeout_minutes: 60,   // Mark as Not Collected after 60 mins from Ready
  opening_time: '00:00',
  closing_time: '23:59',

  // camelCase aliases kept for older callers/seed data
  maxOrdersPerSlot: 20,
  maxItemsPerCustomer: 10,
  maxScheduledPickupsPerSlot: 15,
  slotIntervalMinutes: 15,
  kitchenCapacity: 15,
  autoDelayGraceMinutes: 5,
  uncollectedTimeoutMinutes: 60,
  openingTime: '00:00',
  closingTime: '23:59'
};

// Criterion A3: Strict status state machine transition map
const STATUS_TRANSITIONS = {
  [ORDER_STATUS.PLACED]: [ORDER_STATUS.ACCEPTED, ORDER_STATUS.REJECTED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.ACCEPTED]: [ORDER_STATUS.PREPARING, ORDER_STATUS.CANCELLED, ORDER_STATUS.DELAYED],
  [ORDER_STATUS.PREPARING]: [ORDER_STATUS.READY, ORDER_STATUS.DELAYED],
  [ORDER_STATUS.DELAYED]: [ORDER_STATUS.PREPARING, ORDER_STATUS.READY],
  [ORDER_STATUS.READY]: [ORDER_STATUS.COLLECTED, ORDER_STATUS.NOT_COLLECTED],
  [ORDER_STATUS.COLLECTED]: [ORDER_STATUS.COMPLETED]
};

module.exports = {
  ROLES,
  ACCOUNT_STATUS,
  MENU_ITEM_STATUS,
  ORDER_STATUS,
  PAYMENT_STATUS,
  PAYMENT_METHODS,
  ONLINE_PAYMENT_METHODS,
  SMART_CARD_DEFAULT_BALANCE,
  NOTIFICATION_TYPES,
  DEFAULT_SETTINGS,
  STATUS_TRANSITIONS
};
