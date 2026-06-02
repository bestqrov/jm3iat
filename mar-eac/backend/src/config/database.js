const { PrismaClient } = require('@prisma/client');

// Lazy singleton: create PrismaClient on first access so that test setup
// code (which runs before any database call) can override DATABASE_URL first.
let _prisma;

function getPrisma() {
  if (!_prisma) {
    _prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
  }
  return _prisma;
}

// Re-initialize prisma (used by tests to pick up a new DATABASE_URL)
function resetPrisma() {
  _prisma = null;
}

// Export a Proxy so existing code that does `prisma.user.findMany(...)` keeps
// working without any changes — the proxy forwards every property access to
// the lazily-created PrismaClient instance.
const proxy = new Proxy(
  {},
  {
    get(_, prop) {
      const client = getPrisma();
      const value = client[prop];
      // Bind methods so `this` inside prisma client methods works correctly
      return typeof value === 'function' ? value.bind(client) : value;
    },
    set(_, prop, value) {
      getPrisma()[prop] = value;
      return true;
    },
  }
);

proxy.__resetPrisma = resetPrisma;
proxy.__getPrisma = getPrisma;

module.exports = proxy;
