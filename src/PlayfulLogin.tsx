import { useState } from 'react';
import { ArrowRight, CheckCircle2, LockKeyhole, Sparkles, ShieldCheck } from 'lucide-react';
import { auth } from './cloud';
import type { AuthUser } from './cloud';
import './playful-login.css';

export default function PlayfulLogin({onSuccess,onAdvanced}:{
  onSuccess:(user:AuthUser)=>void;onAdvanced:()=>void
}) {
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [mode,setMode]=useState<'signin'|'signup'|'email'|'recover'>('signin');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [positive,setPositive]=useState(false);
  const submit=async(event:React.FormEvent)=>{
    event.preventDefault();setBusy(true);setMessage('');setPositive(false);
    try {
      if(mode==='recover') {
        await auth.resetPassword(email);
        setPositive(true);setMessage('If this account exists, a password recovery link will arrive by email.');
      } else if(mode==='email') {
        await auth.signIn(email);
        setPositive(true);setMessage('A sign-in link was sent. Check your email and return here.');
      } else if(mode==='signup') {
        const result=await auth.signUpWithPassword(email,password);
        if(result.user) onSuccess(result.user);
        else {setPositive(true);setMessage('Check your email to confirm your account, then sign in.');}
      } else {
        const user=await auth.signInWithPassword(email,password);
        onSuccess(user);
      }
    } catch(e) {setMessage((e as Error)?.message||'Unable to sign in.');}
    finally {setBusy(false);}
  };
  const google=async()=>{
    setBusy(true);setMessage('');setPositive(false);
    try {await auth.signInWithGoogle();}
    catch(e) {setMessage((e as Error)?.message||'Google sign-in is unavailable.');setBusy(false);}
  };
  return <div className="pl-login-page">
    <div className="pl-login-decoration pl-login-decoration-one" aria-hidden="true">✳</div>
    <div className="pl-login-decoration pl-login-decoration-two" aria-hidden="true">✦</div>
    <header className="pl-login-brand"><span>✳</span> mind<strong>blogging</strong></header>
    <main className="pl-login-card">
      <div className="pl-login-bubble"><Sparkles size={33}/></div>
      <span className="pl-login-eyebrow">YOUR PERSONAL GROWTH STUDIO</span>
      <h1>Your little moments, <em>all together.</em></h1>
      <p>Sign in to continue into the playful Mind Blogging workspace.
        Your real journal, goals and evidence are linked to your private account.</p>
      <button type="button" onClick={google} className="pl-login-google" disabled={busy}>
        Continue with Google <ArrowRight size={17}/>
      </button>
      <div className="pl-login-divider"><span>or use your email</span></div>
      <form onSubmit={submit}>
        <label htmlFor="pl-email">Email address</label>
        <input id="pl-email" type="email" required autoComplete="email" value={email}
          onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/>
        {mode!=='email'&&mode!=='recover'&&<>
          <label htmlFor="pl-password">Password</label>
          <input id="pl-password" type="password" required minLength={6} value={password}
            onChange={e=>setPassword(e.target.value)}
            autoComplete={mode==='signup'?'new-password':'current-password'}/>
        </>}
        <button type="submit" disabled={busy} className="pl-login-submit">
          {busy?'Please wait…':mode==='signup'?'Create my account':mode==='email'?'Send sign-in link':mode==='recover'?'Email recovery link':'Sign in securely'}
          <ArrowRight size={17}/>
        </button>
      </form>
      {message&&<div role={positive?'status':'alert'} className={positive?'pl-login-success':'pl-login-error'}>
        {positive?<CheckCircle2 size={18}/>:<LockKeyhole size={18}/>} {message}
      </div>}
      <div className="pl-login-options">
        <button type="button" onClick={()=>{setMode(mode==='signup'?'signin':'signup');setMessage('');}}>
          {mode==='signup'?'I already have an account':'Create an account'}
        </button>
        <button type="button" onClick={()=>{setMode(mode==='email'?'signin':'email');setMessage('');}}>
          {mode==='email'?'Use password':'Email link'}
        </button>
        <button type="button" onClick={()=>{setMode(mode==='recover'?'signin':'recover');setMessage('');}}>
          {mode==='recover'?'Back to sign in':'Forgot password?'}
        </button>
      </div>
      <button type="button" className="pl-login-advanced" onClick={()=>setMode('email')}>
        Use an email link instead
      </button>
      <div className="pl-login-privacy"><ShieldCheck size={17}/> Account-based privacy · No demo records</div>
    </main>
  </div>;
}
