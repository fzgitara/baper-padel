import React, { useState } from 'react';
import { useTournamentStore } from '../store/tournamentStore';
import { UserPlus, UserMinus, Users } from 'lucide-react';

export function PlayerManagement() {
  const [newPlayerName, setNewPlayerName] = useState('');
  const { tournaments, activeTournamentId, addPlayer, removePlayer, globalPlayers } = useTournamentStore();
  const activeTournament = tournaments.find(t => t.id === activeTournamentId);

  if (!activeTournament) return null;

  const activePlayers = activeTournament.players.filter(p => p.active);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPlayerName.trim()) {
      addPlayer(newPlayerName.trim());
      setNewPlayerName('');
    }
  };

  return (
    <div className="glass-card">
      {/* ── Header ── */}
      <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-5)' }}>
        <h2 className="flex items-center gap-2" style={{ fontSize: 'var(--font-size-xl)' }}>
          <Users style={{ color: 'var(--accent-primary)' }} size={20} />
          Players
        </h2>
        <span className="badge badge-completed">
          {activePlayers.length} Active
        </span>
      </div>

      {/* ── Add Player Form ── */}
      <form onSubmit={handleAdd} className="flex gap-2" style={{ marginBottom: 'var(--space-5)' }}>
        <input
          id="add-player-input"
          type="text"
          list="global-players"
          className="input"
          placeholder="Enter player name…"
          value={newPlayerName}
          onChange={(e) => setNewPlayerName(e.target.value)}
        />
        <datalist id="global-players">
          {globalPlayers.map(p => (
            <option key={p.id} value={p.name} />
          ))}
        </datalist>
        <button
          id="add-player-btn"
          type="submit"
          className="btn btn-primary"
          disabled={!newPlayerName.trim()}
          style={{ flexShrink: 0 }}
          aria-label="Add player"
        >
          <UserPlus size={18} />
          <span className="hide-mobile">Add</span>
        </button>
      </form>

      {/* ── Player List ── */}
      {activePlayers.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-5) 0', fontSize: 'var(--font-size-sm)' }}>
          No players added yet.
        </p>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--space-2)', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
          {activePlayers.map(player => (
            <div
              key={player.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 'var(--space-2)',
                padding: 'var(--space-2) var(--space-3)',
                background: 'rgba(255, 255, 255, 0.04)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                transition: 'background var(--transition-fast), border-color var(--transition-fast)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.15)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-light)';
              }}
            >
              <span style={{ fontWeight: 500, fontSize: 'var(--font-size-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {player.name}
              </span>
              <button
                id={`remove-player-${player.id}`}
                onClick={() => removePlayer(player.id)}
                className="btn btn-danger btn-icon"
                style={{ padding: '5px', borderRadius: 'var(--radius-sm)', flexShrink: 0 }}
                title={`Remove ${player.name}`}
                aria-label={`Remove player ${player.name}`}
              >
                <UserMinus size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
