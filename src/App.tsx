import { useState } from 'react';
import { useTournamentStore } from './store/tournamentStore';
import { Dashboard } from './components/Dashboard';
import { PlayerManagement } from './components/PlayerManagement';
import { MatchList } from './components/MatchList';
import { Leaderboard } from './components/Leaderboard';
import { HomeScreen } from './components/HomeScreen';
import { ArrowLeft } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'matches' | 'leaderboard'>('dashboard');
  const { activeTournamentId, tournaments, setActiveTournament } = useTournamentStore();

  if (!activeTournamentId) {
    return <HomeScreen />;
  }

  const activeTournament = tournaments.find(t => t.id === activeTournamentId);

  if (!activeTournament) {
    return <HomeScreen />;
  }

  return (
    <div className="container">
      <header style={{ marginBottom: '40px', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <button 
            className="btn btn-outline" 
            style={{ marginBottom: '16px', padding: '6px 12px', fontSize: '0.85rem' }}
            onClick={() => setActiveTournament(null)}
          >
            <ArrowLeft size={16} />
            Back to Home
          </button>
          <h1 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '4px' }}>
            {activeTournament.name}
          </h1>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-[1fr_2fr]" style={{ gridTemplateColumns: '1fr', minHeight: 'calc(100vh - 150px)' }}>
        
        {/* Sidebar / Left Column */}
        <div className="flex flex-col gap-6">
          <Dashboard />
          <PlayerManagement />
        </div>

        {/* Main Content / Right Column */}
        <div>
          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              Overview
            </button>
            <button 
              className={`tab ${activeTab === 'matches' ? 'active' : ''}`}
              onClick={() => setActiveTab('matches')}
            >
              Matches
            </button>
            <button 
              className={`tab ${activeTab === 'leaderboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('leaderboard')}
            >
              Leaderboard
            </button>
          </div>

          <div style={{ minHeight: '400px' }}>
            {activeTab === 'dashboard' && (
              <div className="glass-card flex flex-col items-center justify-center gap-4" style={{ padding: '60px 20px', textAlign: 'center' }}>
                <h3 className="text-gradient" style={{ fontSize: '1.5rem' }}>Tournament Dashboard</h3>
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
    </div>
  );
}

export default App;
