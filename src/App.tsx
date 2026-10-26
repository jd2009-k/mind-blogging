import {useState} from 'react';
import PlayfulProfile from './PlayfulProfile';
import PlayfulWorkspace from './PlayfulWorkspace';
import PasswordRecovery from './PasswordRecovery';
import type {WorkspacePage} from './PlayfulProfile';

const toPage=(page:WorkspacePage):'overview'|'capture'|'journal'|'growth'|'reviews'|'settings' =>
  page==='home'?'overview':page==='timeline'?'journal':page;

export default function App(){
  const [entry,setEntry]=useState<WorkspacePage|null>(null);
  const [recovery,setRecovery]=useState(()=>new URLSearchParams(window.location.search).has('passwordRecovery'));
  if(recovery)return <PasswordRecovery onDone={()=>{
    window.history.replaceState({},'',window.location.pathname);
    setRecovery(false);
  }}/>;
  return entry
    ? <PlayfulWorkspace initialPage={toPage(entry)}/>
    : <PlayfulProfile onEnter={setEntry}/>;
}
