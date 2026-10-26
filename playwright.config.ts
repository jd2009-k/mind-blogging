import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
 testDir:'./tests/e2e',
 timeout:30_000,
 retries:process.env.CI?1:0,
 reporter:process.env.CI?'github':'list',
 use:{baseURL:'http://127.0.0.1:5173',trace:'retain-on-failure',screenshot:'only-on-failure'},
 projects:[
  {name:'desktop-chromium',use:{...devices['Desktop Chrome']}},
  {name:'mobile-chromium',use:{...devices['Desktop Chrome'],viewport:{width:390,height:844},isMobile:true,hasTouch:true}}
 ],
 webServer:{command:'npm run dev -- --host 127.0.0.1',url:'http://127.0.0.1:5173',reuseExistingServer:!process.env.CI,timeout:60_000}
});