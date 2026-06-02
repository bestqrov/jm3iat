/**
 * globalTeardown: intentionally minimal.
 * MongoDB is stopped via process.on('exit') registered in jestSetup.js.
 */
module.exports = async () => {
  // nothing to do here
};
