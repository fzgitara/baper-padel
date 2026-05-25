import { useTournamentStore } from '../store/tournamentStore';
import { Play, RotateCcw, Activity, CheckCircle } from 'lucide-react';

export function Dashboard() {
  const { tournaments, activeTournamentId, startTournament, resetTournament, updateTotalCourts, finishTournament } = useTournamentStore();
  const activeTournament = tournaments.find(t => t.id === activeTournamentId);

  if (!activeTournament) return null;

  const { status, players, matches, totalCourts, format } = activeTournament;
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
        
        <div className="flex items-center gap-2">
          <span className="badge" style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)', textTransform: 'capitalize', letterSpacing: '0.5px' }}>
            {format}
          </span>
          <span className={`badge ${status === 'active' ? 'badge-completed' : 'badge-pending'}`}>
            {status.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent-primary)' }}>{activePlayers}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Active Players</div>
        </div>
        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '12px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <input 
            type="number"
            value={totalCourts}
            onChange={(e) => updateTotalCourts(Math.max(1, parseInt(e.target.value) || 1))}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: '#fff', 
              fontSize: '2rem', 
              fontWeight: 700, 
              width: '60px', 
              textAlign: 'center',
              outline: 'none',
              borderBottom: '2px solid rgba(255,255,255,0.2)'
            }}
            min="1"
            title="Edit total courts"
          />
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', marginTop: '4px' }}>Courts</div>
        </div>
        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent-secondary)' }}>{completedMatches} / {totalMatches}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Matches Played</div>
        </div>
        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'capitalize' }}>{format}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Format</div>
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
        
        {status === 'active' && (
          <button 
            className="btn btn-primary" 
            onClick={() => {
              if (window.confirm('Are you sure you want to finish the tournament? No more matches can be generated.')) {
                finishTournament();
              }
            }}
            style={{ flex: 1 }}
          >
            <CheckCircle size={18} />
            Finish Tournament
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
            style={{ flex: 1 }}
          >
            <RotateCcw size={18} />
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
