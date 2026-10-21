const mongoose = require('mongoose');
const User = require('../models/User');
const { SMART_CARD_DEFAULT_BALANCE } = require('../config/constants');

const dbConnected = () => mongoose.connection.readyState === 1;

const InMemoryStore = () => require('./inMemoryStore');

/**
 * Reads a user's effective smart-card balance.
 *
 * Legacy accounts created before the smart-card field existed have no value
 * stored. Rather than blocking them at checkout we treat a missing balance as
 * the standard starting balance (without mutating the record).
 */
const getSmartCardBalance = (user) => {
  if (!user) return 0;
  const value = user.smart_card_balance;
  return Number.isFinite(Number(value)) ? Number(value) : SMART_CARD_DEFAULT_BALANCE;
};

/**
 * Atomically deducts `amount` from a customer's smart-card balance in MongoDB.
 *
 * The conditional filter guarantees the balance can never go negative even if
 * two orders race for the same funds: only one update can match when the
 * remaining balance covers the amount. A missing balance is treated as the
 * default starting balance via $ifNull.
 *
 * @returns {Promise<{success: boolean, balance: number, reason?: string}>}
 */
const deductSmartCardBalance = async (userId, amount) => {
  const value = Number(amount);
  if (!Number.isFinite(value) || value < 0) {
    return { success: false, balance: 0, reason: 'invalid_amount' };
  }

  if (!dbConnected()) {
    const user = InMemoryStore().findUserById(userId);
    if (!user) return { success: false, balance: 0, reason: 'user_not_found' };
    const balance = getSmartCardBalance(user);
    if (balance < value) {
      return { success: false, balance, reason: 'insufficient_balance' };
    }
    user.smart_card_balance = balance - value;
    return { success: true, balance: user.smart_card_balance };
  }

  const updated = await User.findOneAndUpdate(
    {
      _id: userId,
      $expr: {
        $gte: [{ $ifNull: ['$smart_card_balance', SMART_CARD_DEFAULT_BALANCE] }, value]
      }
    },
    [
      {
        $set: {
          smart_card_balance: {
            $subtract: [{ $ifNull: ['$smart_card_balance', SMART_CARD_DEFAULT_BALANCE] }, value]
          }
        }
      }
    ],
    { returnDocument: 'after', updatePipeline: true }
  ).lean();

  if (!updated) {
    const user = await User.findById(userId).select('smart_card_balance').lean();
    return {
      success: false,
      balance: getSmartCardBalance(user),
      reason: 'insufficient_balance'
    };
  }

  return { success: true, balance: getSmartCardBalance(updated) };
};

/**
 * Credits (refunds) `amount` back onto a customer's smart-card balance.
 * Uses $inc so concurrent credits/refunds cannot clobber each other.
 */
const creditSmartCardBalance = async (userId, amount) => {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return null;

  if (!dbConnected()) {
    const user = InMemoryStore().findUserById(userId);
    if (!user) return null;
    user.smart_card_balance = getSmartCardBalance(user) + value;
    return { ...user };
  }

  return User.findByIdAndUpdate(
    userId,
    { $inc: { smart_card_balance: value } },
    { returnDocument: 'after' }
  ).lean();
};

module.exports = {
  getSmartCardBalance,
  deductSmartCardBalance,
  creditSmartCardBalance
};
