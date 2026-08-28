import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { VersionGate } from './components/VersionGate';

// Code-split tiap route (mengurangi ukuran bundle utama & mempercepat first paint).
const HomeScreen = lazy(() => import('./components/HomeScreen').then((m) => ({ default: m.HomeScreen })));
const TournamentView = lazy(() => import('./components/TournamentView').then((m) => ({ default: m.TournamentView })));
const Scoreboard = lazy(() => import('./components/Scoreboard').then((m) => ({ default: m.Scoreboard })));

function LoadingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600 dark:border-emerald-500/30 dark:border-t-emerald-400" />
      <span className="text-sm text-slate-500 dark:text-slate-400">Loading…</span>
    </div>
  );
}

/* ─── Keep the screen awake while the app is open ─────────────────────────── */
function useWakeLock() {
  useEffect(() => {
    let sentinel: WakeLockSentinel | null = null;
    const request = async () => {
      try {
        if ('wakeLock' in navigator) {
          sentinel = await navigator.wakeLock.request('screen');
        }
      } catch {
        // Unsupported or permission denied — the app still works, screen just
        // may sleep. Never let a wake-lock failure break the UI.
      }
    };
    request();
    // The browser releases the lock when the tab is hidden; re-acquire it
    // whenever the tab becomes visible again.
    const onVisibility = () => {
      if (document.visibilityState === 'visible') request();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      sentinel?.release().catch(() => {});
    };
  }, []);
}

function App() {
  useWakeLock();
  return (
    <>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/tournament/:id" element={<TournamentView />} />
          <Route path="/tournament/:id/scoreboard" element={<Scoreboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <VersionGate />
    </>
  );
}

export default App;
