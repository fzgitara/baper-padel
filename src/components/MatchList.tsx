import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTournamentStore } from '../store/tournamentStore';
import { Swords, Check, Shuffle, Play, ClipboardList } from 'lucide-react';
import { MatchSwapper } from './MatchSwapper';
import type { Match, Player, FixedTeam } from '../lib/types';
import {
  card,
  input,
  muted,
  btnPrimary,
  btnOutline,
  badgeBase,
  badgePending,
} from '../lib/ui';

const roundCls =
  'mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400';

export function MatchList() {
  const navigate = useNavigate();
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
      <div className={card}>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
            <Swords size={20} className="text-emerald-600" />
            Pending Matches
          </h2>

          <div className="flex flex-wrap gap-2">
            {status === 'active' && (
              <button
                id="generate-match-btn"
                className={btnPrimary}
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
                className={btnOutline}
                onClick={randomizePendingMatches}
                title="Randomize pending match players"
              >
                <Shuffle size={15} />
                <span className="hidden sm:inline">Randomize</span>
              </button>
            )}
            <button
              id="scoreboard-btn"
              className={btnOutline}
              onClick={() => navigate(`/tournament/${activeTournamentId}/scoreboard`)}
              title="Open the live scoreboard"
            >
              <ClipboardList size={15} />
              <span>Scoreboard</span>
            </button>
          </div>
        </div>

        {pendingMatches.length === 0 ? (
          <p className={`${muted} py-6 text-center text-sm`}>
            {status === 'active'
              ? 'All matches are completed. Generate a new one!'
              : 'Start the tournament to generate matches.'}
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            {pendingRounds.map(roundNum => (
              <div key={roundNum}>
                <div className={roundCls}>
                  <span className="inline-block h-px w-6 bg-slate-300 dark:bg-slate-700" />
                  Round {roundNum}
                  <span className="h-px flex-1 bg-slate-300 dark:bg-slate-700" />
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
        <div className={`${card} opacity-80`}>
          <h2 className="mb-5 text-lg font-semibold text-slate-400 dark:text-slate-500">
            Completed Matches
          </h2>
          <div className="flex flex-col gap-6">
            {completedRounds.map(roundNum => (
              <div key={roundNum}>
                <div className={roundCls}>
                  <span className="inline-block h-px w-6 bg-slate-300 dark:bg-slate-700" />
                  Round {roundNum}
                  <span className="h-px flex-1 bg-slate-300 dark:bg-slate-700" />
                </div>
                <div className="grid gap-3">
                  {completedByRound[roundNum].map(match => {
                    const t1win = match.score1! > match.score2!;
                    const t2win = match.score2! > match.score1!;
                    return (
                      <div
                        key={match.id}
                        className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50"
                      >
                        {/* Team 1 */}
                        <div className="min-w-0">
                          {partnerMode === 'fixed' && findTeamByPlayers(match.team1[0], match.team1[1]) && (
                            <div className="mb-0.5 text-[0.65rem] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                              {findTeamByPlayers(match.team1[0], match.team1[1])!.name}
                            </div>
                          )}
                          {[match.team1[0], match.team1[1]].map(pid => (
                            <div
                              key={pid}
                              className={`truncate text-sm ${
                                t1win
                                  ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                                  : 'text-slate-800 dark:text-slate-100'
                              }`}
                            >
                              {getPlayerName(pid)}
                              <span className="ml-1 text-[0.7rem] opacity-45">
                                ({playCount[pid] || 0}x)
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Score */}
                        <div className="flex shrink-0 items-center gap-2 text-xl font-bold tracking-wider">
                          <span className={t1win ? 'text-emerald-600 dark:text-emerald-400' : muted}>{match.score1}</span>
                          <span className="text-sm font-normal text-slate-400 dark:text-slate-500">–</span>
                          <span className={t2win ? 'text-emerald-600 dark:text-emerald-400' : muted}>{match.score2}</span>
                        </div>

                        {/* Team 2 */}
                        <div className="min-w-0 text-right">
                          {partnerMode === 'fixed' && findTeamByPlayers(match.team2[0], match.team2[1]) && (
                            <div className="mb-0.5 text-[0.65rem] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                              {findTeamByPlayers(match.team2[0], match.team2[1])!.name}
                            </div>
                          )}
                          {[match.team2[0], match.team2[1]].map(pid => (
                            <div
                              key={pid}
                              className={`truncate text-sm ${
                                t2win
                                  ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                                  : 'text-slate-800 dark:text-slate-100'
                              }`}
                            >
                              {getPlayerName(pid)}
                              <span className="ml-1 text-[0.7rem] opacity-45">
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

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Round label + badge */}
      <div className="flex items-center justify-between text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">
        <span>Round {match.round}</span>
        <span className={`${badgeBase} ${badgePending}`}>Pending</span>
      </div>

      {/* Teams + Score — responsive stacking */}
      <div id="match-card-body" className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 max-sm:grid-cols-1">
        <MatchSwapper
          match={match}
          players={players}
          teams={teams}
          partnerMode={partnerMode}
          getPlayerLabel={getPlayerLabel}
          hasPartneredBefore={hasPartneredBefore}
          onSwap={onSwap}
          onSwapTeam={onSwapTeam}
          side="team1"
        />

        {/* Score inputs */}
        <div className="flex shrink-0 items-center gap-2">
          <input
            type="number"
            className={`${input} w-14 px-2 py-2 text-center text-lg font-semibold`}
            value={s1}
            onChange={handleS1Change}
            min="0"
            placeholder="–"
            {...(pointsMode === 'total21' ? { max: 21 } : {})}
            aria-label="Team 1 score"
          />
          <span className="text-sm text-slate-400 dark:text-slate-500">–</span>
          <input
            type="number"
            className={`${input} w-14 px-2 py-2 text-center text-lg font-semibold`}
            value={s2}
            onChange={handleS2Change}
            min="0"
            placeholder="–"
            {...(pointsMode === 'total21' ? { max: 21 } : {})}
            aria-label="Team 2 score"
          />
        </div>

        <MatchSwapper
          match={match}
          players={players}
          teams={teams}
          partnerMode={partnerMode}
          getPlayerLabel={getPlayerLabel}
          hasPartneredBefore={hasPartneredBefore}
          onSwap={onSwap}
          onSwapTeam={onSwapTeam}
          side="team2"
        />
      </div>

      {/* Save button */}
      <button
        id={`save-score-${match.id}`}
        className={`${btnPrimary} mx-auto w-full max-w-[220px]`}
        onClick={handleSave}
        disabled={s1 === '' || s2 === ''}
      >
        <Check size={16} />
        Save Score
      </button>
    </div>
  );
}
