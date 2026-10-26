import {useState} from 'react';
import MindBlog from './MindBlog';
import PlayfulProfile from './PlayfulProfile';
import PlayfulWorkspace from './PlayfulWorkspace';
import type {WorkspacePage} from './PlayfulProfile';

type AdvancedPage='home'|'capture'|'timeline'|'growth'|'reviews'|'settings';
const playfulPage=(page:WorkspacePage):'overview'|'capture'|'journal'|'growth'|'reviews'|'settings'=>
  page==='home'?'overview':page==='timeline'?'journal':page;

export default function App(){
  const [entry,setEntry]=useState<WorkspacePage|null>(null);
  const [advanced,setAdvanced]=useState<AdvancedPage|null>(null);
  // Open the playful profile first, then the fully styled private workspace.
  // Advanced tools preserve the original AI and source-backed review controls.
  if(advanced)return <MindBlog initialPage={advanced}/>;
  if(entry)return <PlayfulWorkspace initialPage={playfulPage(entry)} onAdvanced={page=>setAdvanced(page||'home')}/>;
  return <PlayfulProfile onEnter={setEntry}/>;
}
