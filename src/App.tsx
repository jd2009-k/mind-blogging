import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import PlayfulLogin from './PlayfulLogin';
import { auth } from './cloud';
import type { AuthUser } from './cloud';

const PlayfulWorkspace = lazy(() => import('./PlayfulWorkspace'));
const PasswordRecovery = lazy(() => import('./PasswordRecovery'));

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const authGeneration = useRef(0);
  const [recovery, setRecovery] = useState(
    () => new URLSearchParams(window.location.search).has('passwordRecovery')
  );

  useEffect(() => {
    let active = true;
    const unsubscribe = auth.onAuthStateChange((event, currentUser) => {
      if (!active) return;
      if (event === 'SIGNED_OUT') {
        authGeneration.current++;
        setUser(null);
      } else if (event === 'SIGNED_IN' && currentUser) {
        authGeneration.current++;
        setUser(currentUser);
      }
    });

    const generation = authGeneration.current;
    // Restore an existing account without holding signed-out visitors on a spinner.
    // A later sign-in or sign-out always takes priority over this request.
    void auth.getUser().then(existing => {
      if (active && authGeneration.current === generation) setUser(existing);
    }).catch(() => {
      // The login page remains available if session validation cannot complete.
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  if (recovery) {
    return <Suspense fallback={<div role="status">Opening recovery…</div>}>
      <PasswordRecovery onDone={() => {
        window.history.replaceState({}, '', window.location.pathname);
        setRecovery(false);
      }} />
    </Suspense>;
  }

  const signedIn = (me: AuthUser) => {
    authGeneration.current++;
    setUser(me);
  };

  // All signed-out visitors must authenticate before any workspace content.
  if (!user) return <PlayfulLogin onSuccess={signedIn} onAdvanced={() => {}} />;

  // A valid restored session or completed login opens the real workspace directly.
  // No separate welcome or profile setup page is inserted between them.
  return <Suspense fallback={<div role="status">Opening your private workspace…</div>}>
    <PlayfulWorkspace initialPage="overview" initialUser={user} />
  </Suspense>;
}
