import { useMemo, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTournamentStore } from '../store/tournamentStore';
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Check,
  Gauge,
  Trophy,
  Shuffle,
  Play,
} from 'lucide-react';
import { MatchSwapper } from './MatchSwapper';
import type { Match, Player, FixedTeam } from '../lib/types';
import {
  tennisGameStatus,
  tennisGameStatusText,
  tennisSideLabel,
  applyTennisPoint,
} from '../lib/tennisScoring';
import {
  card,
  btnPrimary,
  btnOutline,
  muted,
  badgeBase,
  badgeActive,
  badgePending,
  badgeMeta,
} from '../lib/ui';

/** In-progress scoring state for a single match. */
interface LiveScore {
  matchId: string;
  // Set points (games won) — the primary scoreboard numbers.
  sets1: number;
  sets2: number;
  // Current game raw points (0,1,2,3,…) in tennis notation.
  game1: number;
  game2: number;
}

const panelCls =
  'flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 dark:border-slate-700 dark:bg-slate-800/40';
const bigScoreCls =
  'flex items-center justify-center gap-4 font-extrabold leading-none tracking-[6px] text-7xl sm:text-9xl';
const scoreTapCls =
  'cursor-pointer rounded-md bg-transparent p-0 [font:inherit] transition-transform active:scale-95';

