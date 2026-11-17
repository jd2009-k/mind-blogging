import { lazy, Suspense, useEffect, useState } from 'react';
import PlayfulProfile from './PlayfulProfile';
import PlayfulLogin from './PlayfulLogin';
import { auth } from './cloud';
import type { AuthUser } from './cloud';
import type { WorkspacePage } from './PlayfulProfile';

const PlayfulWorkspace = lazy(() => import('./PlayfulWorkspace'));
const PasswordRecovery = lazy(() => import('./PasswordRecovery'));

const toPage = (page: WorkspacePage): 'overview'|'capture'|'journal'|'growth'|'reviews'|'settings' =>
  page === 'home' ? 'overview' : page === 'timeline' ? 'journal' : page;

export default function App() {
  // Show sign-in immediately to signed-out visitors. No network call can block the first screen.
  const [user, setUser] = useState<AuthUser | null>(null);
  const [entry, setEntry] = useState<WorkspacePage | null>(null);
  const [recovery, setRecovery] = useState(() => new URLSearchParams(window.location.search).has('passwordRecovery'));

  useEffect(() => {
    let active = true;
    let authRevision = 0;
    const unsubscribe = auth.onAuthStateChange((event, currentUser) => {
      if (!active) return;
      if (event === 'SIGNED_OUT') {
        authRevision++;
        setUser(null);
        setEntry(null);
      } else if (event === 'SIGNED_IN' && currentUser) {
        authRevision++;
        setUser(currentUser);
      }
    });
    const beforeCheck = authRevision;
    // Restore an already signed-in account, but never trap an anonymous visitor behind loading.
    void auth.getUser()
      .then(existing => {
        if (active && authRevision === beforeCheck) setUser(existing);
      })
      .catch(() => {
        // The sign-in form stays usable even if session validation cannot contact the backend.
      });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  if (recovery) return <Suspense fallback={<div role="status">Opening recovery…</div>}>
    <PasswordRecovery onDone={() => {
      window.history.replaceState({}, '', window.location.pathname);
      setRecovery(false);
    }}/>
  </Suspense>;

  if (!user) return <PlayfulLogin onSuccess={setUser} onAdvanced={() => {}}/>;

  return entry
    ? <Suspense fallback={<div role="status">Opening your private workspace…</div>}>
        <PlayfulWorkspace initialPage={toPage(entry)} initialUser={user}/>
      </Suspense>
    : <PlayfulProfile onEnter={setEntry}/>;
}
