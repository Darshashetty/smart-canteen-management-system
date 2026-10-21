const http = require('http');
const { io: createClient } = require('socket.io-client');
const request = require('supertest');
const app = require('../src/app');
const InMemoryStore = require('../src/services/inMemoryStore');
const { attachSocketServer } = require('../src/socket/socketServer');
const { setSocketIOInstance } = require('../src/services/notificationService');
const { SEED, tokenFor, authHeader } = require('./helpers');

const ITEM_FRIES = '64f1a2b3c4d5e6f7a8b9c002';

let httpServer;
let ioServer;
let baseUrl;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const once = (emitter, event, timeoutMs = 8000) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for '${event}'`)), timeoutMs);
    emitter.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });

const connectClient = () => createClient(baseUrl, { transports: ['websocket'], forceNew: true });

beforeAll(async () => {
  httpServer = http.createServer(app);
  // Uses the exact same socket wiring as src/server.js (rooms, CORS, instance)
  ioServer = attachSocketServer(httpServer);
  await new Promise((resolve) => httpServer.listen(0, resolve));
  baseUrl = `http://127.0.0.1:${httpServer.address().port}`;
});

afterAll(async () => {
  setSocketIOInstance(null);
  await new Promise((resolve) => ioServer.close(resolve));
  await new Promise((resolve) => httpServer.close(resolve));
});

describe('Real-time updates over Socket.io', () => {
  test('the order owner receives notification + status events when staff advance the order', async () => {
    const socket = connectClient();
    try {
      await once(socket, 'connect');
      const customer = InMemoryStore.findUserByEmail(SEED.customer);
      socket.emit('join_user_room', customer._id);
      await sleep(150);

      const created = await request(app)
        .post('/api/orders')
        .set(authHeader(tokenFor(SEED.customer)))
        .send({ items: [{ item_id: ITEM_FRIES, quantity: 1 }], pickup_slot: '13:00-13:15' });
      expect(created.status).toBe(201);
      const order = created.body.data;

      const notificationPromise = once(socket, 'notification');
      const statusPromise = once(socket, 'order_status_updated');
      const queuePromise = once(socket, 'queue_updated');

      const advance = await request(app)
        .patch(`/api/queue/${order.order_id}/status`)
        .set(authHeader(tokenFor(SEED.staff)))
        .send({ status: 'Accepted' });
      expect(advance.status).toBe(200);

      const notification = await notificationPromise;
      expect(notification.type).toBe('ORDER_ACCEPTED');
      expect(notification.token_number).toBe(order.token_number);

      const statusEvent = await statusPromise;
      expect(statusEvent.order_status).toBe('Accepted');

      await queuePromise;
    } finally {
      socket.close();
    }
  });

  test('kitchen subscribers receive order_created and pickup_slots_updated on a new booking', async () => {
    const socket = connectClient();
    try {
      await once(socket, 'connect');
      socket.emit('join_kitchen_room');
      await sleep(150);

      const createdPromise = once(socket, 'order_created');
      const slotsPromise = once(socket, 'pickup_slots_updated');

      const created = await request(app)
        .post('/api/orders')
        .set(authHeader(tokenFor(SEED.customer)))
        .send({ items: [{ item_id: ITEM_FRIES, quantity: 1 }], pickup_slot: '13:15-13:30' });
      expect(created.status).toBe(201);
      const order = created.body.data;

      const event = await createdPromise;
      expect(event.order_id).toBe(order.order_id);
      await slotsPromise;
    } finally {
      socket.close();
    }
  });

  test('confirming a collection broadcasts queue and slot updates', async () => {
    const createRes = await request(app)
      .post('/api/orders')
      .set(authHeader(tokenFor(SEED.customer)))
      .send({ items: [{ item_id: ITEM_FRIES, quantity: 1 }], pickup_slot: '13:30-13:45' });
    expect(createRes.status).toBe(201);
    const order = createRes.body.data;
    for (const status of ['Accepted', 'Preparing', 'Ready']) {
      const res = await request(app)
        .patch(`/api/queue/${order.order_id}/status`)
        .set(authHeader(tokenFor(SEED.staff)))
        .send({ status });
      expect(res.status).toBe(200);
    }

    const socket = connectClient();
    try {
      await once(socket, 'connect');
      const queuePromise = once(socket, 'queue_updated');
      const slotsPromise = once(socket, 'pickup_slots_updated');
      const statusPromise = once(socket, 'order_status_updated');

      const confirm = await request(app)
        .post('/api/collection/confirm')
        .set(authHeader(tokenFor(SEED.staff)))
        .send({ token_number: order.token_number });
      expect(confirm.status).toBe(200);

      await queuePromise;
      await slotsPromise;
      const statusEvent = await statusPromise;
      expect(statusEvent.order_status).toBe('Completed');
    } finally {
      socket.close();
    }
  });
});