export function Scoreboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    tournaments,
    activeTournamentId,
    updateScore,
    updateLiveScore,
    randomizePendingMatches,
    swapMatchPlayer,
    swapMatchTeam,
    generateSingleMatch,
  } = useTournamentStore();
  const activeTournament = tournaments.find(t => t.id === (id || activeTournamentId));

  const [loading, setLoading] = useState(!!id);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      useTournamentStore.getState().setActiveTournament(id);
      useTournamentStore.getState().fetchTournamentById(id).finally(() => setLoading(false));
    }
    const unsubscribe = useTournamentStore.getState().subscribeToRealtime();
    return () => {
      unsubscribe();
      useTournamentStore.getState().setActiveTournament(null);
    };
  }, [id]);

  const activePlayers = useMemo(
    () => (activeTournament ? activeTournament.players.filter(p => p.active) : []),
    [activeTournament]
  );

  if (loading && !activeTournament) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600 dark:border-emerald-500/30 dark:border-t-emerald-400" />
        <span className={`${muted} text-sm`}>Loading tournament…</span>
      </div>
    );
  }

  if (!activeTournament) return null;

  const { matches, pointsMode, status, partnerMode, teams } = activeTournament;
  const getPlayerName = (pid: string) => activePlayers.find(p => p.id === pid)?.name || 'Unknown';

  const findTeamByPlayers = (p1: string, p2: string) =>
    (teams || []).find(
      t =>
        (t.playerIds[0] === p1 && t.playerIds[1] === p2) ||
        (t.playerIds[0] === p2 && t.playerIds[1] === p1)
    );

  // Play count across completed matches only (for the swap dropdown labels).
  const playCount = matches.filter(m => m.status === 'completed').reduce((acc, m) => {
    [...m.team1, ...m.team2].forEach(pid => {
      acc[pid] = (acc[pid] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const getPlayerLabel = (id: string) => {
    const name = getPlayerName(id);
    const count = playCount[id] || 0;
    return `${name} (${count}x)`;
  };

  // Build partnership history from completed matches.
  const partnerships = new Set<string>();
  matches.filter(m => m.status === 'completed').forEach(m => {
    partnerships.add([m.team1[0], m.team1[1]].sort().join('|'));
    partnerships.add([m.team2[0], m.team2[1]].sort().join('|'));
  });
  const hasPartneredBefore = (a: string, b: string) =>
    partnerships.has([a, b].sort().join('|'));

  const pendingMatches = matches.filter(m => m.status === 'pending');
  const completedMatches = matches.filter(m => m.status === 'completed');

  // The currently selected match. Falls back to the first pending match when
  // none is explicitly selected (or after finishing one).
  const selectedMatch: Match | null =
    matches.find(m => m.id === selectedMatchId) || pendingMatches[0] || null;

  // Derive the displayed live score directly from the selected match's
  // persisted live fields (the single source of truth, kept in sync via
  // realtime by updateLiveScore).
  const liveScore: LiveScore | null =
    selectedMatch && selectedMatch.status === 'pending'
      ? {
          matchId: selectedMatch.id,
          sets1: selectedMatch.live_sets1 ?? 0,
          sets2: selectedMatch.live_sets2 ?? 0,
          game1: selectedMatch.live_game1 ?? 0,
          game2: selectedMatch.live_game2 ?? 0,
        }
      : null;

  const isTennis = pointsMode === 'default';

  const handleChoose = (m: Match) => {
    if (m.status !== 'pending') return;
    setSelectedMatchId(m.id);
  };

  // Persist a live score change: optimistic UI + realtime sync to DB.
  const persistLiveScore = (live: LiveScore) => {
    updateLiveScore(live.matchId, {
      sets1: live.sets1,
      sets2: live.sets2,
      game1: live.game1,
      game2: live.game2,
    });
  };

  const handleFinish = async () => {
    if (!selectedMatch || !liveScore) return;
    // Tennis: the match result is the set-point totals.
    // Total 21: the points live in game1/game2 (sets stay 0), so save those.
    const score1 = isTennis ? liveScore.sets1 : liveScore.game1;
    const score2 = isTennis ? liveScore.sets2 : liveScore.game2;
    await updateScore(selectedMatch.id, score1, score2);
    setSelectedMatchId(null);
  };

  const renderTeamPlayers = (team: string[], align: 'left' | 'right' | 'center') => {
    const teamName = partnerMode === 'fixed' && findTeamByPlayers(team[0], team[1])
      ? findTeamByPlayers(team[0], team[1])!.name
      : null;
    const alignCls = align === 'left' ? 'text-left' : align === 'right' ? 'text-right' : 'text-center';

    return (
      <div className={`min-w-0 ${alignCls}`}>
        {teamName && (
          <div className="mb-0.5 text-[0.65rem] uppercase tracking-wide text-slate-400 dark:text-slate-500">
            {teamName}
          </div>
        )}
        {team.map(pid => (
          <div
            key={pid}
            className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100"
          >
            {getPlayerName(pid)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="mx-auto w-full max-w-[860px] px-4 py-8 sm:px-6">
      {/* ── Header ── */}
      <header className="mb-6 pt-2">
        <button
          className={`${btnOutline} mb-4`}
          onClick={() => navigate(`/tournament/${activeTournament.id}`)}
        >
          <ArrowLeft size={16} />
          Back to Tournament
        </button>
        <h1 className="mb-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Scoreboard
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`${badgeBase} ${badgeMeta}`}>
            <Gauge size={11} className="mr-1" />
            {isTennis ? 'Default' : 'Total 21'}
          </span>
          <span className={`${badgeBase} ${badgePending} capitalize`}>{status}</span>
          <div className="ml-auto flex flex-wrap gap-2">
            {status === 'active' && (
              <button
                className={btnPrimary}
                onClick={generateSingleMatch}
                title="Generate a new match"
              >
                <Play size={15} />
                <span>Generate</span>
              </button>
            )}
            {status === 'active' && (
              <button
                className={btnOutline}
                onClick={randomizePendingMatches}
                title="Randomize pending match players"
              >
                <Shuffle size={15} />
                <span className="hidden sm:inline">Randomize</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Match Selector ── */}
      {pendingMatches.length > 0 && (
        <div className={`${card} mb-6 p-4`}>
          <div className="mb-3 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Select match to score
          </div>
          <div className="flex flex-wrap gap-2">
            {pendingMatches.map(m => (
              <button
                key={m.id}
                className={`${selectedMatchId === m.id ? btnPrimary : btnOutline} text-xs`}
                onClick={() => handleChoose(m)}
                disabled={status !== 'active'}
              >
                Round {m.round}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Active Scoreboard ── */}
      {liveScore && status === 'active' ? (
        isTennis ? (
          <TennisScoreboard
            match={selectedMatch}
            score={liveScore}
            setScore={persistLiveScore}
            renderTeamPlayers={renderTeamPlayers}
            onFinish={handleFinish}
            players={activePlayers}
            teams={teams || []}
            partnerMode={partnerMode || 'rotating'}
            getPlayerLabel={getPlayerLabel}
            hasPartneredBefore={hasPartneredBefore}
            onSwap={swapMatchPlayer}
            onSwapTeam={swapMatchTeam}
          />
        ) : (
          <Court21Scoreboard
            match={selectedMatch}
            score={liveScore}
            setScore={persistLiveScore}
            renderTeamPlayers={renderTeamPlayers}
            onFinish={handleFinish}
            players={activePlayers}
            teams={teams || []}
            partnerMode={partnerMode || 'rotating'}
            getPlayerLabel={getPlayerLabel}
            hasPartneredBefore={hasPartneredBefore}
            onSwap={swapMatchPlayer}
            onSwapTeam={swapMatchTeam}
          />
        )
      ) : (
        <div className={`${card} flex flex-col items-center justify-center gap-3 px-6 py-14 text-center`}>
          <Trophy size={48} className="text-slate-300 dark:text-slate-700" />
          <p className={muted}>
            {status === 'active'
              ? 'No pending matches available to score.'
              : 'Start the tournament to view the scoreboard.'}
          </p>
        </div>
      )}

      {/* ── Completed Matches ── */}
      {completedMatches.length > 0 && (
        <div className={`${card} mt-6 opacity-90`}>
          <h2 className={`${muted} mb-4 text-lg`}>Completed Matches</h2>
          <div className="flex flex-col gap-3">
            {completedMatches.map(m => (
              <div
                key={m.id}
                className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/40"
              >
                {renderTeamPlayers(m.team1, 'left')}
                <div className="flex items-center gap-2 text-2xl font-bold tracking-wider">
                  <span className="text-emerald-600 dark:text-emerald-400">{m.score1}</span>
                  <span className="font-normal text-slate-300 dark:text-slate-600">–</span>
                  <span className="text-emerald-600 dark:text-emerald-400">{m.score2}</span>
                </div>
                {renderTeamPlayers(m.team2, 'right')}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Shared team controls / header helpers ────────────────────────────────── */
type RenderPlayers = (team: string[], align: 'left' | 'right' | 'center') => React.ReactNode;

interface BaseScoreboardProps {
  match: Match;
  score: LiveScore | null;
  setScore: (s: LiveScore) => void;
  renderTeamPlayers: RenderPlayers;
  onFinish: () => void;
  players: Player[];
  teams: FixedTeam[];
  partnerMode: 'fixed' | 'rotating';
  getPlayerLabel: (id: string) => string;
  hasPartneredBefore: (a: string, b: string) => boolean;
  onSwap: (matchId: string, oldPlayerId: string, newPlayerId: string) => Promise<void>;
  onSwapTeam: (matchId: string, oldTeamPlayerIds: string[], newTeamPlayerIds: string[]) => Promise<void>;
}

/** Small +/- controls used under each team. */
function PointControls({
  canDec,
  canInc,
  onDec,
  onInc,
}: {
  canDec: boolean;
  canInc: boolean;
  onDec: () => void;
  onInc: () => void;
}) {
  return (
    <div className="mt-4 flex justify-center gap-2">
      <button
        className="inline-flex items-center justify-center rounded-lg border border-slate-300 p-2 text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
        onClick={onDec}
        disabled={!canDec}
        title="Decrement"
      >
        <ArrowDown size={16} />
      </button>
      <button
        className="inline-flex items-center justify-center rounded-lg bg-emerald-600 p-2 text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={onInc}
        disabled={!canInc}
        title="Increment"
      >
        <ArrowUp size={16} />
      </button>
    </div>
  );
}

/* Small hint shown under the big scoreboard. */
function TapHint() {
  return (
    <div className="mt-2 text-center text-xs text-slate-400 dark:text-slate-500">
      Tap a number to add a point
    </div>
  );
}

/* ── Team / player swapping (shared with MatchList) ───────────────────────── */
interface SwapSectionProps {
  match: Match;
  players: Player[];
  teams: FixedTeam[];
  partnerMode: 'fixed' | 'rotating';
  getPlayerLabel: (id: string) => string;
  hasPartneredBefore: (a: string, b: string) => boolean;
  onSwap: (matchId: string, oldPlayerId: string, newPlayerId: string) => Promise<void>;
  onSwapTeam: (matchId: string, oldTeamPlayerIds: string[], newTeamPlayerIds: string[]) => Promise<void>;
}

function SwapSection({
  match,
  players,
  teams,
  partnerMode,
  getPlayerLabel,
  hasPartneredBefore,
  onSwap,
  onSwapTeam,
}: SwapSectionProps) {
  return (
    <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/30">
      <div className="mb-3 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
        Change team or player
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 max-sm:grid-cols-1">
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
        <div className="text-sm font-semibold text-slate-400 dark:text-slate-500">vs</div>
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
    </div>
  );
}

/* ─── Tennis (Default) Scoreboard: big SET POINTS on top, game below ─────── */
function TennisScoreboard({
  match,
  score,
  setScore,
  renderTeamPlayers,
  onFinish,
  players,
  teams,
  partnerMode,
  getPlayerLabel,
  hasPartneredBefore,
  onSwap,
  onSwapTeam,
}: BaseScoreboardProps) {
  const s = score || { matchId: match.id, sets1: 0, sets2: 0, game1: 0, game2: 0 };
  const gameStatus = tennisGameStatus(s.game1, s.game2);
  const gameText = tennisGameStatusText(gameStatus);
  // The winner is decided by the user, so the match can be saved once at
  // least one set point has been scored (prevents saving an empty 0–0).
  const matchComplete = s.sets1 + s.sets2 >= 1;

  const addGamePoint = (side: 1 | 2) => {
    const res = applyTennisPoint(s.game1, s.game2, side);
    setScore({
      ...s,
      game1: res.game1,
      game2: res.game2,
      // When a game is won, that side earns a set point.
      sets1: s.sets1 + (res.wonSide === 1 ? 1 : 0),
      sets2: s.sets2 + (res.wonSide === 2 ? 1 : 0),
    });
  };

  // Tapping the big SET POINT number adds one set point for that side.
  const addSetPoint = (side: 1 | 2) => {
    setScore({
      ...s,
      sets1: side === 1 ? s.sets1 + 1 : s.sets1,
      sets2: side === 2 ? s.sets2 + 1 : s.sets2,
    });
  };

  const undoGamePoint = (side: 1 | 2) => {
    const g = side === 1 ? Math.max(0, s.game1 - 1) : s.game1;
    const g2 = side === 2 ? Math.max(0, s.game2 - 1) : s.game2;
    setScore({ ...s, game1: g, game2: g2 });
  };

  return (
    <div className={`${card} border-emerald-300 dark:border-emerald-500/30`}>
      {/* Header label */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
          <Trophy size={20} className="text-emerald-600" />
          Round {match.round}
        </h2>
        <div className="flex items-center gap-2">
          <span className={`${badgeBase} ${badgeMeta}`}>Set Points</span>
          {matchComplete && (
            <span className={`${badgeBase} ${badgeActive}`}>Ready to save</span>
          )}
        </div>
      </div>

      {/* ── BIG SET-POINT SCOREBOARD ── */}
      <div className={`${panelCls} mb-6`}>
        {/* Team names above the score */}
        <div className="flex w-full justify-between gap-4">
          {renderTeamPlayers(match.team1, 'left')}
          <span className="self-center text-3xl uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">
            Set Points
          </span>
          {renderTeamPlayers(match.team2, 'right')}
        </div>

        <div className={`${bigScoreCls} text-emerald-600 dark:text-emerald-400`}>
          <button type="button" onClick={() => addSetPoint(1)} title="Tap to add a set point" className={scoreTapCls}>{s.sets1}</button>
          <span className="text-[0.5em] font-light text-slate-300 dark:text-slate-600">–</span>
          <button type="button" onClick={() => addSetPoint(2)} title="Tap to add a set point" className={scoreTapCls}>{s.sets2}</button>
        </div>
      </div>
      <TapHint />

      {/* ── Current game in tennis notation ── */}
      <div className="mb-3 text-center">
        <div className="text-3xl uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
          In This Game
        </div>
        <div className={`${bigScoreCls} mt-2 text-slate-900 dark:text-slate-100`}>
          <button type="button" onClick={() => addGamePoint(1)} title="Tap to add a point" className={scoreTapCls}>{tennisSideLabel(s.game1, 1, gameStatus)}</button>
          <span className="text-[0.5em] font-light text-slate-300 dark:text-slate-600">–</span>
          <button type="button" onClick={() => addGamePoint(2)} title="Tap to add a point" className={scoreTapCls}>{tennisSideLabel(s.game2, 2, gameStatus)}</button>
        </div>
        {gameText && (
          <div className="mt-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            {gameText}
          </div>
        )}
      </div>

      {/* ── Point controls ── */}
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Team 1 Points
          </div>
          <PointControls
            canDec={s.game1 > 0}
            canInc
            onDec={() => undoGamePoint(1)}
            onInc={() => addGamePoint(1)}
          />
        </div>
        <div className="text-center">
          <div className="text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Team 2 Points
          </div>
          <PointControls
            canDec={s.game2 > 0}
            canInc
            onDec={() => undoGamePoint(2)}
            onInc={() => addGamePoint(2)}
          />
        </div>
      </div>

      <SwapSection
        match={match}
        players={players}
        teams={teams}
        partnerMode={partnerMode}
        getPlayerLabel={getPlayerLabel}
        hasPartneredBefore={hasPartneredBefore}
        onSwap={onSwap}
        onSwapTeam={onSwapTeam}
      />

      <FinishBar isReady={matchComplete} onFinish={onFinish} hint="You decide the winner. Save the match result whenever it's finished." />
    </div>
  );
}

/* ─── Total 21 Scoreboard ──────────────────────────────────────────────────── */
function Court21Scoreboard({
  match,
  score,
  setScore,
  renderTeamPlayers,
  onFinish,
  players,
  teams,
  partnerMode,
  getPlayerLabel,
  hasPartneredBefore,
  onSwap,
  onSwapTeam,
}: BaseScoreboardProps) {
  const s = score || { matchId: match.id, sets1: 0, sets2: 0, game1: 0, game2: 0 };
  // Total 21: game ends when the COMBINED points equal 21.
  const total = s.game1 + s.game2;
  const isComplete = total === 21;

  const add = (side: 1 | 2) => {
    if (isComplete) return;
    setScore({
      ...s,
      game1: side === 1 ? s.game1 + 1 : s.game1,
      game2: side === 2 ? s.game2 + 1 : s.game2,
    });
  };

  const undo = (side: 1 | 2) => {
    setScore({
      ...s,
      game1: side === 1 ? Math.max(0, s.game1 - 1) : s.game1,
      game2: side === 2 ? Math.max(0, s.game2 - 1) : s.game2,
    });
  };

  return (
    <div className={`${card} border-emerald-300 dark:border-emerald-500/30`}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
          <Trophy size={20} className="text-emerald-600" />
          Round {match.round}
        </h2>
        {isComplete && (
          <span className={`${badgeBase} ${badgeActive}`}>Match complete</span>
        )}
      </div>

      {/* Big score */}
      <div className={panelCls}>
        {/* Team names above the score */}
        <div className="flex w-full justify-between gap-4">
          {renderTeamPlayers(match.team1, 'left')}
          <span className="self-center text-3xl uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">
            Points
          </span>
          {renderTeamPlayers(match.team2, 'right')}
        </div>

        <div className={`${bigScoreCls} text-emerald-600 dark:text-emerald-400`}>
          <button type="button" onClick={() => add(1)} disabled={isComplete} title="Tap to add a point" className={scoreTapCls}>{s.game1}</button>
          <span className="text-[0.5em] font-light text-slate-300 dark:text-slate-600">–</span>
          <button type="button" onClick={() => add(2)} disabled={isComplete} title="Tap to add a point" className={scoreTapCls}>{s.game2}</button>
        </div>
      </div>
      <TapHint />

      {/* Controls */}
      <div className="mt-5 grid grid-cols-2 gap-4">
        <PointControls canDec={s.game1 > 0} canInc={!isComplete} onDec={() => undo(1)} onInc={() => add(1)} />
        <PointControls canDec={s.game2 > 0} canInc={!isComplete} onDec={() => undo(2)} onInc={() => add(2)} />
      </div>

      <SwapSection
        match={match}
        players={players}
        teams={teams}
        partnerMode={partnerMode}
        getPlayerLabel={getPlayerLabel}
        hasPartneredBefore={hasPartneredBefore}
        onSwap={onSwap}
        onSwapTeam={onSwapTeam}
      />

      <FinishBar isReady={isComplete} onFinish={onFinish} hint="Both teams' points must add up to exactly 21." />
    </div>
  );
}

/* ─── Shared footer ───────────────────────────────────────────────────────── */
function FinishBar({ isReady, onFinish, hint }: { isReady: boolean; onFinish: () => void; hint: string }) {
  return (
    <div className="mt-6 text-center">
      <button
        className={`${btnPrimary} mx-auto w-full max-w-[260px]`}
        onClick={onFinish}
        disabled={!isReady}
      >
        <Check size={16} />
        {isReady ? 'Save Match Result' : 'Complete the match to record result'}
      </button>
      <div className="mt-2 text-xs text-slate-400 dark:text-slate-500">
        {hint}
      </div>
    </div>
  );
}
