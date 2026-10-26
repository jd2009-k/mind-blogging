import { useEffect, useRef, useState } from 'react';
import { auth } from './cloud';
import {
  ArrowRight, BookOpen, CalendarDays, Check, ChevronRight,
  Feather, Heart, Home, LockKeyhole, PenLine, Pencil,
  Settings2, ShieldCheck, Sparkles, Sprout, UserRound
} from 'lucide-react';
import './playful-profile.css';

export type WorkspacePage = 'home' | 'capture' | 'timeline' | 'growth' | 'reviews' | 'settings';
type Color = 'lilac' | 'coral' | 'mint' | 'amber';
type Profile = { name: string; headline: string; bio: string; color: Color };

const PROFILE_KEY = 'mind-blogging-personal-profile-v2';
// Legacy unowned profiles are intentionally not migrated: ownership cannot be established.
const blankProfile: Profile = {
  name: '', headline: '', bio: '', color: 'lilac'
};
const colors: { color: Color; label: string }[] = [
  { color: 'lilac', label: 'Lilac' },
  { color: 'coral', label: 'Coral' },
  { color: 'mint', label: 'Mint' },
  { color: 'amber', label: 'Sunshine' }
];

function loadProfile(userId: string | null): Profile {
  // Never infer account ownership from browser storage before authentication.
  if (!userId) return { ...blankProfile };
  try {
    const value = window.localStorage.getItem(PROFILE_KEY + ':' + userId);
    if (!value) return { ...blankProfile };
    const record: unknown = JSON.parse(value);
    if (!record || typeof record !== 'object') return { ...blankProfile };
    const profile = record as Partial<Profile>;
    return {
      name: typeof profile.name === 'string' ? profile.name.slice(0, 60) : '',
      headline: typeof profile.headline === 'string' ? profile.headline.slice(0, 80) : '',
      bio: typeof profile.bio === 'string' ? profile.bio.slice(0, 240) : '',
      color: colors.some(item => item.color === profile.color) ? profile.color! : 'lilac'
    };
  } catch {
    return { ...blankProfile };
  }
}

function initials(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).slice(0, 2)
    .map(piece => piece[0].toUpperCase()).join('') || '✦';
}

function SparkFriend() {
  return (
    <svg className="pl-mascot" viewBox="0 0 360 290" fill="none" aria-hidden="true">
      <defs>
        <radialGradient id="pl-spark" cx="35%" cy="23%" r="86%">
          <stop offset="0" stopColor="#ffe5a0" />
          <stop offset=".56" stopColor="#ffa28d" />
          <stop offset="1" stopColor="#a39af9" />
        </radialGradient>
      </defs>
      <ellipse cx="185" cy="258" rx="129" ry="14" fill="#d6cafa" opacity=".55" />
      <circle cx="67" cy="89" r="9" fill="#e8c6f7" />
      <circle cx="295" cy="53" r="6" fill="#f8c879" />
      <circle cx="283" cy="211" r="11" fill="#cfeddc" />
      <path d="M173 22 C198 80 218 95 286 123 C223 143 210 174 182 240 C156 177 133 153 70 130 C135 106 152 81 173 22 Z"
        fill="url(#pl-spark)" stroke="#3e3656" strokeWidth="4" strokeLinejoin="round" />
      <path d="M133 130 Q144 118 155 130 M195 129 Q206 119 216 128 M159 158 Q178 177 196 156"
        stroke="#3e3656" strokeWidth="5" strokeLinecap="round" />
      <ellipse cx="134" cy="153" rx="11" ry="6" fill="#ff7d86" opacity=".52" />
      <ellipse cx="218" cy="151" rx="11" ry="6" fill="#ff7d86" opacity=".52" />
      <path d="M54 51 l7 -13 6 13 13 6 -13 7 -6 13 -7 -13 -13 -7Z" fill="#f6cc70" />
      <path d="M291 163 l6 -11 6 11 11 6 -11 6 -6 11 -6 -11 -11 -6Z" fill="#8c7de7" />
    </svg>
  );
}

type Props = { onEnter: (page: WorkspacePage) => void };

