// @ts-check
import { defineConfig, devices } from '@playwright/test';
import fs from 'node:fs';

const PORT = process.env.PORT || 8000;
const baseURL = `http://localhost:${PORT}`;

// Locally we use the chromium that ships preinstalled in this environment; in CI
// Playwright installs its own browsers (npx playwright install chromium).
const LOCAL_CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const executablePath = !process.env.CI && fs.existsSync(LOCAL_CHROME) ? LOCAL_CHROME : undefined;
const launchOptions = executablePath ? { executablePath } : {};

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 2,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
    browserName: 'chromium',
    launchOptions,
  },
  webServer: {
    command: `python3 -m http.server ${PORT}`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 30_000,
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], launchOptions },
      grepInvert: /@mobile/,
    },
    {
      // Phone viewport with touch, on chromium (the iPhone preset defaults to WebKit).
      name: 'mobile',
      use: {
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        launchOptions,
      },
      grep: /@mobile/,
    },
  ],
});
