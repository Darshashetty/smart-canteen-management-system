/**
 * Environment configuration validation.
 *
 * Fails fast at startup when running in production without required secrets,
 * and warns loudly in development so insecure defaults are never shipped silently.
 */

const REQUIRED_IN_PRODUCTION = ['JWT_SECRET', 'MONGO_URI'];

const validateEnv = () => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const missing = [];

  if (nodeEnv === 'production') {
    for (const key of REQUIRED_IN_PRODUCTION) {
      if (!process.env[key]) missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `[Config] Missing required environment variable(s) in production: ${missing.join(', ')}. ` +
        'Set them before starting the server.'
    );
  }

  if (nodeEnv !== 'test' && !process.env.JWT_SECRET) {
    console.warn(
      '[Config] JWT_SECRET is not set. Using an insecure development fallback secret. ' +
        'Set JWT_SECRET before deploying to production.'
    );
  }

  return { nodeEnv };
};

module.exports = { validateEnv };
