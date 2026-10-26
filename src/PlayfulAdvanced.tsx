import {useEffect,useRef,useState} from 'react';
import {
  ArrowLeft,ArrowRight,Bell,BookOpen,BrainCircuit,Check,CheckCircle2,
  Download,FileText,Lightbulb,LockKeyhole,RefreshCw,Save,ShieldCheck,
  Sparkles,Trash2, X
} from 'lucide-react';
import {api,auth,notifications} from './cloud';
import './playful-advanced.css';

type Entry={id:string;title:string;body:string;date:string;version:number;aiExcluded?:boolean};
type Artifact={id:string;title:string;description?:string;sourceEntryId?:string;sourceVersion?:number;deletedAt?:string};
type Review={id:string;body:string;artifactIds:string[];periodStart?:string;periodEnd?:string;version:number;createdAt:string};
type Settings={aiConsent:boolean;weeklyReview:boolean;initiative?:string;timezone?:string;version:number};
type Snapshot={entries:Entry[];artifacts:Artifact[];reviews:Review[];settings:Settings;goals:unknown[]};
type Props={onBack:()=>void;onJournal:()=>void};

const safeDate=(value:string)=>{try{return new Date(value).toLocaleDateString();}catch{return value;}};
const sayError=(e:unknown)=>e instanceof Error?e.message:'Something went wrong. Please retry.';
const download=(filename:string,content:string)=>{
  const url=URL.createObjectURL(new Blob([content],{type:'application/json;charset=utf-8'}));
  const anchor=document.createElement('a');anchor.href=url;anchor.download=filename;
  document.body.appendChild(anchor);anchor.click();anchor.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
};
export default function PlayfulAdvanced({onBack,onJournal}:Props){
  const [snapshot,setSnapshot]=useState<Snapshot|null>(null);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState('');
  const [entryId,setEntryId]=useState('');
  const [directive,setDirective]=useState('normal');
  const [reflection,setReflection]=useState('');
  const [suggestions,setSuggestions]=useState<string[]>([]);
  const [evidenceIds,setEvidenceIds]=useState<string[]>([]);
  const [reviewBody,setReviewBody]=useState('');
  const [editingReview,setEditingReview]=useState<string|null>(null);
  const abort=useRef<AbortController|null>(null);
  const load=async()=>{
    setBusy('loading');setError('');
    try{
      const {data}=await api.get('/api/bootstrap');
      const next:Snapshot={
        entries:(data.entries||[]) as Entry[],
        artifacts:((data.artifacts||[]) as Artifact[]).filter(a=>!a.deletedAt),
        reviews:(data.reviews||[]) as Review[],
        goals:data.goals||[],
        settings:{
          aiConsent:!!data.settings?.aiConsent,
          weeklyReview:!!data.settings?.weeklyReview,
          initiative:data.settings?.initiative||'guided',
          timezone:data.settings?.timezone||'Asia/Kolkata',
          version:Number(data.settings?.version||0)
        }
      };
      setSnapshot(next);
      setEntryId(current=>next.entries.some(e=>e.id===current)?current:(next.entries[0]?.id||''));
    }catch(e){setError(sayError(e));}
    finally{setBusy('');}
  };
  useEffect(()=>{
    let active=true;
    api.get('/api/bootstrap').then(({data})=>{
      if(!active)return;
      const next:Snapshot={
        entries:data.entries||[],artifacts:(data.artifacts||[]).filter((a:Artifact)=>!a.deletedAt),
        reviews:data.reviews||[],goals:data.goals||[],
        settings:{
          aiConsent:!!data.settings?.aiConsent,
          weeklyReview:!!data.settings?.weeklyReview,
          initiative:data.settings?.initiative||'guided',
          timezone:data.settings?.timezone||'Asia/Kolkata',
          version:Number(data.settings?.version||0)
        }
      };
      setSnapshot(next);setEntryId(next.entries[0]?.id||'');
    }).catch(e=>{if(active)setError(sayError(e));})
      .finally(()=>{if(active)setBusy('');});
    setBusy('loading');
    return()=>{active=false;abort.current?.abort();};
  },[]);
  const feedback=(value:string)=>{setMessage(value);setError('');};
  const toggleAI=async()=>{
    if(!snapshot)return;
    const newValue=!snapshot.settings.aiConsent;
    if(newValue && !window.confirm('Enable optional AI processing of journal entries you select? Content can be sent to an external AI provider.'))return;
    setBusy('ai');setError('');
    try{
      const {data}=await api.put('/api/settings',{aiConsent:newValue});
      setSnapshot(p=>p?{...p,settings:{...p.settings,...data.settings,aiConsent:newValue}}:p);
      if(!newValue){abort.current?.abort();setReflection('');}
      feedback(newValue?'AI consent enabled for eligible entries.':'AI processing disabled.');
    }catch(e){setError(sayError(e));}
    finally{setBusy('');}
  };
  const toggleExclusion=async(entry:Entry)=>{
    setBusy('exclusion');setError('');
    try{
      const {data}=await api.put('/api/entries/'+encodeURIComponent(entry.id),{
        aiExcluded:!entry.aiExcluded,expectedVersion:entry.version
      });
      setSnapshot(p=>p?{...p,entries:p.entries.map(e=>e.id===entry.id?data.entry:e)}:p);
      if(entry.id===entryId){setReflection('');setSuggestions([]);}
      feedback(!entry.aiExcluded?'Entry excluded from AI.':'Entry made eligible for AI (consent still required).');
    }catch(e){setError(sayError(e));}
    finally{setBusy('');}
  };
  const reflect=async()=>{
    if(!snapshot?.settings.aiConsent)return setError('Enable AI consent first.');
    const selected=snapshot.entries.find(e=>e.id===entryId);
    if(!selected||selected.aiExcluded)return setError('Choose a non-excluded journal entry.');
    abort.current?.abort();
    const controller=new AbortController();abort.current=controller;
    setBusy('reflection');setReflection('');setError('');setSuggestions([]);
    try{
      const token=await auth.getAccessToken();
      if(!token)throw new Error('Sign in to use AI reflections.');
      const response=await fetch('/api/ai',{
        method:'POST',signal:controller.signal,
        headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
        body:JSON.stringify({entryId,directive})
      });
      if(!response.ok){
        const json=await response.json().catch(()=>({}));
        throw new Error(json.error||'AI reflection unavailable.');
      }
      if(!response.body)throw new Error('Your browser does not support streamed reflections.');
      const reader=response.body.getReader(),decoder=new TextDecoder();
      let text='';
      while(true){
        const {value,done}=await reader.read();
        if(done)break;
        text+=decoder.decode(value,{stream:true});
        setReflection(text);
      }
      text+=decoder.decode();
      setReflection(text);
      feedback('Reflection complete. Check the result against your original note.');
    }catch(e){
      if(!controller.signal.aborted)setError(sayError(e));
    }finally{if(abort.current===controller){abort.current=null;setBusy('');}}
  };
  const tag=async()=>{
    const selected=snapshot?.entries.find(e=>e.id===entryId);
    if(!snapshot?.settings.aiConsent||!selected||selected.aiExcluded){
      return setError('Enable AI consent and select an eligible entry.');
    }
    setBusy('tags');setError('');
    try{
      const {data}=await api.post('/api/suggest-tags',{entryId});
      setSuggestions((data.tags||[]).map((x:{label:string})=>x.label));
      feedback('Tag suggestions are based on the selected saved note.');
    }catch(e){setError(sayError(e));}
    finally{setBusy('');}
  };
  const toggleEvidence=(id:string)=>setEvidenceIds(old=>old.includes(id)?old.filter(x=>x!==id):[...old,id]);
  const startEdit=(r:Review)=>{
    setEditingReview(r.id);setReviewBody(r.body);setEvidenceIds(r.artifactIds);
    setError('');setMessage('');
  };
  const clearReview=()=>{setEditingReview(null);setReviewBody('');setEvidenceIds([]);};
  const saveReview=async()=>{
    if(!snapshot)return;
    if(!reviewBody.trim())return setError('Enter a review before saving.');
    if(!evidenceIds.length)return setError('Choose at least one saved evidence card.');
    const selected=snapshot.reviews.find(r=>r.id===editingReview);
    setBusy('review');setError('');
    try{
      const payload={body:reviewBody.trim().slice(0,14000),
        artifactIds:evidenceIds,periodStart:selected?.periodStart||'',
        periodEnd:selected?.periodEnd||''};
      const response=selected
        ?await api.put('/api/reviews/'+encodeURIComponent(selected.id),
          {...payload,expectedVersion:selected.version})
        :await api.post('/api/reviews',payload);
      const updated=(response.data.review||response.data.goal) as Review;
      if(!updated?.id)throw new Error('Review response was incomplete.');
      setSnapshot(p=>p?{...p,reviews:selected?
        p.reviews.map(r=>r.id===selected.id?updated:r):[updated,...p.reviews]}:p);
      setEditingReview(updated.id);
      feedback(selected?'Review updated.':'Evidence-backed review saved.');
    }catch(e){setError(sayError(e));}
    finally{setBusy('');}
  };
  const deleteReview=async(id:string)=>{
    if(!window.confirm('Permanently delete this saved review?'))return;
    setBusy('review');setError('');
    try{
      await api.delete('/api/reviews/'+encodeURIComponent(id));
      setSnapshot(p=>p?{...p,reviews:p.reviews.filter(r=>r.id!==id)}:p);
      if(editingReview===id)clearReview();
      feedback('Review deleted.');
    }catch(e){setError(sayError(e));}
    finally{setBusy('');}
  };
  const exportData=async()=>{
    setBusy('export');setError('');
    try{
      const {data}=await api.get('/api/bootstrap');
      download('mind-blogging-private-export-'+new Date().toISOString().slice(0,10)+'.json',
        JSON.stringify({...data,exportedAt:new Date().toISOString()},null,2));
      feedback('Account data export downloaded.');
    }catch(e){setError(sayError(e));}
    finally{setBusy('');}
  };
  const reminders=async()=>{
    if(!snapshot)return;
    setBusy('reminders');setError('');
    try{
      if(snapshot.settings.weeklyReview){
        await notifications.unsubscribe();
        const {data}=await api.put('/api/settings',{weeklyReview:false});
        setSnapshot(p=>p?{...p,settings:{...p.settings,...data.settings,weeklyReview:false}}:p);
      }else{
        await notifications.subscribe();
        const {data}=await api.get('/api/bootstrap');
        setSnapshot(p=>p?{...p,settings:{...p.settings,...data.settings,weeklyReview:true}}:p);
      }
      feedback('Reminder preferences saved.');
    }catch(e){setError(sayError(e));}
    finally{setBusy('');}
  };
  const erase=async()=>{
    const user=await auth.getUser();
    if(!user?.email){setError('Sign in with a confirmed email before requesting account deletion.');return;}
    const typedEmail=window.prompt('Confirm your account email to permanently delete this account:');
    if(!typedEmail || typedEmail.trim().toLowerCase()!==user.email.toLowerCase()){
      setError('Account email does not match. No data was deleted.');return;
    }
    if(window.prompt('Type DELETE MY DATA to delete your account, journal and goals:')!=='DELETE MY DATA')return;
    setBusy('erase');setError('');
    try{
      const result=await api.post('/api/account/erase',{
        confirmation:'DELETE MY DATA',confirmEmail:typedEmail.trim()
      });
      if(!result.data?.complete)throw new Error('Deletion was not confirmed by the server.');
      await auth.signOut();
      window.location.assign('/');
    }catch(e){setError(sayError(e));setBusy('');}
  };
  const sorted=[...(snapshot?.entries||[])].sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  const active=sorted.find(e=>e.id===entryId);
  const evidence=(snapshot?.artifacts||[]).filter(a=>
    a.sourceEntryId && sorted.some(e=>e.id===a.sourceEntryId));
  const saving=!!busy;
  return <div className="page-screen pa-page">
    <div className="page-heading pa-heading">
      <div><span className="eyebrow">A LITTLE MORE MAGIC</span>
        <h1>AI &amp; <em>advanced tools.</em> <span aria-hidden="true">✦</span></h1>
        <p>Thoughtful reflections, real evidence and private account controls—all in your studio.</p>
      </div>
      <button type="button" className="secondary-button" onClick={onBack}>
        <ArrowLeft size={18}/> Back to my space
      </button>
    </div>
    {error && <div className="pa-banner pa-error" role="alert">{error}<button onClick={()=>setError('')} aria-label="Dismiss error"><X size={17}/></button></div>}
    {message && <div className="pa-banner pa-success" role="status"><CheckCircle2 size={18}/>{message}<button onClick={()=>setMessage('')} aria-label="Dismiss message"><X size={17}/></button></div>}
    {!snapshot? <section className="panel pa-loading" role="status"><Sparkles size={23}/> {busy==='loading'?'Loading your private tools…':'Unable to load private tools.'}
      <button className="secondary-button" onClick={()=>void load()}>Retry</button></section> :
    <>
      <section className="pa-intro panel">
        <span className="pa-spark"><BrainCircuit size={35}/></span>
        <div><span className="eyebrow">YOU ARE IN CONTROL</span>
          <h2>Reflect on purpose.</h2>
          <p>AI is off until you explicitly enable it. Excluded notes will never be submitted by this tool.</p>
        </div>
        <button type="button" role="switch" aria-label="Allow AI processing" aria-checked={snapshot.settings.aiConsent}
          disabled={saving} onClick={()=>void toggleAI()}
          className={'toggle'+(snapshot.settings.aiConsent?' on':'')}><span/></button>
      </section>
      <div className="pa-grid">
        <section className="panel pa-card">
          <div className="pa-card-head"><span className="pa-icon"><Sparkles size={22}/></span>
            <div><span className="eyebrow">A SECOND PERSPECTIVE</span><h2>AI reflection</h2></div>
          </div>
          <label className="field-label" htmlFor="pa-entry">Choose your saved moment</label>
          <select id="pa-entry" className="input full" value={entryId}
            onChange={e=>{setEntryId(e.target.value);setReflection('');setSuggestions([]);}}>
            {sorted.length?<>{sorted.map(e=><option value={e.id} key={e.id}>{e.title}{e.aiExcluded?' · excluded':''}</option>)}</>:
            <option value="">No journal entries yet</option>}
          </select>
          {active && <div className="pa-entry-status">
            <span><BookOpen size={15}/> {active.date} · {active.body?.length||0} characters</span>
            <button type="button" disabled={saving} className="text-link" onClick={()=>void toggleExclusion(active)}>
              {active.aiExcluded?'Allow this note for AI':'Exclude this note from AI'}
            </button>
          </div>}
          <label className="field-label" htmlFor="pa-directive">Reflection style</label>
          <select id="pa-directive" className="input full" value={directive} onChange={e=>setDirective(e.target.value)}>
            <option value="normal">Balanced and grounded</option>
            <option value="concise">Short and focused</option>
            <option value="solutions">Practical next step</option>
            <option value="example">Hypothetical example</option>
          </select>
          <div className="pa-action-row">
            <button type="button" className="primary-button" onClick={()=>void reflect()}
              disabled={saving||!snapshot.settings.aiConsent||!active||!!active.aiExcluded}>
              <Sparkles size={17}/>{busy==='reflection'?'Reflecting…':'Reflect on this entry'}
            </button>
            <button type="button" className="secondary-button" onClick={()=>void tag()}
              disabled={saving||!snapshot.settings.aiConsent||!active||!!active.aiExcluded}>
              <Lightbulb size={17}/> Suggest tags
            </button>
            {busy==='reflection' && <button type="button" className="secondary-button" onClick={()=>{
              abort.current?.abort();abort.current=null;setBusy('');feedback('Reflection stopped.');
            }}>Stop</button>}
          </div>
          {reflection && <div className="pa-output"><strong>YOUR REFLECTION</strong>
            <p>{reflection}</p><small>AI can make mistakes. Verify against your own experience.</small>
          </div>}
          {!!suggestions.length && <div className="pa-tags">{suggestions.map(t=><span key={t}>#{t}</span>)}</div>}
          {!snapshot.settings.aiConsent && <p className="pa-help"><LockKeyhole size={16}/> Turn on AI consent above to use these tools.</p>}
          {!sorted.length && <button type="button" className="soft-button" onClick={onJournal}>Open your journal <ArrowRight size={16}/></button>}
        </section>

        <section className="panel pa-card">
          <div className="pa-card-head"><span className="pa-icon pa-mint"><FileText size={22}/></span>
            <div><span className="eyebrow">EVIDENCE OVER OPINION</span><h2>Career reviews</h2></div>
          </div>
          <p className="pa-help">Choose approved evidence cards. Saved reviews are private to your account.</p>
          <div className="pa-evidence" role="group" aria-label="Review evidence">
            {evidence.length?evidence.map(a=><label className="pa-evidence-row" key={a.id}>
              <input type="checkbox" checked={evidenceIds.includes(a.id)} onChange={()=>toggleEvidence(a.id)}/>
              <span><strong>{a.title||'Approved evidence'}</strong><small>{a.description?.slice(0,100)||'Linked to your journal'}</small></span>
            </label>):<p>No approved evidence yet. Mark an entry as evidence in Capture.</p>}
          </div>
          <label className="field-label" htmlFor="pa-review">Your career review</label>
          <textarea id="pa-review" className="input full pa-review-text" rows={7} value={reviewBody}
            onChange={e=>setReviewBody(e.target.value)}
            placeholder="Describe your progress and the specific evidence supporting it…"/>
          <div className="pa-action-row">
            <button type="button" className="primary-button" disabled={saving||!evidenceIds.length||!reviewBody.trim()}
              onClick={()=>void saveReview()}><Save size={16}/>
              {editingReview?'Update review':'Save evidence-backed review'}</button>
            {editingReview && <button type="button" className="secondary-button" onClick={clearReview}>
              New review
            </button>}
          </div>
          <h3 className="pa-saved-heading">Saved reviews</h3>
          <div className="pa-reviews">
            {(snapshot.reviews||[]).length?snapshot.reviews.map(r=><div className="pa-saved" key={r.id}>
              <span><strong>Career review</strong><small>{safeDate(r.createdAt)} · {r.artifactIds?.length||0} sources</small></span>
              <button type="button" disabled={saving} aria-label="Edit saved review" onClick={()=>startEdit(r)}>Edit</button>
              <button type="button" disabled={saving} className="pa-danger-link" aria-label="Delete saved review"
                onClick={()=>void deleteReview(r.id)}><Trash2 size={16}/></button>
            </div>):<p className="pa-empty">No reviews saved yet.</p>}
          </div>
        </section>
      </div>
      <section className="panel pa-data">
        <div className="pa-data-heading"><ShieldCheck size={26}/>
          <div><span className="eyebrow">YOUR DATA, YOUR CHOICE</span><h2>Account, reminders &amp; export</h2>
            <p>These controls affect your actual signed-in account.</p></div>
        </div>
        <div className="pa-setting-line"><span><Bell size={20}/><strong>Weekly reflection reminders</strong></span>
          <button type="button" role="switch" aria-checked={snapshot.settings.weeklyReview}
            aria-label="Weekly reminders" className={'toggle'+(snapshot.settings.weeklyReview?' on':'')}
            disabled={saving} onClick={()=>void reminders()}><span/></button>
        </div>
        <div className="pa-data-actions">
          <button type="button" className="secondary-button" disabled={saving} onClick={()=>void exportData()}>
            <Download size={17}/> Export account data
          </button>
          <button type="button" className="secondary-button" disabled={saving} onClick={()=>void load()}>
            <RefreshCw size={17}/> Refresh tools
          </button>
        </div>
        <div className="pa-danger-zone">
          <span><LockKeyhole size={19}/><strong>Erase all Mind Blogging records</strong>
            <small>This cannot be undone. Your identity provider account is not deleted.</small></span>
          <button type="button" disabled={saving} onClick={()=>void erase()} className="pa-erase">
            <Trash2 size={16}/> Erase my data
          </button>
        </div>
      </section>
      <div className="pa-bottom-nav">
        <button type="button" className="secondary-button" onClick={onBack}><ArrowLeft size={17}/> Back to overview</button>
        <button type="button" className="secondary-button" onClick={onJournal}><BookOpen size={17}/> My journal <ArrowRight size={17}/></button>
      </div>
    </>}
  </div>;
}
