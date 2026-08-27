import { useState, useEffect } from 'react';
import { Routes, Route, useParams, useNavigate, Navigate } from 'react-router-dom';
import { useTournamentStore } from './store/tournamentStore';
import { Dashboard } from './components/Dashboard';
import { PlayerManagement } from './components/PlayerManagement';
import { TeamsSetup } from './components/TeamsSetup';
import { MatchList } from './components/MatchList';
import { Leaderboard } from './components/Leaderboard';
import { HomeScreen } from './components/HomeScreen';
import { Scoreboard } from './components/Scoreboard';
import { VersionGate } from './components/VersionGate';
import { ArrowLeft } from 'lucide-react';

function TournamentView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'matches' | 'leaderboard'>('dashboard');
  const [loading, setLoading] = useState(true);
  const { tournaments } = useTournamentStore();

  useEffect(() => {
    if (id) {
      useTournamentStore.getState().setActiveTournament(id);
      useTournamentStore.getState().fetchTournamentById(id).finally(() => setLoading(false));
    }
    return () => {
      useTournamentStore.getState().setActiveTournament(null);
    };
  }, [id]);

  useEffect(() => {
    const unsubscribe = useTournamentStore.getState().subscribeToRealtime();
    return () => unsubscribe();
  }, []);

  const activeTournament = tournaments.find((t) => t.id === id);

  if (loading && !activeTournament) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600 dark:border-emerald-500/30 dark:border-t-emerald-400" />
        <span className="text-sm text-slate-500 dark:text-slate-400">Loading tournament…</span>
      </div>
    );
  }

  if (!activeTournament) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      {/* ── Header ── */}
      <header className="mb-8 pt-2">
        <button
          className="mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          onClick={() => navigate('/')}
        >
          <ArrowLeft size={16} />
          Back to Home
        </button>

        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {activeTournament.name}
        </h1>
      </header>

      {/* ── Two-column grid on desktop ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr] xl:grid-cols-[360px_1fr]">
        {/* Sidebar / Left Column */}
        <div className="flex flex-col gap-6">
          <Dashboard />
          <PlayerManagement />
          {activeTournament.partnerMode === 'fixed' && activeTournament.status === 'setup' && <TeamsSetup />}
        </div>

        {/* Main Content / Right Column */}
        <div>
          <div className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200 pb-3 dark:border-slate-800">
            <button
              id="tab-overview"
              className={`whitespace-nowrap rounded-lg px-4 py-2 font-medium transition-colors ${
                activeTab === 'dashboard'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
              onClick={() => setActiveTab('dashboard')}
            >
              Overview
            </button>
            <button
              id="tab-matches"
              className={`whitespace-nowrap rounded-lg px-4 py-2 font-medium transition-colors ${
                activeTab === 'matches'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
              onClick={() => setActiveTab('matches')}
            >
              Matches
            </button>
            <button
              id="tab-leaderboard"
              className={`whitespace-nowrap rounded-lg px-4 py-2 font-medium transition-colors ${
                activeTab === 'leaderboard'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
              onClick={() => setActiveTab('leaderboard')}
            >
              Leaderboard
            </button>
          </div>

          <div className="min-h-[400px]">
            {activeTab === 'dashboard' && (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Tournament Dashboard
                </h3>
                <p className="mx-auto max-w-md text-sm text-slate-500 dark:text-slate-400">
                  Add your players on the left panel, start the tournament, and then switch to the Matches tab to begin scoring.
                </p>
              </div>
            )}

            {activeTab === 'matches' && <MatchList />}

            {activeTab === 'leaderboard' && <Leaderboard />}
          </div>
        </div>
      </div>
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
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/tournament/:id" element={<TournamentView />} />
        <Route path="/tournament/:id/scoreboard" element={<Scoreboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <VersionGate />
    </>
  );
}

export default App;
