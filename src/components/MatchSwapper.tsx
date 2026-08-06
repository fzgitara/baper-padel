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
      style={{
        background: 'transparent',
        border: 'none',
        borderBottom: '1px dashed rgba(255,255,255,0.2)',
        color: 'var(--text-primary)',
        fontSize: 'var(--font-size-sm)',
        fontWeight: 500,
        outline: 'none',
        cursor: 'pointer',
        width: '100%',
        padding: '3px 0',
        fontFamily: "'Outfit', sans-serif",
        transition: 'border-color var(--transition-fast)',
      }}
      onFocus={(e) => (e.target.style.borderBottomColor = 'var(--accent-primary)')}
      onBlur={(e) => (e.target.style.borderBottomColor = 'rgba(255,255,255,0.2)')}
      title="Click to swap player"
    >
      {players.map((p: Player) => (
        <option key={p.id} value={p.id} style={{ color: '#000', background: '#fff' }}>
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
        <div style={{ marginBottom: 'var(--space-1)' }}>
          <span style={{ fontSize: '0.7rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-subtle)' }}>
            {currentTeam?.name || 'Team'}
          </span>
        </div>
        {members.map(pid => (
          <div key={pid} style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
      style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}
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
  const align = side === 'team1' ? 'left' : 'right';
  const teamSelectExclude =
    side === 'team1'
      ? findTeamByPlayers(match.team2[0], match.team2[1])?.id
      : findTeamByPlayers(match.team1[0], match.team1[1])?.id;

  return (
    <div style={{ textAlign: align, minWidth: 0 }}>
      {partnerMode === 'fixed'
        ? (
            <div style={{ textAlign: align }}>
              {renderFixedTeamSlot(team[0], team[1])}
              <div style={{ marginTop: 'var(--space-2)' }}>
                {renderFixedTeamSelect(findTeamByPlayers(team[0], team[1]), teamSelectExclude)}
              </div>
            </div>
          )
        : (
            <>
              {renderPlayerSelect(team[0])}
              <div style={{ marginTop: 'var(--space-2)' }}>{renderPlayerSelect(team[1])}</div>
              {hasPartneredBefore(team[0], team[1]) && (
                <div style={{ marginTop: 'var(--space-1)' }}>
                  <span
                    title="These players have partnered before"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      fontSize: '0.65rem',
                      background: 'rgba(245, 158, 11, 0.12)',
                      color: 'var(--warn)',
                      border: '1px solid rgba(245,158,11,0.25)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '1px 6px',
                      fontWeight: 600,
                    }}
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
