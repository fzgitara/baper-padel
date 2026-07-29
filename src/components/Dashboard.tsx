import { useTournamentStore } from '../store/tournamentStore';
import { Play, RotateCcw, Activity, CheckCircle } from 'lucide-react';

export function Dashboard() {
  const { tournaments, activeTournamentId, startTournament, resetTournament, updateTotalCourts, finishTournament, connectionStatus } = useTournamentStore();
  const activeTournament = tournaments.find(t => t.id === activeTournamentId);

  if (!activeTournament) return null;

  const { status, players, matches, totalCourts, format, pointsMode } = activeTournament;
  const activePlayers = players.filter(p => p.active).length;
  const totalMatches = matches.length;
  const completedMatches = matches.filter(m => m.status === 'completed').length;

  return (
    <div className="glass-card flex flex-col gap-6">
      {/* ── Header ── */}
      <div className="flex justify-between items-center">
        <h2 className="flex items-center gap-2" style={{ fontSize: 'var(--font-size-xl)' }}>
          <Activity style={{ color: 'var(--accent-primary)' }} size={20} />
          Tournament Status
          {/* ── Realtime Connection Status ── */}
          <ConnectionDot />
        </h2>

        <div className="flex items-center gap-2">
          <span className="badge" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-muted)', border: '1px solid var(--border-light)', textTransform: 'capitalize' }}>
            {format}
          </span>
          <span className={`badge ${status === 'active' ? 'badge-completed' : 'badge-pending'}`}>
            {status}
          </span>
        </div>
      </div>

      {/* ── Stat Tiles ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 'var(--space-3)' }}>
        {/* Players */}
        <div className="stat-tile">
          <div className="stat-value" style={{ color: 'var(--accent-primary)' }}>{activePlayers}</div>
          <div className="stat-label">Players</div>
        </div>

        {/* Courts (editable) */}
        <div className="stat-tile" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <input
            type="number"
            value={totalCourts}
            onChange={(e) => updateTotalCourts(Math.max(1, parseInt(e.target.value) || 1))}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: '2px solid rgba(255,255,255,0.15)',
              color: '#fff',
              fontSize: 'clamp(1.5rem, 4vw, 2rem)',
              fontWeight: 700,
              width: '60px',
              textAlign: 'center',
              outline: 'none',
              lineHeight: 1,
              marginBottom: 'var(--space-1)',
              transition: 'border-color var(--transition-fast)',
            }}
            onFocus={(e) => (e.target.style.borderBottomColor = 'var(--accent-primary)')}
            onBlur={(e) => (e.target.style.borderBottomColor = 'rgba(255,255,255,0.15)')}
            min="1"
            title="Edit total courts"
            aria-label="Total courts"
          />
          <div className="stat-label">Courts</div>
        </div>

        {/* Matches */}
        <div className="stat-tile">
          <div className="stat-value" style={{ color: 'var(--accent-secondary)' }}>
            {completedMatches}<span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--text-muted)' }}>/{totalMatches}</span>
          </div>
          <div className="stat-label">Matches</div>
        </div>

        {/* Points mode */}
        <div className="stat-tile">
          <div className="stat-value" style={{ fontSize: 'var(--font-size-xl)', color: 'var(--text-primary)' }}>
            {pointsMode === 'free' ? 'Free' : '21'}
          </div>
          <div className="stat-label">Points</div>
        </div>
      </div>

      {/* ── Action Buttons ── */}
      <div className="flex gap-3" style={{ marginTop: 'var(--space-1)' }}>
        {status === 'setup' && (
          <button
            id="start-tournament-btn"
            className="btn btn-primary w-full"
            onClick={startTournament}
            disabled={activePlayers < 4}
          >
            <Play size={18} />
            {activePlayers < 4 ? `Need ${4 - activePlayers} more player${4 - activePlayers !== 1 ? 's' : ''}` : 'Start Tournament'}
          </button>
        )}

        {status === 'active' && (
          <button
            id="finish-tournament-btn"
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={() => {
              if (window.confirm('Finish the tournament? No more matches can be generated.')) {
                finishTournament();
              }
            }}
          >
            <CheckCircle size={18} />
            Finish
          </button>
        )}

        {status !== 'setup' && (
          <button
            id="reset-tournament-btn"
            className="btn btn-danger"
            style={{ flex: status === 'active' ? '0 0 auto' : 1 }}
            onClick={() => {
              if (window.confirm('Reset the tournament? This cannot be undone.')) {
                resetTournament();
              }
            }}
          >
            <RotateCcw size={16} />
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

const STATUS_CONFIG = {
  connected: { color: '#22c55e', glow: 'rgba(34, 197, 94, 0.5)', label: 'Live' },
  connecting: { color: '#eab308', glow: 'rgba(234, 179, 8, 0.5)', label: 'Connecting...' },
  error: { color: '#ef4444', glow: 'rgba(239, 68, 68, 0.5)', label: 'Connection error' },
  disconnected: { color: '#6b7280', glow: 'rgba(107, 114, 128, 0.4)', label: 'Offline' },
} as const;

export function ConnectionDot() {
  const connectionStatus = useTournamentStore((s) => s.connectionStatus);
  const config = STATUS_CONFIG[connectionStatus] || STATUS_CONFIG.disconnected;

  return (
    <span
      title={config.label}
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: config.color,
        boxShadow: `0 0 6px 1px ${config.glow}`,
        animation: connectionStatus === 'connecting' ? 'pulse-dot 1.2s ease-in-out infinite' : 'none',
      }}
    />
  );
}