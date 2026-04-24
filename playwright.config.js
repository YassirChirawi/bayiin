import { defineConfig } from '@playwright/test';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: 'http://localhost:5173',
    channel: 'chrome',          // use system Chrome — no 179MB download needed
    screenshot: 'off',
    video: 'off',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chrome',
      use: { channel: 'chrome' },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,   // reuse if already running
    timeout: 60000,
  },
});
