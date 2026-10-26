import {createClient} from '@supabase/supabase-js';
import {list,del} from '@vercel/blob';
import {authenticated,send} from './_shared.js';
import {eraseAccount} from './account-delete-core.mjs';

const prefix='mindblog-push/';
const supabaseUrl='https://laodxcqxfbzoeetlfxyd.supabase.co';

async function removePushForUser(userId){
  let cursor;
  do {
    const page=await list({prefix:prefix+userId+'/',limit:100,cursor});
    for(const blob of page.blobs) await del(blob.url);
    cursor=page.cursor;
  } while(cursor);
}
export default async function handler(req,res){
  if(req.method!=='POST')return send(res,405,{error:'POST only'});
  // Fail closed until a server-only credential has been configured on Vercel.
  const secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!secret)return send(res,503,{error:'Account deletion is not configured. Contact support.'});
  const session=await authenticated(req,res);
  if(!session)return;
  const admin=createClient(supabaseUrl,secret,{
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
  });
  const result=await eraseAccount({
    user:session.user,
    body:req.body,
    clearPush:removePushForUser,
    deleteAuthUser:async userId=>{
      const {error}=await admin.auth.admin.deleteUser(userId);
      if(error)throw error;
    }
  });
  return send(res,result.status,result.body);
}
