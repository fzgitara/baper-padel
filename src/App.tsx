import { useState, useEffect } from 'react';
import { Routes, Route, useParams, useNavigate, Navigate } from 'react-router-dom';
import { useTournamentStore } from './store/tournamentStore';
import { Dashboard } from './components/Dashboard';
import { PlayerManagement } from './components/PlayerManagement';
import { MatchList } from './components/MatchList';
import { Leaderboard } from './components/Leaderboard';
import { HomeScreen } from './components/HomeScreen';
import { ArrowLeft } from 'lucide-react';
import './App.css';

/* ─── Inline styles for TournamentView layout ─────────────────────────────── */
const tournamentGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: 'var(--space-6)',
  minHeight: 'calc(100vh - 160px)',
};

function TournamentView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'matches' | 'leaderboard'>('dashboard');
  const [loading, setLoading] = useState(true);
  const { tournaments } = useTournamentStore();

  useEffect(() => {
    if (id) {
      useTournamentStore.getState().setActiveTournament(id);
      setLoading(true);
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

  const activeTournament = tournaments.find(t => t.id === id);

  if (loading && !activeTournament) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--space-4)',
        }}
      >
        <div className="spinner" />
        <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>Loading tournament…</span>
      </div>
    );
  }

  if (!activeTournament) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="container fade-in">
      {/* ── Header ── */}
      <header style={{ marginBottom: 'var(--space-8)', paddingTop: 'var(--space-5)' }}>
        <button
          className="btn btn-outline"
          style={{ marginBottom: 'var(--space-4)', padding: '6px 14px', fontSize: 'var(--font-size-sm)' }}
          onClick={() => navigate('/')}
        >
          <ArrowLeft size={16} />
          Back to Home
        </button>

        <h1 className="text-gradient" style={{ fontSize: 'var(--font-size-4xl)', marginBottom: 'var(--space-1)' }}>
          {activeTournament.name}
        </h1>
      </header>

      {/* ── Two-column grid on desktop ── */}
      <div id="tournament-grid" style={tournamentGridStyle}>

        {/* Sidebar / Left Column */}
        <div className="flex flex-col gap-6 fade-in fade-in-delay-1">
          <Dashboard />
          <PlayerManagement />
        </div>

        {/* Main Content / Right Column */}
        <div className="fade-in fade-in-delay-2">
          <div className="tabs">
            <button
              id="tab-overview"
              className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              Overview
            </button>
            <button
              id="tab-matches"
              className={`tab ${activeTab === 'matches' ? 'active' : ''}`}
              onClick={() => setActiveTab('matches')}
            >
              Matches
            </button>
            <button
              id="tab-leaderboard"
              className={`tab ${activeTab === 'leaderboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('leaderboard')}
            >
              Leaderboard
            </button>
          </div>

          <div style={{ minHeight: '400px' }}>
            {activeTab === 'dashboard' && (
              <div className="glass-card empty-state fade-in">
                <h3 className="text-gradient" style={{ fontSize: 'var(--font-size-2xl)' }}>Tournament Dashboard</h3>
                <p style={{ color: 'var(--text-muted)', maxWidth: '400px' }}>
                  Add your players on the left panel, start the tournament, and then switch to the Matches tab to begin scoring.
                </p>
              </div>
            )}

            {activeTab === 'matches' && <MatchList />}

            {activeTab === 'leaderboard' && <Leaderboard />}
          </div>
        </div>

      </div>

      {/* Responsive: switch to two-column on md+ */}
      <style>{`
        @media (min-width: 768px) {
          #tournament-grid {
            grid-template-columns: 320px 1fr;
          }
        }
        @media (min-width: 1024px) {
          #tournament-grid {
            grid-template-columns: 360px 1fr;
          }
        }
      `}</style>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeScreen />} />
      <Route path="/tournament/:id" element={<TournamentView />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
