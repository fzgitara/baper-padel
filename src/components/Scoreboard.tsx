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

export function Scoreboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    tournaments,
    activeTournamentId,
    updateScore,
    randomizePendingMatches,
    swapMatchPlayer,
    swapMatchTeam,
    generateSingleMatch,
  } = useTournamentStore();
  const activeTournament = tournaments.find(t => t.id === (id || activeTournamentId));

  const [loading, setLoading] = useState(!!id);
  const [score, setScore] = useState<LiveScore | null>(null);

  useEffect(() => {
    if (id) {
      useTournamentStore.getState().setActiveTournament(id);
      useTournamentStore.getState().fetchTournamentById(id).finally(() => setLoading(false));
    }
    return () => {
      useTournamentStore.getState().setActiveTournament(null);
    };
  }, [id]);

  const activePlayers = useMemo(
    () => (activeTournament ? activeTournament.players.filter(p => p.active) : []),
    [activeTournament]
  );

  if (loading && !activeTournament) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--space-4)',
        }}
      >
        <div className="spinner" />
        <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>Loading tournament…</span>
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

  const selectedMatch: Match | null =
    score ? matches.find(m => m.id === score.matchId) || null : pendingMatches[0] || null;

  const isTennis = pointsMode === 'default';

  const handleChoose = (m: Match) => {
    if (m.status !== 'pending') return;
    setScore({ matchId: m.id, sets1: 0, sets2: 0, game1: 0, game2: 0 });
  };

  const handleFinish = async () => {
    if (!selectedMatch) return;
    const s = score || { matchId: selectedMatch.id, sets1: 0, sets2: 0, game1: 0, game2: 0 };
    // Persist the set-point totals as the match result.
    await updateScore(selectedMatch.id, s.sets1, s.sets2);
    setScore(null);
  };

  const renderTeamPlayers = (team: string[], align: 'left' | 'right' | 'center') => {
    const teamName = partnerMode === 'fixed' && findTeamByPlayers(team[0], team[1])
      ? findTeamByPlayers(team[0], team[1])!.name
      : null;

    return (
      <div style={{ textAlign: align, minWidth: 0 }}>
        {teamName && (
          <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-subtle)', marginBottom: 2 }}>
            {teamName}
          </div>
        )}
        {team.map(pid => (
          <div
            key={pid}
            style={{
              fontSize: 'var(--font-size-sm)',
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {getPlayerName(pid)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="container fade-in" style={{ maxWidth: '860px' }}>
      {/* ── Header ── */}
      <header style={{ marginBottom: 'var(--space-6)', paddingTop: 'var(--space-5)' }}>
        <button
          className="btn btn-outline"
          style={{ marginBottom: 'var(--space-4)', padding: '6px 14px', fontSize: 'var(--font-size-sm)' }}
          onClick={() => navigate(`/tournament/${activeTournament.id}`)}
        >
          <ArrowLeft size={16} />
          Back to Tournament
        </button>
        <h1 className="text-gradient" style={{ fontSize: 'var(--font-size-3xl)', marginBottom: 'var(--space-1)' }}>
          Scoreboard
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <span className="badge" style={{ background: 'rgba(139,92,246,0.2)', color: '#d8b4fe', border: '1px solid rgba(139,92,246,0.3)' }}>
            <Gauge size={11} style={{ marginRight: 4 }} />
            {isTennis ? 'Default' : 'Total 21'}
          </span>
          <span className="badge" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-muted)', border: '1px solid var(--border-light)', textTransform: 'capitalize' }}>
            {status}
          </span>
          <div className="flex gap-2" style={{ marginLeft: 'auto', flexWrap: 'wrap' }}>
            {status === 'active' && (
              <button
                className="btn btn-primary"
                onClick={generateSingleMatch}
                title="Generate a new match"
                style={{ fontSize: 'var(--font-size-xs)', padding: '6px 12px' }}
              >
                <Play size={15} />
                <span>Generate</span>
              </button>
            )}
            {status === 'active' && (
              <button
                className="btn btn-outline"
                onClick={randomizePendingMatches}
                title="Randomize pending match players"
                style={{ fontSize: 'var(--font-size-xs)', padding: '6px 12px' }}
              >
                <Shuffle size={15} />
                <span className="hide-mobile">Randomize</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Match Selector ── */}
      {pendingMatches.length > 0 && (
        <div className="glass-card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-4)' }}>
          <div style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
            Select match to score
          </div>
          <div className="flex" style={{ gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            {pendingMatches.map(m => (
              <button
                key={m.id}
                className={`btn ${score?.matchId === m.id ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: 'var(--font-size-xs)', padding: '6px 12px' }}
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
      {selectedMatch && status === 'active' ? (
        isTennis ? (
          <TennisScoreboard
            match={selectedMatch}
            score={score}
            setScore={setScore}
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
            score={score}
            setScore={setScore}
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
        <div className="glass-card empty-state">
          <Trophy size={48} className="empty-state-icon" />
          <p style={{ color: 'var(--text-muted)' }}>
            {status === 'active'
              ? 'No pending matches available to score.'
              : 'Start the tournament to view the scoreboard.'}
          </p>
        </div>
      )}

      {/* ── Completed Matches ── */}
      {completedMatches.length > 0 && (
        <div className="glass-card" style={{ marginTop: 'var(--space-6)', opacity: 0.9 }}>
          <h2 style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-lg)', color: 'var(--text-muted)' }}>
            Completed Matches
          </h2>
          <div className="flex flex-col gap-3">
            {completedMatches.map(m => (
              <div
                key={m.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto 1fr',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-3)',
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-lg)',
                }}
              >
                {renderTeamPlayers(m.team1, 'left')}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontWeight: 700, fontSize: 'var(--font-size-2xl)', letterSpacing: '2px' }}>
                  <span style={{ color: 'var(--accent-primary)' }}>{m.score1}</span>
                  <span style={{ color: 'var(--border-light)', fontWeight: 400 }}>–</span>
                  <span style={{ color: 'var(--accent-primary)' }}>{m.score2}</span>
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
    <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
      <button className="btn btn-outline btn-icon" onClick={onDec} disabled={!canDec} title="Decrement">
        <ArrowDown size={16} />
      </button>
      <button className="btn btn-primary btn-icon" onClick={onInc} disabled={!canInc} title="Increment">
        <ArrowUp size={16} />
      </button>
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
    <div
      style={{
        marginTop: 'var(--space-6)',
        padding: 'var(--space-4)',
        borderRadius: 'var(--radius-lg)',
        border: '1px dashed var(--border-light)',
        background: 'rgba(255,255,255,0.02)',
      }}
    >
      <div style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
        Change team or player
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 'var(--space-3)' }}>
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
        <div style={{ color: 'var(--text-subtle)', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>vs</div>
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

  const undoGamePoint = (side: 1 | 2) => {
    const g = side === 1 ? Math.max(0, s.game1 - 1) : s.game1;
    const g2 = side === 2 ? Math.max(0, s.game2 - 1) : s.game2;
    setScore({ ...s, game1: g, game2: g2 });
  };

  return (
    <div className="glass-card fade-in" style={{ borderColor: 'rgba(16,185,129,0.25)' }}>
      {/* Header label */}
      <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        <h2 style={{ fontSize: 'var(--font-size-xl)' }} className="flex items-center gap-2">
          <Trophy size={20} style={{ color: 'var(--accent-primary)' }} />
          Round {match.round}
        </h2>
        <div className="flex items-center gap-2">
          <span className="badge" style={{ background: 'rgba(139,92,246,0.2)', color: '#d8b4fe', border: '1px solid rgba(139,92,246,0.3)' }}>
            Set Points
          </span>
          {matchComplete && (
            <span className="badge badge-completed">Ready to save</span>
          )}
        </div>
      </div>

      {/* ── BIG SET-POINT SCOREBOARD ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          gap: 'var(--space-4)',
          padding: 'var(--space-6)',
          background: 'rgba(0,0,0,0.35)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid rgba(255,255,255,0.08)',
          marginBottom: 'var(--space-6)',
        }}
      >
        {renderTeamPlayers(match.team1, 'center')}

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', fontWeight: 800, fontSize: 'var(--font-size-4xl)', letterSpacing: '4px' }}>
          <span style={{ color: 'var(--accent-primary)' }}>{s.sets1}</span>
          <span style={{ color: 'var(--border-light)', fontWeight: 300, fontSize: 'var(--font-size-2xl)' }}>–</span>
          <span style={{ color: 'var(--accent-primary)' }}>{s.sets2}</span>
        </div>

        {renderTeamPlayers(match.team2, 'center')}
      </div>

      {/* ── Current game in tennis notation ── */}
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-3)' }}>
        <div style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
          In This Game
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-3)', fontSize: 'var(--font-size-3xl)', fontWeight: 700, letterSpacing: '2px', marginTop: 'var(--space-2)' }}>
          <span style={{ color: 'var(--accent-primary)' }}>{tennisSideLabel(s.game1, 1, gameStatus)}</span>
          <span style={{ color: 'var(--border-light)', fontWeight: 400 }}>–</span>
          <span style={{ color: 'var(--accent-primary)' }}>{tennisSideLabel(s.game2, 2, gameStatus)}</span>
        </div>
        {gameText && (
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--accent-secondary)', fontWeight: 600, marginTop: 'var(--space-1)' }}>
            {gameText}
          </div>
        )}
      </div>

      {/* ── Point controls ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-subtle)' }}>
            Team 1 Points
          </div>
          <PointControls
            canDec={s.game1 > 0}
            canInc
            onDec={() => undoGamePoint(1)}
            onInc={() => addGamePoint(1)}
          />
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-subtle)' }}>
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
    <div className="glass-card fade-in" style={{ borderColor: 'rgba(16,185,129,0.25)' }}>
      <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-5)', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        <h2 style={{ fontSize: 'var(--font-size-xl)' }} className="flex items-center gap-2">
          <Trophy size={20} style={{ color: 'var(--accent-primary)' }} />
          Round {match.round}
        </h2>
        {isComplete && (
          <span className="badge badge-completed">Match complete</span>
        )}
      </div>

      {/* Big score */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          gap: 'var(--space-4)',
          padding: 'var(--space-6)',
          background: 'rgba(0,0,0,0.35)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {renderTeamPlayers(match.team1, 'center')}

        <div style={{ fontSize: 'var(--font-size-4xl)', fontWeight: 800, letterSpacing: '4px' }}>
          <span style={{ color: 'var(--accent-primary)' }}>{s.game1}</span>
          <span style={{ color: 'var(--border-light)', fontWeight: 300, fontSize: 'var(--font-size-2xl)' }}> – </span>
          <span style={{ color: 'var(--accent-primary)' }}>{s.game2}</span>
        </div>

        {renderTeamPlayers(match.team2, 'center')}
      </div>

      {/* Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginTop: 'var(--space-5)' }}>
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
    <div style={{ marginTop: 'var(--space-6)', textAlign: 'center' }}>
      <button
        className="btn btn-primary"
        onClick={onFinish}
        disabled={!isReady}
        style={{ maxWidth: 260, width: '100%' }}
      >
        <Check size={16} />
        {isReady ? 'Save Match Result' : 'Complete the match to record result'}
      </button>
      <div style={{ marginTop: 'var(--space-2)', fontSize: 'var(--font-size-xs)', color: 'var(--text-subtle)' }}>
        {hint}
      </div>
    </div>
  );
}


