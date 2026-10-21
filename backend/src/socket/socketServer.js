const { Server } = require('socket.io');
const { setSocketIOInstance } = require('../services/notificationService');

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://smartcanteern.vercel.app'
];

const getAllowedOrigins = () => {
  const configuredOrigins = (process.env.CLIENT_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  return [...new Set([...configuredOrigins, ...DEFAULT_ALLOWED_ORIGINS])];
};

/**
 * Registers the client -> room subscription handlers used by the frontend
 * (personal customer rooms + the shared kitchen staff room).
 */
const registerRoomHandlers = (io, { verbose = true } = {}) => {
  io.on('connection', (socket) => {
    if (verbose) console.log(`[Socket.io] Client connected: ${socket.id}`);

    socket.on('join_user_room', (userId) => {
      socket.join(`user_${userId}`);
      if (verbose) console.log(`[Socket.io] User joined personal room: user_${userId}`);
    });

    socket.on('join_kitchen_room', () => {
      socket.join('kitchen_staff');
      if (verbose) console.log('[Socket.io] Kitchen staff joined live queue room');
    });

    socket.on('disconnect', () => {
      if (verbose) console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });
};

/**
 * Creates the Socket.io server, registers room handlers and registers the
 * instance for controllers/services to broadcast on.
 */
const attachSocketServer = (httpServer, { verbose = true } = {}) => {
  const allowedOrigins = getAllowedOrigins();
  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => callback(null, !origin || allowedOrigins.includes(origin)),
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
      credentials: true
    }
  });

  setSocketIOInstance(io);
  registerRoomHandlers(io, { verbose });
  return io;
};

module.exports = { attachSocketServer, registerRoomHandlers, getAllowedOrigins };
