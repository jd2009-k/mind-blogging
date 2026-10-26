import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const browser=await chromium.launch({headless:true});
try {
  for(const [label,viewport] of [
    ['desktop',{width:1280,height:900}],
    ['mobile',{width:390,height:844}]
  ]){
    const page=await browser.newPage({viewport});
    try{
      const response=await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
      assert.equal(response?.status(),200,label+': homepage returned non-200');
      await page.locator('#pl-name').waitFor({state:'visible',timeout:15000});
      assert.equal(await page.locator('#pl-bio').isVisible(),true,label+': profile editor missing');
      // No profile should be loaded before authentication, including when browser storage exists.
      assert.equal(await page.locator('#pl-name').inputValue(),'',
        label+': display profile unexpectedly populated before authentication');
      const widths=await page.evaluate(()=>({
        page:document.documentElement.scrollWidth,
        viewport:document.documentElement.clientWidth
      }));
      assert.ok(widths.page<=widths.viewport+2,
        label+': horizontal overflow '+JSON.stringify(widths));
      await page.getByRole('button',{name:/Open my workspace/i}).first().click();
      await page.getByText('Continue with Google',{exact:false}).waitFor({state:'visible',timeout:15000});
      console.log(label+' public UI and login gate passed');
    } finally {await page.close();}
  }
} finally {await browser.close();}
