const request = require('supertest');
const app = require('../../server');

let counter = 0;

const createOrg = async (overrides = {}) => {
  counter++;
  const ts = Date.now();
  const defaults = {
    orgName: `جمعية اختبار ${counter}`,
    orgEmail: `org-${counter}-${ts}@test.com`,
    adminName: `مدير ${counter}`,
    adminEmail: `admin-${counter}-${ts}@test.com`,
    password: 'Test1234!',
    assocType: 'REGULAR',
    orgCity: 'الدار البيضاء',
    orgPhone: '0612345678',
  };
  const data = { ...defaults, ...overrides };

  const res = await request(app).post('/api/auth/register').send(data);

  if (res.status !== 201) {
    throw new Error(`createOrg failed (${res.status}): ${JSON.stringify(res.body)}`);
  }

  return { token: res.body.token, org: res.body.organization, user: res.body.user };
};

module.exports = { createOrg };
