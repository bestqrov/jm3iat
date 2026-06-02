const { MongoMemoryServer } = require('mongodb-memory-server');
const { execSync } = require('child_process');
const path = require('path');

module.exports = async () => {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri() + 'mar_eac_test';

  process.env.DATABASE_URL = uri;
  process.env.JWT_SECRET = 'test-secret-key-32chars-minimum!!';
  process.env.NODE_ENV = 'test';

  global.__MONGOD__ = mongod;

  try {
    execSync('npx prisma db push --skip-generate --accept-data-loss', {
      env: { ...process.env, DATABASE_URL: uri },
      cwd: path.resolve(__dirname, '../../..'),
      stdio: 'pipe',
    });
    console.log('[test] Prisma schema pushed to test DB');
  } catch (e) {
    console.warn('[test] prisma db push warning (may be ok for MongoDB):', e.stderr?.toString()?.slice(0, 200));
  }

  console.log('[test] MongoDB in-memory started');
};
