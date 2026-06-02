const request = require('supertest');
const app = require('../server');
const { cleanDb } = require('./helpers/db');
const { createOrg } = require('./helpers/factories');

let token;
beforeEach(async () => { await cleanDb(); ({ token } = await createOrg()); });
const auth = () => ({ Authorization: `Bearer ${token}` });

describe('POST /api/finance', () => {
  it('creates INCOME transaction (201)', async () => {
    const res = await request(app).post('/api/finance').set(auth())
      .send({ type: 'INCOME', amount: 5000, category: 'اشتراكات', date: new Date() });
    expect(res.status).toBe(201);
    expect(res.body.type).toBe('INCOME');
    expect(res.body.amount).toBe(5000);
  });

  it('creates EXPENSE transaction (201)', async () => {
    const res = await request(app).post('/api/finance').set(auth())
      .send({ type: 'EXPENSE', amount: 1200, category: 'إيجار', date: new Date() });
    expect(res.status).toBe(201);
    expect(res.body.type).toBe('EXPENSE');
  });

  it('returns 400 when type missing', async () => {
    expect((await request(app).post('/api/finance').set(auth()).send({ amount: 100, category: 'x' })).status).toBe(400);
  });

  it('returns 400 when amount missing', async () => {
    expect((await request(app).post('/api/finance').set(auth()).send({ type: 'INCOME', category: 'x' })).status).toBe(400);
  });
});

describe('GET /api/finance', () => {
  it('returns transactions (200)', async () => {
    await request(app).post('/api/finance').set(auth())
      .send({ type: 'INCOME', amount: 1000, category: 'تبرعات', date: new Date() });
    const res = await request(app).get('/api/finance').set(auth());
    expect(res.status).toBe(200);
    // Handle both array and { transactions: [...] } shapes
    const list = Array.isArray(res.body) ? res.body : res.body.transactions;
    expect(list.length).toBeGreaterThanOrEqual(1);
  });
});

describe('GET /api/finance/summary', () => {
  it('returns financial summary (200)', async () => {
    await request(app).post('/api/finance').set(auth())
      .send({ type: 'INCOME', amount: 3000, category: 'منح', date: new Date() });
    await request(app).post('/api/finance').set(auth())
      .send({ type: 'EXPENSE', amount: 800, category: 'مصاريف', date: new Date() });
    const res = await request(app).get('/api/finance/summary').set(auth());
    expect(res.status).toBe(200);
    // Accept any reasonable summary shape
    const body = res.body;
    const hasIncome = 'totalIncome' in body || 'income' in body || 'revenues' in body;
    expect(hasIncome).toBe(true);
  });
});
