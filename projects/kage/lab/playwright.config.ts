import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:8143',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: {
      executablePath: process.env.BROWSER_EXECUTABLE_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      args: ['--enable-webgl', '--ignore-gpu-blocklist']
    }
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }
  ],
  webServer: {
    command: 'npm run dev:8143',
    url: 'http://127.0.0.1:8143',
    reuseExistingServer: true,
    timeout: 120_000
  }
});
