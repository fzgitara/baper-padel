import type { Match, Player, FixedTeam } from '../lib/types';
import { ArrowLeftRight } from 'lucide-react';

/**
 * Reusable player / team swapping controls for a single match.
 * Shared between MatchList and Scoreboard so the "change team or player"
 * behaviour is identical everywhere.
 */

interface MatchSwapperProps {
  match: Match;
  players: Player[];
  teams: FixedTeam[];
  partnerMode: 'fixed' | 'rotating';
  getPlayerLabel: (id: string) => string;
  hasPartneredBefore: (a: string, b: string) => boolean;
  onSwap: (matchId: string, oldPlayerId: string, newPlayerId: string) => Promise<void>;
  onSwapTeam: (matchId: string, oldTeamPlayerIds: string[], newTeamPlayerIds: string[]) => Promise<void>;
  /** Which side of the match this column represents. */
  side: 'team1' | 'team2';
}

const playerSelectCls =
  'w-full cursor-pointer border-b border-dashed border-slate-300 bg-transparent py-0.5 text-sm font-medium text-slate-900 outline-none transition-colors focus:border-emerald-500 dark:border-slate-600 dark:text-slate-100';

export function MatchSwapper({
  match,
  players,
  teams,
  partnerMode,
  getPlayerLabel,
  hasPartneredBefore,
  onSwap,
  onSwapTeam,
  side,
}: MatchSwapperProps) {
  // Find a fixed team that contains the given two players.
  const findTeamByPlayers = (p1: string, p2: string): FixedTeam | undefined =>
    teams.find(
      t =>
        (t.playerIds[0] === p1 && t.playerIds[1] === p2) ||
        (t.playerIds[0] === p2 && t.playerIds[1] === p1)
    );

  const renderPlayerSelect = (playerId: string) => (
    <select
      value={playerId}
      onChange={(e) => onSwap(match.id, playerId, e.target.value)}
      className={playerSelectCls}
      title="Click to swap player"
    >
      {players.map((p: Player) => (
        <option key={p.id} value={p.id}>
          {getPlayerLabel(p.id)}
        </option>
      ))}
    </select>
  );

  // Fixed partner: render a read-only partnership under a swapable team name.
  const renderFixedTeamSlot = (p1: string, p2: string) => {
    const currentTeam = findTeamByPlayers(p1, p2);
    const members = [p1, p2].filter(Boolean);

    return (
      <div>
        <div className="mb-1">
          <span className="text-[0.7rem] uppercase tracking-wide text-slate-400 dark:text-slate-500">
            {currentTeam?.name || 'Team'}
          </span>
        </div>
        {members.map(pid => (
          <div key={pid} className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
            {getPlayerLabel(pid)}
          </div>
        ))}
      </div>
    );
  };

  // Fixed partner: a select to swap which team occupies this side (opponent).
  const renderFixedTeamSelect = (current: FixedTeam | undefined, excludeId?: string) => (
    <select
      disabled={match.status !== 'pending'}
      value={current?.id || ''}
      onChange={(e) => {
        const next = teams.find(t => t.id === e.target.value);
        if (next && current) {
          onSwapTeam(match.id, current.playerIds, next.playerIds);
        }
      }}
      className="w-full cursor-pointer bg-transparent text-sm font-semibold text-slate-900 outline-none dark:text-slate-100"
      title="Click to change team on this side"
    >
      {teams
        .filter(t => t.playerIds.length === 2 && t.id !== excludeId)
        .map(t => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
    </select>
  );

  const team = side === 'team1' ? match.team1 : match.team2;
  const align = side === 'team1' ? 'text-left' : 'text-right max-sm:text-left';
  const teamSelectExclude =
    side === 'team1'
      ? findTeamByPlayers(match.team2[0], match.team2[1])?.id
      : findTeamByPlayers(match.team1[0], match.team1[1])?.id;

  return (
    <div className={`min-w-0 ${align}`}>
      {partnerMode === 'fixed'
        ? (
            <div className={align}>
              {renderFixedTeamSlot(team[0], team[1])}
              <div className="mt-2">
                {renderFixedTeamSelect(findTeamByPlayers(team[0], team[1]), teamSelectExclude)}
              </div>
            </div>
          )
        : (
            <>
              {renderPlayerSelect(team[0])}
              <div className="mt-2">{renderPlayerSelect(team[1])}</div>
              {hasPartneredBefore(team[0], team[1]) && (
                <div className="mt-1">
                  <span
                    title="These players have partnered before"
                    className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-[0.65rem] font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-400"
                  >
                    <ArrowLeftRight size={9} />
                    repeat
                  </span>
                </div>
              )}
            </>
          )
      }
    </div>
  );
}
