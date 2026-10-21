const mongoose = require('mongoose');
const User = require('../models/User');
const SystemLog = require('../models/SystemLog');
const asyncHandler = require('../utils/asyncHandler');
const { generateToken } = require('../middleware/auth');
const { ROLES, ACCOUNT_STATUS } = require('../config/constants');
const InMemoryStore = require('../services/inMemoryStore');

/**
 * Register a new user (Criteria A5 & A6)
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;

  if (mongoose.connection.readyState !== 1) {
    const existing = InMemoryStore.findUserByEmail(email);
    if (existing) {
      return res.status(409).json({
        message: 'A user with this email address already exists.',
        details: { email }
      });
    }
    const user = await InMemoryStore.createUser({ name, email, password, phone, role: ROLES.CUSTOMER });
    const token = generateToken(user);
    InMemoryStore.addLog({
      userId: user._id,
      userName: user.name,
      role: user.role,
      action: 'USER_REGISTERED',
      details: { email: user.email, role: user.role }
    });

    return res.status(201).json({
      message: 'Account successfully registered',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        account_status: user.account_status,
        phone: user.phone
      }
    });
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return res.status(409).json({
      message: 'A user with this email address already exists.',
      details: { email }
    });
  }

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    role: ROLES.CUSTOMER,
    phone: phone || '',
    account_status: ACCOUNT_STATUS.ACTIVE
  });

  const token = generateToken(user);

  await SystemLog.create({
    user_id: user._id,
    user_name: user.name,
    role: user.role,
    action: 'USER_REGISTERED',
    details: { email: user.email, role: user.role }
  });

  return res.status(201).json({
    message: 'Account successfully registered',
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      account_status: user.account_status,
      phone: user.phone
    }
  });
});

/**
 * Login user (Criterion A6)
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (mongoose.connection.readyState !== 1) {
    const user = InMemoryStore.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({
        message: 'Invalid email or password',
        details: null
      });
    }

    const isMatch = await InMemoryStore.comparePassword(password, user);
    if (!isMatch) {
      return res.status(401).json({
        message: 'Invalid email or password',
        details: null
      });
    }

    const token = generateToken(user);
    InMemoryStore.addLog({
      userId: user._id,
      userName: user.name,
      role: user.role,
      action: 'USER_LOGIN',
      details: { ip: req.ip }
    });

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        account_status: user.account_status,
        phone: user.phone,
        smart_card_balance: user.smart_card_balance
      }
    });
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return res.status(401).json({
      message: 'Invalid email or password',
      details: null
    });
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({
      message: 'Invalid email or password',
      details: null
    });
  }

  if (user.account_status !== ACCOUNT_STATUS.ACTIVE) {
    return res.status(403).json({
      message: `Account is ${user.account_status}. Please contact canteen administrator.`,
      details: { status: user.account_status }
    });
  }

  const token = generateToken(user);

  await SystemLog.create({
    user_id: user._id,
    user_name: user.name,
    role: user.role,
    action: 'USER_LOGIN',
    details: { ip: req.ip }
  });

  return res.json({
    message: 'Login successful',
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      account_status: user.account_status,
      phone: user.phone,
      smart_card_balance: user.smart_card_balance
    }
  });
});

/**
 * Get currently authenticated user profile
 */
const getMe = asyncHandler(async (req, res) => {
  const raw = req.user && typeof req.user.toObject === 'function' ? req.user.toObject() : req.user;
  const { passwordHash, password, ...user } = raw || {};
  return res.json({
    message: 'User profile retrieved',
    user
  });
});

const getPreferences = asyncHandler(async (req, res) => {
  const defaultPrefs = {
    vegetarianOnly: false,
    veganOnly: false,
    glutenFree: false,
    nutAllergyWarning: false,
    preferredPickupSlot: "13:00-13:15",
    maxDailyBudget: 500,
    notifyOnReady: true,
    notifyOnDelay: true
  };
  return res.json({ data: { ...defaultPrefs, ...(req.user.preferences || {}) } });
});

/**
 * Top up the signed-in customer's campus smart-card balance.
 * Demo payment flow: no external gateway, money is credited instantly.
 */
const topUpSmartCard = asyncHandler(async (req, res) => {
  const amount = Number(req.body.amount);

  if (req.user.role !== ROLES.CUSTOMER) {
    return res.status(403).json({
      message: 'Only customer accounts have a campus smart card.',
      details: null
    });
  }

  const { creditSmartCardBalance, getSmartCardBalance } = require('../services/smartCardService');
  const updated = await creditSmartCardBalance(req.user._id, amount);

  if (!updated) {
    return res.status(500).json({
      message: 'Could not credit the smart card. Please try again.',
      details: null
    });
  }

  const balance = getSmartCardBalance(updated);

  InMemoryStore.addLog({
    userId: req.user._id,
    userName: req.user.name,
    role: req.user.role,
    action: 'SMART_CARD_TOPUP',
    details: { amount, balance }
  });

  if (mongoose.connection.readyState === 1) {
    await SystemLog.create({
      user_id: req.user._id,
      user_name: req.user.name,
      role: req.user.role,
      action: 'SMART_CARD_TOPUP',
      details: { amount, balance }
    });
  }

  return res.json({
    message: `Rs. ${amount.toFixed(2)} added to your smart card.`,
    data: { smart_card_balance: balance, amount }
  });
});

const updatePreferences = asyncHandler(async (req, res) => {
  const allowedFields = [
    'vegetarianOnly',
    'veganOnly',
    'glutenFree',
    'nutAllergyWarning',
    'preferredPickupSlot',
    'maxDailyBudget',
    'notifyOnReady',
    'notifyOnDelay'
  ];

  if (!req.user.preferences) {
    req.user.preferences = {
      vegetarianOnly: false,
      veganOnly: false,
      glutenFree: false,
      nutAllergyWarning: false,
      preferredPickupSlot: "13:00-13:15",
      maxDailyBudget: 500,
      notifyOnReady: true,
      notifyOnDelay: true
    };
  }

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      req.user.preferences[field] = req.body[field];
    }
  }

  if (typeof req.user.save === 'function') {
    await req.user.save();
  } else {
    const InMemoryStore = require('../services/inMemoryStore');
    const memUser = InMemoryStore.findUserById(req.user._id);
    if (memUser) {
      memUser.preferences = req.user.preferences;
    }
  }

  return res.json({ data: req.user.preferences });
});

module.exports = {
  register,
  login,
  getMe,
  getPreferences,
  updatePreferences,
  topUpSmartCard
};
