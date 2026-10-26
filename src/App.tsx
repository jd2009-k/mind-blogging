import {lazy,Suspense,useState} from 'react';
import PlayfulProfile from './PlayfulProfile';
const PlayfulWorkspace=lazy(()=>import('./PlayfulWorkspace'));
const PasswordRecovery=lazy(()=>import('./PasswordRecovery'));
import type {WorkspacePage} from './PlayfulProfile';

const toPage=(page:WorkspacePage):'overview'|'capture'|'journal'|'growth'|'reviews'|'settings' =>
  page==='home'?'overview':page==='timeline'?'journal':page;

export default function App(){
  const [entry,setEntry]=useState<WorkspacePage|null>(null);
  const [recovery,setRecovery]=useState(()=>new URLSearchParams(window.location.search).has('passwordRecovery'));
  if(recovery)return <Suspense fallback={<div role="status">Opening recovery…</div>}>
    <PasswordRecovery onDone={()=>{
      window.history.replaceState({},'',window.location.pathname);
      setRecovery(false);
    }}/>
  </Suspense>;
  return entry
    ? <Suspense fallback={<div role="status">Opening your private workspace…</div>}>
        <PlayfulWorkspace initialPage={toPage(entry)}/>
      </Suspense>
    : <PlayfulProfile onEnter={setEntry}/>;
}
