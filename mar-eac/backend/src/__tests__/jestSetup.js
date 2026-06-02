/**
 * setupFilesAfterEnv — runs in the Jest worker process before each test file.
 *
 * Starts a MongoDB replica set in-memory server once per worker process, then
 * sets DATABASE_URL and resets the lazy Prisma singleton so it re-connects
 * using the test database URL.
 *
 * Prisma MongoDB requires a replica set for transactions (used by deleteMany
 * etc.). We use MongoMemoryReplSet here — running it in the test worker
 * process (via setupFilesAfterEnv) ensures the killer process monitors the
 * correct parent PID, keeping mongod alive for the entire test run.
 */
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');

// In --runInBand mode all test files share the same process, so we start
// MongoDB only once (guard via a global flag).
if (!global.__MONGOD_STARTED__) {
  global.__MONGOD_STARTED__ = true;

  beforeAll(async () => {
    if (global.__MONGOD__) {
      // Already started by a previous test file; ensure env vars are set.
      _ensureEnv();
      return;
    }

    // Start replica set with one member, using wiredTiger storage engine
    // (ephemeralForTest does not support majority read concern needed by Prisma)
    const mongod = await MongoMemoryReplSet.create({
      replSet: { count: 1 },
      instanceOpts: [{ storageEngine: 'wiredTiger' }],
    });
    await mongod.waitUntilRunning();

    // Wait for primary election before allowing tests to proceed
    const adminUri = mongod.getUri();
    const client = new MongoClient(adminUri);
    try {
      await client.connect();
      const admin = client.db('admin').admin();
      for (let i = 0; i < 120; i++) {
        try {
          const status = await admin.replSetGetStatus();
          const hasPrimary = status.members && status.members.some(m => m.stateStr === 'PRIMARY');
          if (hasPrimary) {
            console.log('[test] Replica set primary elected after', i * 500, 'ms');
            break;
          }
        } catch (_) {}
        await new Promise(r => setTimeout(r, 500));
      }
    } finally {
      await client.close();
    }

    global.__MONGOD__ = mongod;

    // Build a clean database URI
    const baseUri = mongod.getUri(); // e.g. mongodb://127.0.0.1:PORT/?replicaSet=...
    // getUri() may include replicaSet query param; insert db name before '?'
    const dbUri = baseUri.includes('?')
      ? baseUri.replace('?', 'mar_eac_test?')
      : baseUri.endsWith('/') ? baseUri + 'mar_eac_test' : baseUri + '/mar_eac_test';

    process.env.DATABASE_URL = dbUri;
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-32chars-minimum!!';
    process.env.NODE_ENV = 'test';

    // Reset the lazy Prisma singleton so it connects with the new URL
    try {
      const db = require('../config/database');
      if (typeof db.__resetPrisma === 'function') db.__resetPrisma();
    } catch (_) {}

    console.log('[test] MongoDB replica set started:', dbUri);
  }, 60000);

  afterAll(async () => {
    // Disconnect Prisma
    try {
      const db = require('../config/database');
      if (typeof db.__getPrisma === 'function') {
        const client = db.__getPrisma();
        if (client) await client.$disconnect();
      }
    } catch (_) {}

    if (global.__MONGOD__) {
      await global.__MONGOD__.stop();
      global.__MONGOD__ = undefined;
      global.__MONGOD_STARTED__ = false;
      console.log('[test] MongoDB stopped');
    }
  }, 15000);
}

function _ensureEnv() {
  if (!process.env.DATABASE_URL && global.__MONGOD__) {
    const baseUri = global.__MONGOD__.getUri();
    const dbUri = baseUri.includes('?')
      ? baseUri.replace('?', 'mar_eac_test?')
      : (baseUri.endsWith('/') ? baseUri : baseUri + '/') + 'mar_eac_test';
    process.env.DATABASE_URL = dbUri;
  }
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-32chars-minimum!!';
  process.env.NODE_ENV = 'test';
}
