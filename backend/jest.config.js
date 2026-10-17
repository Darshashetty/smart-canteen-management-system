module.exports = {
  testEnvironment: 'node',
  // The full suite loads bcrypt/qrcode/mongoose; 5s is too tight for the first
  // test in a worker and caused intermittent false timeouts.
  testTimeout: 15000
};
