import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    exclude: ['test/browser/**', 'test/types/**', 'node_modules/**', 'dist/**'],
    setupFiles: ['test/jsdom-polyfills.js', 'test/setup.js'],
  },
});
