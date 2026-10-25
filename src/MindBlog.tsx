import { useEffect, useMemo, useRef, useState } from 'react';
import { api, auth, notifications } from './cloud';
import type { AuthUser } from './cloud';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock3,
  Copy,
  Download,
  FileText,
  Filter,
  Feather,
  HeartHandshake,
  Info,
  LayoutDashboard,
  Lightbulb,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Menu,
  MessageCircle,
  MoreHorizontal,
  NotebookPen,
  PanelRightClose,
  PanelRightOpen,
  PenLine,
  Plus,
  Quote,
  RotateCcw,
  Save,
  ScrollText,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Square,
  Star,
  Tag,
  Target,
  Trash2,
  TrendingUp,
  WandSparkles,
  X,
  EyeOff,
  CheckSquare2,
  Pencil,
  AlertCircle,
} from 'lucide-react';
import './mind.css';

type Tab = 'home' | 'capture' | 'timeline' | 'growth' | 'reviews' | 'settings';
type Entry = {
  id: string;
  title: string;
  body: string;
  date: string;
  kind: string;
  tags: string[];
  aiExcluded: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
};
type Artifact = {
  id: string;
  title: string;
  description: string;
  outcome: string;
  kind: string;
  sourceEntryId: string | null;
  sourceVersion: number | null;
  quote: string;
  version: number;
  createdAt: string;
};
type Goal = {
  id: string;
  title: string;
  nextStep: string;
  status: string;
  targetDate: string;
  version: number;
  createdAt: string;
};
type Review = {
  id: string;
  body: string;
  periodStart: string;
  periodEnd: string;
  artifactIds: string[];
  createdAt: string;
};
type Preferences = {
  initiative: string;
  aiConsent: boolean;
  weeklyReview: boolean;
  timezone: string;
  version: number;
};
type Proposal = {
  title: string;
  description: string;
  outcome: string;
  nextStep: string;
  sourceEntryId: string;
  sourceVersion: number;
  quote: string;
};
type Chat = { role: 'assistant' | 'user'; text: string };
const fresh = () => ({
  id: '',
  title: '',
  body: '',
  date: new Date().toLocaleDateString('en-CA'),
  kind: 'reflection',
  tags: [] as string[],
  aiExcluded: false,
  version: 0,
});
const cap = (text: string, count: number) =>
  text.length > count ? text.slice(0, count) + '…' : text;
const day = (date: string) =>
  new Date(date + (date.includes('T') ? '' : 'T12:00:00')).toLocaleDateString(
    'en-US',
    { month: 'short', day: 'numeric' }
  );
const displayDate = (date: string) =>
  new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
