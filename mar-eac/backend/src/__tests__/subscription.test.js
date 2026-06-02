const request = require('supertest');
const app = require('../server');
const prisma = require('../config/database');
const { cleanDb } = require('./helpers/db');
const { createOrg } = require('./helpers/factories');

let token, orgId;
beforeEach(async () => {
  await cleanDb();
  ({ token, org: { id: orgId } } = await createOrg({ assocType: 'REGULAR' }));
});
const auth = () => ({ Authorization: `Bearer ${token}` });

describe('TRIAL subscription allows basic access', () => {
  it('GET /api/members returns 200 on TRIAL', async () => {
    expect((await request(app).get('/api/members').set(auth())).status).toBe(200);
  });

  it('GET /api/meetings returns 200 on TRIAL', async () => {
    expect((await request(app).get('/api/meetings').set(auth())).status).toBe(200);
  });
});

describe('EXPIRED subscription blocks module-gated endpoints', () => {
  beforeEach(async () => {
    await prisma.subscription.updateMany({
      where: { organizationId: orgId },
      data: { status: 'EXPIRED', expiresAt: new Date(Date.now() - 86400000) },
    });
  });

  it('returns 403 on module-gated endpoint (water requires WATER module)', async () => {
    // WATER is in legacy PREMIUM allowlist — but EXPIRED subscription is blocked first
    const res = await request(app).get('/api/water').set(auth());
    expect(res.status).toBe(403);
  });
});

describe('Org without WATER module cannot access WATER', () => {
  it('GET /api/water returns 403 for org with explicit modules not including WATER', async () => {
    // Org with explicit modules (only PROJECTS) → WATER not included → blocked
    const { token: t2 } = await createOrg({ modules: ['PROJECTS'] });
    const res = await request(app).get('/api/water').set({ Authorization: `Bearer ${t2}` });
    expect(res.status).toBe(403);
  });
});
