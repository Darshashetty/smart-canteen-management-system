const mongoose = require('mongoose');
const { DEFAULT_SETTINGS } = require('../config/constants');

const canteenSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: 'default_canteen_config',
      unique: true
    },
    max_orders_per_slot: {
      type: Number,
      default: DEFAULT_SETTINGS.maxOrdersPerSlot
    },
    max_items_per_customer: {
      type: Number,
      default: DEFAULT_SETTINGS.maxItemsPerCustomer
    },
    max_scheduled_pickups_per_slot: {
      type: Number,
      default: DEFAULT_SETTINGS.maxScheduledPickupsPerSlot
    },
    slot_interval_minutes: {
      type: Number,
      default: DEFAULT_SETTINGS.slotIntervalMinutes
    },
    kitchen_capacity: {
      type: Number,
      default: DEFAULT_SETTINGS.kitchen_capacity
    },
    auto_delay_grace_minutes: {
      type: Number,
      default: DEFAULT_SETTINGS.auto_delay_grace_minutes
    },
    uncollected_timeout_minutes: {
      type: Number,
      default: DEFAULT_SETTINGS.uncollected_timeout_minutes
    },
    opening_time: {
      type: String,
      default: DEFAULT_SETTINGS.opening_time
    },
    closing_time: {
      type: String,
      default: DEFAULT_SETTINGS.closing_time
    },
    categories: {
      type: [String],
      default: ['Fast Food', 'Meals', 'Beverages', 'Snacks', 'Desserts']
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('CanteenSetting', canteenSettingSchema);