const icons = {
  home: LayoutDashboard,
  capture: NotebookPen,
  timeline: BookOpen,
  growth: TrendingUp,
  reviews: ScrollText,
  settings: Settings2,
};
const navItems: { key: Tab; label: string; text: string }[] = [
  { key: 'home', label: 'Overview', text: 'Your workspace' },
  { key: 'capture', label: 'Capture', text: 'Record a moment' },
  { key: 'timeline', label: 'Journal', text: 'Your entries' },
  { key: 'growth', label: 'Growth', text: 'Your evidence' },
  { key: 'reviews', label: 'Reviews', text: 'Tell your story' },
];
const defaultPrefs: Preferences = {
  initiative: 'guided',
  aiConsent: false,
  weeklyReview: false,
  timezone: 'Asia/Kolkata',
  version: 0,
};
function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [notificationBusy,setNotificationBusy] = useState(false);
  const pendingCreateId = useRef('');
  const [serverConflict, setServerConflict] = useState<Entry | null>(null);
  const [erasing, setErasing] = useState(false);
  const [deletionPhrase, setDeletionPhrase] = useState('');
  const [authHint, setAuthHint] = useState(false);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState<Tab>('home');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [prefs, setPrefs] = useState<Preferences>(defaultPrefs);
  const [draft, setDraft] = useState(fresh);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [toast, setToast] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [evidenceTab, setEvidenceTab] = useState<
    'achievements' | 'skills' | 'goals'
  >('achievements');
  const [showEvidence, setShowEvidence] = useState(true);
  const [selected, setSelected] = useState<{
    quote: string;
    start: number;
    end: number;
  } | null>(null);
  const [manualExcerpt, setManualExcerpt] = useState(false);
  const [excerptText, setExcerptText] = useState('');
  const [proposal, setProposal] = useState<{
    type: string;
    data?: Proposal;
    text?: string;
  } | null>(null);
  const [proposalBusy, setProposalBusy] = useState(false);
  const [proposalEditing, setProposalEditing] = useState<Proposal | null>(null);
  const [suggestions, setSuggestions] = useState<
    { label: string; kind: string }[] | null
  >(null);
  const [chat, setChat] = useState<Chat[]>([]);
  const [thinking, setThinking] = useState(false);
  const [directive, setDirective] = useState('normal');
  const [reflectEntry, setReflectEntry] = useState<Entry | null>(null);
  const [goalModal, setGoalModal] = useState(false);
  const [goalForm, setGoalForm] = useState({
    title: '',
    nextStep: '',
    targetDate: '',
  });
  const [reviewStart, setReviewStart] = useState('');
  const [reviewEnd, setReviewEnd] = useState('');
  const [checkedEvidence, setCheckedEvidence] = useState<string[]>([]);
  const [reviewText, setReviewText] = useState('');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [confirm, setConfirm] = useState<{
    message: string;
    run: () => void;
  } | null>(null);
  const [editingArtifact, setEditingArtifact] = useState<Artifact | null>(null);
  const [artifactForm, setArtifactForm] = useState({
    title: '',
    description: '',
    outcome: '',
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const requestRef = useRef(0);
  const aiAbortRef=useRef<AbortController|null>(null);

  const [liveStage,setLiveStage] = useState('');
  const dialogOpen = !!(serverConflict || confirm || manualExcerpt || proposal || suggestions || goalModal || editingArtifact);
  useEffect(() => {
    if (!dialogOpen) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = document.querySelector<HTMLElement>('.modal-scrim .modal');
    const selectors = 'button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';
    const focusables = () => Array.from(dialog?.querySelectorAll<HTMLElement>(selectors) || []);
    focusables()[0]?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (serverConflict) return;
        setConfirm(null); setManualExcerpt(false); setProposal(null);
        setSuggestions(null); setGoalModal(false); setEditingArtifact(null);
      }
      if (event.key === 'Tab') {
        const list = focusables();
        if (!list.length) { event.preventDefault(); return; }
        const first = list[0], last = list[list.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); previouslyFocused?.focus(); };
  }, [dialogOpen, serverConflict]);


  const note = (value: string) => {
    setToast(value);
    window.setTimeout(() => setToast(old => (old === value ? '' : old)), 3800);
  };
  const fail = (
    e: unknown,
    fallback = 'Something went wrong. Please try again.'
  ) => {
    const candidate = e as {
      response?: { data?: { error?: string; message?: string } };
      message?: string;
    };
    const msg =
      candidate?.response?.data?.error ||
      candidate?.response?.data?.message ||
      candidate?.message ||
      fallback;
    setErrorMessage(String(msg));
  };
  useEffect(() => {
    let active=true;
    auth.getUser().then(me=>{if(active){setUser(me);setAuthReady(true);}})
      .catch(e=>{if(active){setAuthReady(true);setErrorMessage(e?.message||'Unable to restore session.');}});
    const unsubscribe=auth.onAuthStateChange((event,me)=>{
      if(!active)return;
      if(event==='SIGNED_IN'||event==='SIGNED_OUT'||event==='INITIAL_SESSION'){
        setUser(me);setAuthReady(true);
      }
    });
    return ()=>{active=false;unsubscribe();};
  }, []);
  const load = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const { data } = await api.get('/api/bootstrap');
      const kinds = ['entries', 'artifacts', 'goals', 'reviews'] as const;
      const collected: Record<string, unknown[]> = {};
      for (const kind of kinds) {
        let items = data[kind] || [];
        let cursor: string | null = data.cursors?.[kind] || null;
        const cursors = new Set<string>();
        for (let n = 0; cursor && n < 200; n++) {
          if (cursors.has(cursor)) throw new Error('Repeated page cursor');
          cursors.add(cursor);
          const next = await api.get('/api/collection/' + kind + '?cursor=' + encodeURIComponent(cursor));
          items = [...items, ...next.data.items];
          cursor = next.data.nextToken;
        }
        if (cursor) throw new Error('Incomplete history: please retry before exporting.');
        collected[kind] = items;
      }
      setEntries((collected.entries as Entry[]).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)));
      setArtifacts(collected.artifacts as Artifact[]);
      setGoals(collected.goals as Goal[]);
      setReviews(collected.reviews as Review[]);
      setPrefs(data.settings || defaultPrefs);
    } catch (e) {
      fail(e, 'Unable to load your private workspace.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (user) {
      void load();
      try {
        const saved = localStorage.getItem('mindblog_draft_' + user.userId);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed.body === 'string' && !parsed.id) {
            pendingCreateId.current = parsed.pendingCreateId || '';
            setDraft({ ...fresh(), ...parsed, id: '' });
          }
        }
      } catch {
        /* draft is optional */
      }
    }
  }, [user?.userId]);
  useEffect(() => {
    if (!user || draft.id) return;
    try {
      localStorage.setItem(
        'mindblog_draft_' + user.userId,
        JSON.stringify({ ...draft, pendingCreateId: pendingCreateId.current })
      );
    } catch {
      /* unsupported storage */
    }
  }, [draft, user?.userId]);
  useEffect(() => {
    if (!user || !draft.id) return;
    try {
      localStorage.setItem('mindblog_edit_' + user.userId + '_' + draft.id, JSON.stringify(draft));
    } catch { /* local storage disabled */ }
  }, [draft, user?.userId]);
  const signInWithGoogle=async()=>{
    setErrorMessage('');setAuthBusy(true);
    try{await auth.signInWithGoogle();}
    catch(error){fail(error,'Google sign-in is unavailable.');setAuthBusy(false);}
  };
  const signOut = async () => {
    await auth.signOut();
    setUser(null);
    setEntries([]);
    setArtifacts([]);
    setGoals([]);
    setReviews([]);
    setDraft(fresh());
    setPage('home');
  };
  const go = (next: Tab) => {
    setPage(next);
    setMobileMenu(false);
    setErrorMessage('');
  };
  const newCapture = () => {
    pendingCreateId.current = '';
    setDraft(fresh());
    setTagInput('');
    setSelected(null);
    setChat([]);
    setReflectEntry(null);
    go('capture');
  };
  const editEntry = (entry: Entry) => {
    let recovered: Partial<typeof draft> = {};
    if (user) {
      try {
        const saved = localStorage.getItem('mindblog_edit_' + user.userId + '_' + entry.id);
        const value = saved ? JSON.parse(saved) : null;
        if (value?.id === entry.id && (value.body !== entry.body || value.title !== entry.title) &&
          window.confirm('Unsaved changes found for this entry. Recover your draft?')) recovered = value;
      } catch { /* corrupted backup */ }
    }
    setDraft({
      id: entry.id,
      title: entry.title,
      body: entry.body,
      date: entry.date,
      kind: entry.kind,
      tags: entry.tags,
      aiExcluded: entry.aiExcluded,
      version: entry.version,
      ...recovered
    });
    setTagInput('');
    setSelected(null);
    setChat([]);
    setReflectEntry(entry);
    go('capture');
  };
  const saveEntry = async (): Promise<Entry | null> => {
    if (!draft.title.trim() || !draft.body.trim()) {
      setErrorMessage('Please add a title and write a little about your work.');
      return null;
    }
    setSaving(true);
    setErrorMessage('');
    setSaveStatus('Saving…');
    try {
      const body = {
        ...draft,
        title: draft.title.trim(),
        body: draft.body.trim(),
      };
      if (!draft.id && !pendingCreateId.current) pendingCreateId.current = crypto.randomUUID();
      const { data } = draft.id
        ? await api.put('/api/entries/' + draft.id, {
            ...body,
            expectedVersion: draft.version,
          })
        : await api.post('/api/entries', { ...body, id: pendingCreateId.current });
      const saved = data.entry as Entry;
      setDraft({
        id: saved.id,
        title: saved.title,
        body: saved.body,
        kind: saved.kind,
        date: saved.date,
        tags: saved.tags,
        aiExcluded: saved.aiExcluded,
        version: saved.version,
      });
      setEntries(old => [saved, ...old.filter(e => e.id !== saved.id)]);
      setReflectEntry(saved);
      setSaveStatus('All changes saved');
      if (user) {
        localStorage.removeItem('mindblog_draft_' + user.userId);
        localStorage.removeItem('mindblog_edit_' + user.userId + '_' + saved.id);
      }
      pendingCreateId.current = '';
      setServerConflict(null);
      note('Journal entry saved privately');
      return saved;
    } catch (e) {
      setSaveStatus('Save failed · draft retained');
      const issue = e as { response?: { status?: number }; status?: number };
      if (draft.id && (issue.response?.status === 409 || issue.status === 409)) {
        try {
          const latest = await api.get('/api/entries/' + draft.id);
          setServerConflict(latest.data.entry);
          setErrorMessage('Edit conflict. Choose which version to keep.');
        } catch { setErrorMessage('Edit conflict. Your local draft remains available.'); }
      } else fail(e, 'Save failed; your text is still here.');
      return null;
    } finally {
      setSaving(false);
    }
  };
  const deleteEntry = (entry: Entry) => {
    setConfirm({
      message: 'Delete "' + entry.title + '" and all linked evidence and dependent reviews? This cannot be undone.',
      run: async () => {
        try {
          await api.delete('/api/entries/' + entry.id);
          setEntries(old => old.filter(e => e.id !== entry.id));
          setArtifacts(old => old.filter(a => a.sourceEntryId !== entry.id));
          if (user) localStorage.removeItem('mindblog_edit_' + user.userId + '_' + entry.id);
          void load();
          if (draft.id === entry.id) setDraft(fresh());
          note('Entry deleted');
          setConfirm(null);
        } catch (e) {
          fail(e);
          setConfirm(null);
        }
      },
    });
  };
  const updateSelection = () => {
    const el = textareaRef.current;
    if (!el || !el.value || el.selectionStart === el.selectionEnd) {
      setSelected(null);
      return;
    }
    const start = Array.from(el.value.slice(0, el.selectionStart)).length;
    const end = Array.from(el.value.slice(0, el.selectionEnd)).length;
    setSelected({
      start,
      end,
      quote: el.value.slice(el.selectionStart, el.selectionEnd),
    });
  };
  const selectManual = () => {
    const i = draft.body.indexOf(excerptText);
    if (i < 0 || !excerptText.trim()) {
      setErrorMessage('Your excerpt must match text in this entry.');
      return;
    }
    setSelected({
      quote: excerptText,
      start: Array.from(draft.body.slice(0, i)).length,
      end: Array.from(draft.body.slice(0, i + excerptText.length)).length,
    });
    setManualExcerpt(false);
    setErrorMessage('');
  };
  const requestAction = async (action: string) => {
    if (!selected || !draft.id) {
      setErrorMessage('Save this entry, then select an excerpt to work with.');
      return;
    }
    if (!prefs.aiConsent) {
      setErrorMessage(
        'Turn on AI reflections in Settings to use passage actions.'
      );
      return;
    }
    setProposalBusy(true);
    setErrorMessage('');
    try {
      const { data } = await api.post('/api/action', {
        action,
        entryId: draft.id,
        ...selected,
      });
      setProposal({ type: data.type, data: data.proposal, text: data.text });
      setProposalEditing(data.proposal || null);
      setSelected(null);
    } catch (e) {
      fail(e);
    } finally {
      setProposalBusy(false);
    }
  };
  const confirmProposal = async () => {
    if (!proposalEditing || !proposal) return;
    setProposalBusy(true);
    setErrorMessage('');
    try {
      if (proposal.type === 'goal') {
        const { data } = await api.post('/api/goals', {
          title: proposalEditing.title,
          nextStep: proposalEditing.nextStep,
        });
        setGoals(old => [data.goal, ...old]);
        note('Growth goal added');
      } else {
        const { data } = await api.post('/api/artifacts', {
          ...proposalEditing,
          kind: proposal.type,
          sourceEntryId: proposalEditing.sourceEntryId,
          sourceVersion: proposalEditing.sourceVersion,
          quote: proposalEditing.quote,
        });
        setArtifacts(old => [data.artifact, ...old]);
        note('Evidence approved and saved');
      }
      setProposal(null);
      setProposalEditing(null);
    } catch (e) {
      fail(e);
    } finally {
      setProposalBusy(false);
    }
  };
  const getTags = async () => {
    if (!draft.id) {
      setErrorMessage('Save this entry before suggesting tags.');
      return;
    }
    setProposalBusy(true);
    try {
      const { data } = await api.post('/api/suggest-tags', {
        entryId: draft.id,
      });
      setSuggestions(data.tags || []);
    } catch (e) {
      fail(e);
    } finally {
      setProposalBusy(false);
    }
  };
  const applyTag = (value: string) => {
    if (!draft.tags.some(t => t.toLowerCase() === value.toLowerCase()))
      setDraft(old => ({ ...old, tags: [...old.tags, value].slice(0, 10) }));
    setTagInput('');
  };
  const addTag = () => {
    const value = tagInput.trim().replace(/^#/, '').slice(0, 34);
    if (value) applyTag(value);
  };
  const reflect = async (entry: Entry, newDirective = 'normal') => {
    if(!prefs.aiConsent||entry.aiExcluded){setErrorMessage(entry.aiExcluded?'Entry excluded from AI.':'Enable AI consent first.');return;}
    aiAbortRef.current?.abort();
    const controller=new AbortController();aiAbortRef.current=controller;
    const ticket=++requestRef.current;
    setReflectEntry(entry);setThinking(true);setChat([]);setLiveStage('Connecting…');setDirective(newDirective);setErrorMessage('');
    try{
      const token=await auth.getAccessToken();if(!token)throw new Error('Please sign in.');
      const response=await fetch('/api/ai',{method:'POST',signal:controller.signal,
        headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
        body:JSON.stringify({entryId:entry.id,directive:newDirective})});
      if(!response.ok){const issue=await response.json().catch(()=>({}));throw new Error(issue.error||'AI request failed ('+response.status+').');}
      if(!response.body)throw new Error('Streaming not supported.');
      const reader=response.body.getReader(),decoder=new TextDecoder();let output='';
      setLiveStage('Streaming reflection…');
      while(true){const chunk=await reader.read();if(chunk.done)break;if(ticket!==requestRef.current)return;
        output+=decoder.decode(chunk.value,{stream:true});setChat([{role:'assistant',text:output}]);}
      setLiveStage('Reflection complete');
    }catch(e){if(ticket===requestRef.current&&(e as Error).name!=='AbortError')fail(e,'Reflection failed.');}
    finally{if(ticket===requestRef.current){setThinking(false);aiAbortRef.current=null;}}
  };
  const stopReflection=()=>{
    requestRef.current++;aiAbortRef.current?.abort();aiAbortRef.current=null;
    setThinking(false);setLiveStage('Stopped');note('AI generation stopped.');
  };
  const resolveConflict = (keepMine: boolean) => {
    if (!serverConflict) return;
    const s = serverConflict;
    if (keepMine) {
      setDraft(current => ({ ...current, version:s.version }));
      setSaveStatus('Your edits are preserved; review and save changes.');
    } else {
      setDraft({ id:s.id, title:s.title, body:s.body, kind:s.kind, date:s.date, tags:s.tags, aiExcluded:s.aiExcluded, version:s.version });
    }
    setServerConflict(null);
    setErrorMessage('');
  };
  const eraseMyData = async () => {
    if (deletionPhrase !== 'DELETE MY DATA') { setErrorMessage('Type DELETE MY DATA exactly.'); return; }
    setErasing(true);
    try {
      let complete = false;
      for (let n=0; n<250; n++) {
        const result = await api.post('/api/account/erase', { confirmation:deletionPhrase });
        if (result.data.complete) { complete = true; break; }
      }
      if (!complete) throw new Error('Erasure incomplete; please retry.');
      if (user) {
        localStorage.removeItem('mindblog_draft_' + user.userId);
        for (const e of entries) localStorage.removeItem('mindblog_edit_' + user.userId + '_' + e.id);
      }
      setConfirm(null);
      await signOut();
    } catch(e) { fail(e); } finally { setErasing(false); }
  };
  const saveGoal = async () => {
    if (!goalForm.title.trim()) {
      setErrorMessage('Give your goal a title.');
      return;
    }
    setSaving(true);
    setErrorMessage('');
    try {
      const { data } = await api.post('/api/goals', goalForm);
      setGoals(old => [data.goal, ...old]);
      setGoalModal(false);
      setGoalForm({ title: '', nextStep: '', targetDate: '' });
      note('New growth goal saved');
    } catch (e) {
      fail(e);
    } finally {
      setSaving(false);
    }
  };
  const toggleGoal = async (goal: Goal) => {
    try {
      const { data } = await api.put('/api/goals/' + goal.id, {
        ...goal,
        expectedVersion: goal.version,
        status: goal.status === 'done' ? 'active' : 'done',
      });
      setGoals(old => old.map(g => (g.id === goal.id ? data.goal : g)));
      note('Goal updated');
    } catch (e) {
      fail(e);
    }
  };
  const toggleWeekly = async (enabled:boolean) => {
    if(notificationBusy) return;
    setNotificationBusy(true);
    setErrorMessage('');
    try {
      if(enabled) {
        // Explicit user gesture, required by browser permission model.
        await notifications.subscribe();
        const {data}=await api.put('/api/settings',{...prefs,weeklyReview:true});
        setPrefs(data.settings);
        note('Weekly Monday reminder enabled.');
      } else {
        const {data}=await api.put('/api/settings',{...prefs,weeklyReview:false});
        setPrefs(data.settings);
        await notifications.unsubscribe({showUi:false});
        note('Weekly reminders disabled.');
      }
    } catch(e) {
      fail(e,'Could not change reminder permissions. Check your browser notifications.');
    } finally {setNotificationBusy(false);}
  };
  const sendReminderTest = async () => {
    setNotificationBusy(true); setErrorMessage('');
    try {
      const {data}=await api.post('/api/reminders/test');
      if(data.sent) note('Test notification sent to your subscribed devices.');
      else setErrorMessage('No active browser subscription received the test. Re-enable notifications in browser settings.');
    } catch(e) {fail(e);}
    finally {setNotificationBusy(false);}
  };
  const savePrefs = async (patch: Partial<Preferences>) => {
    try {
      const { data } = await api.put('/api/settings', { ...prefs, ...patch });
      setPrefs(data.settings);
      note('Preferences updated');
    } catch (e) {
      fail(e);
    }
  };
  const isStale = (artifact: Artifact) =>
    !!artifact.sourceEntryId &&
    (!entries.some(e => e.id === artifact.sourceEntryId) ||
      entries.some(
        e =>
          e.id === artifact.sourceEntryId &&
          e.version !== artifact.sourceVersion
      ));
  const filtered = useMemo(
    () =>
      entries.filter(
        e =>
          (kindFilter === 'all' || e.kind === kindFilter) &&
          (tagFilter === 'all' || e.tags.includes(tagFilter)) &&
          (!search ||
            (e.title + ' ' + e.body + ' ' + e.tags.join(' '))
              .toLowerCase()
              .includes(search.toLowerCase()))
      ),
    [entries, search, kindFilter, tagFilter]
  );
  const allTags = useMemo(
    () => [...new Set(entries.flatMap(e => e.tags))].sort(),
    [entries]
  );
  const achievements = artifacts.filter(a => a.kind === 'accomplishment');
  const eligibleEvidence = artifacts.filter(
    a =>
      !isStale(a) &&
      (!reviewStart ||
        (entries.find(e => e.id === a.sourceEntryId)?.date ||
          a.createdAt.slice(0, 10)) >= reviewStart) &&
      (!reviewEnd ||
        (entries.find(e => e.id === a.sourceEntryId)?.date ||
          a.createdAt.slice(0, 10)) <= reviewEnd)
  );
  const draftReview = () => {
    const approved = eligibleEvidence.filter(a =>
      checkedEvidence.includes(a.id)
    );
    if (!approved.length) {
      setErrorMessage('Choose at least one current, approved evidence card.');
      return;
    }
    const lines = [
      '# Career review',
      '',
      'Period: ' +
        (reviewStart || 'Beginning') +
        ' – ' +
        (reviewEnd || 'Present'),
      '',
      '## Contributions and learning',
      ...approved.map(
        a =>
          '- ' +
          a.title +
          (a.description ? ': ' + a.description : '') +
          (a.outcome ? ' Outcome: ' + a.outcome : '') +
          ' [source:' +
          (a.sourceEntryId || a.id) +
          ']'
      ),
      '',
      '## What to strengthen next',
      ...goals
        .filter(g => g.status === 'active')
        .map(
          g => '- Planned: ' + g.title + (g.nextStep ? ' — ' + g.nextStep : '')
        ),
      '',
      '## Evidence to add',
      '- Add measurable results or examples where source notes do not yet contain them.',
    ];
    setReviewText(lines.join('\n'));
    note('Review draft created from selected evidence');
  };
  const saveReview = async () => {
    try {
      const { data } = await api.post('/api/reviews', {
        body: reviewText,
        periodStart: reviewStart,
        periodEnd: reviewEnd,
        artifactIds: checkedEvidence,
      });
      setReviews(old => [data.review, ...old]);
      note('Review draft saved');
    } catch (e) {
      fail(e);
    }
  };
  const download = (filename: string, content: string, type = 'text/plain') => {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const el = document.createElement('a');
    el.href = url;
    el.download = filename;
    el.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 500);
  };
  const exportData = () =>
    download(
      'mind-blogging-export.json',
      JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          entries,
          artifacts,
          goals,
          reviews,
          prefs,
        },
        null,
        2
      ),
      'application/json'
    );
  const deleteArtifact = (artifact: Artifact) =>
    setConfirm({
      message: 'Remove "' + artifact.title + '" from your evidence?',
      run: async () => {
        try {
          await api.delete('/api/artifacts/' + artifact.id);
          setArtifacts(old => old.filter(x => x.id !== artifact.id));
          setConfirm(null);
          note('Evidence removed');
        } catch (e) {
          fail(e);
          setConfirm(null);
        }
      },
    });
  const updateArtifact = async () => {
    if (!editingArtifact) return;
    try {
      const { data } = await api.put('/api/artifacts/' + editingArtifact.id, {
        ...artifactForm,
        expectedVersion: editingArtifact.version,
      });
      setArtifacts(old =>
        old.map(a => (a.id === editingArtifact.id ? data.artifact : a))
      );
      setEditingArtifact(null);
      note('Evidence updated');
    } catch (e) {
      fail(e);
    }
  };
  const deleteGoal = (goal: Goal) =>
    setConfirm({
      message: 'Delete the goal "' + goal.title + '"?',
      run: async () => {
        try {
          await api.delete('/api/goals/' + goal.id);
          setGoals(old => old.filter(g => g.id !== goal.id));
          setConfirm(null);
          note('Goal deleted');
        } catch (e) {
          fail(e);
          setConfirm(null);
        }
      },
    });
  if (!authReady)
    return (
      <div className="boot-screen">
        <div className="brandmark">
          <Feather size={24} />
        </div>
        <LoaderCircle className="spin" />
      </div>
    );
  if (!user)
    return (
      <div className="auth-screen">
        <div className="auth-top">
          <div className="brandmark">
            <Feather size={22} />
          </div>
          <strong>
            mindblog<span>.</span>
          </strong>
          <span className="auth-top-tag">
            <LockKeyhole size={14} /> PRIVATE WORKSPACE
          </span>
        </div>
        <div className="auth-content">
          <div className="auth-copy">
            <div className="eyebrow light">
              <span className="tiny-spark">✳</span> A NEW WAY TO REFLECT AT WORK
            </div>
            <h1>
              Your work has a story.
              <br />
              <em>Make it count.</em>
            </h1>
            <p>
              A quiet space to capture meaningful moments, recognize your
              growth, and bring real evidence to your next big conversation.
            </p>
            <div className="auth-features">
              <span>
                <Check size={16} />
                Private career journal
              </span>
              <span>
                <Check size={16} />
                Evidence-backed achievements
              </span>
              <span>
                <Check size={16} />
                AI, only when you choose
              </span>
            </div>
            <section className="google-login-card" aria-label="Account access">
              <div className="google-login-eyebrow">SIMPLE, SECURE ACCESS</div>
              <h2>One account. All your progress.</h2>
              <p className="google-login-description">
                Sign in or create your private workspace using your Google account.
                No password to remember and no email link to copy.
              </p>
              <button type="button" className="google-login-button"
                onClick={()=>{void signInWithGoogle();}} disabled={authBusy}
                aria-label="Continue with Google">
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                  alt="" width={23} height={23} aria-hidden="true"/>
                <span>{authBusy?'Opening Google…':'Continue with Google'}</span>
                {authBusy&&<LoaderCircle className="spin" size={18}/>}
              </button>
              <p className="google-login-fine">
                First time here? Your account is created when you sign in.
                Returning users can pick up where they left off.
              </p>
              {errorMessage&&<p className="google-login-error" role="alert">{errorMessage}</p>}
            </section>
            <div className="auth-fine">
              Your entries stay private to your account. AI is off by default.
            </div>
          </div>
          <div className="auth-preview" aria-label="Preview of Mind Blogging">
            <div className="preview-note">
              <span className="preview-meta">
                <span className="preview-dot"></span> TODAY'S REFLECTION{' '}
                <span>✳</span>
              </span>
              <div className="preview-hand">
                Small moments. <em>Real progress.</em>
              </div>
              <div className="preview-lines">
                <i></i>
                <i></i>
                <i></i>
              </div>
              <div className="preview-badge">
                <Star size={15} fill="currentColor" /> Example achievement card
              </div>
            </div>
            <div className="preview-floating">
              <span>
                <Sparkles size={16} />
              </span>
              <div>
                <small>YOUR CAREER, IN FOCUS</small>
                <strong>Turn everyday work into growth.</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-footer">
          A little reflection goes a long way. <span>✦</span> Made for the work
          behind the work.
        </div>
      </div>
    );
  const firstName =
    user.name?.split(' ')[0] || user.email?.split('@')[0] || 'there';
  const navButton = (item: (typeof navItems)[number]) => {
    const Icon = icons[item.key];
    return (
      <button
        key={item.key}
        className={'nav-item ' + (page === item.key ? 'active' : '')}
        onClick={() => go(item.key)}
      >
        <Icon size={19} strokeWidth={1.9} />
        <span>{item.label}</span>
        {page === item.key && <span className="nav-current" />}
      </button>
    );
  };
  const artCard = (a: Artifact, compact = false) => (
    <div key={a.id} className={'evidence-card ' + (compact ? 'compact' : '')}>
      <div className="evidence-top">
        <span className={'type-pill ' + (a.kind === 'feedback' ? 'muted' : '')}>
          <Star size={12} />{' '}
          {a.kind === 'accomplishment'
            ? 'Achievement'
            : a.kind === 'feedback'
              ? 'Feedback'
              : 'Evidence'}
        </span>
        <button
          className="icon-only quiet"
          aria-label={'Edit ' + a.title}
          onClick={() => {
            setEditingArtifact(a);
            setArtifactForm({
              title: a.title,
              description: a.description,
              outcome: a.outcome,
            });
          }}
        >
          <Pencil size={14} />
        </button>
      </div>
      <h4>{a.title}</h4>
      {a.description && <p>{cap(a.description, compact ? 100 : 260)}</p>}
      {a.outcome && (
        <div className="artifact-outcome">Outcome: {a.outcome}</div>
      )}
      <div className="evidence-footer">
        {isStale(a) ? (
          <span className="stale">
            <AlertCircle size={12} /> Source changed
          </span>
        ) : (
          <span>
            <CheckCircle2 size={13} /> Source linked
          </span>
        )}{' '}
        <span>{day(a.createdAt)}</span>
      </div>
    </div>
  );
  const goalCard = (g: Goal, compact = false) => (
    <div
      key={g.id}
      className={'goal-card ' + (g.status === 'done' ? 'done' : '')}
    >
      <button
        className="goal-check"
        aria-label={'Toggle goal ' + g.title}
        onClick={() => toggleGoal(g)}
      >
        {g.status === 'done' ? (
          <CheckCircle2 size={23} />
        ) : (
          <Circle size={23} />
        )}
      </button>
      <div className="goal-content">
        <strong>{g.title}</strong>
        {g.nextStep && <p>{cap(g.nextStep, compact ? 60 : 180)}</p>}
        {g.targetDate && (
          <small>
            <CalendarDays size={12} /> {day(g.targetDate)}
          </small>
        )}
      </div>
      {!compact && (
        <button
          className="icon-only quiet"
          aria-label="Delete goal"
          onClick={() => deleteGoal(g)}
        >
          <Trash2 size={15} />
        </button>
      )}
    </div>
  );
  return (
    <div className="app-shell">
      <aside className={'sidebar ' + (mobileMenu ? 'mobile-open' : '')}>
        <div className="side-brand">
          <div className="brandmark">
            <Feather size={21} />
          </div>
          <span>
            mindblog<span className="brand-dot">.</span>
          </span>
          <button
            className="icon-only mobile-close"
            onClick={() => setMobileMenu(false)}
          >
            <X size={20} />
          </button>
        </div>
        <div className="side-label">WORKSPACE</div>
        <nav className="side-nav">{navItems.map(navButton)}</nav>
        <button className="new-note-side" onClick={newCapture}>
          <Plus size={18} /> New entry <span>↗</span>
        </button>
        <div className="side-bottom">
          <div className="privacy-mini">
            <ShieldCheck size={17} />
            <div>
              <strong>Your space is private</strong>
              <span>Only you can see your journal</span>
            </div>
          </div>
          <button
            className={
              'nav-item settings-link ' + (page === 'settings' ? 'active' : '')
            }
            onClick={() => go('settings')}
          >
            <Settings2 size={19} /> Settings
          </button>
          <button className="user-card" onClick={() => go('settings')}>
            <span className="avatar">{firstName[0]?.toUpperCase()}</span>
            <span>
              <strong>{user.name || firstName}</strong>
              <small>Personal workspace</small>
            </span>
            <MoreHorizontal size={19} />
          </button>
        </div>
      </aside>
      {mobileMenu && (
        <div className="mobile-backdrop" onClick={() => setMobileMenu(false)} />
      )}
      <div className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-only mobile-menu"
              onClick={() => setMobileMenu(true)}
            >
              <Menu size={23} />
            </button>
            <span className="breadcrumb">Workspace</span>
            <ChevronRight size={15} className="crumb-chev" />
            <strong>
              {navItems.find(x => x.key === page)?.label || 'Settings'}
            </strong>
          </div>
          <div className="topbar-right">
            <span className="today-date">
              <CalendarDays size={15} />{' '}
              {new Date().toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            <span className="top-avatar">{firstName[0]?.toUpperCase()}</span>
          </div>
        </header>
        <div
          className={
            'workspace ' +
            (!showEvidence || page === 'settings' || page === 'reviews'
              ? 'no-rail'
              : '')
          }
        >
          <main className="content">
            {errorMessage && (
              <div className="error-strip" role="alert">
                <AlertCircle size={17} />
                <span>{errorMessage}</span>
                <button
                  aria-label="Close error"
                  onClick={() => setErrorMessage('')}
                >
                  <X size={16} />
                </button>
              </div>
            )}
            {loading && (
              <div className="loading-strip">
                <LoaderCircle className="spin" size={16} /> Syncing your
                workspace…
              </div>
            )}
            {page === 'home' && (
              <>
                <div className="home-hero">
                  <div className="eyebrow">
                    <span className="little-line" /> YOUR PERSONAL GROWTH SPACE
                  </div>
                  <h1>
                    Good to see you,
                    <br />
                    <em>{firstName}.</em>{' '}
                    <span className="greeting-star">✳</span>
                  </h1>
                  <p>
                    Every small win, lesson, and challenge adds to your story.
                    Let's keep track of what matters.
                  </p>
                  <button className="button primary" onClick={newCapture}>
                    <PenLine size={17} /> Capture a moment{' '}
                    <ArrowRight size={16} />
                  </button>
                  <div className="hero-art">
                    <div className="floating-flower">✳</div>
                    <div className="hero-oval"></div>
                    <div className="hero-orbit"></div>
                    <div className="hero-orbit two"></div>
                  </div>
                </div>
                <div className="section-caption">
                  <span>YOUR JOURNEY SO FAR</span>
                  <span className="caption-rule"></span>
                </div>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-icon lilac">
                      <NotebookPen size={18} />
                    </div>
                    <strong>
                      {entries.length.toString().padStart(2, '0')}
                    </strong>
                    <span>Journal entries</span>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon peach">
                      <Star size={18} />
                    </div>
                    <strong>
                      {achievements.length.toString().padStart(2, '0')}
                    </strong>
                    <span>Achievements</span>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon mint">
                      <Target size={18} />
                    </div>
                    <strong>
                      {goals
                        .filter(g => g.status === 'active')
                        .length.toString()
                        .padStart(2, '0')}
                    </strong>
                    <span>Active goals</span>
                  </div>
                </div>
                <div className="section-heading">
                  <div>
                    <div className="eyebrow">THE LATEST</div>
                    <h2>
                      Recent reflections<span className="small-star">✳</span>
                    </h2>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => go('timeline')}
                  >
                    View journal <ArrowUpRight size={16} />
                  </button>
                </div>
                {entries.length ? (
                  <div className="entry-grid">
                    {entries.slice(0, 3).map(e => (
                      <button
                        className="entry-tile"
                        key={e.id}
                        onClick={() => editEntry(e)}
                      >
                        <div className="entry-tile-top">
                          <span className={'kind-label ' + e.kind}>
                            {e.kind}
                          </span>
                          <span>{day(e.date)}</span>
                        </div>
                        <h3>{e.title}</h3>
                        <p>{cap(e.body, 135)}</p>
                        <div className="tile-bottom">
                          {e.tags.slice(0, 2).map(t => (
                            <span key={t}>#{t}</span>
                          ))}
                          <ArrowUpRight size={17} />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="empty-card">
                    <div className="empty-illustration">
                      <NotebookPen size={32} />
                      <span>✦</span>
                    </div>
                    <div>
                      <h3>Your story starts here.</h3>
                      <p>
                        Your first entry can be as simple as one thing you
                        worked on, learned, or felt proud of today.
                      </p>
                      <button className="button dark" onClick={newCapture}>
                        Write your first entry <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
                <div className="prompt-section">
                  <div className="section-heading">
                    <div>
                      <div className="eyebrow">A LITTLE INSPIRATION</div>
                      <h2>Not sure where to start?</h2>
                    </div>
                  </div>
                  <div className="prompts-grid">
                    {[
                      {
                        icon: Star,
                        title: 'A small win',
                        text: 'What went well this week?',
                        kind: 'win',
                      },
                      {
                        icon: Lightbulb,
                        title: 'Something I learned',
                        text: 'What surprised or taught me?',
                        kind: 'reflection',
                      },
                      {
                        icon: HeartHandshake,
                        title: 'Feedback worth keeping',
                        text: 'What would I like to remember?',
                        kind: 'feedback',
                      },
                    ].map(p => {
                      const Icon = p.icon;
                      return (
                        <button
                          className="prompt-card"
                          key={p.title}
                          onClick={() => {
                            setDraft({
                              ...fresh(),
                              title: p.title,
                              kind: p.kind,
                            });
                            go('capture');
                          }}
                        >
                          <span className="prompt-icon">
                            <Icon size={19} />
                          </span>
                          <strong>{p.title}</strong>
                          <span>{p.text}</span>
                          <ArrowUpRight size={16} className="prompt-arrow" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
            {page === 'capture' && (
              <>
                <div className="page-intro">
                  <div className="eyebrow">
                    <span className="little-line" /> THE CAPTURE SPACE
                  </div>
                  <h1>
                    Put it into <em>words.</em>
                  </h1>
                  <p>
                    Collect a moment from your workday, in your own words. You
                    decide what happens next.
                  </p>
                </div>
                <div className="editor-card">
                  <div className="editor-top">
                    <span className="editor-indicator">
                      <span></span>{' '}
                      {draft.id ? 'EDITING YOUR ENTRY' : 'NEW JOURNAL ENTRY'}
                    </span>
                    <span className="save-indicator">
                      {saveStatus || 'Private by default'}
                    </span>
                  </div>
                  <input
                    aria-label="Entry title"
                    placeholder="Give this moment a title…"
                    className="title-input"
                    value={draft.title}
                    maxLength={120}
                    onChange={e => {
                      setDraft(d => ({ ...d, title: e.target.value }));
                      setSaveStatus('Unsaved edits');
                    }}
                  />
                  <div className="entry-meta-row">
                    <label>
                      <CalendarDays size={15} />
                      <input
                        aria-label="Entry date"
                        type="date"
                        value={draft.date}
                        onChange={e =>
                          setDraft(d => ({ ...d, date: e.target.value }))
                        }
                      />
                    </label>
                    <label>
                      <Tag size={15} />
                      <select
                        aria-label="Entry category"
                        value={draft.kind}
                        onChange={e =>
                          setDraft(d => ({ ...d, kind: e.target.value }))
                        }
                      >
                        <option value="reflection">Reflection</option>
                        <option value="win">Win</option>
                        <option value="feedback">Feedback</option>
                        <option value="challenge">Challenge</option>
                      </select>
                    </label>
                  </div>
                  <div className="writing-area">
                    <textarea
                      ref={textareaRef}
                      aria-label="Journal entry"
                      placeholder={
                        'What happened today?\n\nYou can write about a win, something challenging, a conversation that stayed with you, or anything you would like to remember…'
                      }
                      value={draft.body}
                      maxLength={20000}
                      onChange={e => {
                        setDraft(d => ({ ...d, body: e.target.value }));
                        setSelected(null);
                        setSaveStatus('Unsaved edits');
                      }}
                      onSelect={updateSelection}
                    />
                    <span className="word-count">
                      {draft.body.trim()
                        ? draft.body.trim().split(/\s+/).length
                        : 0}{' '}
                      words
                    </span>
                  </div>
                  {selected && (
                    <div className="selection-toolbar">
                      <div>
                        <Quote size={15} />{' '}
                        <span>“{cap(selected.quote, 58)}”</span>
                      </div>
                      <div className="selection-buttons">
                        <button onClick={() => requestAction('accomplishment')}>
                          Save achievement
                        </button>
                        <button onClick={() => requestAction('feedback')}>
                          Explore feedback
                        </button>
                        <button onClick={() => requestAction('goal')}>
                          Extract goal
                        </button>
                        <button onClick={() => requestAction('reframe')}>
                          Reframe
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="tag-edit">
                    <div className="tag-heading">
                      <span>
                        <Tag size={15} /> Tags & context
                      </span>
                      <button
                        onClick={getTags}
                        disabled={!draft.id || proposalBusy || !prefs.aiConsent}
                      >
                        <WandSparkles size={14} /> Suggest tags
                      </button>
                    </div>
                    <div className="tags-box">
                      {draft.tags.map(t => (
                        <span className="editable-tag" key={t}>
                          #{t}
                          <button
                            aria-label={'Remove tag ' + t}
                            onClick={() =>
                              setDraft(d => ({
                                ...d,
                                tags: d.tags.filter(x => x !== t),
                              }))
                            }
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                      <input
                        aria-label="Add tag"
                        placeholder="+ Add project or skill"
                        value={tagInput}
                        onChange={e => setTagInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault();
                            addTag();
                          }
                        }}
                        onBlur={addTag}
                      />
                    </div>
                  </div>
                  <div className="editor-options">
                    <label className="toggle-line">
                      <input
                        type="checkbox"
                        checked={draft.aiExcluded}
                        onChange={e =>
                          setDraft(d => ({
                            ...d,
                            aiExcluded: e.target.checked,
                          }))
                        }
                      />
                      <EyeOff size={16} /> Exclude this entry from AI{' '}
                      <span>(private capture only)</span>
                    </label>
                    <button
                      className="text-button"
                      onClick={() => {
                        setExcerptText('');
                        setManualExcerpt(true);
                      }}
                    >
                      <Quote size={15} /> Select excerpt
                    </button>
                  </div>
                  <div className="editor-actions">
                    <span>
                      <LockKeyhole size={14} /> Only you can view this entry
                    </span>
                    <div>
                      <button
                        className="button outline"
                        onClick={() => void saveEntry()}
                        disabled={saving}
                      >
                        <Save size={16} />
                        {saving
                          ? 'Saving…'
                          : draft.id
                            ? 'Save changes'
                            : 'Save privately'}
                      </button>
                      <button
                        className="button primary"
                        onClick={async () => {
                          const e = await saveEntry();
                          if (e) void reflect(e);
                        }}
                        disabled={saving || thinking || draft.aiExcluded}
                      >
                        <Sparkles size={17} /> Save & reflect
                      </button>
                    </div>
                  </div>
                </div>
                {thinking || chat.length > 0 ? (
                  <div className="reflection-panel">
                    <div className="reflection-head">
                      <span className="ai-bubble">
                        <Sparkles size={17} />
                      </span>
                      <div>
                        <strong>Your reflection companion</strong>
                        <small>
                          Live AI reflection sections, based on your selected entry
                        </small>
                      </div>
                    </div>
                    <div className="reflection-thread">
                      {chat
                        .filter(x => x.role === 'assistant')
                        .map((m, i) => (
                          <div className="assistant-response" key={i}>
                            {m.text}
                          </div>
                        ))}
                      {thinking && (
                        <div className="thinking-bubble">
                          <LoaderCircle className="spin" size={17} /> {liveStage || 'Reflecting on your entry…'}
                        </div>
                      )}
                    </div>
                    <div className="directive-row">
                      <span>STEER THE RESPONSE</span>
                      <button
                        onClick={() => reflect(reflectEntry!, 'concise')}
                        disabled={!reflectEntry}
                      >
                        <PenLine size={13} /> Be concise
                      </button>
                      <button
                        onClick={() => reflect(reflectEntry!, 'example')}
                        disabled={!reflectEntry}
                      >
                        <Lightbulb size={13} /> Give example
                      </button>
                      <button
                        onClick={() => reflect(reflectEntry!, 'solutions')}
                        disabled={!reflectEntry}
                      >
                        <Target size={13} /> Focus on solutions
                      </button>
                      {thinking && (
                        <button
                          className="stop-button"
                          onClick={stopReflection}
                        >
                          <Square size={13} /> Stop generating
                        </button>
                      )}
                    </div>
                    <small className="ai-disclaimer">
                      Sections appear when ready. Stop prevents later generation stages, but an in-progress model call cannot be aborted by the current provider API.
                    </small>
                  </div>
                ) : (
                  <div className="capture-tip">
                    <Lightbulb size={19} />
                    <span>
                      <strong>A gentle tip</strong> Highlight any sentence in a
                      saved entry to turn it into a source-linked achievement or
                      growth goal. On mobile, use “Select excerpt”.
                    </span>
                  </div>
                )}
              </>
            )}
            {page === 'timeline' && (
              <>
                <div className="page-intro compact-intro">
                  <div className="eyebrow">
                    <span className="little-line" /> THE JOURNAL
                  </div>
                  <div className="intro-row">
                    <div>
                      <h1>
                        Your work, <em>remembered.</em>
                      </h1>
                      <p>Go back to the moments that shaped your growth.</p>
                    </div>
                    <button className="button primary" onClick={newCapture}>
                      <Plus size={17} /> New entry
                    </button>
                  </div>
                </div>
                <div className="filters-card">
                  <div className="search-field">
                    <Search size={17} />
                    <input
                      aria-label="Search entries"
                      placeholder="Search moments, words, projects…"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                  </div>
                  <div className="filter-row">
                    <label>
                      <Filter size={15} />
                      <select
                        aria-label="Filter by category"
                        value={kindFilter}
                        onChange={e => setKindFilter(e.target.value)}
                      >
                        <option value="all">All moments</option>
                        {['win', 'reflection', 'feedback', 'challenge'].map(
                          k => (
                            <option key={k} value={k}>
                              {k}
                            </option>
                          )
                        )}
                      </select>
                    </label>
                    <label>
                      <Tag size={15} />
                      <select
                        aria-label="Filter by tag"
                        value={tagFilter}
                        onChange={e => setTagFilter(e.target.value)}
                      >
                        <option value="all">All tags</option>
                        {allTags.map(t => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    </label>
                    <span>{filtered.length} entries</span>
                  </div>
                </div>
                {filtered.length ? (
                  <div className="timeline-list">
                    {filtered.map(e => (
                      <article className="timeline-item" key={e.id}>
                        <div className="timeline-date">
                          <span>{day(e.date)}</span>
                          <span className="timeline-dot" />
                        </div>
                        <div className="journal-card">
                          <div className="journal-card-top">
                            <span className={'kind-label ' + e.kind}>
                              {e.kind}
                            </span>
                            <span>
                              {e.aiExcluded && <EyeOff size={13} />}{' '}
                              {day(e.date)}
                            </span>
                          </div>
                          <h3>{e.title}</h3>
                          <p>{cap(e.body, 340)}</p>
                          <div className="journal-tags">
                            {e.tags.map(t => (
                              <span key={t}>#{t}</span>
                            ))}
                          </div>
                          <div className="journal-actions">
                            <button onClick={() => editEntry(e)}>
                              <PenLine size={15} /> Open & edit{' '}
                              <ArrowRight size={14} />
                            </button>
                            <button
                              className="icon-only quiet"
                              aria-label={'Delete ' + e.title}
                              onClick={() => deleteEntry(e)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <BookOpen size={30} />
                    <h3>
                      {entries.length
                        ? 'No matching moments'
                        : 'Nothing here yet'}
                    </h3>
                    <p>
                      {entries.length
                        ? 'Try adjusting your search or filters.'
                        : 'Start your journal with one moment from today.'}
                    </p>
                    <button
                      className="button dark"
                      onClick={
                        entries.length
                          ? () => {
                              setSearch('');
                              setKindFilter('all');
                              setTagFilter('all');
                            }
                          : newCapture
                      }
                    >
                      {entries.length ? 'Clear filters' : 'Write an entry'}
                    </button>
                  </div>
                )}
              </>
            )}
            {page === 'growth' && (
              <>
                <div className="page-intro compact-intro">
                  <div className="eyebrow">
                    <span className="little-line" /> YOUR GROWTH LIBRARY
                  </div>
                  <h1>
                    Look how far <em>you've come.</em>
                  </h1>
                  <p>
                    Collect the evidence behind your story and make space for
                    what's next.
                  </p>
                </div>
                <div className="growth-summary">
                  <div>
                    <span>RECORDED EVIDENCE</span>
                    <strong>{artifacts.length}</strong>
                    <small>Confirmed cards</small>
                  </div>
                  <div>
                    <span>GOALS IN MOTION</span>
                    <strong>
                      {goals.filter(g => g.status === 'active').length}
                    </strong>
                    <small>Active intentions</small>
                  </div>
                  <div>
                    <span>GOALS COMPLETED</span>
                    <strong>
                      {goals.filter(g => g.status === 'done').length}
                    </strong>
                    <small>Milestones</small>
                  </div>
                </div>
                <div className="section-heading growth-head">
                  <div>
                    <div className="eyebrow">THE PROOF OF YOUR PROGRESS</div>
                    <h2>Evidence library</h2>
                  </div>
                  <button className="text-button" onClick={newCapture}>
                    Capture more <ArrowUpRight size={16} />
                  </button>
                </div>
                {artifacts.length ? (
                  <div className="evidence-grid">
                    {[...artifacts].reverse().map(a => artCard(a))}
                  </div>
                ) : (
                  <div className="empty-state soft">
                    <Star size={30} />
                    <h3>Small wins belong here.</h3>
                    <p>
                      Highlight a passage in a saved journal entry, choose “Save
                      achievement”, and approve the result.
                    </p>
                    <button className="button dark" onClick={newCapture}>
                      Capture your first win
                    </button>
                  </div>
                )}
                <div className="section-heading growth-head">
                  <div>
                    <div className="eyebrow">NEXT CHAPTER</div>
                    <h2>Growth goals</h2>
                  </div>
                  <button
                    className="button outline small"
                    onClick={() => setGoalModal(true)}
                  >
                    <Plus size={16} /> New goal
                  </button>
                </div>
                {goals.length ? (
                  <div className="goal-list">{goals.map(g => goalCard(g))}</div>
                ) : (
                  <div className="empty-inline">
                    No goals yet. One small next step is enough to begin.
                  </div>
                )}
              </>
            )}
            {page === 'reviews' && (
              <>
                <div className="page-intro compact-intro">
                  <div className="eyebrow">
                    <span className="little-line" /> THE REVIEW STUDIO
                  </div>
                  <h1>
                    Your story, <em>with substance.</em>
                  </h1>
                  <p>
                    Bring your contributions together into a review grounded in
                    moments you actually recorded.
                  </p>
                </div>
                <div className="review-builder">
                  <div className="step-label">
                    <span>01</span> CHOOSE YOUR TIMEFRAME
                  </div>
                  <div className="date-range">
                    <label>
                      From
                      <input
                        type="date"
                        aria-label="Review start date"
                        value={reviewStart}
                        onChange={e => setReviewStart(e.target.value)}
                      />
                    </label>
                    <label>
                      To
                      <input
                        type="date"
                        aria-label="Review end date"
                        value={reviewEnd}
                        onChange={e => setReviewEnd(e.target.value)}
                      />
                    </label>
                  </div>
                  <div className="step-label">
                    <span>02</span> SELECT YOUR APPROVED EVIDENCE{' '}
                    <small>{checkedEvidence.length} selected</small>
                  </div>
                  <div className="review-evidence">
                    {eligibleEvidence.length ? (
                      eligibleEvidence.map(a => (
                        <label
                          key={a.id}
                          className={
                            'review-evidence-item ' +
                            (checkedEvidence.includes(a.id) ? 'checked' : '')
                          }
                        >
                          <input
                            type="checkbox"
                            checked={checkedEvidence.includes(a.id)}
                            onChange={e =>
                              setCheckedEvidence(old =>
                                e.target.checked
                                  ? [...old, a.id]
                                  : old.filter(id => id !== a.id)
                              )
                            }
                          />
                          <div>
                            <strong>{a.title}</strong>
                            <small>
                              {a.description
                                ? cap(a.description, 100)
                                : 'Approved evidence'}
                            </small>
                          </div>
                          <CheckCircle2 size={16} />
                        </label>
                      ))
                    ) : (
                      <div className="review-empty">
                        <FileText size={24} />
                        <strong>No eligible evidence yet</strong>
                        <p>
                          Confirm an accomplishment from your journal first.
                          Changed sources need revalidation.
                        </p>
                      </div>
                    )}
                  </div>
                  <button
                    className="button primary review-generate"
                    onClick={draftReview}
                    disabled={!eligibleEvidence.length}
                  >
                    <Sparkles size={17} /> Generate review draft{' '}
                    <ArrowRight size={17} />
                  </button>
                </div>
                {reviewText && (
                  <div className="review-output">
                    <div className="review-output-top">
                      <div>
                        <div className="eyebrow">EDITABLE DRAFT</div>
                        <h3>Your career narrative</h3>
                      </div>
                      <span className="approved-label">
                        <ShieldCheck size={14} /> Source-linked
                      </span>
                    </div>
                    <textarea
                      aria-label="Review draft"
                      value={reviewText}
                      onChange={e => setReviewText(e.target.value)}
                    />
                    <div className="review-output-actions">
                      <button
                        className="button outline"
                        onClick={() =>
                          download(
                            'career-review.md',
                            reviewText,
                            'text/markdown'
                          )
                        }
                      >
                        <Download size={16} /> Export all Markdown
                      </button>
                      <button className="button dark" onClick={saveReview}>
                        <Save size={16} /> Save review
                      </button>
                    </div>
                    <p className="review-caveat">
                      <Info size={14} /> Verify each claim against its source
                      before sharing. The app never sends reviews to an
                      employer.
                    </p>
                  </div>
                )}
                {reviews.length > 0 && (
                  <div className="past-reviews">
                    <div className="section-heading">
                      <div>
                        <h2>Saved reviews</h2>
                      </div>
                    </div>
                    {[...reviews].reverse().map(r => (
                      <button
                        key={r.id}
                        className="past-review"
                        onClick={() => {
                          setReviewText(r.body);
                          setReviewStart(r.periodStart);
                          setReviewEnd(r.periodEnd);
                          setCheckedEvidence(r.artifactIds);
                        }}
                      >
                        <FileText size={19} />
                        <div>
                          <strong>Career review</strong>
                          <small>
                            {day(r.createdAt)} · {r.artifactIds.length} evidence
                            sources
                          </small>
                        </div>
                        <ArrowUpRight size={17} />
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
            {page === 'settings' && (
              <>
                <div className="page-intro compact-intro">
                  <div className="eyebrow">
                    <span className="little-line" /> MAKE IT YOURS
                  </div>
                  <h1>
                    Your space. <em>Your rules.</em>
                  </h1>
                  <p>
                    Choose how much guidance you'd like and exactly how your
                    notes can be used.
                  </p>
                </div>
                <div className="settings-section">
                  <div className="settings-head">
                    <span className="settings-icon">
                      <Sparkles size={20} />
                    </span>
                    <div>
                      <h3>AI reflections</h3>
                      <p>
                        AI is optional. Your notes can always be saved without
                        it.
                      </p>
                    </div>
                  </div>
                  <label className="settings-toggle">
                    <div>
                      <strong>Allow AI reflection</strong>
                      <span>
                        Send only eligible, explicitly requested entries to the
                        AI service
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={prefs.aiConsent}
                      onChange={e => savePrefs({ aiConsent: e.target.checked })}
                    />
                    <i />
                  </label>
                  <div className="setting-divider" />
                  <div className="setting-choice">
                    <strong>Conversation style</strong>
                    <p>How much should your reflection companion guide you?</p>
                    <div className="mode-grid">
                      {[
                        ['passive', 'Passive', 'Answers only'],
                        ['guided', 'Guided', 'One helpful question'],
                        ['proactive', 'Proactive', 'Opt-in check-ins'],
                      ].map(m => (
                        <button
                          key={m[0]}
                          className={
                            'mode-choice ' +
                            (prefs.initiative === m[0] ? 'selected' : '')
                          }
                          onClick={() => savePrefs({ initiative: m[0] })}
                        >
                          <span>{m[1]}</span>
                          <small>{m[2]}</small>
                          {prefs.initiative === m[0] && (
                            <CheckCircle2 size={16} />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="settings-section">
                  <div className="settings-head">
                    <span className="settings-icon mint">
                      <Bell size={20} />
                    </span>
                    <div>
                      <h3>Gentle reminders</h3>
                      <p>Build a reflection habit on your own terms.</p>
                    </div>
                  </div>
                  <label className="settings-toggle">
                    <div>
                      <strong>Weekly review prompt</strong>
                      <span>
                        Scheduled browser notification every Monday at 9:00 AM India time. Allow notifications when prompted.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={prefs.weeklyReview}
                      disabled={notificationBusy}
                      onChange={e => void toggleWeekly(e.target.checked)}
                    />
                    <i />
                  </label>
                </div>
                {prefs.weeklyReview && <div className="settings-section">
                  <div className="settings-line">
                    <div><strong>Test browser notification</strong><span>Send one test reminder to this account's subscribed devices.</span></div>
                    <button className="button outline small" disabled={notificationBusy} onClick={sendReminderTest}>
                      <Bell size={16}/> Send test
                    </button>
                  </div>
                  <button className="text-button" disabled={notificationBusy} onClick={() => void toggleWeekly(true)}>
                    <Bell size={15}/> Reconnect browser notifications and renew schedule
                  </button>
                </div>}
                <div className="settings-section">
                  <div className="settings-head">
                    <span className="settings-icon peach">
                      <ShieldCheck size={20} />
                    </span>
                    <div>
                      <h3>Privacy & your data</h3>
                      <p>
                        Your records belong to you. There is no employer
                        dashboard.
                      </p>
                    </div>
                  </div>
                  <div className="settings-line">
                    <div>
                      <strong>Download your data</strong>
                      <span>
                        Export all pages of your journal, achievements, goals and reviews as JSON.
                      </span>
                    </div>
                    <button
                      className="button outline small"
                      onClick={exportData}
                    >
                      <Download size={16} /> Export
                    </button>
                  </div>
                  <div className="settings-line">
                    <div>
                      <strong>Signed in as</strong>
                      <span>{user.email || 'Your private account'}</span>
                    </div>
                    <button className="button outline small" onClick={signOut}>
                      <LogOut size={16} /> Sign out
                    </button>
                  </div>
                  <div className="settings-line">
                    <div><strong>Erase your Mind Blogging data</strong><span>Permanent removal of records; your Google/email identity remains active.</span></div>
                    <button className="button danger-ghost" onClick={() => setConfirm({
                      message: 'Permanently erase all Mind Blogging records? Your Google/email identity will remain.',
                      run: eraseMyData
                    })}><Trash2 size={16}/> Erase data</button>
                  </div>
                  <label className="data-erase-confirm">To erase, type DELETE MY DATA
                    <input aria-label="Confirm data erasure" placeholder="DELETE MY DATA" value={deletionPhrase} onChange={e => setDeletionPhrase(e.target.value)}/>
                  </label>
                  <div className="privacy-info">
                    <LockKeyhole size={16} /> Journal data is protected by
                    account login. With AI enabled, selected text is processed
                    by an AI provider; this is not end-to-end encryption.
                  </div>
                </div>
              </>
            )}
            <footer className="content-footer">
              <Feather size={15} /> A little reflection goes a long way.{' '}
              <span>Mindblog · your private career space</span>
            </footer>
          </main>
          {showEvidence && page !== 'settings' && page !== 'reviews' && (
            <aside className="evidence-rail">
              <div className="rail-top">
                <span>YOUR GROWTH AT A GLANCE</span>
                <button
                  className="icon-only quiet"
                  title="Hide side panel"
                  aria-label="Hide side panel"
                  onClick={() => setShowEvidence(false)}
                >
                  <PanelRightClose size={18} />
                </button>
              </div>
              <div className="rail-quote">
                <div className="rail-decoration">✳</div>
                <Quote size={18} />
                <p>
                  Progress isn't always loud. Sometimes it's the moment you
                  decide to <em>notice.</em>
                </p>
                <span>A SPACE TO GROW</span>
              </div>
              <div className="rail-heading">
                <h3>Evidence shelf</h3>
                <button onClick={() => go('growth')}>
                  View all <ArrowUpRight size={14} />
                </button>
              </div>
              <div className="rail-tabs">
                <button
                  className={evidenceTab === 'achievements' ? 'selected' : ''}
                  onClick={() => setEvidenceTab('achievements')}
                >
                  Wins
                </button>
                <button
                  className={evidenceTab === 'skills' ? 'selected' : ''}
                  onClick={() => setEvidenceTab('skills')}
                >
                  Skills
                </button>
                <button
                  className={evidenceTab === 'goals' ? 'selected' : ''}
                  onClick={() => setEvidenceTab('goals')}
                >
                  Goals
                </button>
              </div>
              <div className="rail-items">
                {evidenceTab === 'achievements' &&
                  (achievements.length ? (
                    achievements
                      .slice(-3)
                      .reverse()
                      .map(a => artCard(a, true))
                  ) : (
                    <div className="rail-empty">
                      <span className="rail-empty-icon">
                        <Star size={24} />
                      </span>
                      <strong>Make room for your wins</strong>
                      <p>As you save achievements, they'll find a home here.</p>
                    </div>
                  ))}
                {evidenceTab === 'skills' &&
                  (allTags.length ? (
                    <div className="skill-tags">
                      {allTags.map(t => (
                        <span key={t}>
                          <span className="skill-dot" />#{t}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="rail-empty">
                      <span className="rail-empty-icon">
                        <Tag size={24} />
                      </span>
                      <strong>Skills and projects, collected</strong>
                      <p>
                        Tag a journal entry to begin building your context
                        library.
                      </p>
                    </div>
                  ))}
                {evidenceTab === 'goals' &&
                  (goals.length ? (
                    goals.slice(-4).map(g => goalCard(g, true))
                  ) : (
                    <div className="rail-empty">
                      <span className="rail-empty-icon">
                        <Target size={24} />
                      </span>
                      <strong>Your next chapter</strong>
                      <p>Goals you choose to pursue will live here.</p>
                      <button
                        className="text-button"
                        onClick={() => setGoalModal(true)}
                      >
                        Add a goal <ArrowRight size={14} />
                      </button>
                    </div>
                  ))}
              </div>
              <div className="rail-bottom">
                <div className="rail-small-title">
                  A THOUGHT FOR TODAY <span>✳</span>
                </div>
                <p>
                  “The work you don't record is the growth you might forget.”
                </p>
                <span>KEEP SHOWING UP</span>
              </div>
            </aside>
          )}
        </div>
      </div>
      {!showEvidence && page !== 'settings' && page !== 'reviews' && (
        <button
          className="show-rail"
          aria-label="Show evidence panel"
          onClick={() => setShowEvidence(true)}
        >
          <PanelRightOpen size={20} />
        </button>
      )}
      <nav className="bottom-nav">
        {navItems.slice(0, 5).map(item => {
          const Icon = icons[item.key];
          return (
            <button
              className={page === item.key ? 'selected' : ''}
              onClick={() => go(item.key)}
              key={item.key}
            >
              <Icon size={21} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      {toast && (
        <div className="toast">
          <CheckCircle2 size={17} />
          {toast}
        </div>
      )}
      {confirm && (
        <div className="modal-scrim" role="dialog" aria-modal="true">
          <div className="modal small-modal">
            <div className="modal-top">
              <h3>Please confirm</h3>
              <button
                className="icon-only"
                aria-label="Close"
                onClick={() => setConfirm(null)}
              >
                <X size={20} />
              </button>
            </div>
            <p>{confirm.message}</p>
            <div className="modal-actions">
              <button
                className="button outline"
                onClick={() => setConfirm(null)}
              >
                Cancel
              </button>
              <button className="button danger" onClick={confirm.run}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {serverConflict && (
        <div className="modal-scrim" role="dialog" aria-modal="true" aria-label="Resolve edit conflict">
          <div className="modal">
            <div className="modal-top"><h3>Resolve edit conflict</h3></div>
            <p>Compare both versions. Keeping your edits does not save them until you click Save changes.</p>
            <div className="conflict-compare">
              <div><strong>Current saved version</strong><pre>{serverConflict.title + '\n' + serverConflict.body}</pre></div>
              <div><strong>Your draft</strong><pre>{draft.title + '\n' + draft.body}</pre></div>
            </div>
            <div className="modal-actions">
              <button className="button outline" onClick={() => resolveConflict(false)}>Use saved version</button>
              <button className="button primary" onClick={() => resolveConflict(true)}>Keep my draft</button>
            </div>
          </div>
        </div>
      )}
      {manualExcerpt && (
        <div className="modal-scrim" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modal-top">
              <div>
                <div className="eyebrow">INLINE CONTEXT</div>
                <h3>Select a passage</h3>
              </div>
              <button
                className="icon-only"
                onClick={() => setManualExcerpt(false)}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <p>
              Copy the exact sentence or phrase from your saved entry that you
              want to explore.
            </p>
            <textarea
              className="modal-textarea"
              autoFocus
              value={excerptText}
              onChange={e => setExcerptText(e.target.value)}
              placeholder="Paste or type the exact excerpt…"
            />
            <div className="modal-actions">
              <button
                className="button outline"
                onClick={() => setManualExcerpt(false)}
              >
                Cancel
              </button>
              <button className="button primary" onClick={selectManual}>
                Use passage <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}
      {proposal && (
        <div className="modal-scrim" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modal-top">
              <div>
                <div className="eyebrow">
                  AI SUGGESTION · REVIEW BEFORE SAVING
                </div>
                <h3>
                  {proposal.type === 'reframe'
                    ? 'A different perspective'
                    : 'Make this yours'}
                </h3>
              </div>
              <button
                className="icon-only"
                aria-label="Close"
                onClick={() => setProposal(null)}
              >
                <X size={20} />
              </button>
            </div>
            {proposal.text ? (
              <div className="reframe-text">{proposal.text}</div>
            ) : (
              proposalEditing && (
                <div className="modal-fields">
                  <label>
                    Title
                    <input
                      value={proposalEditing.title}
                      onChange={e =>
                        setProposalEditing(
                          p => p && { ...p, title: e.target.value }
                        )
                      }
                    />
                  </label>
                  <label>
                    Description
                    <textarea
                      value={proposalEditing.description}
                      onChange={e =>
                        setProposalEditing(
                          p => p && { ...p, description: e.target.value }
                        )
                      }
                    />
                  </label>
                  {proposal.type !== 'goal' && (
                    <label>
                      Outcome (leave blank if unknown)
                      <input
                        value={proposalEditing.outcome}
                        onChange={e =>
                          setProposalEditing(
                            p => p && { ...p, outcome: e.target.value }
                          )
                        }
                      />
                    </label>
                  )}
                  {proposal.type === 'goal' && (
                    <label>
                      First step
                      <input
                        value={proposalEditing.nextStep}
                        onChange={e =>
                          setProposalEditing(
                            p => p && { ...p, nextStep: e.target.value }
                          )
                        }
                      />
                    </label>
                  )}
                  <div className="source-box">
                    <Quote size={15} /> “{cap(proposalEditing.quote, 220)}”
                  </div>
                </div>
              )
            )}
            <div className="modal-actions">
              <button
                className="button outline"
                onClick={() => setProposal(null)}
              >
                Discard
              </button>
              {!proposal.text && (
                <button
                  className="button primary"
                  disabled={proposalBusy}
                  onClick={confirmProposal}
                >
                  <Check size={16} /> Approve & save
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {suggestions && (
        <div className="modal-scrim" role="dialog" aria-modal="true">
          <div className="modal small-modal">
            <div className="modal-top">
              <div>
                <div className="eyebrow">SUGGESTED, NOT APPLIED</div>
                <h3>Review tags</h3>
              </div>
              <button
                className="icon-only"
                onClick={() => setSuggestions(null)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="suggestions">
              {suggestions.length ? (
                suggestions.map((s, i) => (
                  <div key={i}>
                    <span>
                      <Tag size={14} /> #{s.label} <small>{s.kind}</small>
                    </span>
                    <button
                      onClick={() => {
                        applyTag(s.label);
                        setSuggestions(
                          old => old?.filter((_, j) => i !== j) || []
                        );
                      }}
                    >
                      <Plus size={15} /> Add
                    </button>
                  </div>
                ))
              ) : (
                <p>No useful suggestions for this entry yet.</p>
              )}
            </div>
            <p className="mini-note">
              Tags are saved to the entry when you choose “Save changes”.
            </p>
          </div>
        </div>
      )}
      {goalModal && (
        <div className="modal-scrim" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modal-top">
              <div>
                <div className="eyebrow">A SMALL NEXT STEP</div>
                <h3>New growth goal</h3>
              </div>
              <button className="icon-only" onClick={() => setGoalModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-fields">
              <label>
                What would you like to work toward?
                <input
                  placeholder="e.g. Speak up more confidently in meetings"
                  value={goalForm.title}
                  onChange={e =>
                    setGoalForm(g => ({ ...g, title: e.target.value }))
                  }
                />
              </label>
              <label>
                What's one first step?
                <textarea
                  placeholder="A practical action you can take…"
                  value={goalForm.nextStep}
                  onChange={e =>
                    setGoalForm(g => ({ ...g, nextStep: e.target.value }))
                  }
                />
              </label>
              <label>
                Target date (optional)
                <input
                  type="date"
                  value={goalForm.targetDate}
                  onChange={e =>
                    setGoalForm(g => ({ ...g, targetDate: e.target.value }))
                  }
                />
              </label>
            </div>
            <div className="modal-actions">
              <button
                className="button outline"
                onClick={() => setGoalModal(false)}
              >
                Cancel
              </button>
              <button
                className="button primary"
                onClick={saveGoal}
                disabled={saving}
              >
                Save goal <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}
      {editingArtifact && (
        <div className="modal-scrim" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modal-top">
              <div>
                <div className="eyebrow">EDIT YOUR EVIDENCE</div>
                <h3>Make it accurate</h3>
              </div>
              <button
                className="icon-only"
                onClick={() => setEditingArtifact(null)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-fields">
              <label>
                Title
                <input
                  value={artifactForm.title}
                  onChange={e =>
                    setArtifactForm(f => ({ ...f, title: e.target.value }))
                  }
                />
              </label>
              <label>
                Description
                <textarea
                  value={artifactForm.description}
                  onChange={e =>
                    setArtifactForm(f => ({
                      ...f,
                      description: e.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Outcome
                <input
                  value={artifactForm.outcome}
                  onChange={e =>
                    setArtifactForm(f => ({ ...f, outcome: e.target.value }))
                  }
                />
              </label>
            </div>
            <div className="modal-actions split">
              <button
                className="button danger-ghost"
                onClick={() => {
                  deleteArtifact(editingArtifact);
                  setEditingArtifact(null);
                }}
              >
                <Trash2 size={15} /> Delete
              </button>
              <button className="button primary" onClick={updateArtifact}>
                Save edits
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default App;
