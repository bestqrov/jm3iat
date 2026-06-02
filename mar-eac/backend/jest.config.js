module.exports = {
  testEnvironment: 'node',
  globalSetup: './src/__tests__/globalSetup.js',
  globalTeardown: './src/__tests__/globalTeardown.js',
  setupFilesAfterEnv: ['./src/__tests__/jestSetup.js'],
  testTimeout: 30000,
  testMatch: ['**/__tests__/**/*.test.js'],
  verbose: true,
};
