import {list,get,del} from '@vercel/blob';
import webpush from 'web-push';
import {validPushSubscription} from '../lib/push-validation.js';
export default async function handler(req,res){
 if(req.method!=='GET')return res.status(405).json({error:'GET only'});
 // Fail closed if the deployment secret is missing or empty.
 const secret=process.env.CRON_SECRET;
 if(!secret||req.headers.authorization!==`Bearer ${secret}`)return res.status(401).json({error:'Unauthorized'});
 if(!process.env.VAPID_PUBLIC_KEY||!process.env.VAPID_PRIVATE_KEY)return res.status(503).json({error:'Push not configured'});
 webpush.setVapidDetails('mailto:noreply@example.com',process.env.VAPID_PUBLIC_KEY,process.env.VAPID_PRIVATE_KEY);
 let cursor,sent=0,failed=0;
 try{do{
  const page=await list({prefix:'mindblog-push/',limit:100,cursor});
  for(const item of page.blobs){
   try{
    const file=await get(item.url,{access:'private'});if(!file?.stream)continue;
    const {subscription}=JSON.parse(await new Response(file.stream).text());if(!validPushSubscription(subscription)){failed++;await del(item.url);continue;}
    await webpush.sendNotification(subscription,JSON.stringify({title:'A moment to reflect',body:'Your weekly Mind Blogging check-in is ready.',url:'/'}),{TTL:86400});sent++;
   }catch(err){failed++;if([404,410].includes(err.statusCode))await del(item.url);}
  }
  cursor=page.cursor;
 }while(cursor);
 return res.status(200).json({sent,failed});
 }catch(err){console.error('Weekly push failed',String(err).slice(0,250));return res.status(503).json({error:'Weekly reminders temporarily unavailable.'});}
}