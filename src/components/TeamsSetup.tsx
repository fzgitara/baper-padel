import { useTournamentStore } from '../store/tournamentStore';
import { Users, Plus, Trash2, ChevronDown } from 'lucide-react';
import type { FixedTeam, Player } from '../lib/types';
import { card, input, btnPrimary, btnIconDanger, muted } from '../lib/ui';

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
    <div className={card}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
          <Users size={20} className="text-emerald-600" />
          Fixed Teams
        </h2>
        {activeTournament.status === 'setup' && (
          <button
            id="add-team-btn"
            className={`${btnPrimary} !px-2.5 !py-2`}
            onClick={addTeam}
            title="Add team"
            aria-label="Add team"
          >
            <Plus size={16} />
          </button>
        )}
      </div>

      <p className={`${muted} mb-4 text-xs`}>
        Each team keeps a fixed partnership. Assign 2 players per team. Opponents can still be changed in the Matches view.
      </p>

      {teams.length === 0 ? (
        <p className={`${muted} py-4 text-center text-sm`}>
          No teams yet — click + to add a team.
        </p>
      ) : (
        <div className="grid gap-3">
          {teams.map((team, idx) => (
            <div
              key={team.id}
              className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50"
            >
              <div className="flex items-center justify-between gap-2">
                <input
                  className={input}
                  style={{ flex: 1, fontWeight: 600 }}
                  value={team.name}
                  disabled={activeTournament.status !== 'setup'}
                  onChange={(e) => renameTeam(team.id, e.target.value)}
                  aria-label={`Team ${idx + 1} name`}
                />
                {activeTournament.status === 'setup' && (
                  <button
                    className={btnIconDanger}
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
                <div key={slot} className="relative">
                  <select
                    className={`${input} appearance-none pr-10`}
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
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {activeTournament.status === 'setup' && (
        <p className={`${muted} mt-3 text-xs`}>
          {teams.filter(t => t.playerIds.length === 2).length} of {teams.length} team(s) ready
        </p>
      )}
    </div>
  );
}
