import {test,expect} from '@playwright/test';

test('the profile-first homepage renders and gates the private workspace',async({page})=>{
 const faults:string[]=[];
 page.on('pageerror',e=>faults.push(e.message));
 await page.goto('/');
 await expect(page.getByRole('heading',{name:/Make it yours/i})).toBeVisible();
 await expect(page.getByRole('textbox',{name:/Display name/i})).toBeVisible();
 await page.locator('.pl-mobile-bottom').isVisible()
  ? await page.locator('.pl-mobile-bottom').getByRole('button',{name:'Home'}).click()
  : await page.getByRole('button',{name:/Open my workspace/i}).click();
 await expect(page.getByRole('heading',{name:/Your little moments/i})).toBeVisible();
 await expect(page.getByRole('button',{name:/Continue with Google/i})).toBeVisible();
 expect(faults).toEqual([]);
});

test('unsigned users cannot persist private profile information',async({page})=>{
 await page.goto('/');
 await page.getByRole('textbox',{name:/Display name/i}).fill('Temporary unsaved preview');
 await page.getByRole('button',{name:/Save my profile/i}).click();
 await expect(page.getByRole('alert')).toContainText('Sign in and confirm');
 await page.reload();
 await expect(page.getByRole('heading',{name:/Make it yours/i})).toBeVisible();
 await expect(page.getByRole('textbox',{name:/Display name/i})).toHaveValue('');
});

test('password recovery and registration entry points render without credentials',async({page})=>{
 await page.goto('/');
 await page.locator('.pl-mobile-bottom').isVisible()
  ? await page.locator('.pl-mobile-bottom').getByRole('button',{name:'Home'}).click()
  : await page.getByRole('button',{name:/Enter workspace/i}).click();
 await page.getByRole('button',{name:/Forgot password/i}).click();
 await expect(page.getByRole('button',{name:/Email recovery link/i})).toBeVisible();
 await page.getByRole('button',{name:/Back to sign in/i}).click();
 await page.getByRole('button',{name:/Create an account/i}).click();
 await expect(page.getByRole('button',{name:/Create my account/i})).toBeVisible();
});

test('mobile and desktop public pages do not overflow horizontally',async({page})=>{
 await page.goto('/');
 const widths=await page.evaluate(()=>({actual:document.documentElement.scrollWidth,viewport:window.innerWidth}));
 expect(widths.actual).toBeLessThanOrEqual(widths.viewport+2);
 await page.locator('.pl-mobile-bottom').isVisible()
  ? await page.locator('.pl-mobile-bottom').getByRole('button',{name:'Home'}).click()
  : await page.getByRole('button',{name:/Open my workspace/i}).click();
 const login=await page.evaluate(()=>({actual:document.documentElement.scrollWidth,viewport:window.innerWidth}));
 expect(login.actual).toBeLessThanOrEqual(login.viewport+2);
});