export default function PlayfulProfile({ onEnter }: Props) {
  // A profile is blank until the current authenticated identity is established.
  // No device-wide profile is ever read.
  // Keep the first paint blank; do not show a cached previous account's profile.
  const [profile, setProfile] = useState<Profile>({ ...blankProfile });
  const [profileOwner, setProfileOwner] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const lastOwner = useRef<string | null>(null);
  const authInitialized = useRef(false);
  useEffect(() => {
    // Listen for initial session restoration, sign-in, sign-out and account changes.
    // Avoid discarding unsaved edits when the same account emits SIGNED_IN again.
    return auth.onAuthStateChange((event, user) => {
      if (!['INITIAL_SESSION', 'SIGNED_IN', 'SIGNED_OUT', 'USER_UPDATED'].includes(event)) return;
      const userId = user?.userId ?? null;
      if (authInitialized.current && lastOwner.current === userId) return;
      authInitialized.current = true;
      lastOwner.current = userId;
      setProfileOwner(userId);
      setProfile(loadProfile(userId));
      setSaved(false);
      setError('');
    });
  }, []);
  const nav = [
    { label: 'Overview', page: 'home' as const, icon: Home },
    { label: 'Capture', page: 'capture' as const, icon: PenLine },
    { label: 'Journal', page: 'timeline' as const, icon: BookOpen },
    { label: 'Growth', page: 'growth' as const, icon: Sprout },
    { label: 'Reviews', page: 'reviews' as const, icon: CalendarDays },
    { label: 'Settings', page: 'settings' as const, icon: Settings2 }
  ];
  const save = async () => {
    const currentUser = await auth.getUser().catch(() => null);
    if (!currentUser?.userId || currentUser.userId !== profileOwner) {
      setError('Sign in and confirm your account before saving a private profile.');
      return;
    }
    if (!profile.name.trim()) {
      setError('Please add your display name.');
      return;
    }
    const updated = {
      ...profile,
      name: profile.name.trim().slice(0, 60),
      headline: profile.headline.trim().slice(0, 80),
      bio: profile.bio.trim().slice(0, 240)
    };
    try {
      window.localStorage.setItem(PROFILE_KEY + ':' + currentUser.userId, JSON.stringify(updated));
    } catch {
      setError('Browser storage is unavailable. You can still open your workspace.');
      return;
    }
    setProfile(updated);
    setError('');
    setSaved(true);
  };
  const change = (values: Partial<Profile>) => {
    setProfile(current => ({ ...current, ...values }));
    setSaved(false);
    setError('');
  };
  return (
    <div className="pl-shell">
      <aside className="pl-sidebar">
        <button className="pl-brand" type="button" onClick={() => onEnter('home')} aria-label="Mind Blogging home">
          <span className="pl-mark">✳</span>
          <span className="pl-brand-words">mind<span>blogging</span><small>the little wins studio</small></span>
        </button>
        <div className="pl-nav-label">YOUR SPACE</div>
        <nav className="pl-navigation" aria-label="Workspace">
          {nav.map(item => (
            <button key={item.page} type="button" onClick={() => onEnter(item.page)} className="pl-nav-btn">
              <item.icon size={19} strokeWidth={2} />
              <span>{item.label}</span>
              <ChevronRight className="pl-nav-arrow" size={16} />
            </button>
          ))}
          <div className="pl-nav-btn pl-nav-active" aria-current="page">
            <UserRound size={19} strokeWidth={2} /><span>My profile</span><span className="pl-nav-dot" />
          </div>
        </nav>
        <div className="pl-side-bottom">
          <div className="pl-side-note"><span>✷</span><strong>A little bit counts.</strong><p>Keep the moments that make your story.</p></div>
          <button className="pl-side-entry" type="button" onClick={() => onEnter('home')}>
            <Feather size={17} /> Open my workspace <ArrowRight size={16} />
          </button>
        </div>
      </aside>

      <div className="pl-workspace">
        <header className="pl-topbar">
          <div className="pl-mobile-brand"><span className="pl-mark">✳</span><strong>mind blogging</strong></div>
          <span className="pl-date">{new Date().toLocaleDateString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric'
          })}</span>
          <div className="pl-top-actions">
            <span className="pl-private-label"><ShieldCheck size={16} /> Your personal space</span>
            <span className={'pl-top-avatar pl-avatar-' + profile.color}
              aria-label="Profile avatar">{initials(profile.name)}</span>
          </div>
        </header>

        <main className="pl-main">
          <div className="pl-heading">
            <div><span className="pl-eyebrow">A SPACE THAT FEELS LIKE YOU</span>
              <h1>Make it <em>yours.</em></h1>
              <p>Set up your personal corner before stepping into your private journal.</p>
            </div>
            <button type="button" className="pl-button pl-secondary pl-heading-action" onClick={() => onEnter('home')}>
              Enter workspace <ArrowRight size={17} />
            </button>
          </div>

          <section className="pl-profile-hero">
            <span className={'pl-portrait pl-avatar-' + profile.color} aria-hidden="true">
              {initials(profile.name)}<span className="pl-portrait-spark">✦</span>
            </span>
            <div className="pl-profile-identity">
              <span className="pl-eyebrow">MY PERSONAL SPACE</span>
              <h2>{profile.name.trim() || 'Your name'}</h2>
              <p>{profile.headline.trim() || 'Your next chapter begins here.'}</p>
              <span className="pl-local-chip"><LockKeyhole size={14} /> Profile saved on this device</span>
            </div>
            <span className="pl-hero-decoration" aria-hidden="true">✳</span>
          </section>

          <div className="pl-profile-layout">
            <section className="pl-card pl-profile-editor">
              <div className="pl-section-heading"><div><span className="pl-eyebrow">PERSONALISE YOUR SPACE</span><h2>Edit profile</h2></div><Pencil size={21} /></div>
              <label htmlFor="pl-name" className="pl-label">Display name</label>
              <input id="pl-name" className="pl-input" maxLength={60}
                placeholder="How should we call you?"
                autoComplete="nickname" value={profile.name}
                onChange={event => change({ name: event.target.value })} />
              <label htmlFor="pl-headline" className="pl-label">Short headline</label>
              <input id="pl-headline" className="pl-input" maxLength={80}
                placeholder="What are you working toward?" value={profile.headline}
                onChange={event => change({ headline: event.target.value })} />
              <label htmlFor="pl-bio" className="pl-label">About you</label>
              <textarea id="pl-bio" className="pl-input pl-bio" rows={4} maxLength={240}
                placeholder="One or two lines about you…" value={profile.bio}
                onChange={event => change({ bio: event.target.value })} />
              <span className="pl-counter">{profile.bio.length}/240 characters</span>
              <span className="pl-label">Choose your avatar color</span>
              <div className="pl-colors" role="group" aria-label="Choose avatar color">
                {colors.map(option => (
                  <button key={option.color} type="button"
                    className={'pl-color-choice pl-avatar-' + option.color + (profile.color === option.color ? ' pl-chosen' : '')}
                    onClick={() => change({ color: option.color })}
                    aria-label={option.label + ' avatar color'} title={option.label}
                    aria-pressed={profile.color === option.color}>
                    {initials(profile.name)}
                    {profile.color === option.color && <span className="pl-choice-check"><Check size={12} /></span>}
                  </button>
                ))}
              </div>
              {error && <p className="pl-error" role="alert">{error}</p>}
              {saved && <p className="pl-success" role="status"><Check size={17} /> Profile saved in this browser.</p>}
              <div className="pl-profile-actions">
                <button type="button" className="pl-button pl-secondary" onClick={() => onEnter('home')}>Open workspace</button>
                <button type="button" className="pl-button pl-primary" onClick={save}><Check size={17} /> Save my profile</button>
              </div>
            </section>

            <aside className="pl-profile-side">
              <section className="pl-card pl-story-card">
                <span className="pl-eyebrow">YOUR STORY, YOUR PACE</span>
                <h2>Growing, your way.</h2>
                <div className="pl-spark-wrap"><SparkFriend /></div>
                <p>Every win, challenge and new idea deserves a little room to breathe.</p>
                <button type="button" className="pl-button pl-soft" onClick={() => onEnter('timeline')}>
                  View my journal <ArrowRight size={17} />
                </button>
              </section>
              <section className="pl-card pl-security-card">
                <ShieldCheck size={25} />
                <h3>Your journal remains private</h3>
                <p>Your existing account and saved records remain in the separate authenticated workspace. This display profile is stored on this browser only.</p>
                <button type="button" onClick={() => onEnter('home')}>Go to secure sign-in <ArrowRight size={15} /></button>
              </section>
              <section className="pl-affirmation"><Sparkles size={19} /><p>Small steps still move you forward.</p><Heart size={17} /></section>
            </aside>
          </div>
        </main>

        <footer className="pl-footer">Made for little moments and meaningful growth · Mind Blogging</footer>
      </div>
      <nav className="pl-mobile-bottom" aria-label="Mobile navigation">
        <button type="button" onClick={() => onEnter('home')}><Home size={21} /><span>Home</span></button>
        <button type="button" onClick={() => onEnter('capture')}><PenLine size={21} /><span>Capture</span></button>
        <button type="button" onClick={() => onEnter('timeline')}><BookOpen size={21} /><span>Journal</span></button>
        <button type="button" onClick={() => onEnter('growth')}><Sprout size={21} /><span>Growth</span></button>
        <button type="button" className="pl-bottom-active"><UserRound size={21} /><span>Profile</span></button>
      </nav>
    </div>
  );
}
