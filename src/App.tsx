import { lazy, Suspense, useState } from 'react';
import PlayfulWorkspace from './PlayfulWorkspace';

const PasswordRecovery = lazy(() => import('./PasswordRecovery'));

export default function App() {
  const [recovery, setRecovery] = useState(
    () => new URLSearchParams(window.location.search).has('passwordRecovery')
  );

  // The real workspace is the homepage. A signed-out visitor sees the same
  // workspace shell with an in-place sign-in option, never a separate profile
  // or login splash screen. Protected records remain account-scoped.
  if (recovery) {
    return <Suspense fallback={<div role="status">Opening recovery…</div>}>
      <PasswordRecovery onDone={() => {
        window.history.replaceState({}, '', window.location.pathname);
        setRecovery(false);
      }} />
    </Suspense>;
  }
  return <PlayfulWorkspace initialPage="overview" />;
}
