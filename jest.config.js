// Jest config for ESM. Kept as a separate file (instead of an inline `jest`
// field in package.json) so that `transform: {}` plays nicely with
// `node --experimental-vm-modules`. `.js` is treated as ESM automatically
// because of the `"type": "module"` in package.json.
export default {
  testEnvironment: 'node',
  transform: {},
  setupFiles: ['<rootDir>/tests/jest.setup.js'],
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: ['src/**/*.js', '!src/server.js'],
  coverageDirectory: 'coverage',
  verbose: true
};
