const QRCode = require('qrcode');

/**
 * Base URL of the student frontend that opens when a phone camera scans an
 * order QR code (FRONTEND_URL override, else first CLIENT_ORIGIN, else local dev).
 */
const resolveFrontendBase = () => {
  const explicit = (process.env.FRONTEND_URL || '').trim().replace(/\/+$/, '');
  if (explicit) return explicit;
  const fromOrigins = (process.env.CLIENT_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin && origin !== '*');
  return fromOrigins[0] || 'http://localhost:3000';
};

/**
 * Generates a Base64 Data URL QR Code for order verification.
 * Encodes a human/tap-friendly link to the live order tracker so a phone
 * camera opens the order instead of showing raw JSON. The staff scanner
 * accepts this same URL (see collectionController.parseScannedPayload).
 */
const generateQRCodeDataURL = async (tokenNumber, orderId) => {
  try {
    const payload = `${resolveFrontendBase()}/live-order?order=${encodeURIComponent(orderId)}&token=${encodeURIComponent(tokenNumber)}`;

    const qrDataUrl = await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 250,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });

    return qrDataUrl;
  } catch (error) {
    console.error('Failed to generate QR Code:', error.message);
    return '';
  }
};

module.exports = {
  generateQRCodeDataURL
};
