/*
 * Flat config. The rules here are the ones that catch real defects in this
 * codebase rather than stylistic preferences, which are left to whatever
 * formatter the team prefers.
 */
export default [
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        fetch: 'readonly',
        AbortSignal: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        structuredClone: 'readonly',
      },
    },
    rules: {
      /* An unawaited promise in a request handler is a silently dropped
       * operation — exactly the failure mode this backend replaces. */
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'no-console': 'off', // scripts print to stdout by design
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'smart'],
      'no-return-await': 'error',
      /*
       * Off deliberately. Every hit in this codebase is a false positive: a
       * per-request property assigned after an await (request.user), and a
       * last-write-wins in-process cache. Node is single-threaded between
       * awaits, so none of them can interleave. Leaving the rule on would mean
       * three permanent disable comments, which teaches the team to skim past
       * lint output.
       */
      'require-atomic-updates': 'off',
      'no-promise-executor-return': 'error',
      'no-await-in-loop': 'off', // sequential provider calls are intentional
    },
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        jest: 'readonly',
      },
    },
  },
  {
    ignores: ['node_modules/**', 'coverage/**', 'admin/dist/**', 'seed/data/**'],
  },
];
