import {get,put,del,list} from '@vercel/blob';
import webpush from 'web-push';
import {authenticated,getRecord,send} from './_shared.js';
const prefix='mindblog-push/';
const configure=()=>{if(!process.env.VAPID_PUBLIC_KEY||!process.env.VAPID_PRIVATE_KEY)throw Error('Push keys missing');webpush.setVapidDetails('mailto:noreply@example.com',process.env.VAPID_PUBLIC_KEY,process.env.VAPID_PRIVATE_KEY);};
async function subscribers(userId){let cursor;const out=[];do{const page=await list({prefix:prefix+userId+'/',limit:100,cursor});out.push(...page.blobs);cursor=page.cursor;}while(cursor);return out;}
export default async function handler(req,res){
 if(req.method==='GET'&&req.query.mode==='key')return send(res,200,{key:process.env.VAPID_PUBLIC_KEY||null});
 if(!['POST','DELETE'].includes(req.method))return send(res,405,{error:'Unsupported method'});
 const session=await authenticated(req,res);if(!session)return;
 try{
  if(req.method==='POST'&&req.query.mode==='subscribe'){
   const pref=await getRecord(session.supabase,session.user.id,'settings','00000000-0000-0000-0000-000000000001');
   if(!pref?.weeklyReview)return send(res,403,{error:'Enable reminders first.'});
   const sub=req.body?.subscription;
   if(!String(sub?.endpoint||'').startsWith('https://')||!sub?.keys?.auth||!sub?.keys?.p256dh)return send(res,422,{error:'Invalid subscription.'});
   const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(sub.endpoint));
   const name=Buffer.from(digest).toString('hex');
   await put(prefix+session.user.id+'/'+name+'.json',JSON.stringify({subscription:sub}),{access:'private',addRandomSuffix:false,allowOverwrite:true,contentType:'application/json'});
   return send(res,200,{ok:true});
  }
  if(req.method==='DELETE'&&req.query.mode==='unsubscribe'){
   const all=await subscribers(session.user.id);await Promise.all(all.map(x=>del(x.url)));
   return send(res,200,{ok:true});
  }
  if(req.method==='POST'&&req.query.mode==='test'){
   configure();let sent=0,failed=0;
   for(const item of await subscribers(session.user.id)){
    const file=await get(item.url,{access:'private'});
    if(!file?.stream)continue;
    const body=JSON.parse(await new Response(file.stream).text());
    try{await webpush.sendNotification(body.subscription,JSON.stringify({title:'Mind Blogging test',body:'Your notifications are working.',url:'/'}),{TTL:60});sent++;}
    catch(err){failed++;if([404,410].includes(err.statusCode))await del(item.url);}
   }
   return send(res,200,{sent:sent>0,delivered:sent,failed});
  }
  return send(res,404,{error:'Unknown push mode'});
 }catch(error){console.error('Push operation failed',String(error).slice(0,250));return send(res,503,{error:'Push notifications unavailable.'});}
}