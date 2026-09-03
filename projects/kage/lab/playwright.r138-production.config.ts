import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  workers: 1,
  reporter: 'list',
  use: {
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: {
      executablePath: process.env.BROWSER_EXECUTABLE_PATH
        || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      args: ['--enable-webgl', '--ignore-gpu-blocklist']
    }
  },
  projects: [
    { name: 'production', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }
  ],
  webServer: {
    command: 'npm run preview:pages:r138',
    url: 'http://127.0.0.1:8147/0823_githubcode_study/projects/kage/pages/v2/',
    reuseExistingServer: true,
    timeout: 120_000
  }
});
