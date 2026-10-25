import {createClient} from '@supabase/supabase-js';
const url='https://laodxcqxfbzoeetlfxyd.supabase.co';
const key='sb_publishable_wDgvpfzO9urXXQxj52z3Aw_FTCgDdif';
export const send=(res,status,body)=>res.status(status).json(body);
export async function authenticated(req,res){
 const header=String(req.headers.authorization||'');
 if(!header.startsWith('Bearer ')){send(res,401,{error:'Sign in required.'});return null;}
 const token=header.slice(7);
 const sb=createClient(url,key,{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await sb.auth.getUser(token);
 if(error||!data.user){send(res,401,{error:'Invalid or expired session.'});return null;}
 return {user:data.user,supabase:sb};
}
export async function getRecord(sb,userId,kind,id){
 const {data,error}=await sb.from('mind_blog_records').select('payload').eq('user_id',userId).eq('kind',kind).eq('id',id).maybeSingle();
 if(error)throw new Error('Unable to access private record.');return data?.payload||null;
}