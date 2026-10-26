import {createClient} from '@supabase/supabase-js';
import {list,del} from '@vercel/blob';
import {authenticated,send} from './_shared.js';

const url='https://laodxcqxfbzoeetlfxyd.supabase.co';
const publishable='sb_publishable_wDgvpfzO9urXXQxj52z3Aw_FTCgDdif';
const RECENT_LOGIN_MS=15*60*1000;

export default async function handler(req,res){
  if(req.method!=='POST')return send(res,405,{error:'POST only'});
  res.setHeader('Cache-Control','no-store');
  // Fail closed before touching user data when production secret is unavailable.
  const adminSecret=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!adminSecret)return send(res,503,{error:'Account deletion is not configured. Contact support.'});
  const confirmation=req.body?.confirmation, confirmEmail=String(req.body?.confirmEmail||'').trim().toLowerCase();
  if(confirmation!=='DELETE MY DATA')return send(res,422,{error:'Type DELETE MY DATA to confirm.'});
  const session=await authenticated(req,res);if(!session)return;
  const user=session.user;
  if(!user.email||confirmEmail!==user.email.toLowerCase()){
    return send(res,422,{error:'Confirm your signed-in account email.'});
  }
  // last_sign_in_at is supplied by Supabase Auth, not by the client or JWT metadata.
  const signedInAt=Date.parse(user.last_sign_in_at||'');
  if(!Number.isFinite(signedInAt)||Date.now()-signedInAt>RECENT_LOGIN_MS||signedInAt>Date.now()+30000){
    return send(res,403,{error:'Sign out, sign in again, and retry deletion within 15 minutes.'});
  }
  const admin=createClient(url,adminSecret,{auth:{persistSession:false,autoRefreshToken:false}});
  try{
    const {data,error}=await admin.auth.admin.getUserById(user.id);
    if(error||!data.user||data.user.id!==user.id)return send(res,403,{error:'Account verification failed.'});
    if(!data.user.last_sign_in_at||Date.now()-Date.parse(data.user.last_sign_in_at)>RECENT_LOGIN_MS){
      return send(res,403,{error:'A fresh sign-in is required before deleting this account.'});
    }
    // Unsubscribe first. If cleanup fails, retain the account and its DB records.
    let cursor;
    do{
      const page=await list({prefix:'mindblog-push/'+user.id+'/',limit:100,cursor});
      for(const item of page.blobs){await del(item.url);}
      cursor=page.cursor;
    }while(cursor);
    // Database FK mind_blog_records_user_id_fkey has ON DELETE CASCADE.
    // Supabase Auth removes refresh sessions; existing JWTs expire naturally.
    const {error:deleteError}=await admin.auth.admin.deleteUser(user.id);
    if(deleteError)throw deleteError;
    return send(res,200,{complete:true});
  }catch(e){
    console.error('Account deletion failed at a privileged step',e?.name||'UnknownError');
    return send(res,503,{error:'Deletion could not be completed. Your account may still exist. Sign in and retry or contact support.'});
  }
}
