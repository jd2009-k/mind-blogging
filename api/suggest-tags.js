import {authenticated,getRecord,send} from './_shared.js';
export default async function handler(req,res){
 if(req.method!=='POST')return send(res,405,{error:'POST only'});
 const a=await authenticated(req,res);if(!a)return;
 const id=String(req.body?.entryId||'');
 if(!/^[0-9a-f-]{36}$/i.test(id))return send(res,422,{error:'Invalid entry ID'});
 try{
  const [entry,prefs]=await Promise.all([
   getRecord(a.supabase,a.user.id,'entries',id),
   getRecord(a.supabase,a.user.id,'settings','00000000-0000-0000-0000-000000000001')]);
  if(!entry)return send(res,404,{error:'Entry not found'});
  if(!prefs?.aiConsent||entry.aiExcluded)return send(res,403,{error:'AI consent required for this entry.'});
  const body=String(entry.body||'').toLowerCase();
  const topics=[['teamwork',['collaborat','team','cowork','colleague']],['leadership',['led ','leader','mentored','managed']],['problem-solving',['solved','fixed','debug','issue','challenge']],['communication',['present','meeting','explain','wrote']],['planning',['planned','organize','roadmap','priorit']],['learning',['learn','studied','training','course']],['delivery',['shipped','delivered','launched','completed']],['feedback',['feedback','review','suggestion']]];
  return send(res,200,{tags:topics.filter(([,words])=>words.some(w=>body.includes(w))).slice(0,5).map(([label])=>({label,kind:'Suggested from journal text'}))});
 }catch(e){console.error('Tag action error',String(e).slice(0,150));return send(res,503,{error:'Unable to suggest tags.'});}
}