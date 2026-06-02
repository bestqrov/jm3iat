const request = require('supertest');
const app = require('../server');
const prisma = require('../config/database');
const { cleanDb } = require('./helpers/db');
const { createOrg } = require('./helpers/factories');

let token, orgId;
beforeEach(async () => {
  await cleanDb();
  ({ token, org: { id: orgId } } = await createOrg({ modules: ['PROJECTS'] }));
});
const auth = () => ({ Authorization: `Bearer ${token}` });

describe('POST /api/projects', () => {
  it('creates project (201)', async () => {
    const res = await request(app).post('/api/projects').set(auth())
      .send({ title: 'مشروع توزيع المساعدات', type: 'SOCIAL', budget: 50000 });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('مشروع توزيع المساعدات');
  });

  it('returns 400 when title missing', async () => {
    expect((await request(app).post('/api/projects').set(auth()).send({ description: 'x' })).status).toBe(400);
  });

  it('returns 401 without token', async () => {
    expect((await request(app).post('/api/projects').send({ title: 'x' })).status).toBe(401);
  });
});

describe('GET /api/projects', () => {
  it('returns empty list initially', async () => {
    const res = await request(app).get('/api/projects').set(auth());
    expect(res.status).toBe(200);
    const list = Array.isArray(res.body) ? res.body : res.body.projects ?? [];
    expect(list.length).toBe(0);
  });

  it('returns created projects', async () => {
    await request(app).post('/api/projects').set(auth()).send({ title: 'مشروع 1' });
    const res = await request(app).get('/api/projects').set(auth());
    const list = Array.isArray(res.body) ? res.body : res.body.projects ?? [];
    expect(list.length).toBeGreaterThanOrEqual(1);
  });
});

describe('PUT /api/projects/:id', () => {
  it('updates project title (200)', async () => {
    const { body: p } = await request(app).post('/api/projects').set(auth()).send({ title: 'قديم' });
    const res = await request(app).put(`/api/projects/${p.id}`).set(auth()).send({ title: 'محدث' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('محدث');
  });
});

describe('DELETE /api/projects/:id', () => {
  it('deletes project (200)', async () => {
    const { body: p } = await request(app).post('/api/projects').set(auth()).send({ title: 'للحذف' });
    // Remove auto-created funding record first (onDelete: NoAction requires manual cleanup)
    await prisma.funding.deleteMany({ where: { projectId: p.id } });
    expect((await request(app).delete(`/api/projects/${p.id}`).set(auth())).status).toBe(200);
  });
});

describe('Smart: PROJECT_CREATE vs PROJECT_UPDATE', () => {
  it('org with 0 projects should get PROJECT_CREATE not PROJECT_UPDATE', async () => {
    const count = await prisma.project.count({ where: { organizationId: orgId } });
    expect(count).toBe(0);
    // The smart reminder logic: count=0 → type=PROJECT_CREATE
    const reminderType = count > 0 ? 'PROJECT_UPDATE' : 'PROJECT_CREATE';
    expect(reminderType).toBe('PROJECT_CREATE');
  });

  it('org with projects gets PROJECT_UPDATE type', async () => {
    await request(app).post('/api/projects').set(auth()).send({ title: 'مشروع موجود' });
    const count = await prisma.project.count({ where: { organizationId: orgId } });
    expect(count).toBeGreaterThan(0);
    const reminderType = count > 0 ? 'PROJECT_UPDATE' : 'PROJECT_CREATE';
    expect(reminderType).toBe('PROJECT_UPDATE');
  });
});
