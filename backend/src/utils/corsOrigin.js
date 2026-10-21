/**
 * Central CORS origin policy shared by the Express app and the Socket.io server.
 *
 * Supports:
 *   - `CLIENT_ORIGIN=*`                 -> allow every origin (dev convenience)
 *   - comma-separated exact origins     -> https://app.example.com,http://localhost:3000
 *   - wildcard subdomains               -> https://*.devtunnels.ms, https://*.vercel.app
 *
 * Always allows requests with no origin (server-to-server, curl, same-origin).
 */

const defaultAllowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://smartcanteern.vercel.app'
];

const configuredOrigins = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowAll = configuredOrigins.includes('*');

const allowedOrigins = [...new Set([...configuredOrigins, ...defaultAllowedOrigins])].filter(
  (origin) => origin !== '*'
);

const wildcardPatterns = allowedOrigins
  .filter((origin) => origin.includes('*'))
  .map((origin) => {
    const escaped = origin.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    return new RegExp(`^${escaped}$`, 'i');
  });

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  if (allowAll) return true;
  if (allowedOrigins.includes(origin)) return true;
  return wildcardPatterns.some((pattern) => pattern.test(origin));
};

module.exports = {
  isOriginAllowed,
  defaultAllowedOrigins,
  configuredOrigins,
  allowedOrigins
};
