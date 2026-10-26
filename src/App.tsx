import { useState } from 'react';
import MindBlog from './MindBlog';
import PlayfulProfile from './PlayfulProfile';
import type { WorkspacePage } from './PlayfulProfile';

export default function App() {
  const [workspacePage, setWorkspacePage] = useState<WorkspacePage | null>(null);
  // The playful profile is always the first screen after opening the site.
  // Existing authentication, journal data and backend integrations are unchanged.
  return workspacePage
    ? <MindBlog initialPage={workspacePage} />
    : <PlayfulProfile onEnter={setWorkspacePage} />;
}
