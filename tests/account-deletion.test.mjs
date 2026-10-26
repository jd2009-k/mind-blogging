import test from 'node:test';
import assert from 'node:assert/strict';
import {eraseAccount} from '../api/account-delete-core.mjs';

const now=Date.parse('2026-10-26T12:00:00Z');
const user={id:'owner-123',email:'account@example.com',last_sign_in_at:new Date(now-60000).toISOString()};
const valid={confirmation:'DELETE MY ACCOUNT',email:' ACCOUNT@EXAMPLE.COM '};
function deps(overrides={}){
  const calls=[];
  return {calls,opts:{user,body:valid,now,
    clearPush:async id=>{calls.push('push:'+id);},
    deleteAuthUser:async id=>{calls.push('delete:'+id);},...overrides}};
}
test('deletion fails closed without exact phrase and matching current email',async()=>{
  for(const body of [{...valid,confirmation:'DELETE MY DATA'},{...valid,email:'other@example.com'},{}]){
    const {opts,calls}=deps({body});
    const result=await eraseAccount(opts);
    assert.equal(result.status,422);
    assert.deepEqual(calls,[]);
  }
});
test('deletion requires a fresh provider sign-in (not just a refreshed JWT)',async()=>{
  const {opts,calls}=deps({user:{...user,last_sign_in_at:new Date(now-16*60000).toISOString()}});
  assert.equal((await eraseAccount(opts)).status,403);
  assert.deepEqual(calls,[]);
});
test('deletion removes push before deleting only the authenticated user',async()=>{
  const {opts,calls}=deps();
  assert.deepEqual(await eraseAccount(opts),{status:200,body:{complete:true}});
  assert.deepEqual(calls,['push:owner-123','delete:owner-123']);
});
test('push cleanup failure must not delete account',async()=>{
  const {opts,calls}=deps({clearPush:async()=>{calls.push('push-error');throw Error('fail');}});
  assert.equal((await eraseAccount(opts)).status,503);
  assert.deepEqual(calls,['push-error']);
});
test('auth admin deletion failure is reported, not falsely marked complete',async()=>{
  const {opts,calls}=deps({deleteAuthUser:async()=>{calls.push('auth-error');throw Error('fail');}});
  assert.equal((await eraseAccount(opts)).status,503);
  assert.deepEqual(calls,['push:owner-123','auth-error']);
});
