import { useTournamentStore } from '../store/tournamentStore';
import { Users, Plus, Trash2 } from 'lucide-react';
import type { FixedTeam, Player } from '../lib/types';

export function TeamsSetup() {
  const { tournaments, activeTournamentId, addTeam, renameTeam, setTeamPlayers, removeTeam } = useTournamentStore();
  const activeTournament = tournaments.find(t => t.id === activeTournamentId);

  if (!activeTournament) return null;

  const teams = activeTournament.teams || [];
  const activePlayers = activeTournament.players.filter(p => p.active);

  // Build a lookup of which player has been assigned to any team.
  const assignedPlayers = new Set<string>();
  teams.forEach(t => t.playerIds.forEach(p => assignedPlayers.add(p)));

  const playerOptions = (team: FixedTeam) => {
    return activePlayers.filter(
      p => team.playerIds.includes(p.id) || !assignedPlayers.has(p.id)
    );
  };

  const handleSlotChange = (teamId: string, slotIndex: number, playerId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return;
    const next = [...team.playerIds];
    next[slotIndex] = playerId;
    setTeamPlayers(teamId, next.filter(Boolean));
  };

  const handleRemove = (teamId: string) => {
    if (window.confirm('Remove this team? Players will be returned to unassigned.')) {
      removeTeam(teamId);
    }
  };

  return (
    <div className="glass-card">
      <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-4)' }}>
        <h2 className="flex items-center gap-2" style={{ fontSize: 'var(--font-size-xl)' }}>
          <Users style={{ color: 'var(--accent-primary)' }} size={20} />
          Fixed Teams
        </h2>
        {activeTournament.status === 'setup' && (
          <button id="add-team-btn" className="btn btn-primary btn-icon" onClick={addTeam} title="Add team" aria-label="Add team">
            <Plus size={16} />
          </button>
        )}
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)', marginBottom: 'var(--space-4)' }}>
        Each team keeps a fixed partnership. Assign 2 players per team. Opponents can still be changed in the Matches view.
      </p>

      {teams.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-4) 0', fontSize: 'var(--font-size-sm)' }}>
          No teams yet — click + to add a team.
        </p>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
          {teams.map((team, idx) => (
            <div
              key={team.id}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-3)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-2)',
              }}
            >
              <div className="flex justify-between items-center gap-2">
                <input
                  className="input"
                  style={{ flex: 1, fontWeight: 600 }}
                  value={team.name}
                  disabled={activeTournament.status !== 'setup'}
                  onChange={(e) => renameTeam(team.id, e.target.value)}
                  aria-label={`Team ${idx + 1} name`}
                />
                {activeTournament.status === 'setup' && (
                  <button
                    className="btn btn-danger btn-icon"
                    style={{ flexShrink: 0 }}
                    onClick={() => handleRemove(team.id)}
                    title="Remove team"
                    aria-label={`Remove ${team.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              {[0, 1].map(slot => (
                <select
                  key={slot}
                  className="input"
                  disabled={activeTournament.status !== 'setup'}
                  value={team.playerIds[slot] || ''}
                  onChange={(e) => handleSlotChange(team.id, slot, e.target.value)}
                  aria-label={`${team.name} player ${slot + 1}`}
                >
                  <option value="">— Select player —</option>
                  {playerOptions(team).map((p: Player) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              ))}
            </div>
          ))}
        </div>
      )}

      {activeTournament.status === 'setup' && (
        <p style={{ color: 'var(--text-subtle)', fontSize: 'var(--font-size-xs)', marginTop: 'var(--space-3)' }}>
          {teams.filter(t => t.playerIds.length === 2).length} of {teams.length} team(s) ready
        </p>
      )}
    </div>
  );
}
