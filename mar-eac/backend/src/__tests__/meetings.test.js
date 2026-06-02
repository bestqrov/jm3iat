const request = require('supertest');
const app = require('../server');
const { cleanDb } = require('./helpers/db');
const { createOrg } = require('./helpers/factories');

let token;
beforeEach(async () => { await cleanDb(); ({ token } = await createOrg()); });
const auth = () => ({ Authorization: `Bearer ${token}` });

describe('POST /api/meetings', () => {
  it('creates meeting (201)', async () => {
    const res = await request(app).post('/api/meetings').set(auth())
      .send({ title: 'الاجتماع العام', date: new Date().toISOString(), location: 'مقر الجمعية' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('الاجتماع العام');
  });

  it('returns 400 when title missing', async () => {
    expect((await request(app).post('/api/meetings').set(auth()).send({ date: new Date() })).status).toBe(400);
  });

  it('returns 401 without token', async () => {
    expect((await request(app).post('/api/meetings').send({ title: 't', date: new Date() })).status).toBe(401);
  });
});

describe('GET /api/meetings', () => {
  it('returns array (200)', async () => {
    await request(app).post('/api/meetings').set(auth()).send({ title: 'اجتماع', date: new Date() });
    const res = await request(app).get('/api/meetings').set(auth());
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });
});

describe('DELETE /api/meetings/:id', () => {
  it('deletes meeting (200)', async () => {
    const { body: m } = await request(app).post('/api/meetings').set(auth())
      .send({ title: 'للحذف', date: new Date() });
    expect((await request(app).delete(`/api/meetings/${m.id}`).set(auth())).status).toBe(200);
  });
});
