import { useEffect, useMemo, useRef, useState } from 'react';
import {api,auth} from './cloud';
import type {AuthUser} from './cloud';
import PlayfulLogin from './PlayfulLogin';
import PlayfulAdvanced from './PlayfulAdvanced';
import './playful-full.css';
import {
  Home,
  PenLine,
  BookOpen,
  Sprout,
  Ellipsis,
  CalendarDays,
  Settings2,
  ArrowRight,
  ArrowUpRight,
  Plus,
  Search,
  X,
  Trash2,
  Moon,
  Sun,
  Download,
  RotateCcw,
  Tag,
  Check,
  Sparkles,
  ShieldCheck,
  Star,
  Heart,
  ChevronRight,
  Target,
  Lightbulb,
  Pencil,
  LockKeyhole,
  TrendingUp,
  UserRound,
} from 'lucide-react';

type Page =
  | 'overview'
  | 'capture'
  | 'journal'
  | 'growth'
  | 'reviews'
  | 'settings'
  | 'profile'
  | 'advanced';
type Category = 'Small win' | 'Challenge' | 'Idea' | 'Feedback';
type Entry = {
  id: string;
  title: string;
  notes: string;
  date: string;
  category: Category;
  tags: string[];
  evidence: boolean;
};
type Step = { id: string; label: string; done: boolean };
type Goal = { id: string; title: string; steps: Step[] };
type Prefs = { dark: boolean; motion: boolean; companion: boolean };
type Profile = {
  name: string;
  headline: string;
  bio: string;
  color: 'lilac' | 'coral' | 'mint' | 'amber';
};
type Data = {
  entries: Entry[];
  goals: Goal[];
  prefs: Prefs;
  profile?: Profile;
};
type Draft = {
  id?: string;
  title: string;
  notes: string;
  date: string;
  category: Category;
  tags: string;
  evidence: boolean;
};
const STORE_KEY = 'mind-blogging-playful-ui-settings-2026';
const DEFAULT_PROFILE: Profile = {
  name: 'Jay',
  headline: 'Your little wins explorer',
  bio: 'Making space for small moments and meaningful growth.',
  color: 'lilac',
};
const AVATAR_COLORS: { color: Profile['color']; label: string }[] = [
  { color: 'lilac', label: 'Lilac' },
  { color: 'coral', label: 'Coral' },
  { color: 'mint', label: 'Mint' },
  { color: 'amber', label: 'Sunshine' },
];
const categories: Category[] = ['Small win', 'Challenge', 'Idea', 'Feedback'];
const today = (ago = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - ago);
  return d.toLocaleDateString('en-CA');
};
const id = () =>
  crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
const blank = (): Draft => ({
  title: '',
  notes: '',
  date: today(),
  category: 'Small win',
  tags: '',
  evidence: false,
});

