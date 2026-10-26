import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import cron from '../api/cron.js';
import deletion from '../api/account-delete.js';
import {trustedPushEndpoint,validPushSubscription} from '../lib/push-validation.js';

const source=readFileSync(new URL('../src/account-profile.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const profiles=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));

const oldKey='mind-blogging-personal-profile-v1';
test('an anonymous user never receives a saved profile',()=>{
 const record={profileOwnerId:'account-a',profile:{name:'Secret A',bio:'private',color:'coral'}};
 assert.deepEqual(profiles.profileFromSettings(record,null),profiles.emptyProfile());
});
test('one account cannot display another account profile',()=>{
 const record={profileOwnerId:'account-a',profile:{name:'Secret A',bio:'private',color:'coral'}};
 assert.equal(profiles.profileFromSettings(record,'account-a').name,'Secret A');
 assert.deepEqual(profiles.profileFromSettings(record,'account-b'),profiles.emptyProfile());
});
test('signed-out and switched accounts cannot persist old private details',()=>{
 assert.throws(()=>profiles.profilePatch(null,{name:'Anonymous'}),/Sign in/);
 const a=profiles.profilePatch('account-a',{name:'A',bio:'Private A',color:'coral'});
 assert.equal(profiles.profileFromSettings(a,'account-a').bio,'Private A');
 assert.equal(profiles.profileFromSettings(a,'account-b').bio,'');
 const b=profiles.profilePatch('account-b',{name:'B',bio:'Private B'});
 assert.equal(profiles.profileFromSettings(b,'account-a').name,'');
 assert.equal(profiles.profileFromSettings(b,'account-b').name,'B');
});
test('legacy browser-wide profile is not migrated without ownership proof',()=>{
 const landing=readFileSync(new URL('../src/PlayfulProfile.tsx',import.meta.url),'utf8');
 const workspace=readFileSync(new URL('../src/PlayfulWorkspace.tsx',import.meta.url),'utf8');
 const account=readFileSync(new URL('../src/account-profile.ts',import.meta.url),'utf8');
 assert.doesNotMatch(landing,new RegExp(oldKey));
 assert.doesNotMatch(workspace,new RegExp(oldKey));
 assert.doesNotMatch(account,new RegExp(oldKey));
});
test('account deletion refuses missing server secret',async()=>{
 const old=process.env.SUPABASE_SERVICE_ROLE_KEY;
 delete process.env.SUPABASE_SERVICE_ROLE_KEY;
 const res=await invoke(deletion,{method:'POST',headers:{},body:{confirmation:'DELETE MY DATA',confirmEmail:'test@example.invalid'}});
 if(old!==undefined)process.env.SUPABASE_SERVICE_ROLE_KEY=old;
 assert.equal(res.status,503);
});
test('account deletion rejects unauthorized caller when server key exists',async()=>{
 const old=process.env.SUPABASE_SERVICE_ROLE_KEY;
 process.env.SUPABASE_SERVICE_ROLE_KEY='local-test-placeholder-key';
 try{
  const res=await invoke(deletion,{method:'POST',headers:{},body:{confirmation:'DELETE MY DATA',confirmEmail:'test@example.invalid'}});
  assert.equal(res.status,401);
 }finally{if(old===undefined)delete process.env.SUPABASE_SERVICE_ROLE_KEY;else process.env.SUPABASE_SERVICE_ROLE_KEY=old;}
});
test('cron authorization executes and denies missing / wrong secrets',async()=>{
 const old=process.env.CRON_SECRET;
 try{
  delete process.env.CRON_SECRET;
  assert.equal((await invoke(cron,{method:'GET',headers:{authorization:'Bearer undefined'}})).status,401);
  process.env.CRON_SECRET='test-cron-key';
  assert.equal((await invoke(cron,{method:'GET',headers:{authorization:'Bearer wrong'}})).status,401);
  assert.equal((await invoke(cron,{method:'POST',headers:{authorization:'Bearer test-cron-key'}})).status,405);
  const vapid=process.env.VAPID_PUBLIC_KEY;delete process.env.VAPID_PUBLIC_KEY;
  assert.equal((await invoke(cron,{method:'GET',headers:{authorization:'Bearer test-cron-key'}})).status,503);
  if(vapid!==undefined)process.env.VAPID_PUBLIC_KEY=vapid;
 }finally{if(old===undefined)delete process.env.CRON_SECRET;else process.env.CRON_SECRET=old;}
});
function invoke(handler,req){
 return new Promise((resolve,reject)=>{
  const response={status(n){this.code=n;return this;},setHeader(){},json(body){resolve({status:this.code||200,body});}};
  Promise.resolve(handler(req,response)).catch(reject);
 });
}

test('browser push endpoint whitelist blocks SSRF targets and malicious ports',()=>{
 for(const endpoint of [
  'https://127.0.0.1/private','https://169.254.169.254/latest/meta-data',
  'https://fcm.googleapis.com.evil.example/path',
  'https://localhost/','http://fcm.googleapis.com/fcm/send/abc',
  'https://fcm.googleapis.com:8443/message','https://user:pass@fcm.googleapis.com/message',
  'https://[::1]/local','https://192.168.1.1/private'
 ])assert.equal(trustedPushEndpoint(endpoint),false,endpoint);
 for(const endpoint of [
  'https://fcm.googleapis.com/fcm/send/example',
  'https://updates.push.services.mozilla.com/wpush/v2/example',
  'https://web.push.apple.com/Qexample',
  'https://wps.notify.windows.com/?token=test'
 ])assert.equal(trustedPushEndpoint(endpoint),true,endpoint);
});
test('push subscriptions must have reasonable browser keys',()=>{
 assert.equal(validPushSubscription({endpoint:'https://localhost/x',keys:{auth:'abcdefgh',p256dh:'abcdefgh'}}),false);
 assert.equal(validPushSubscription({endpoint:'https://fcm.googleapis.com/a',keys:{auth:'abcdefghijk',p256dh:'abcdefghijklmnop'}}),true);
 assert.equal(validPushSubscription({endpoint:'https://fcm.googleapis.com/a',keys:{auth:'<script>',p256dh:'abcdefgh'}}),false);
});
