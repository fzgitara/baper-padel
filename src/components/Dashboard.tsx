import { useTournamentStore } from '../store/tournamentStore';
import { Play, RotateCcw, Activity } from 'lucide-react';

export function Dashboard() {
  const { tournaments, activeTournamentId, startTournament, resetTournament } = useTournamentStore();
  const activeTournament = tournaments.find(t => t.id === activeTournamentId);

  if (!activeTournament) return null;

  const { status, players, matches } = activeTournament;
  const activePlayers = players.filter(p => p.active).length;
  const totalMatches = matches.length;
  const completedMatches = matches.filter(m => m.status === 'completed').length;

  return (
    <div className="glass-card flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h2 className="flex items-center gap-2">
          <Activity className="text-gradient" size={24} />
          Tournament Status
        </h2>
        
        <span className={`badge ${status === 'active' ? 'badge-completed' : 'badge-pending'}`}>
          {status.toUpperCase()}
        </span>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent-primary)' }}>{activePlayers}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Active Players</div>
        </div>
        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent-secondary)' }}>{completedMatches} / {totalMatches}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Matches Played</div>
        </div>
      </div>

      <div className="flex justify-center gap-4" style={{ marginTop: '10px' }}>
        {status === 'setup' && (
          <button 
            className="btn btn-primary" 
            onClick={startTournament}
            disabled={activePlayers < 4}
            style={{ width: '100%' }}
          >
            <Play size={20} />
            {activePlayers < 4 ? 'Need at least 4 players' : 'Start Tournament'}
          </button>
        )}
        
        {status !== 'setup' && (
          <button 
            className="btn btn-danger" 
            onClick={() => {
              if (window.confirm('Are you sure you want to reset the entire tournament? This cannot be undone.')) {
                resetTournament();
              }
            }}
          >
            <RotateCcw size={18} />
            Reset Tournament
          </button>
        )}
      </div>
    </div>
  );
}
