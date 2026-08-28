import React, { useState } from 'react';
import { useTournamentStore } from '../store/tournamentStore';
import { UserPlus, UserMinus, Users } from 'lucide-react';
import type { Player } from '../lib/types';
import { ConfirmModal } from './ConfirmModal';
import { card, input, btnPrimary, btnIconDanger, badgeBase, badgeActive, muted } from '../lib/ui';

export function PlayerManagement() {
  const [newPlayerName, setNewPlayerName] = useState('');
  const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);
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

  const handleConfirmRemove = () => {
    if (playerToDelete) {
      removePlayer(playerToDelete.id);
      setPlayerToDelete(null);
    }
  };

  return (
    <div className={card}>
      {/* ── Header ── */}
      <div className="mb-5 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
          <Users size={20} className="text-emerald-600" />
          Players
        </h2>
        <span className={`${badgeBase} ${badgeActive}`}>
          {activePlayers.length} Active
        </span>
      </div>

      {/* ── Add Player Form ── */}
      <form onSubmit={handleAdd} className="mb-5 flex gap-2">
        <input
          id="add-player-input"
          type="text"
          list="global-players"
          className={input}
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
          className={`${btnPrimary} flex-shrink-0`}
          disabled={!newPlayerName.trim()}
          aria-label="Add player"
        >
          <UserPlus size={18} />
          <span className="hidden sm:inline">Add</span>
        </button>
      </form>

      {/* ── Player List ── */}
      {activePlayers.length === 0 ? (
        <p className={`${muted} py-5 text-center text-sm`}>No players added yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {activePlayers.map(player => (
            <div
              key={player.id}
              className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-100 px-3 py-2 transition-colors hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
            >
              <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                {player.name}
              </span>
              <button
                id={`remove-player-${player.id}`}
                onClick={() => setPlayerToDelete(player)}
                className={btnIconDanger}
                title={`Remove ${player.name}`}
                aria-label={`Remove player ${player.name}`}
              >
                <UserMinus size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Confirmation Modal ── */}
      <ConfirmModal
        isOpen={!!playerToDelete}
        title="Remove Player?"
        message={
          <>
            Are you sure you want to set <strong>{playerToDelete?.name}</strong> to inactive for this tournament?
          </>
        }
        confirmText="Remove"
        onConfirm={handleConfirmRemove}
        onClose={() => setPlayerToDelete(null)}
      />
    </div>
  );
}
