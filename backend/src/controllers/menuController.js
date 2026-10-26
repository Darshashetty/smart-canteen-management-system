const mongoose = require('mongoose');
const MenuItem = require('../models/MenuItem');
const SystemLog = require('../models/SystemLog');
const asyncHandler = require('../utils/asyncHandler');
const { MENU_ITEM_STATUS } = require('../config/constants');

// Seed items fallback if MongoDB is in offline mode — served from the unified
// in-memory store so stock decrements and the full 76-item menu stay in sync.
const getFallbackMenuItems = () => {
  const InMemoryStore = require('../services/inMemoryStore');
  return InMemoryStore.getMenuItems();
};

/**
 * Get all menu items with search and filters (A10: asyncHandler)
 */
const getMenuItems = asyncHandler(async (req, res) => {
  const { category, search, minPrice, maxPrice, availability, maxPrepTime, sortBy } = req.query;

  if (mongoose.connection.readyState !== 1) {
    let items = [...getFallbackMenuItems()];
    if (category && category !== 'All') {
      items = items.filter((i) => i.category.toLowerCase() === category.toLowerCase());
    }
    if (search) {
      items = items.filter((i) => i.item_name.toLowerCase().includes(search.toLowerCase()));
    }
    return res.json({
      message: 'Menu items retrieved',
      count: items.length,
      data: items
    });
  }

  const query = {};

  if (category && category !== 'All') {
    query.category = new RegExp(category, 'i');
  }

  if (search) {
    query.item_name = new RegExp(search, 'i');
  }

  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }

  if (availability) {
    query.status = availability;
  }

  if (maxPrepTime) {
    query.preparation_time = { $lte: Number(maxPrepTime) };
  }

  let sortOptions = { createdAt: -1 };
  if (sortBy === 'popular') {
    sortOptions = { total_orders_count: -1 };
  } else if (sortBy === 'price_asc') {
    sortOptions = { price: 1 };
  } else if (sortBy === 'price_desc') {
    sortOptions = { price: -1 };
  } else if (sortBy === 'prep_time') {
    sortOptions = { preparation_time: 1 };
  }

  const items = await MenuItem.find(query).sort(sortOptions);

  return res.json({
    message: 'Menu items retrieved',
    count: items.length,
    data: items
  });
});

/**
 * Get single menu item by ID
 */
const getMenuItemById = asyncHandler(async (req, res) => {
  const item = await MenuItem.findById(req.params.id);
  if (!item) {
    return res.status(404).json({
      message: 'Menu item not found',
      details: { id: req.params.id }
    });
  }

  return res.json({
    message: 'Menu item retrieved',
    data: item
  });
});

/**
 * Create a new menu item (Manager / Admin)
 */
const createMenuItem = asyncHandler(async (req, res) => {
  const { item_name, category, price, available_quantity, preparation_time, status, image } = req.body;

  const item = await MenuItem.create({
    item_name,
    category,
    price: Number(price),
    available_quantity: Number(available_quantity || 0),
    preparation_time: Number(preparation_time || 5),
    status: status || MENU_ITEM_STATUS.AVAILABLE,
    image: image || ''
  });

  await SystemLog.create({
    user_id: req.user._id,
    user_name: req.user.name,
    role: req.user.role,
    action: 'MENU_ITEM_CREATED',
    details: { itemId: item.item_id, name: item.item_name, price: item.price }
  });

  return res.status(201).json({
    message: 'Menu item created successfully',
    data: item
  });
});

/**
 * Update menu item details (Manager / Admin)
 */
const updateMenuItem = asyncHandler(async (req, res) => {
  const { item_name, category, price, available_quantity, preparation_time, status, image } = req.body;

  const item = await MenuItem.findById(req.params.id);
  if (!item) {
    return res.status(404).json({
      message: 'Menu item not found',
      details: { id: req.params.id }
    });
  }

  if (item_name !== undefined) item.item_name = item_name;
  if (category !== undefined) item.category = category;
  if (price !== undefined) item.price = Number(price);
  if (available_quantity !== undefined) item.available_quantity = Number(available_quantity);
  if (preparation_time !== undefined) item.preparation_time = Number(preparation_time);
  if (status !== undefined) item.status = status;
  if (image !== undefined) item.image = image;

  await item.save();

  await SystemLog.create({
    user_id: req.user._id,
    user_name: req.user.name,
    role: req.user.role,
    action: 'MENU_ITEM_UPDATED',
    details: { itemId: item.item_id, name: item.item_name }
  });

  return res.json({
    message: 'Menu item updated successfully',
    data: item
  });
});

/**
 * Update stock and availability in real-time (Staff / Manager / Admin)
 */
const updateStockAndAvailability = asyncHandler(async (req, res) => {
  const { available_quantity, status } = req.body;

  const item = await MenuItem.findById(req.params.id);
  if (!item) {
    return res.status(404).json({
      message: 'Menu item not found',
      details: { id: req.params.id }
    });
  }

  if (available_quantity !== undefined) {
    item.available_quantity = Math.max(0, Number(available_quantity));
  }

  if (status !== undefined) {
    item.status = status;
  }

  await item.save();

  await SystemLog.create({
    user_id: req.user._id,
    user_name: req.user.name,
    role: req.user.role,
    action: 'STOCK_AVAILABILITY_UPDATED',
    details: { itemId: item.item_id, quantity: item.available_quantity, status: item.status }
  });

  return res.json({
    message: 'Stock and availability status updated',
    data: item
  });
});

/**
 * Delete menu item (Manager / Admin)
 */
const deleteMenuItem = asyncHandler(async (req, res) => {
  const item = await MenuItem.findByIdAndDelete(req.params.id);
  if (!item) {
    return res.status(404).json({
      message: 'Menu item not found',
      details: { id: req.params.id }
    });
  }

  await SystemLog.create({
    user_id: req.user._id,
    user_name: req.user.name,
    role: req.user.role,
    action: 'MENU_ITEM_DELETED',
    details: { itemId: item.item_id, name: item.item_name }
  });

  return res.json({
    message: 'Menu item removed successfully'
  });
});

module.exports = {
  getMenuItems,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  updateStockAndAvailability,
  deleteMenuItem
};
