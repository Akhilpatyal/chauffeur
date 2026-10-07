/*
 * Native ESM, no Babel: the source runs in tests exactly as it runs in
 * production, so a transform cannot mask a module-resolution bug.
 * Requires NODE_OPTIONS=--experimental-vm-modules (set by the npm script).
 */
export default {
  testEnvironment: 'node',
  transform: {},
  setupFiles: ['<rootDir>/tests/setup-env.js'],
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  /* In-memory MongoDB needs room to download and boot on a cold machine. */
  testTimeout: 60_000,
  collectCoverageFrom: [
    'src/modules/**/*.js',
    'src/services/**/*.js',
    'src/lib/**/*.js',
    'src/utils/**/*.js',
  ],
  /*
   * Lead capture and the money-adjacent paths are the ones that must not
   * regress, so they carry a real floor rather than a global average that a
   * well-tested utility file could prop up.
   */
  coverageThreshold: {
    './src/modules/leads/': { statements: 75, branches: 60, functions: 75, lines: 75 },
    './src/modules/newsletter/': { statements: 70, branches: 55, functions: 70, lines: 70 },
  },
};
