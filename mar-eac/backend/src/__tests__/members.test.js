const request = require('supertest');
const app = require('../server');
const { cleanDb } = require('./helpers/db');
const { createOrg } = require('./helpers/factories');

let token, orgId;
beforeEach(async () => {
  await cleanDb();
  ({ token, org: { id: orgId } } = await createOrg());
});
const auth = () => ({ Authorization: `Bearer ${token}` });

describe('POST /api/members', () => {
  it('creates member (201)', async () => {
    const res = await request(app).post('/api/members').set(auth()).send({ name: 'فاطمة الزهراء', phone: '0612345678' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('فاطمة الزهراء');
    expect(res.body.organizationId).toBe(orgId);
  });

  it('returns 400 when name missing', async () => {
    expect((await request(app).post('/api/members').set(auth()).send({ phone: '0600' })).status).toBe(400);
  });

  it('returns 401 without token', async () => {
    expect((await request(app).post('/api/members').send({ name: 'x' })).status).toBe(401);
  });
});

describe('GET /api/members', () => {
  it('returns array (200)', async () => {
    const res = await request(app).get('/api/members').set(auth());
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('returns created members', async () => {
    await request(app).post('/api/members').set(auth()).send({ name: 'عضو 1' });
    await request(app).post('/api/members').set(auth()).send({ name: 'عضو 2' });
    const res = await request(app).get('/api/members').set(auth());
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });
});

describe('PUT /api/members/:id', () => {
  it('updates member name (200)', async () => {
    const { body: m } = await request(app).post('/api/members').set(auth()).send({ name: 'قديم' });
    const res = await request(app).put(`/api/members/${m.id}`).set(auth()).send({ name: 'جديد' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('جديد');
  });
});

describe('DELETE /api/members/:id', () => {
  it('deletes member (200)', async () => {
    const { body: m } = await request(app).post('/api/members').set(auth()).send({ name: 'للحذف' });
    expect((await request(app).delete(`/api/members/${m.id}`).set(auth())).status).toBe(200);
  });
});
