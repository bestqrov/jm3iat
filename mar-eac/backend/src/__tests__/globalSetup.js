/**
 * globalSetup: intentionally minimal.
 * MongoDB lifecycle is managed in setupFilesAfterFramework (jestSetup.js)
 * which runs in the actual test worker process, avoiding the "killer process"
 * problem where mongod gets killed when globalSetup's process exits.
 */
module.exports = async () => {
  // nothing to do here
};