const PROFILE_KEY='mind-blogging-personal-profile-v1';
type StoredEntry={id:string;title:string;body:string;kind:string;date:string;tags:string[];version:number;evidence?:boolean;aiExcluded?:boolean};
type StoredGoal={id:string;title:string;nextStep:string;status:string;version:number};
type StoredArtifact={id:string;sourceEntryId?:string};
const categoryOf=(k:string):Category=>/challenge|blocker/i.test(k)?'Challenge':/idea|insight/i.test(k)?'Idea':/feedback/i.test(k)?'Feedback':'Small win';
const kindOf=(c:Category)=>({'Small win':'accomplishment',Challenge:'challenge',Idea:'idea',Feedback:'feedback'} as Record<Category,string>)[c];
function initialData():Data{
 let prefs:Prefs={dark:false,motion:true,companion:true};
 let profile:Profile={name:'',headline:'',bio:'',color:'lilac'};
 try{const v=JSON.parse(localStorage.getItem(STORE_KEY)||'{}');if(v?.prefs)prefs={dark:!!v.prefs.dark,motion:v.prefs.motion!==false,companion:v.prefs.companion!==false};}catch{}
 try{const v=JSON.parse(localStorage.getItem(PROFILE_KEY)||'{}');
  profile={name:String(v.name||'').slice(0,60),headline:String(v.headline||'').slice(0,80),bio:String(v.bio||'').slice(0,240),color:AVATAR_COLORS.some(x=>x.color===v.color)?v.color:'lilac'};
 }catch{}
 return{entries:[],goals:[],prefs,profile};
}
function load():Data{return initialData();}

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.slice(0, 2).map(word => word[0]?.toUpperCase()).join('') || 'J');
}
function shortDate(s: string) {
  return new Date(s + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}
function dateGreeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}
function BrandMark({ large = false }: { large?: boolean }) {
  return (
    <span
      className={'brand-mark' + (large ? ' brand-large' : '')}
      aria-hidden="true"
    >
      <span className="brand-inner">✳</span>
    </span>
  );
}
function SparkFriend({ float = true }: { float?: boolean }) {
  return (
    <div
      className={'mascot-stage' + (float ? ' mascot-float' : '')}
      aria-hidden="true"
    >
      <svg viewBox="0 0 360 290" role="img" className="mascot-art">
        <defs>
          <radialGradient id="sparkfill" cx="35%" cy="23%" r="86%">
            <stop offset="0" stopColor="#ffe5a0" />
            <stop offset=".56" stopColor="#ffa28d" />
            <stop offset="1" stopColor="#a39af9" />
          </radialGradient>
          <linearGradient id="ground" x1="0" x2="1">
            <stop stopColor="#d6cafa" />
            <stop offset="1" stopColor="#e7f7e9" />
          </linearGradient>
        </defs>
        <ellipse
          cx="185"
          cy="260"
          rx="137"
          ry="18"
          fill="url(#ground)"
          opacity=".6"
        />
        <circle cx="67" cy="89" r="9" fill="#e8c6f7" />
        <circle cx="295" cy="53" r="6" fill="#f8c879" />
        <circle cx="283" cy="211" r="11" fill="#cfeddc" />
        <path
          d="M173 22 C198 80 218 95 286 123 C223 143 210 174 182 240 C156 177 133 153 70 130 C135 106 152 81 173 22 Z"
          fill="url(#sparkfill)"
          stroke="#3e3656"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <path
          d="M133 130 Q144 118 155 130"
          stroke="#3e3656"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M195 129 Q206 119 216 128"
          stroke="#3e3656"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M159 158 Q178 177 196 156"
          stroke="#3e3656"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
        <ellipse
          cx="134"
          cy="153"
          rx="11"
          ry="6"
          fill="#ff7d86"
          opacity=".52"
        />
        <ellipse
          cx="218"
          cy="151"
          rx="11"
          ry="6"
          fill="#ff7d86"
          opacity=".52"
        />
        <path
          d="M54 51 l7 -13 6 13 13 6 -13 7 -6 13 -7 -13 -13 -7Z"
          fill="#f6cc70"
        />
        <path
          d="M291 163 l6 -11 6 11 11 6 -11 6 -6 11 -6 -11 -11 -6Z"
          fill="#8c7de7"
        />
        <circle cx="97" cy="219" r="4" fill="#8c7de7" />
        <circle cx="250" cy="91" r="4" fill="#ff9a7e" />
      </svg>
    </div>
  );
}
function Donut({ count, goal = 5 }: { count: number; goal?: number }) {
  const pct = Math.min(100, (count / goal) * 100);
  return (
    <div
      className="donut"
      aria-label={count + ' of ' + goal + ' weekly reflections'}
    >
      <svg viewBox="0 0 144 144" aria-hidden="true">
        <circle
          cx="72"
          cy="72"
          r="57"
          strokeWidth="13"
          className="donut-bg"
          fill="none"
        />
        <circle
          cx="72"
          cy="72"
          r="57"
          strokeWidth="13"
          className="donut-line"
          strokeDasharray={pct * 3.58 + ' 358'}
          strokeLinecap="round"
          fill="none"
          transform="rotate(-90 72 72)"
        />
      </svg>
      <div className="donut-label">
        <strong>
          {count}
          <span>/{goal}</span>
        </strong>
        <small>moments</small>
      </div>
    </div>
  );
}
const tabs = [
  { page: 'overview' as const, icon: Home, text: 'Overview' },
  { page: 'capture' as const, icon: PenLine, text: 'Capture' },
  { page: 'journal' as const, icon: BookOpen, text: 'Journal' },
  { page: 'growth' as const, icon: Sprout, text: 'Growth' },
  { page: 'reviews' as const, icon: CalendarDays, text: 'Reviews' },
  { page: 'settings' as const, icon: Settings2, text: 'Settings' },
  { page: 'profile' as const, icon: UserRound, text: 'My profile' },
  { page: 'advanced' as const, icon: Sparkles, text: 'AI & advanced tools' },
];
const categoryClass = (c: Category) => c.toLowerCase().replace(' ', '-');
type Props={initialPage?:'overview'|'capture'|'journal'|'growth'|'reviews'|'settings'|'profile';};
function App({initialPage='overview'}:Props) {
  const [user,setUser]=useState<AuthUser|null>(null);
  const [authReady,setAuthReady]=useState(false);
  const [loading,setLoading]=useState(false);
  const [busy,setBusy]=useState(false);
  const [backendError,setBackendError]=useState('');
  const rawEntries=useRef<Record<string,StoredEntry>>({});
  const rawGoals=useRef<Record<string,StoredGoal>>({});
  const rawArtifacts=useRef<StoredArtifact[]>([]);
  const [data, setData] = useState<Data>(load);
  const [profileDraft, setProfileDraft] = useState<Profile>(() => ({ ...data.profile || DEFAULT_PROFILE }));
  const [profileError, setProfileError] = useState('');
  const [page, setPage] = useState<Page>(initialPage);
  const [more, setMore] = useState(false);
  const [draft, setDraft] = useState<Draft>(blank);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'All' | Category>('All');
  const [toast, setToast] = useState('');
  const [formError, setFormError] = useState('');
  const [burst, setBurst] = useState(0);
  const [showIdeas, setShowIdeas] = useState(false);
  useEffect(()=>{try{localStorage.setItem(STORE_KEY,JSON.stringify({prefs:data.prefs}));}catch{}},[data.prefs]);
  useEffect(()=>{
    let active=true;auth.getUser().then(me=>{if(active){setUser(me);setAuthReady(true);}})
      .catch(e=>{if(active){setBackendError(String(e?.message||'Sign-in unavailable'));setAuthReady(true);}});
    const off=auth.onAuthStateChange((_event,me)=>{if(active){setUser(me);setAuthReady(true);}});
    return()=>{active=false;off();};
  },[]);
  useEffect(()=>{
    if(!user){setData(p=>({...p,entries:[],goals:[]}));return;}
    let active=true;setLoading(true);setBackendError('');
    api.get('/api/bootstrap').then(({data:remote})=>{
      if(!active)return;
      const entries=(remote.entries||[]) as StoredEntry[];
      const goals=(remote.goals||[]) as StoredGoal[];
      const artifacts=(remote.artifacts||[]) as StoredArtifact[];
      const linked=new Set(artifacts.map(a=>a.sourceEntryId).filter(Boolean));
      rawEntries.current=Object.fromEntries(entries.map(e=>[e.id,e]));
      rawGoals.current=Object.fromEntries(goals.map(g=>[g.id,g]));
      rawArtifacts.current=artifacts;
      setData(p=>({...p,
        entries:entries.map(e=>({id:e.id,title:e.title,notes:e.body,date:e.date,
          category:categoryOf(e.kind),tags:Array.isArray(e.tags)?e.tags:[],
          evidence:!!e.evidence||linked.has(e.id)})),
        goals:goals.map(g=>({id:g.id,title:g.title,
          steps:[{id:g.id,label:g.nextStep||'Take the first small step',done:g.status==='completed'}]}))
      }));
    }).catch(e=>{if(active)setBackendError(String(e?.message||'Unable to load records'));})
      .finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[user?.userId]);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(''), 3400);
    return () => window.clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (!more) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMore(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [more]);
  const weekDays = Array.from({ length: 7 }, (_, i) => today(6 - i));
  const thisWeek = data.entries.filter(e => weekDays.includes(e.date));
  const winCount = thisWeek.filter(e => e.category === 'Small win').length;
  const evidenceCount = data.entries.filter(e => e.evidence).length;
  const sorted = useMemo(
    () => [...data.entries].sort((a, b) => b.date.localeCompare(a.date)),
    [data.entries]
  );
  const filtered = sorted.filter(
    e =>
      (category === 'All' || e.category === category) &&
      (e.title + ' ' + e.notes + ' ' + e.tags.join(' '))
        .toLowerCase()
        .includes(query.toLowerCase())
  );
  const doneSteps = data.goals.reduce(
    (sum, g) => sum + g.steps.filter(s => s.done).length,
    0
  );
  const allSteps = data.goals.reduce((sum, g) => sum + g.steps.length, 0);

  function navigate(p: Page) {
    if (p === 'profile') {
      setProfileDraft({ ...(data.profile || DEFAULT_PROFILE) });
      setProfileError('');
    }
    setPage(p);
    setMore(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function saveProfile() {
    const name = profileDraft.name.trim();
    if (!name) {
      setProfileError('Please enter your display name.');
      return;
    }
    const saved: Profile = {
      ...profileDraft,
      name,
      headline: profileDraft.headline.trim().slice(0, 80),
      bio: profileDraft.bio.trim().slice(0, 240),
    };
    try{localStorage.setItem(PROFILE_KEY,JSON.stringify(saved));}
    catch{setProfileError('Could not save your device profile.');return;}
    setData(prev => ({ ...prev, profile: saved }));
    setProfileDraft(saved);
    setProfileError('');
    setToast('Your profile has been saved on this device.');
  }
  function startCapture(entry?: Entry) {
    setDraft(
      entry
        ? {
            id: entry.id,
            title: entry.title,
            notes: entry.notes,
            date: entry.date,
            category: entry.category,
            tags: entry.tags.join(', '),
            evidence: entry.evidence,
          }
        : blank()
    );
    setFormError('');
    navigate('capture');
  }
  async function save(){
    if(!draft.title.trim()){setFormError('Please add a title.');return;}
    if(!draft.notes.trim()){setFormError('Please add some notes.');return;}
    setBusy(true);setFormError('');
    try{
      const previous=draft.id?rawEntries.current[draft.id]:undefined;
      const payload={title:draft.title.trim(),body:draft.notes.trim(),date:draft.date||today(),
        kind:previous?.kind||kindOf(draft.category),tags:draft.tags.split(',').map(s=>s.trim()).filter(Boolean).slice(0,6),
        evidence:draft.evidence,aiExcluded:previous?.aiExcluded||false};
      const response=draft.id
        ?await api.put('/api/entries/'+encodeURIComponent(draft.id),{...payload,expectedVersion:previous?.version})
        :await api.post('/api/entries',payload);
      const record=response.data.entry as StoredEntry;
      rawEntries.current[record.id]=record;
      if(draft.evidence&&!rawArtifacts.current.some(a=>a.sourceEntryId===record.id)){
        try{
          const {data}=await api.post('/api/artifacts',{
            title:record.title,description:record.body.slice(0,900),outcome:'',kind:'accomplishment',
            sourceEntryId:record.id,sourceVersion:record.version,quote:record.body.slice(0,200)
          });
          rawArtifacts.current.push(data.artifact);
        }catch(err){setBackendError('Note saved, but evidence could not be linked: '+String((err as Error)?.message||err));}
      }
      const entry:Entry={id:record.id,title:record.title,notes:record.body,date:record.date,
        category:categoryOf(record.kind),tags:record.tags||[],evidence:draft.evidence};
      setData(p=>({...p,entries:draft.id?p.entries.map(e=>e.id===record.id?entry:e):[entry,...p.entries]}));
      setToast(draft.id?'Moment updated.':'Moment saved to your private journal!');
      navigate('journal');
    }catch(err){setFormError(String((err as Error)?.message||'Unable to save entry.'));}
    finally{setBusy(false);}
  }
  async function remove(entry:Entry){
    if(!window.confirm('Permanently delete this journal entry?'))return;
    setBusy(true);
    try{
      await api.delete('/api/entries/'+encodeURIComponent(entry.id));
      delete rawEntries.current[entry.id];
      rawArtifacts.current=rawArtifacts.current.filter(a=>a.sourceEntryId!==entry.id);
      setData(p=>({...p,entries:p.entries.filter(e=>e.id!==entry.id)}));
      setToast('Entry deleted.');
    }catch(err){setBackendError(String((err as Error)?.message||'Delete failed.'));}
    finally{setBusy(false);}
  }
  async function toggleStep(gid:string,sid:string){
    const goal=rawGoals.current[gid],shown=data.goals.find(g=>g.id===gid);
    if(!goal||!shown||sid!==gid)return;
    const done=shown.steps.every(s=>s.done);setBusy(true);
    try{
      const {data:response}=await api.put('/api/goals/'+encodeURIComponent(gid),
        {status:done?'active':'completed',expectedVersion:goal.version});
      rawGoals.current[gid]=response.goal;
      setData(p=>({...p,goals:p.goals.map(g=>g.id!==gid?g:
        {...g,steps:g.steps.map(s=>({...s,done:!done}))})}));
      if(!done){setBurst(n=>n+1);setToast('Milestone complete!');}
      else setToast('Progress saved.');
    }catch(err){setBackendError(String((err as Error)?.message||'Goal update failed.'));}
    finally{setBusy(false);}
  }
  async function addGoal(){
    const title=window.prompt('What is one meaningful goal?');
    if(!title?.trim())return;
    const nextStep=window.prompt('What is your next step?')?.trim()||'Take the first small step';
    setBusy(true);
    try{
      const {data:response}=await api.post('/api/goals',{
        title:title.trim().slice(0,160),nextStep:nextStep.slice(0,350),status:'active',targetDate:''
      });
      const g=response.goal as StoredGoal;
      rawGoals.current[g.id]=g;
      setData(p=>({...p,goals:[...p.goals,
        {id:g.id,title:g.title,steps:[{id:g.id,label:g.nextStep,done:false}]}]}));
      setToast('Goal saved privately.');
    }catch(err){setBackendError(String((err as Error)?.message||'Could not save goal.'));}
    finally{setBusy(false);}
  }
  function exportReview() {
    const text =
      'MIND BLOGGING — WEEKLY REVIEW\n\n' +
      thisWeek
        .map(
          e => e.date + ' | ' + e.category + ' | ' + e.title + '\n' + e.notes
        )
        .join('\n\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mind-blogging-weekly-review.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setToast('Your review was exported.');
  }
  async function reset(){
    if(!window.confirm('Sign out of your private workspace?'))return;
    setBusy(true);
    try{
      await auth.signOut();setUser(null);
      rawEntries.current={};rawGoals.current={};rawArtifacts.current=[];
      setData(p=>({...p,entries:[],goals:[]}));
      setToast('Signed out.');
    }catch(err){setBackendError(String((err as Error)?.message||'Sign-out failed.'));}
    finally{setBusy(false);}
  }
  if(!authReady)return <div className="playful-loading" role="status">Opening Mind Blogging…</div>;
  if(!user)return <PlayfulLogin onSuccess={setUser} onAdvanced={()=>{setPage('advanced');}}/>;
  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const settings = data.prefs;
  const profile = data.profile || DEFAULT_PROFILE;
  return (
    <div
      className="app-shell"
      data-theme={settings.dark ? 'dark' : 'light'}
      data-motion={settings.motion ? 'on' : 'off'}
    >
      <div className="ambience ambience-1" aria-hidden="true" />
      <div className="ambience ambience-2" aria-hidden="true" />
      <aside className="sidebar">
        <button
          className="brand"
          onClick={() => navigate('overview')}
          aria-label="Mind Blogging Home"
        >
          <BrandMark />
          <span className="brand-name">
            mind<span>blogging</span>
            <small>the little wins studio</small>
          </span>
        </button>
        <div className="side-label">YOUR SPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          {tabs.map(t => (
            <button
              key={t.page}
              className={'nav-button' + (page === t.page ? ' active' : '')}
              aria-current={page === t.page ? 'page' : undefined}
              onClick={() =>
                t.page === 'capture' ? startCapture() : navigate(t.page)
              }
            >
              <t.icon size={19} strokeWidth={2} />
              <span>{t.text}</span>
              {page === t.page && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="side-bottom">
          <div className="side-note">
            <span className="side-note-symbol">✷</span>
            <strong>A little bit counts.</strong>
            <p>Keep the moments that make your story.</p>
          </div>
          <button className="side-demo" onClick={() => navigate('advanced')}>
            <Sparkles size={17} /> AI & advanced tools <ArrowUpRight size={15} />
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="mobile-brand">
            <BrandMark />
            <span>mind blogging</span>
          </div>
          <span className="date-label">{todayLabel}</span>
          <div className="top-actions">
            <span className="demo-label"><span /> {loading?'SYNCING':'PRIVATE WORKSPACE'}</span>
            <button
              className="icon-btn settings-quick"
              onClick={() => navigate('settings')}
              aria-label="Open settings"
            >
              <Settings2 size={19} />
            </button>
            <button
              type="button"
              className={'avatar profile-avatar avatar-' + profile.color}
              onClick={() => navigate('profile')}
              aria-label={'Open my profile: ' + profile.name}
              title="Open my profile"
              aria-current={page === 'profile' ? 'page' : undefined}
            >
              {initialsFor(profile.name)}
            </button>
          </div>
        </header>
        <main className="content" id="main">
          {backendError && <div className="form-error" role="alert">{backendError}
            <button className="text-link" onClick={()=>navigate('advanced')}>Advanced workspace</button>
          </div>}
          {loading && <p className="muted-note" role="status">Syncing your private records…</p>}
          {page === 'overview' && (
            <div className="page-screen">
              <div className="page-heading">
                <div>
                  <span className="eyebrow">YOUR PERSONAL GROWTH SPACE</span>
                  <h1>
                    {dateGreeting()},{' '}
                    <span className="name-highlight">{profile.name.split(' ')[0] || user.name || 'friend'}.</span>
                  </h1>
                  <p>A calmer way to notice how far you've come.</p>
                </div>
                <button
                  className="text-link desktop-link"
                  onClick={() => navigate('journal')}
                >
                  View all moments <ArrowRight size={17} />
                </button>
              </div>
              <section className="hero-card">
                <div className="hero-copy">
                  <span className="hero-pill">
                    <Sparkles size={15} /> TODAY'S LITTLE REMINDER
                  </span>
                  <h2>
                    Every little
                    <br />
                    <em>moment matters.</em>
                  </h2>
                  <p>
                    Big growth starts with small notes. What's one thing you'd
                    like to remember from today?
                  </p>
                  <button
                    className="primary-button"
                    onClick={() => startCapture()}
                  >
                    <PenLine size={18} /> Capture a moment{' '}
                    <ArrowRight size={17} />
                  </button>
                </div>
                <div className="hero-visual">
                  <div className="orb orb-one" />
                  <div className="orb orb-two" />
                  {settings.companion && <SparkFriend />}
                  <div className="mini-float">
                    <Star size={14} fill="currentColor" /> Look at you, growing!
                  </div>
                </div>
              </section>
              <div className="section-heading">
                <div>
                  <span className="eyebrow">KEEP THE MOMENTUM</span>
                  <h2>
                    Your week, in bloom <span className="heading-spark">✳</span>
                  </h2>
                </div>
                <span className="muted-note">No pressure. Just progress.</span>
              </div>
              <div className="stats-grid">
                <article className="stat-card stat-orbit">
                  <div className="stat-title">
                    Your weekly orbit{' '}
                    <span className="tiny-icon">
                      <Target size={16} />
                    </span>
                  </div>
                  <div className="orbit-wrap">
                    <Donut count={thisWeek.length} />
                    <span className="orbit-aside">
                      A little reflection makes a difference.
                    </span>
                  </div>
                  <div className="stat-foot">
                    <span className="status-pip" />{' '}
                    {Math.max(0, 5 - thisWeek.length)} more to your gentle goal
                  </div>
                </article>
                <article className="stat-card stat-week">
                  <div className="stat-title">
                    Little wins this week{' '}
                    <span className="tiny-icon blush">
                      <Star size={16} />
                    </span>
                  </div>
                  <div className="big-stat">
                    {winCount}
                    <span>small wins ✦</span>
                  </div>
                  <div className="bars">
                    {weekDays.map((d, i) => {
                      const n = data.entries.filter(e => e.date === d).length;
                      return (
                        <div className="bar-col" key={d}>
                          <div
                            className={'bar' + (n ? ' filled' : '')}
                            style={{ height: 20 + Math.min(n * 23, 70) + '%' }}
                          />
                          <small>
                            {
                              ['S', 'M', 'T', 'W', 'T', 'F', 'S'][
                                new Date(d + 'T12:00:00').getDay()
                              ]
                            }
                          </small>
                        </div>
                      );
                    })}
                  </div>
                </article>
                <article className="stat-card stat-evidence">
                  <div className="stat-title">
                    Proof of progress{' '}
                    <span className="tiny-icon mint">
                      <TrendingUp size={16} />
                    </span>
                  </div>
                  <div className="big-stat">
                    {evidenceCount}
                    <span>moments worth keeping</span>
                  </div>
                  <div className="evidence-visual">
                    <span className="circle-seal">✿</span>
                    <div>
                      <strong>Your story is adding up.</strong>
                      <small>
                        These reflections can help you see your growth.
                      </small>
                    </div>
                  </div>
                  <button
                    className="text-link"
                    onClick={() => navigate('growth')}
                  >
                    Explore your growth <ArrowRight size={17} />
                  </button>
                </article>
              </div>
              <div className="lower-grid">
                <section className="panel recent-panel">
                  <div className="panel-heading">
                    <div>
                      <span className="eyebrow">A WALK DOWN MEMORY LANE</span>
                      <h2>Recent moments</h2>
                    </div>
                    <button
                      className="tiny-action"
                      onClick={() => navigate('journal')}
                    >
                      See all <ArrowRight size={17} />
                    </button>
                  </div>
                  <div className="recent-list">
                    {sorted.slice(0, 3).map(e => (
                      <button
                        className="recent-row"
                        key={e.id}
                        onClick={() => startCapture(e)}
                      >
                        <span
                          className={
                            'category-icon ' + categoryClass(e.category)
                          }
                        >
                          {e.category === 'Small win'
                            ? '✳'
                            : e.category === 'Challenge'
                              ? '◒'
                              : e.category === 'Idea'
                                ? '✦'
                                : '♡'}
                        </span>
                        <span className="recent-copy">
                          <strong>{e.title}</strong>
                          <small>
                            {shortDate(e.date)} · {e.category}
                          </small>
                        </span>
                        <ChevronRight className="row-chevron" size={18} />
                      </button>
                    ))}
                  </div>
                </section>
                <section className="panel next-panel">
                  <div className="panel-heading">
                    <div>
                      <span className="eyebrow">A SMALL STEP FORWARD</span>
                      <h2>What's next?</h2>
                    </div>
                    <span className="leaf-icon">🌱</span>
                  </div>
                  <p className="section-explainer">
                    Big plans feel easier one little step at a time.
                  </p>
                  {data.goals.slice(0, 2).map(g => {
                    const step = g.steps.find(s => !s.done);
                    return (
                      <button
                        className="next-goal"
                        key={g.id}
                        onClick={() => navigate('growth')}
                      >
                        <span className="next-check">
                          <Check size={16} />
                        </span>
                        <span>
                          <strong>{g.title}</strong>
                          <small>
                            {step?.label || 'Completed — great work!'}
                          </small>
                        </span>
                      </button>
                    );
                  })}
                  <button
                    className="soft-button"
                    onClick={() => navigate('growth')}
                  >
                    See all my goals <ArrowRight size={17} />
                  </button>
                </section>
              </div>
            </div>
          )}

          {page === 'capture' && (
            <div className="page-screen">
              <div className="page-heading">
                <div>
                  <span className="eyebrow">A BLANK PAGE IS A FRESH START</span>
                  <h1>
                    {draft.id ? 'Edit a moment' : 'Capture a moment'}{' '}
                    <span className="heading-spark">✎</span>
                  </h1>
                  <p>It doesn't need to be perfect. Just make it yours.</p>
                </div>
              </div>
              <div className="editor-layout">
                <section className="panel editor-panel">
                  <label className="field-label" htmlFor="entry-title">
                    Give your moment a title
                  </label>
                  <input
                    id="entry-title"
                    value={draft.title}
                    maxLength={100}
                    onChange={e => {
                      setDraft(d => ({ ...d, title: e.target.value }));
                      setFormError('');
                    }}
                    placeholder="Something I'd like to remember…"
                    className="title-input"
                  />
                  <div className="form-row">
                    <label className="field-label" htmlFor="entry-category">
                      This was a…
                    </label>
                    <label className="field-label" htmlFor="entry-date">
                      On this day
                    </label>
                  </div>
                  <div className="form-row">
                    <select
                      id="entry-category"
                      className="input"
                      value={draft.category}
                      onChange={e =>
                        setDraft(d => ({
                          ...d,
                          category: e.target.value as Category,
                        }))
                      }
                    >
                      {categories.map(c => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                    <input
                      id="entry-date"
                      type="date"
                      className="input"
                      value={draft.date}
                      max={today()}
                      onChange={e =>
                        setDraft(d => ({ ...d, date: e.target.value }))
                      }
                    />
                  </div>
                  <label className="field-label" htmlFor="entry-notes">
                    Tell your story
                  </label>
                  <textarea
                    id="entry-notes"
                    className="notes-editor"
                    value={draft.notes}
                    onChange={e => {
                      setDraft(d => ({ ...d, notes: e.target.value }));
                      setFormError('');
                    }}
                    placeholder="What happened? What did you learn? How did it feel?"
                  />
                  <div className="editor-meta">
                    <span>
                      {draft.notes.trim()
                        ? draft.notes.trim().split(/\s+/).length
                        : 0}{' '}
                      words
                    </span>
                    <span>Saved to your private account</span>
                  </div>
                  <label className="field-label" htmlFor="entry-tags">
                    Add a few tags{' '}
                    <span className="optional">
                      (optional, comma separated)
                    </span>
                  </label>
                  <input
                    id="entry-tags"
                    className="input full"
                    placeholder="team, learning, design…"
                    value={draft.tags}
                    onChange={e =>
                      setDraft(d => ({ ...d, tags: e.target.value }))
                    }
                  />
                  <label className="check-row">
                    <input
                      type="checkbox"
                      checked={draft.evidence}
                      onChange={e =>
                        setDraft(d => ({ ...d, evidence: e.target.checked }))
                      }
                    />
                    <span>Save this as evidence of progress</span>
                  </label>
                  {formError && (
                    <div className="form-error" role="alert">
                      {formError}
                    </div>
                  )}
                  <div className="editor-actions">
                    <button
                      className="secondary-button"
                      onClick={() => navigate('journal')}
                    >
                      Cancel
                    </button>
                    <button className="primary-button" onClick={save}>
                      <Check size={18} />{' '}
                      {draft.id ? 'Save changes' : 'Save my moment'}
                    </button>
                  </div>
                </section>
                <aside className="editor-aside">
                  <span className="editor-aside-icon">
                    <Lightbulb size={27} />
                  </span>
                  <h3>A gentle writing nudge</h3>
                  <p>
                    What was one small thing that made today worth remembering?
                  </p>
                  <div className="prompt-pills">
                    {categories.map(c => (
                      <button
                        key={c}
                        className={draft.category === c ? 'selected' : ''}
                        onClick={() => setDraft(d => ({ ...d, category: c }))}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                  <div className="privacy-note">
                    <ShieldCheck size={17} /> Private note, synced to your account
                    or real AI.
                  </div>
                </aside>
              </div>
            </div>
          )}
          {page === 'journal' && (
            <div className="page-screen">
              <div className="page-heading">
                <div>
                  <span className="eyebrow">A COLLECTION OF YOUR DAYS</span>
                  <h1>
                    My journal <span className="heading-spark">✿</span>
                  </h1>
                  <p>All the little moments, in one lovely place.</p>
                </div>
                <button
                  className="primary-button"
                  onClick={() => startCapture()}
                >
                  <Plus size={18} /> New moment
                </button>
              </div>
              <section className="panel journal-panel">
                <div className="journal-tools">
                  <label className="search-box">
                    <Search size={19} />
                    <input
                      aria-label="Search journal"
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      placeholder="Search your moments…"
                    />
                  </label>
                  <span className="results-count">
                    {filtered.length}{' '}
                    {filtered.length === 1 ? 'moment' : 'moments'}
                  </span>
                </div>
                <div className="filter-row" aria-label="Filter entries">
                  {(['All', ...categories] as Array<'All' | Category>).map(
                    c => (
                      <button
                        className={
                          'filter-pill' + (category === c ? ' active' : '')
                        }
                        onClick={() => setCategory(c)}
                        key={c}
                      >
                        {c}
                      </button>
                    )
                  )}
                </div>
                <div className="entry-grid">
                  {filtered.length ? (
                    filtered.map(e => (
                      <article
                        className={
                          'entry-card category-' + categoryClass(e.category)
                        }
                        key={e.id}
                      >
                        <div className="entry-top">
                          <span
                            className={
                              'category-chip ' + categoryClass(e.category)
                            }
                          >
                            {e.category}
                          </span>
                          <span className="entry-date">
                            {shortDate(e.date)}
                          </span>
                        </div>
                        <h3>{e.title}</h3>
                        <p>{e.notes}</p>
                        <div className="tag-row">
                          {e.tags.map(t => (
                            <span key={t}>
                              <Tag size={11} />
                              {t}
                            </span>
                          ))}
                        </div>
                        <div className="entry-actions">
                          <button onClick={() => startCapture(e)}>
                            <Pencil size={16} /> Edit
                          </button>
                          <button
                            onClick={() => remove(e)}
                            aria-label={'Delete ' + e.title}
                          >
                            <Trash2 size={16} />
                          </button>
                          {e.evidence && (
                            <span className="evidence-indicator">
                              <Star size={13} /> evidence
                            </span>
                          )}
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="empty-state">
                      <Sparkles size={33} />
                      <h3>Nothing here yet</h3>
                      <p>
                        Try a different filter or capture a new little moment.
                      </p>
                      <button
                        className="primary-button"
                        onClick={() => startCapture()}
                      >
                        Capture a moment
                      </button>
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}
          {page === 'growth' && (
            <div className="page-screen">
              <div className="page-heading">
                <div>
                  <span className="eyebrow">
                    A MAP OF THE YOU YOU'RE BECOMING
                  </span>
                  <h1>
                    Keep growing <span className="heading-spark">✳</span>
                  </h1>
                  <p>Small steps add up to something wonderful.</p>
                </div>
                <button className="primary-button" onClick={addGoal}>
                  <Plus size={18} /> New goal
                </button>
              </div>
              <div className="growth-stats">
                <div className="growth-stat">
                  <span className="growth-stat-icon mint">
                    <Target size={21} />
                  </span>
                  <strong>{data.goals.length}</strong>
                  <small>goals in motion</small>
                </div>
                <div className="growth-stat">
                  <span className="growth-stat-icon peach">
                    <Check size={21} />
                  </span>
                  <strong>
                    {doneSteps}/{allSteps}
                  </strong>
                  <small>steps taken</small>
                </div>
                <div className="growth-stat">
                  <span className="growth-stat-icon lilac">
                    <Star size={21} />
                  </span>
                  <strong>{evidenceCount}</strong>
                  <small>proof points</small>
                </div>
              </div>
              <div className="growth-grid">
                <section>
                  <div className="section-heading">
                    <div>
                      <span className="eyebrow">A LITTLE EACH DAY</span>
                      <h2>My next milestones</h2>
                    </div>
                  </div>
                  {data.goals.map(g => {
                    const completed = g.steps.filter(s => s.done).length;
                    return (
                      <article className="panel goal-card" key={g.id}>
                        <div className="goal-heading">
                          <div>
                            <span className="eyebrow">GROWTH PATH</span>
                            <h3>{g.title}</h3>
                          </div>
                          <span className="goal-completion">
                            {completed}/{g.steps.length}
                          </span>
                        </div>
                        <div className="progress-track">
                          <span
                            style={{
                              width:
                                Math.round(
                                  (completed / Math.max(1, g.steps.length)) *
                                    100
                                ) + '%',
                            }}
                          />
                        </div>
                        <div className="goal-steps">
                          {g.steps.map(s => (
                            <label
                              className={
                                'step-row' + (s.done ? ' checked' : '')
                              }
                              key={s.id}
                            >
                              <input
                                type="checkbox"
                                checked={s.done}
                                onChange={() => toggleStep(g.id, s.id)}
                              />
                              <span>{s.label}</span>
                            </label>
                          ))}
                        </div>
                      </article>
                    );
                  })}
                </section>
                <aside className="panel evidence-panel">
                  <span className="eyebrow">LOOK WHAT YOU'VE DONE</span>
                  <h2>Your bright spots</h2>
                  <p>Things you can point to when you need a reminder.</p>
                  {data.entries
                    .filter(e => e.evidence)
                    .slice(0, 4)
                    .map(e => (
                      <button
                        key={e.id}
                        className="evidence-row"
                        onClick={() => startCapture(e)}
                      >
                        <span>✳</span>
                        <div>
                          <strong>{e.title}</strong>
                          <small>{shortDate(e.date)}</small>
                        </div>
                        <ChevronRight size={18} />
                      </button>
                    ))}
                  {!evidenceCount && (
                    <p>Mark journal entries as evidence to see them here.</p>
                  )}
                </aside>
              </div>
            </div>
          )}
          {page === 'reviews' && (
            <div className="page-screen">
              <div className="page-heading">
                <div>
                  <span className="eyebrow">THE PAUSE THAT HELPS YOU GROW</span>
                  <h1>
                    A look back <span className="heading-spark">✦</span>
                  </h1>
                  <p>Reflect on where the little moments took you.</p>
                </div>
                <button className="secondary-button" onClick={exportReview}>
                  <Download size={18} /> Export summary
                </button>
              </div>
              <section className="review-hero panel">
                <div>
                  <span className="review-label">THIS WEEK AT A GLANCE</span>
                  <h2>Something good is growing.</h2>
                  <p>
                    You've written {thisWeek.length}{' '}
                    {thisWeek.length === 1 ? 'moment' : 'moments'}, found{' '}
                    {winCount} small {winCount === 1 ? 'win' : 'wins'}, and
                    saved {evidenceCount} pieces of evidence overall.
                  </p>
                  <button
                    className="primary-button"
                    onClick={() => startCapture()}
                  >
                    Write another reflection <ArrowRight size={16} />
                  </button>
                </div>
                <SparkFriend />
              </section>
              <div className="review-grid">
                <article className="panel">
                  <span className="eyebrow">THE MOMENTS THAT MATTERED</span>
                  <h2>Highlights</h2>
                  {thisWeek.length ? (
                    thisWeek.slice(0, 5).map(e => (
                      <div className="review-line" key={e.id}>
                        <span
                          className={
                            'category-icon ' + categoryClass(e.category)
                          }
                        >
                          ✳
                        </span>
                        <div>
                          <strong>{e.title}</strong>
                          <small>
                            {e.category} · {shortDate(e.date)}
                          </small>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p>No entries this week yet. A fresh page is waiting.</p>
                  )}
                </article>
                <article className="panel reflection-panel">
                  <span className="eyebrow">A KIND QUESTION</span>
                  <h2>What's one thing you learned?</h2>
                  <p>
                    Not everything needs an answer. Sometimes asking the right
                    question is enough.
                  </p>
                  <button
                    className="secondary-button"
                    onClick={() => setShowIdeas(v => !v)}
                  >
                    <Lightbulb size={17} />
                    {showIdeas
                      ? 'Hide the example'
                      : 'Show reflection example'}
                  </button>
                  {showIdeas && (
                    <div className="demo-ai">
                      <span>WRITING INSPIRATION · NOT AI GENERATED</span>
                      <p>
                        “The work that felt hardest taught me the most about
                        asking for help early.”
                      </p>
                    </div>
                  )}
                </article>
              </div>
            </div>
          )}
          {page === 'profile' && (
            <div className="page-screen profile-page">
              <div className="page-heading">
                <div>
                  <span className="eyebrow">THE PERSON BEHIND THE MOMENTS</span>
                  <h1>My profile <span className="heading-spark">✳</span></h1>
                  <p>A little place to make your studio feel like yours.</p>
                </div>
              </div>
              <section className="profile-hero panel">
                <div className={'profile-portrait avatar-' + profileDraft.color} aria-hidden="true">
                  {initialsFor(profileDraft.name)}
                  <span className="profile-portrait-spark">✦</span>
                </div>
                <div className="profile-identity">
                  <span className="eyebrow">MY PERSONAL SPACE</span>
                  <h2>{profileDraft.name.trim() || 'Your name'}</h2>
                  <p>{profileDraft.headline || 'Your next chapter begins here.'}</p>
                  <span className="profile-local"><ShieldCheck size={15} /> Saved on your device</span>
                </div>
                <div className="profile-hero-decoration" aria-hidden="true">✳</div>
              </section>
              <div className="profile-layout">
                <section className="panel profile-editor">
                  <div className="profile-section-title">
                    <div><span className="eyebrow">PERSONALISE YOUR SPACE</span><h2>Edit profile</h2></div>
                    <Pencil size={20} aria-hidden="true" />
                  </div>
                  <label htmlFor="profile-name" className="field-label">Display name</label>
                  <input id="profile-name" className="input full" placeholder="How should we call you?" maxLength={60}
                    value={profileDraft.name} onChange={e => { setProfileDraft(p => ({ ...p, name: e.target.value })); setProfileError(''); }} />
                  <label htmlFor="profile-headline" className="field-label">Short headline</label>
                  <input id="profile-headline" className="input full" placeholder="What are you working toward?" maxLength={80}
                    value={profileDraft.headline} onChange={e => setProfileDraft(p => ({ ...p, headline: e.target.value }))} />
                  <label htmlFor="profile-bio" className="field-label">About you</label>
                  <textarea id="profile-bio" className="input full profile-bio" maxLength={240} rows={4}
                    placeholder="One or two lines about you…" value={profileDraft.bio}
                    onChange={e => setProfileDraft(p => ({ ...p, bio: e.target.value }))} />
                  <span className="profile-counter">{profileDraft.bio.length}/240 characters</span>
                  <span className="field-label">Choose your avatar color</span>
                  <div className="profile-colors" role="group" aria-label="Choose avatar color">
                    {AVATAR_COLORS.map(option => (
                      <button key={option.color} type="button"
                        className={'profile-color-choice avatar-' + option.color + (profileDraft.color === option.color ? ' chosen' : '')}
                        onClick={() => setProfileDraft(p => ({ ...p, color: option.color }))}
                        aria-label={option.label + ' avatar color'}
                        aria-pressed={profileDraft.color === option.color}
                        title={option.label}>
                        {initialsFor(profileDraft.name)}
                        {profileDraft.color === option.color && <span className="profile-color-check"><Check size={12} /></span>}
                      </button>
                    ))}
                  </div>
                  {profileError && <p className="form-error" role="alert">{profileError}</p>}
                  <div className="profile-actions">
                    <button type="button" className="secondary-button" onClick={() => navigate('overview')}>Back to home</button>
                    <button type="button" className="primary-button" onClick={saveProfile}><Check size={17} /> Save my profile</button>
                  </div>
                </section>
                <aside className="profile-side">
                  <section className="panel profile-summary">
                    <span className="eyebrow">YOUR STORY SO FAR</span>
                    <h2>Growing, your way.</h2>
                    <div className="profile-metrics">
                      <div><strong>{data.entries.length}</strong><small>journal moments</small></div>
                      <div><strong>{evidenceCount}</strong><small>bright spots saved</small></div>
                      <div><strong>{data.goals.length}</strong><small>personal goals</small></div>
                    </div>
                    <button type="button" className="soft-button" onClick={() => navigate('journal')}>View my journal <ArrowRight size={17} /></button>
                  </section>
                  <section className="panel profile-notice">
                    <LockKeyhole size={22} aria-hidden="true" />
                    <div><strong>Private account connected</strong><p>Your journal, evidence and goals are stored with your signed-in account. Only profile appearance is device-local.</p></div>
                    <button type="button" className="text-link" onClick={() => navigate('settings')}>Appearance and settings <ArrowRight size={16} /></button>
                  </section>
                </aside>
              </div>
            </div>
          )}
          {page === 'advanced' && (
            <PlayfulAdvanced onBack={()=>navigate('overview')} onJournal={()=>navigate('journal')}/>
          )}
          {page === 'settings' && (
            <div className="page-screen settings-page">
              <div className="page-heading">
                <div>
                  <span className="eyebrow">MAKE IT FEEL LIKE YOURS</span>
                  <h1>My preferences</h1>
                  <p>A few small choices for a more comfortable space.</p>
                </div>
              </div>
              <section className="panel">
                <h2>Appearance & comfort</h2>
                <div className="setting-row">
                  <span className="setting-icon">
                    <Moon size={20} />
                  </span>
                  <span className="setting-copy">
                    <strong>Dark appearance</strong>
                    <small>A softer view after sunset.</small>
                  </span>
                  <button
                    role="switch"
                    aria-checked={settings.dark}
                    aria-label="Dark appearance"
                    className={'toggle' + (settings.dark ? ' on' : '')}
                    onClick={() =>
                      setData(p => ({
                        ...p,
                        prefs: { ...p.prefs, dark: !p.prefs.dark },
                      }))
                    }
                  >
                    <span />
                  </button>
                </div>
                <div className="setting-row">
                  <span className="setting-icon">
                    <Sparkles size={20} />
                  </span>
                  <span className="setting-copy">
                    <strong>Gentle animations</strong>
                    <small>Turn off motion and small celebrations.</small>
                  </span>
                  <button
                    role="switch"
                    aria-checked={settings.motion}
                    aria-label="Gentle animations"
                    className={'toggle' + (settings.motion ? ' on' : '')}
                    onClick={() =>
                      setData(p => ({
                        ...p,
                        prefs: { ...p.prefs, motion: !p.prefs.motion },
                      }))
                    }
                  >
                    <span />
                  </button>
                </div>
                <div className="setting-row">
                  <span className="setting-icon">
                    <Heart size={20} />
                  </span>
                  <span className="setting-copy">
                    <strong>Your little companion</strong>
                    <small>Show the original friendly spark character.</small>
                  </span>
                  <button
                    role="switch"
                    aria-checked={settings.companion}
                    aria-label="Your little companion"
                    className={'toggle' + (settings.companion ? ' on' : '')}
                    onClick={() =>
                      setData(p => ({
                        ...p,
                        prefs: { ...p.prefs, companion: !p.prefs.companion },
                      }))
                    }
                  >
                    <span />
                  </button>
                </div>
              </section>
              <section className="panel">
                <h2>Your private account & advanced settings</h2>
                <p className="settings-description">
                  <ShieldCheck size={19} /> Journal, goals and evidence are stored in your private account. Manage AI consent and data export in the advanced workspace.
                </p>
                <button className="secondary-button" onClick={() => navigate('advanced')}>
                  <Sparkles size={17} /> AI consent, reminders & data export
                </button>
                <button className="danger-button" disabled={busy} onClick={() => void reset()}>
                  <ShieldCheck size={18} /> Sign out securely
                </button>
              </section>
            </div>
          )}
        </main>
        <footer className="footer">
          Made for little moments and meaningful growth <span>✳</span>{' '}
          <button onClick={() => navigate('advanced')}>AI & advanced tools</button>
        </footer>
      </div>
      <nav className="bottom-nav" aria-label="Mobile navigation">
        {(
          [
            { page: 'overview' as const, label: 'Home', icon: Home },
            { page: 'capture' as const, label: 'Capture', icon: PenLine },
            { page: 'journal' as const, label: 'Journal', icon: BookOpen },
            { page: 'growth' as const, label: 'Growth', icon: Sprout },
          ] as const
        ).map(t => (
          <button
            key={t.page}
            className={
              'mobile-nav-btn' +
              (page === t.page ? ' active' : '') +
              (t.page === 'capture' ? ' capture-nav' : '')
            }
            aria-current={page === t.page ? 'page' : undefined}
            onClick={() =>
              t.page === 'capture' ? startCapture() : navigate(t.page)
            }
          >
            <span className="mobile-nav-icon">
              <t.icon size={21} strokeWidth={2.1} />
            </span>
            <small>{t.label}</small>
          </button>
        ))}
        <button
          className={
            'mobile-nav-btn' +
            (more || page === 'reviews' || page === 'settings' || page === 'profile' || page === 'advanced' ? ' active' : '')
          }
          onClick={() => setMore(v => !v)}
          aria-expanded={more}
          aria-haspopup="dialog"
        >
          <span className="mobile-nav-icon">
            <Ellipsis size={22} />
          </span>
          <small>More</small>
        </button>
      </nav>
      {more && (
        <div className="drawer-backdrop" onClick={() => setMore(false)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-label="More pages"
            className="more-drawer"
            onClick={e => e.stopPropagation()}
          >
            <div className="drawer-header">
              <h2>More to explore</h2>
              <button
                className="icon-btn"
                aria-label="Close menu"
                onClick={() => setMore(false)}
              >
                <X size={22} />
              </button>
            </div>
            {[
              {
                page: 'profile' as const,
                label: 'My profile',
                icon: UserRound,
              },
              {
                page: 'reviews' as const,
                label: 'Weekly reviews',
                icon: CalendarDays,
              },
              {
                page: 'settings' as const,
                label: 'Preferences',
                icon: Settings2,
              },
              {
                page: 'advanced' as const,
                label: 'AI & advanced tools',
                icon: Sparkles,
              },
            ].map(t => (
              <button
                className="drawer-item"
                key={t.page}
                onClick={() => navigate(t.page)}
              >
                <t.icon size={21} />
                <span>{t.label}</span>
                <ChevronRight size={18} />
              </button>
            ))}
          </section>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <span>✦</span> {toast}
          <button onClick={() => setToast('')} aria-label="Dismiss message">
            <X size={15} />
          </button>
        </div>
      )}
      {burst > 0 && settings.motion && (
        <div className="celebration" key={burst} aria-hidden="true">
          {Array.from({ length: 18 }, (_, i) => (
            <i
              key={i}
              style={{
                left: 8 + ((i * 47) % 84) + '%',
                animationDelay: (i % 5) * 0.06 + 's',
                background: ['#f5c969', '#ff9279', '#8b83ec', '#a0dabb'][i % 4],
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
export default App;
