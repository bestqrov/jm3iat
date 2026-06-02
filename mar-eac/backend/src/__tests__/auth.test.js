const request = require('supertest');
const app = require('../server');
const { cleanDb } = require('./helpers/db');
const { createOrg } = require('./helpers/factories');

beforeEach(cleanDb);

describe('POST /api/auth/register', () => {
  it('creates org + TRIAL subscription + returns token (201)', async () => {
    const res = await request(app).post('/api/auth/register').send({
      orgName: 'جمعية التضامن',
      orgEmail: 'reg-test@example.com',
      adminName: 'محمد أمين',
      adminEmail: 'admin-reg@example.com',
      password: 'Test1234!',
      assocType: 'REGULAR',
    });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.organization.subscription.status).toBe('TRIAL');
  });

  it('returns 400 on duplicate orgEmail', async () => {
    const base = { orgName: 'ج1', orgEmail: 'dup@example.com', adminName: 'م', adminEmail: 'a1@example.com', password: 'Test1234!' };
    await request(app).post('/api/auth/register').send(base);
    const res = await request(app).post('/api/auth/register').send({ ...base, adminEmail: 'a2@example.com' });
    expect([400, 409]).toContain(res.status);
  });

  it('returns 400 when required fields missing', async () => {
    const res = await request(app).post('/api/auth/register').send({ orgName: 'ناقص' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send({
      orgName: 'جمعية تسجيل', orgEmail: 'login-org@example.com',
      adminName: 'مدير', adminEmail: 'login-admin@example.com', password: 'MyPass123!',
    });
  });

  it('returns token on valid credentials (200)', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'login-admin@example.com', password: 'MyPass123!' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('returns 401 on wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'login-admin@example.com', password: 'WrongPass' });
    expect(res.status).toBe(401);
  });

  it('returns 401 on unknown email', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'nobody@example.com', password: 'anything' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('returns 401 without token', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
  });

  it('returns 401 with invalid token', async () => {
    expect((await request(app).get('/api/auth/me').set('Authorization', 'Bearer bad.token')).status).toBe(401);
  });

  it('returns org info with valid token', async () => {
    const { token } = await createOrg();
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.organization).toBeDefined();
  });
});
