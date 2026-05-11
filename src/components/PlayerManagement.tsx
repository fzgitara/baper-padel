import React, { useState } from 'react';
import { useTournamentStore } from '../store/tournamentStore';
import { UserPlus, UserMinus, Users } from 'lucide-react';

export function PlayerManagement() {
  const [newPlayerName, setNewPlayerName] = useState('');
  const { tournaments, activeTournamentId, addPlayer, removePlayer } = useTournamentStore();
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
      <div className="flex justify-between items-center" style={{ marginBottom: '20px' }}>
        <h2 className="flex items-center gap-2">
          <Users className="text-gradient" size={24} />
          Players
        </h2>
        <span className="badge badge-completed">
          {activePlayers.length} Active
        </span>
      </div>

      <form onSubmit={handleAdd} className="flex gap-2" style={{ marginBottom: '24px' }}>
        <input 
          type="text" 
          className="input" 
          placeholder="Enter player name..." 
          value={newPlayerName}
          onChange={(e) => setNewPlayerName(e.target.value)}
        />
        <button type="submit" className="btn btn-primary" disabled={!newPlayerName.trim()}>
          <UserPlus size={18} />
          Add
        </button>
      </form>

      {activePlayers.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
          No players added yet.
        </p>
      ) : (
        <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
          {activePlayers.map(player => (
            <div 
              key={player.id} 
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '12px 16px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '8px',
                border: '1px solid var(--border-light)'
              }}
            >
              <span style={{ fontWeight: 500 }}>{player.name}</span>
              <button 
                onClick={() => removePlayer(player.id)}
                className="btn btn-danger"
                style={{ padding: '6px', borderRadius: '6px' }}
                title="Remove Player"
              >
                <UserMinus size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
