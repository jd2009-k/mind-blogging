import {createClient} from '@supabase/supabase-js';
export type AuthUser={userId:string;email?:string;name?:string;scope:string};
const sb=createClient('https://laodxcqxfbzoeetlfxyd.supabase.co','sb_publishable_wDgvpfzO9urXXQxj52z3Aw_FTCgDdif',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
type Row=Record<string,any>;
type Kind='entries'|'artifacts'|'goals'|'reviews'|'settings';
const sid='00000000-0000-0000-0000-000000000001';
const defaults={initiative:'guided',aiConsent:false,weeklyReview:false,timezone:'Asia/Kolkata',version:0};
const guid=()=>crypto.randomUUID(),stamp=()=>new Date().toISOString();
function fail(message:string,status=400):never{throw Object.assign(new Error(message),{status,response:{status,data:{error:message}}});}
async function session(){const {data,error}=await sb.auth.getUser();if(error||!data.user)fail('Please sign in.',401);return data.user;}
async function read(kind:Kind):Promise<Row[]>{const user=await session();let results:Row[]=[];for(let p=0;p<100;p++){const {data,error}=await sb.from('mind_blog_records').select('payload').eq('user_id',user.id).eq('kind',kind).range(p*500,p*500+499);if(error)fail('Unable to load private records.');results.push(...(data||[]).map((r:any)=>r.payload));if((data||[]).length<500)break;}return results;}
async function write(kind:Kind,r:Row){const user=await session();const {error}=await sb.from('mind_blog_records').upsert({user_id:user.id,kind,id:r.id,payload:r},{onConflict:'user_id,kind,id'});if(error)fail('Could not save. '+error.message);return r;}
async function remove(kind:Kind,id:string){const user=await session();const {error}=await sb.from('mind_blog_records').delete().eq('user_id',user.id).eq('kind',kind).eq('id',id);if(error)fail('Could not delete record.');}
async function one(kind:Kind,id:string){return (await read(kind)).find(r=>r.id===id);}
async function settings(){return (await one('settings',sid))||{...defaults,id:sid};}
function success(data:any){return {data};}
async function request(method:string,path:string,body:any={}):Promise<{data:any}>{
 const url=new URL(path,'https://mind-blogging.invalid'),parts=url.pathname.split('/').filter(Boolean);
 const route=parts[1]||'',id=parts[2]||'';
 if(route==='bootstrap'){const [entries,artifacts,goals,reviews,prefs]=await Promise.all([read('entries'),read('artifacts'),read('goals'),read('reviews'),settings()]);return success({entries,artifacts,goals,reviews,settings:prefs,cursors:{}});}
 if(route==='collection'){const rows=await read(id as Kind);return success({items:rows,nextToken:null});}
 if(route==='settings'&&method==='PUT'){const old=await settings();return success({settings:await write('settings',{...old,...body,id:sid,version:(old.version||0)+1})});}
 if(route==='entries'||route==='artifacts'||route==='goals'||route==='reviews'){
  const kind=route as Kind;if(method==='GET'&&id){const r=await one(kind,id);if(!r)fail('Record not found',404);return success({[kind==='entries'?'entry':kind.slice(0,-1)]:r});}
  if(method==='POST'){const time=stamp();const r=await write(kind,{...body,id:body.id||guid(),createdAt:time,updatedAt:time,version:1});
   return success({[kind==='entries'?'entry':kind==='artifacts'?'artifact':kind==='goals'?'goal':'review']:r});}
  if(method==='PUT'&&id){const prev=await one(kind,id);if(!prev)fail('Record not found',404);if(body.expectedVersion!==undefined&&body.expectedVersion!==prev.version)fail('Another edit has changed this record.',409);
   const {expectedVersion,...fields}=body;const r=await write(kind,{...prev,...fields,id,version:(prev.version||0)+1,updatedAt:stamp()});return success({[kind==='entries'?'entry':kind==='artifacts'?'artifact':kind==='reviews'?'review':'goal']:r});}
  if(method==='DELETE'&&id){await remove(kind,id);if(kind==='entries'){for(const a of await read('artifacts'))if(a.sourceEntryId===id)await remove('artifacts',a.id);}return success({deleted:true});}
 }
 if(route==='account'&&parts[2]==='erase'&&method==='POST'){
   if(body.confirmation!=='DELETE MY DATA')fail('Confirmation required.',422);
   return success(await authenticatedFetch('/api/delete-account','POST',body));
 }
 if(route==='reminders'&&parts[2]==='test'&&method==='POST'){const r=await authenticatedFetch('/api/push?mode=test','POST',{});return success(r);}
 if((route==='suggest-tags'||route==='action')&&method==='POST'){return success(await authenticatedFetch('/api/'+route,'POST',body));}
 fail('Unsupported request: '+method+' '+path,404);
}
async function authenticatedFetch(path:string,method:string,body?:any){const token=await auth.getAccessToken();if(!token)fail('Please sign in.',401);const r=await fetch(path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});const j=await r.json().catch(()=>({}));if(!r.ok)fail(j.error||'Request failed',r.status);return j;}
export const api={get:(path:string)=>request('GET',path),post:(path:string,body?:any)=>request('POST',path,body),put:(path:string,body?:any)=>request('PUT',path,body),delete:(path:string)=>request('DELETE',path)};
/** Email auth stays inside this origin. The origin must be on Supabase's Auth redirect allow-list. */
const currentRedirect=()=>new URL('/',window.location.origin).toString();
const mapUser=(user:any):AuthUser=>({userId:user.id,email:user.email,name:user.user_metadata?.name,scope:'user'});
export const auth={
 getUser:async():Promise<AuthUser|null>=>{
  const {data,error}=await sb.auth.getUser();
  // No session on first visit is normal, but an existing session error must be visible.
  if(error && error.name!=='AuthSessionMissingError')throw error;
  return data.user?mapUser(data.user):null;
 },
 /** Email magic link: default Supabase email template sends a link, not a six-digit code. */
 signIn:async(email:string)=>{
  const {error}=await sb.auth.signInWithOtp({
   email:email.trim(),
   options:{emailRedirectTo:currentRedirect()}
  });
  if(error)fail(error.message,error.status||400);
  return {sent:true};
 },
 resetPassword:async(email:string)=>{
  const {error}=await sb.auth.resetPasswordForEmail(email.trim(),{
    redirectTo:currentRedirect()+'?passwordRecovery=1'
  });
  if(error)fail(error.message,error.status||400);
  return {sent:true};
 },
 updatePassword:async(password:string)=>{
  if(password.length<12)fail('Use at least 12 characters for a new password.',422);
  const {error}=await sb.auth.updateUser({password});
  if(error)fail(error.message,error.status||400);
  return {updated:true};
 },
 /** Email+password avoids cross-device magic-link redirects for existing confirmed users. */
 signInWithPassword:async(email:string,password:string)=>{
  const {data,error}=await sb.auth.signInWithPassword({email:email.trim(),password});
  if(error)fail(error.message,error.status||400);
  if(!data.user||!data.session)fail('Sign-in did not create a session. Confirm your email first.');
  return mapUser(data.user);
 },
 signUpWithPassword:async(email:string,password:string)=>{
  const {data,error}=await sb.auth.signUp({
   email:email.trim(),password,
   options:{emailRedirectTo:currentRedirect()}
  });
  if(error)fail(error.message,error.status||400);
  return {user:data.user&&data.session?mapUser(data.user):null,confirmationRequired:!data.session};
 },
 /** Only works if the Supabase email template supplies a visible OTP code. */
 verifyEmailCode:async(email:string,token:string)=>{
  const {data,error}=await sb.auth.verifyOtp({email:email.trim(),token:token.trim(),type:'email'});
  if(error)fail(error.message,error.status||400);
  if(!data.user||!data.session)fail('Code verification did not create a session.');
  return mapUser(data.user);
 },
 /** One Google action signs in returning users and creates accounts for new users. */
 signInWithGoogle:async()=>{
  const settingsResponse=await fetch('https://laodxcqxfbzoeetlfxyd.supabase.co/auth/v1/settings',{
   headers:{apikey:'sb_publishable_wDgvpfzO9urXXQxj52z3Aw_FTCgDdif'}
  });
  if(!settingsResponse.ok)fail('Unable to check Google sign-in availability. Try again.');
  const settings=await settingsResponse.json();
  if(!settings?.external?.google)fail('Google sign-in needs to be enabled in Supabase Authentication → Sign In / Providers → Google before you can continue.',503);
  const {data,error}=await sb.auth.signInWithOAuth({
   provider:'google',
   options:{redirectTo:currentRedirect()}
  });
  if(error)fail(error.message,error.status||400);
  if(!data?.url)fail('Google did not return a sign-in address. Please retry.');
 },
 onAuthStateChange:(callback:(event:string,user:AuthUser|null)=>void)=>{
  const {data:{subscription}}=sb.auth.onAuthStateChange((event,session)=>{
   callback(event,session?.user?mapUser(session.user):null);
  });
  return ()=>subscription.unsubscribe();
 },
 signOut:async()=>{const {error}=await sb.auth.signOut();if(error)fail(error.message);},
 getAccessToken:async()=>{const {data}=await sb.auth.getSession();return data.session?.access_token||null}
};
function fromBase64Url(value:string){const s=atob(value.replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(s,c=>c.charCodeAt(0));}
export const notifications={
 subscribe:async()=>{if(!('serviceWorker' in navigator)||!('PushManager' in window))fail('This browser does not support push notifications.');
  const permission=await Notification.requestPermission();if(permission!=='granted')fail('Notification permission was denied.');
  const worker=await navigator.serviceWorker.register('/sw.js');const ready=await navigator.serviceWorker.ready;
  const keyResponse=await fetch('/api/push?mode=key');const keyData=await keyResponse.json();if(!keyData.key)fail('Push notifications are not configured.');
  let subscription=await ready.pushManager.getSubscription();
  if(!subscription)subscription=await ready.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:fromBase64Url(keyData.key)});
  const prefs=await settings();await write('settings',{...prefs,weeklyReview:true,id:sid,version:(prefs.version||0)+1});
  return authenticatedFetch('/api/push?mode=subscribe','POST',{subscription:subscription.toJSON()});},
 unsubscribe:async(_options?:any)=>{const worker=await navigator.serviceWorker.getRegistration('/sw.js');const s=await worker?.pushManager.getSubscription();await authenticatedFetch('/api/push?mode=unsubscribe','DELETE',{});
   if(s)await s.unsubscribe();}
};
