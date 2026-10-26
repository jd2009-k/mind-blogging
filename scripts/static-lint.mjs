import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const source=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
for(const path of ['src/App.tsx','src/PlayfulProfile.tsx','src/PlayfulWorkspace.tsx','src/cloud.ts']){
 const s=source(path);
 assert.doesNotMatch(s,/sb_secret_[A-Za-z0-9]{10,}|service_role_[A-Za-z0-9]{10,}|-----BEGIN (RSA |EC )?PRIVATE KEY-----/);
 assert.doesNotMatch(s,/localStorage\.getItem\(['"]mind-blogging-personal-profile-v1/);
}
assert.match(source('api/delete-account.js'),/SUPABASE_SERVICE_ROLE_KEY/);
assert.match(source('api/cron.js'),/!secret/);
assert.match(source('api/push.js'),/validPushSubscription/);
console.log('Security static lint passed (not a full ESLint or SAST scan).');
