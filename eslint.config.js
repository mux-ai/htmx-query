export default [
  {
    ignores: ['dist/', 'node_modules/', 'coverage/', 'playwright-report/', 'test-results/'],
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        BroadcastChannel: 'readonly',
        Buffer: 'readonly',
        IntersectionObserver: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        CustomEvent: 'readonly',
        TextEncoder: 'readonly',
        XMLHttpRequest: 'readonly',
        document: 'readonly',
        console: 'readonly',
        globalThis: 'readonly',
        htmx: 'readonly',
        navigator: 'readonly',
        process: 'readonly',
        sessionStorage: 'readonly',
        setTimeout: 'readonly',
        window: 'readonly',
      },
    },
    rules: {
      'no-constant-binary-expression': 'error',
      'no-undef': 'error',
      'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }],
    },
  },
];
