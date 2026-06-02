module.exports = async () => {
  if (global.__MONGOD__) {
    await global.__MONGOD__.stop();
    console.log('[test] MongoDB in-memory stopped');
  }
};
