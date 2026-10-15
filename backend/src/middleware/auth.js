const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { ACCOUNT_STATUS } = require('../config/constants');

const DEV_JWT_FALLBACK = 'smart_canteen_super_secret_jwt_key_2026';

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('[Config] JWT_SECRET must be set in production. Refusing to start with an insecure default.');
}

const JWT_SECRET = process.env.JWT_SECRET || DEV_JWT_FALLBACK;

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token required'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    let user;
    if (require('mongoose').connection.readyState === 1) {
      user = await User.findById(decoded.id);
    } else {
      user = require('../services/inMemoryStore').findUserById(decoded.id);
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists'
      });
    }

    if (user.account_status !== ACCOUNT_STATUS.ACTIVE) {
      return res.status(403).json({
        success: false,
        message: `Account is ${user.account_status}. Please contact canteen administrator.`
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication token',
      error: error.message
    });
  }
};

const optionalAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    let user;
    if (require('mongoose').connection.readyState === 1) {
      user = await User.findById(decoded.id);
    } else {
      user = require('../services/inMemoryStore').findUserById(decoded.id);
    }

    if (user && user.account_status === ACCOUNT_STATUS.ACTIVE) {
      req.user = user;
    }
    return next();
  } catch (error) {
    return next();
  }
};

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

module.exports = {
  authenticate,
  optionalAuthenticate,
  generateToken,
  JWT_SECRET
};
