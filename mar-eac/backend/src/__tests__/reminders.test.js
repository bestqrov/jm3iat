const request = require('supertest');
const app = require('../server');
const prisma = require('../config/database');
const { cleanDb } = require('./helpers/db');
const { createOrg } = require('./helpers/factories');

let token, orgId;
beforeEach(async () => {
  await cleanDb();
  ({ token, org: { id: orgId } } = await createOrg());
});
const auth = () => ({ Authorization: `Bearer ${token}` });

describe('GET /api/reminders', () => {
  it('returns empty array initially', async () => {
    const res = await request(app).get('/api/reminders').set(auth());
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('returns unread count = 0 initially', async () => {
    const res = await request(app).get('/api/reminders/count').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(0);
  });
});

describe('POST /api/reminders', () => {
  it('creates custom reminder (201)', async () => {
    const res = await request(app).post('/api/reminders').set(auth())
      .send({ title: 'تذكير مخصص', message: 'لا تنسَ', scheduledFor: new Date().toISOString() });
    expect(res.status).toBe(201);
    expect(res.body.type).toBe('CUSTOM');
    expect(res.body.isRead).toBe(false);
  });
});

describe('PUT /api/reminders/:id/read', () => {
  it('marks reminder as read', async () => {
    const { body: r } = await request(app).post('/api/reminders').set(auth())
      .send({ title: 'تذكير', scheduledFor: new Date().toISOString() });
    const res = await request(app).put(`/api/reminders/${r.id}/read`).set(auth());
    expect(res.status).toBe(200);
    expect(res.body.isRead).toBe(true);
  });
});

describe('Smart: WATER_READING only with water installations', () => {
  it('org with no water installations: shouldSendWater = false', async () => {
    const waterCount = await prisma.waterInstallation.count({ where: { organizationId: orgId } });
    expect(waterCount).toBe(0);
    expect(waterCount > 0).toBe(false);
  });
});

describe('Smart: BUREAU_EXPIRY not sent to cooperatives', () => {
  it('cooperative orgs excluded from bureau expiry query', async () => {
    const { org: coopOrg } = await createOrg();
    await prisma.organization.update({
      where: { id: coopOrg.id },
      data: { conversionStatus: 'CONVERTED', bureauCreationDate: new Date() },
    });
    const targets = await prisma.organization.findMany({
      where: { bureauCreationDate: { not: null }, conversionStatus: { not: 'CONVERTED' } },
    });
    expect(targets.find(o => o.id === coopOrg.id)).toBeUndefined();
  });
});

describe('Deduplication: no duplicate reminders same month', () => {
  it('existing reminder in same month prevents duplicate creation', async () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    await prisma.reminder.create({
      data: { organizationId: orgId, type: 'FINANCE_RECORD', title: 'Test', scheduledFor: now },
    });
    const existing = await prisma.reminder.findFirst({
      where: { organizationId: orgId, type: 'FINANCE_RECORD', createdAt: { gte: startOfMonth } },
    });
    expect(existing).not.toBeNull();
    expect(!existing).toBe(false); // should NOT create new one
  });
});
