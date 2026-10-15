import {defineConfig} from '@playwright/test'
export default defineConfig({
 testDir:'./e2e-pwa',outputDir:'./test-results/pwa',workers:1,fullyParallel:false,timeout:45000,
 use:{baseURL:'http://127.0.0.1:5175',headless:true},
 webServer:[
  {command:'node ../server/tests/start-e2e.js',url:'http://127.0.0.1:3012/api/health',env:{ALIRA_TEST_PORT:'3012',ALIRA_TEST_ORIGIN:'http://127.0.0.1:5175'},reuseExistingServer:false},
  {command:'node scripts/start-pwa-preview.mjs',url:'http://127.0.0.1:5175',reuseExistingServer:false,timeout:120000},
 ],
})
