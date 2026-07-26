import { existsSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

const localChrome = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
  (existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined);
const port = process.env.PLAYWRIGHT_PORT || '8486';

export default defineConfig({
  testDir: './test/browser',
  timeout: 30_000,
  // One retry on CI absorbs runner-infrastructure flakes (slow demo-server
  // startup, page.goto timeouts) without masking real regressions locally.
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium', launchOptions: localChrome ? { executablePath: localChrome } : undefined } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
  webServer: {
    command: `PORT=${port} npm run demo`,
    url: `http://127.0.0.1:${port}/`,
    // Browser verification must own its server; reusing a just-terminated
    // local demo can pass readiness then leave a worker with a refused socket.
    reuseExistingServer: false,
  },
});
