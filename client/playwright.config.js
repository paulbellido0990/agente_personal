import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './e2e', workers: 1, fullyParallel: false, timeout: 30000,
  use: { baseURL: 'http://127.0.0.1:5174', headless: true },
  webServer: [
    { command: 'node ../server/tests/start-e2e.js', url: 'http://127.0.0.1:3011/api/health', reuseExistingServer: false },
    { command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5174 --strictPort', url: 'http://127.0.0.1:5174', env: { VITE_API_URL: 'http://127.0.0.1:3011/api' }, reuseExistingServer: false },
  ],
})
