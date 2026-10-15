const request = require('supertest');
const app = require('../src/app');
const { SEED, tokenFor, authHeader } = require('./helpers');

describe('Auth API', () => {
  test('health endpoint is ONLINE', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ONLINE');
  });

  test('register rejects invalid payload with 400 (Zod)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'x', email: 'not-an-email', password: '123' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/validation|invalid/i);
  });

  test('register + login round trip returns a token', async () => {
    const email = `student_${Date.now()}@canteen.com`;
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test Student', email, password: 'password123', phone: '+920000000000' });
    expect(registerRes.status).toBe(201);
    expect(registerRes.body.token).toBeTruthy();

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'password123' });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeTruthy();
    expect(loginRes.body.user.role).toBe('customer');
  });

  test('login rejects wrong password with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: SEED.customer, password: 'wrong-password' });
    expect(res.status).toBe(401);
  });

  test('GET /me requires authentication (401 without token)', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('GET /me returns the authenticated user', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set(authHeader(tokenFor(SEED.customer)));
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(SEED.customer);
  });
});
