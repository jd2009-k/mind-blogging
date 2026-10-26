import {useEffect,useState} from 'react';
import {ArrowRight,LockKeyhole,CheckCircle2} from 'lucide-react';
import {auth} from './cloud';
import './playful-login.css';

export default function PasswordRecovery({onDone}:{onDone:()=>void}){
 const [ready,setReady]=useState(false);
 const [password,setPassword]=useState('');
 const [confirm,setConfirm]=useState('');
 const [message,setMessage]=useState('');
 const [busy,setBusy]=useState(false);
 const [complete,setComplete]=useState(false);
 useEffect(()=>{
   let active=true;
   auth.getUser().then(user=>{if(active)setReady(!!user);}).catch(()=>{if(active)setReady(false);});
   return()=>{active=false;};
 },[]);
 const submit=async(event:React.FormEvent)=>{
   event.preventDefault();setMessage('');
   if(password!==confirm)return setMessage('Passwords do not match.');
   if(password.length<12)return setMessage('Choose a password of at least 12 characters.');
   setBusy(true);
   try{await auth.updatePassword(password);setComplete(true);}
   catch(e){setMessage((e as Error)?.message||'Password reset failed.');}
   finally{setBusy(false);}
 };
 return <div className="pl-login-page">
  <header className="pl-login-brand"><span>✳</span>mind<strong>blogging</strong></header>
  <main className="pl-login-card">
    <div className="pl-login-bubble"><LockKeyhole size={32}/></div>
    <h1>Choose a new <em>password.</em></h1>
    {!ready?<><p>The recovery link is missing or expired. Open a fresh recovery email and try again.</p>
      <button className="pl-login-submit" onClick={onDone}>Back to sign in <ArrowRight size={16}/></button></>:
     complete?<><p role="status"><CheckCircle2 size={18}/> Password updated. Continue to Mind Blogging.</p>
       <button className="pl-login-submit" onClick={onDone}>Continue <ArrowRight size={16}/></button></>:
     <form onSubmit={submit}>
       <label htmlFor="recovery-password">New password</label>
       <input id="recovery-password" type="password" autoComplete="new-password"
         minLength={12} required value={password} onChange={e=>setPassword(e.target.value)}/>
       <label htmlFor="recovery-confirm">Confirm password</label>
       <input id="recovery-confirm" type="password" autoComplete="new-password"
         minLength={12} required value={confirm} onChange={e=>setConfirm(e.target.value)}/>
       <button className="pl-login-submit" type="submit" disabled={busy}>Update password <ArrowRight size={17}/></button>
       {message&&<p className="pl-login-error" role="alert">{message}</p>}
     </form>}
  </main>
 </div>;
}
