import { defineConfig } from '@playwright/test'

const external = process.env.ZENWORK_TEST_URL
export default defineConfig({
  testDir:'tests',
  testMatch:'**/*.spec.ts',
  use:{baseURL:external || 'http://127.0.0.1:4199', launchOptions:{executablePath:process.env.ZENWORK_CHROMIUM}},
  webServer:external?undefined:{command:'npm run dev -- --host 127.0.0.1 --port 4199 --strictPort',url:'http://127.0.0.1:4199'},
})
