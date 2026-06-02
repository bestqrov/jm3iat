/**
 * This file runs in each Jest worker process BEFORE any test module is loaded.
 * It reads the DATABASE_URL written by globalSetup.js so Prisma connects to
 * the in-memory MongoDB instance rather than the production URL.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const tmpFile = path.join(os.tmpdir(), 'mar_eac_test_db_url.txt');

try {
  const data = JSON.parse(fs.readFileSync(tmpFile, 'utf8'));
  if (data.DATABASE_URL) {
    process.env.DATABASE_URL = data.DATABASE_URL;
  }
} catch (_) {
  // file not present (running outside test suite) — fall through
}

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-32chars-minimum!!';
process.env.NODE_ENV = 'test';
