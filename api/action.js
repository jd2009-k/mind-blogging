import {authenticated,getRecord,send} from './_shared.js';
export default async function handler(req,res){
 if(req.method!=='POST')return send(res,405,{error:'POST only'});
 const a=await authenticated(req,res);if(!a)return;
 const {entryId,action,quote,start,end}=req.body||{};
 if(!/^[0-9a-f-]{36}$/i.test(String(entryId||'')))return send(res,422,{error:'Invalid entry ID'});
 if(!['accomplishment','feedback','goal','reframe'].includes(action))return send(res,422,{error:'Unsupported action'});
 try{
  const [entry,prefs]=await Promise.all([getRecord(a.supabase,a.user.id,'entries',entryId),getRecord(a.supabase,a.user.id,'settings','00000000-0000-0000-0000-000000000001')]);
  if(!entry)return send(res,404,{error:'Entry not found'});
  if(!prefs?.aiConsent||entry.aiExcluded)return send(res,403,{error:'AI consent required.'});
  const body=String(entry.body||''), text=String(quote||'').trim();
  if(!text||text.length>1500||!body.includes(text))return send(res,422,{error:'Select a passage from the saved entry.'});
  if(Number.isInteger(start)&&Number.isInteger(end)&&Array.from(body).slice(start,end).join('')!==text)return send(res,422,{error:'Selected quote does not match saved entry.'});
  if(action==='reframe')return send(res,200,{type:'reframe',text:'One possible interpretation: '+text+'\nWhat evidence would help you evaluate this situation fairly?'});
  const title=text.slice(0,90)+(text.length>90?'…':'');
  const proposal={title,description:text,outcome:'',nextStep:action==='goal'?'Describe a practical next step.':'',sourceEntryId:entry.id,sourceVersion:entry.version,quote:text};
  return send(res,200,{type:action,proposal});
 }catch(e){console.error('Selected-text action error',String(e).slice(0,150));return send(res,503,{error:'Could not prepare proposal.'});}
}