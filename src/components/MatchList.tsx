import { useState } from 'react';
import { useTournamentStore } from '../store/tournamentStore';
import { Swords, Check, Shuffle, Play, ArrowLeftRight } from 'lucide-react';
import type { Match, Player, FixedTeam } from '../lib/types';

export function MatchList() {
  const { tournaments, activeTournamentId, updateScore, randomizePendingMatches, swapMatchPlayer, swapMatchTeam, generateSingleMatch } = useTournamentStore();
  const activeTournament = tournaments.find(t => t.id === activeTournamentId);

  if (!activeTournament) return null;
  const { matches, players, status, pointsMode, partnerMode, teams } = activeTournament;

  const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || 'Unknown';

  const findTeamByPlayers = (t1: string, t2: string): FixedTeam | undefined =>
    (teams || []).find(
      t =>
        (t.playerIds[0] === t1 && t.playerIds[1] === t2) ||
        (t.playerIds[0] === t2 && t.playerIds[1] === t1)
    );

  // Compute play count per player across completed matches only
  const playCount = matches.filter(m => m.status === 'completed').reduce((acc, match) => {
    [...match.team1, ...match.team2].forEach(pid => {
      acc[pid] = (acc[pid] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const getPlayerLabel = (id: string) => {
    const name = getPlayerName(id);
    const count = playCount[id] || 0;
    return `${name} (${count}x)`;
  };

  const pendingMatches = matches.filter(m => m.status === 'pending');
  const completedMatches = matches.filter(m => m.status === 'completed');

  // Build partnership history from completed matches
  const partnerships = new Set<string>();
  completedMatches.forEach(m => {
    const key1 = [m.team1[0], m.team1[1]].sort().join('|');
    const key2 = [m.team2[0], m.team2[1]].sort().join('|');
    partnerships.add(key1);
    partnerships.add(key2);
  });

  const hasPartneredBefore = (a: string, b: string) =>
    partnerships.has([a, b].sort().join('|'));

  // Group pending matches by round
  const pendingByRound = pendingMatches.reduce((acc, match) => {
    if (!acc[match.round]) acc[match.round] = [];
    acc[match.round].push(match);
    return acc;
  }, {} as Record<number, typeof matches>);

  const pendingRounds = Object.keys(pendingByRound).map(Number).sort((a, b) => a - b);

  // Group completed matches by round
  const completedByRound = completedMatches.reduce((acc, match) => {
    if (!acc[match.round]) acc[match.round] = [];
    acc[match.round].push(match);
    return acc;
  }, {} as Record<number, typeof matches>);

  const completedRounds = Object.keys(completedByRound).map(Number).sort((a, b) => b - a);

  return (
    <div className="flex flex-col gap-6">

      {/* ── Pending Matches ── */}
      <div className="glass-card">
        <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <h2 className="flex items-center gap-2" style={{ fontSize: 'var(--font-size-xl)' }}>
            <Swords style={{ color: 'var(--accent-primary)' }} size={20} />
            Pending Matches
          </h2>

          <div className="flex gap-2">
            {status === 'active' && (
              <button
                id="generate-match-btn"
                className="btn btn-primary"
                onClick={generateSingleMatch}
                title="Generate a new match"
              >
                <Play size={15} />
                <span>Generate</span>
              </button>
            )}
            {pendingMatches.length > 0 && status === 'active' && (
              <button
                id="randomize-matches-btn"
                className="btn btn-outline"
                onClick={randomizePendingMatches}
                title="Randomize pending match players"
              >
                <Shuffle size={15} />
                <span className="hide-mobile">Randomize</span>
              </button>
            )}
          </div>
        </div>

        {pendingMatches.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-6) 0', fontSize: 'var(--font-size-sm)' }}>
            {status === 'active'
              ? 'All matches are completed. Generate a new one!'
              : 'Start the tournament to generate matches.'}
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            {pendingRounds.map(roundNum => (
              <div key={roundNum}>
                <div
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--text-muted)',
                    marginBottom: 'var(--space-3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                  }}
                >
                  <span style={{ width: 24, height: 1, background: 'var(--border-light)', display: 'inline-block' }} />
                  Round {roundNum}
                  <span style={{ flex: 1, height: 1, background: 'var(--border-light)', display: 'inline-block' }} />
                </div>
                <div className="grid gap-4">
                  {pendingByRound[roundNum].map(match => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      players={players.filter(p => p.active)}
                      teams={teams || []}
                      partnerMode={partnerMode || 'rotating'}
                      getPlayerLabel={getPlayerLabel}
                      hasPartneredBefore={hasPartneredBefore}
                      pointsMode={pointsMode}
                      onSave={(s1: number, s2: number) => updateScore(match.id, s1, s2)}
                      onSwap={swapMatchPlayer}
                      onSwapTeam={swapMatchTeam}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Completed Matches ── */}
      {completedRounds.length > 0 && (
        <div className="glass-card" style={{ opacity: 0.85 }}>
          <h2 style={{ marginBottom: 'var(--space-5)', fontSize: 'var(--font-size-xl)', color: 'var(--text-muted)' }}>
            Completed Matches
          </h2>
          <div className="flex flex-col gap-6">
            {completedRounds.map(roundNum => (
              <div key={roundNum}>
                <div
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--text-subtle)',
                    marginBottom: 'var(--space-3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                  }}
                >
                  <span style={{ width: 24, height: 1, background: 'var(--border-light)', display: 'inline-block' }} />
                  Round {roundNum}
                  <span style={{ flex: 1, height: 1, background: 'var(--border-light)', display: 'inline-block' }} />
                </div>
                <div className="grid gap-3">
                  {completedByRound[roundNum].map(match => {
                    const t1win = match.score1! > match.score2!;
                    const t2win = match.score2! > match.score1!;
                    return (
                      <div
                        key={match.id}
                        style={{
                          background: 'rgba(0,0,0,0.2)',
                          padding: 'var(--space-3) var(--space-4)',
                          borderRadius: 'var(--radius-lg)',
                          border: '1px solid var(--border-light)',
                          display: 'grid',
                          gridTemplateColumns: '1fr auto 1fr',
                          alignItems: 'center',
                          gap: 'var(--space-3)',
                        }}
                      >
                        {/* Team 1 */}
                        <div style={{ minWidth: 0 }}>
                          {partnerMode === 'fixed' && findTeamByPlayers(match.team1[0], match.team1[1]) && (
                            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-subtle)', marginBottom: '2px' }}>
                              {findTeamByPlayers(match.team1[0], match.team1[1])!.name}
                            </div>
                          )}
                          {[match.team1[0], match.team1[1]].map(pid => (
                            <div
                              key={pid}
                              style={{
                                fontWeight: t1win ? 600 : 400,
                                color: t1win ? 'var(--accent-primary)' : 'var(--text-primary)',
                                fontSize: 'var(--font-size-sm)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {getPlayerName(pid)}
                              <span style={{ fontSize: '0.7rem', opacity: 0.45, marginLeft: '4px' }}>
                                ({playCount[pid] || 0}x)
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Score */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-2)',
                            fontWeight: 700,
                            fontSize: 'var(--font-size-xl)',
                            letterSpacing: '2px',
                            flexShrink: 0,
                          }}
                        >
                          <span style={{ color: t1win ? 'var(--accent-primary)' : 'var(--text-muted)' }}>{match.score1}</span>
                          <span style={{ color: 'var(--border-light)', fontWeight: 400, fontSize: 'var(--font-size-base)' }}>–</span>
                          <span style={{ color: t2win ? 'var(--accent-primary)' : 'var(--text-muted)' }}>{match.score2}</span>
                        </div>

                        {/* Team 2 */}
                        <div style={{ minWidth: 0, textAlign: 'right' }}>
                          {partnerMode === 'fixed' && findTeamByPlayers(match.team2[0], match.team2[1]) && (
                            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-subtle)', marginBottom: '2px' }}>
                              {findTeamByPlayers(match.team2[0], match.team2[1])!.name}
                            </div>
                          )}
                          {[match.team2[0], match.team2[1]].map(pid => (
                            <div
                              key={pid}
                              style={{
                                fontWeight: t2win ? 600 : 400,
                                color: t2win ? 'var(--accent-primary)' : 'var(--text-primary)',
                                fontSize: 'var(--font-size-sm)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {getPlayerName(pid)}
                              <span style={{ fontSize: '0.7rem', opacity: 0.45, marginLeft: '4px' }}>
                                ({playCount[pid] || 0}x)
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── MatchCard ──────────────────────────────────────────────────────────────── */
interface MatchCardProps {
  match: Match;
  players: Player[];
  teams: FixedTeam[];
  partnerMode: 'fixed' | 'rotating';
  getPlayerLabel: (id: string) => string;
  hasPartneredBefore: (a: string, b: string) => boolean;
  pointsMode: 'total21' | 'default';
  onSave: (s1: number, s2: number) => void;
  onSwap: (matchId: string, oldPlayerId: string, newPlayerId: string) => Promise<void>;
  onSwapTeam: (matchId: string, oldTeamPlayerIds: string[], newTeamPlayerIds: string[]) => Promise<void>;
}

function MatchCard({ match, players, teams, partnerMode, getPlayerLabel, hasPartneredBefore, pointsMode, onSave, onSwap, onSwapTeam }: MatchCardProps) {
  const [s1, setS1] = useState('');
  const [s2, setS2] = useState('');

  const handleSave = () => {
    const num1 = parseInt(s1, 10);
    const num2 = parseInt(s2, 10);
    if (!isNaN(num1) && !isNaN(num2)) {
      onSave(num1, num2);
    }
  };

  const handleS1Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setS1(val);
    if (pointsMode === 'total21' && val !== '') {
      const num = parseInt(val, 10);
      if (!isNaN(num) && num >= 0 && num <= 21) setS2((21 - num).toString());
    } else if (pointsMode === 'total21') {
      setS2('');
    }
  };

  const handleS2Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setS2(val);
    if (pointsMode === 'total21' && val !== '') {
      const num = parseInt(val, 10);
      if (!isNaN(num) && num >= 0 && num <= 21) setS1((21 - num).toString());
    } else if (pointsMode === 'total21') {
      setS1('');
    }
  };

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
      className="input"
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

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
        transition: 'border-color var(--transition-fast)',
      }}
    >
      {/* Round label + badge */}
      <div className="flex justify-between items-center" style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)' }}>
        <span>Round {match.round}</span>
        <span className="badge badge-pending">Pending</span>
      </div>

      {/* Teams + Score — responsive stacking */}
      <div id="match-card-body" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 'var(--space-3)' }}>

        {/* Team 1 (left-aligned) */}
        <div style={{ textAlign: 'left' }}>
          {partnerMode === 'fixed'
            ? (
                <div style={{ textAlign: 'left' }}>
                  {renderFixedTeamSlot(match.team1[0], match.team1[1])}
                  <div style={{ marginTop: 'var(--space-2)' }}>
                    {renderFixedTeamSelect(
                      findTeamByPlayers(match.team1[0], match.team1[1]),
                      findTeamByPlayers(match.team2[0], match.team2[1])?.id
                    )}
                  </div>
                </div>
              )
            : (
                <>
                  {renderPlayerSelect(match.team1[0])}
                  <div style={{ marginTop: 'var(--space-2)' }}>{renderPlayerSelect(match.team1[1])}</div>
                  {hasPartneredBefore(match.team1[0], match.team1[1]) && (
                    <div style={{ marginTop: 'var(--space-1)', textAlign: 'left' }}>
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

        {/* Score inputs */}
        <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
          <input
            type="number"
            className="input"
            style={{ width: '58px', textAlign: 'center', fontSize: 'var(--font-size-lg)', padding: 'var(--space-2)', fontWeight: 600 }}
            value={s1}
            onChange={handleS1Change}
            min="0"
            placeholder="–"
            {...(pointsMode === 'total21' ? { max: 21 } : {})}
            aria-label="Team 1 score"
          />
          <span style={{ color: 'var(--text-subtle)', fontSize: 'var(--font-size-sm)' }}>–</span>
          <input
            type="number"
            className="input"
            style={{ width: '58px', textAlign: 'center', fontSize: 'var(--font-size-lg)', padding: 'var(--space-2)', fontWeight: 600 }}
            value={s2}
            onChange={handleS2Change}
            min="0"
            placeholder="–"
            {...(pointsMode === 'total21' ? { max: 21 } : {})}
            aria-label="Team 2 score"
          />
        </div>

        {/* Team 2 (right-aligned) */}
        <div style={{ textAlign: 'right' }}>
          {partnerMode === 'fixed'
            ? (
                <div style={{ textAlign: 'right' }}>
                  {renderFixedTeamSlot(match.team2[0], match.team2[1])}
                  <div style={{ marginTop: 'var(--space-2)' }}>
                    {renderFixedTeamSelect(
                      findTeamByPlayers(match.team2[0], match.team2[1]),
                      findTeamByPlayers(match.team1[0], match.team1[1])?.id
                    )}
                  </div>
                </div>
              )
            : (
                <>
                  {renderPlayerSelect(match.team2[0])}
                  <div style={{ marginTop: 'var(--space-2)' }}>{renderPlayerSelect(match.team2[1])}</div>
                  {hasPartneredBefore(match.team2[0], match.team2[1]) && (
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
      </div>

      {/* Save button */}
      <button
        id={`save-score-${match.id}`}
        className="btn btn-primary w-full"
        onClick={handleSave}
        disabled={s1 === '' || s2 === ''}
        style={{ maxWidth: '220px', alignSelf: 'center' }}
      >
        <Check size={16} />
        Save Score
      </button>

      {/* Responsive: stack on mobile */}
      <style>{`
        @media (max-width: 480px) {
          #match-card-body {
            grid-template-columns: 1fr !important;
          }
          #match-card-body > div:first-child,
          #match-card-body > div:last-child {
            text-align: left !important;
          }
        }
      `}</style>
    </div>
  );
}
