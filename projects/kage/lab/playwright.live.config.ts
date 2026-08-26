import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './live-e2e',
  timeout: 240_000,
  expect: { timeout: 20_000 },
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:8143',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
    viewport: { width: 1440, height: 900 },
    launchOptions: {
      executablePath: process.env.BROWSER_EXECUTABLE_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      args: ['--enable-webgl', '--ignore-gpu-blocklist']
    }
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 8143',
    url: 'http://127.0.0.1:8143',
    reuseExistingServer: true,
    timeout: 120_000
  }
});
