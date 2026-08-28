import { useTournamentStore } from '../store/tournamentStore';
import { Play, RotateCcw, Activity, CheckCircle } from 'lucide-react';
import {
  card,
  btnPrimary,
  btnDanger,
  statTile,
  statValue,
  statValueAccent,
  statLabel,
  badgeBase,
  badgeActive,
  badgePending,
  badgeMeta,
} from '../lib/ui';

export function Dashboard() {
  const { tournaments, activeTournamentId, startTournament, resetTournament, updateTotalCourts, finishTournament } = useTournamentStore();
  const activeTournament = tournaments.find(t => t.id === activeTournamentId);

  if (!activeTournament) return null;

  const { status, players, matches, totalCourts, format, pointsMode, partnerMode, teams } = activeTournament;
  const activePlayers = players.filter(p => p.active).length;
  const totalMatches = matches.length;
  const completedMatches = matches.filter(m => m.status === 'completed').length;
  const readyTeams = (teams || []).filter(t => t.playerIds.length === 2).length;
  const canStart = partnerMode === 'fixed' ? readyTeams >= 2 : activePlayers >= 4;

  return (
    <div className={`${card} flex flex-col gap-6 p-6`}>
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
          <Activity size={20} className="text-emerald-600" />
          Tournament Status
        </h2>
        <ConnectionDot />
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className={`${badgeBase} ${badgeMeta} capitalize`}>{format}</span>
        <span className={`${badgeBase} ${badgeMeta} capitalize`}>
          {(partnerMode || 'rotating') === 'fixed' ? 'Fixed' : 'Rotating'}
        </span>
        <span className={`${badgeBase} ${status === 'active' ? badgeActive : badgePending}`}>
          {status}
        </span>
      </div>

      {/* ── Stat Tiles ── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Players / Teams */}
        <div className={statTile}>
          <div className={statValueAccent}>
            {partnerMode === 'fixed' ? readyTeams : activePlayers}
          </div>
          <div className={statLabel}>{partnerMode === 'fixed' ? 'Ready Teams' : 'Players'}</div>
        </div>

        {/* Courts (editable) */}
        <div className={`${statTile} flex flex-col items-center`}>
          <input
            type="number"
            value={totalCourts}
            onChange={(e) => updateTotalCourts(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-14 border-b-2 border-slate-300 bg-transparent text-center text-3xl font-bold text-slate-900 outline-none transition-colors focus:border-emerald-500 dark:border-slate-700 dark:text-slate-100"
            min="1"
            title="Edit total courts"
            aria-label="Total courts"
          />
          <div className={statLabel}>Courts</div>
        </div>

        {/* Matches */}
        <div className={statTile}>
          <div className={statValue}>
            {completedMatches}
            <span className="text-base font-normal text-slate-400 dark:text-slate-500">/{totalMatches}</span>
          </div>
          <div className={statLabel}>Matches</div>
        </div>

        {/* Points mode */}
        <div className={statTile}>
          <div className={`${statValue} text-xl`}>
            {pointsMode === 'default' ? 'Default' : '21'}
          </div>
          <div className={statLabel}>Points</div>
        </div>
      </div>

      {/* ── Action Buttons ── */}
      <div className="mt-1 flex gap-3">
        {status === 'setup' && (
          <button
            id="start-tournament-btn"
            className={`${btnPrimary} w-full`}
            onClick={startTournament}
            disabled={!canStart}
          >
            <Play size={18} />
            {partnerMode === 'fixed'
              ? (readyTeams >= 2 ? 'Start Tournament' : `Need ${2 - readyTeams} more ready team${2 - readyTeams !== 1 ? 's' : ''}`)
              : (activePlayers < 4 ? `Need ${4 - activePlayers} more player${4 - activePlayers !== 1 ? 's' : ''}` : 'Start Tournament')}
          </button>
        )}

        {status === 'active' && (
          <button
            id="finish-tournament-btn"
            className={`${btnPrimary} flex-1`}
            onClick={() => {
              if (window.confirm('Finish the tournament? No more matches can be generated.')) {
                finishTournament();
              }
            }}
          >
            <CheckCircle size={18} />
            Finish
          </button>
        )}

        {status !== 'setup' && (
          <button
            id="reset-tournament-btn"
            className={btnDanger}
            style={{ flex: status === 'active' ? '0 0 auto' : 1 }}
            onClick={() => {
              if (window.confirm('Reset the tournament? This cannot be undone.')) {
                resetTournament();
              }
            }}
          >
            <RotateCcw size={16} />
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

const STATUS_CONFIG = {
  connected: { color: '#22c55e', glow: 'rgba(34, 197, 94, 0.5)', label: 'Live' },
  connecting: { color: '#eab308', glow: 'rgba(234, 179, 8, 0.5)', label: 'Connecting...' },
  error: { color: '#ef4444', glow: 'rgba(239, 68, 68, 0.5)', label: 'Connection error' },
  disconnected: { color: '#6b7280', glow: 'rgba(107, 114, 128, 0.4)', label: 'Offline' },
} as const;

export function ConnectionDot() {
  const connectionStatus = useTournamentStore((s) => s.connectionStatus);
  const config = STATUS_CONFIG[connectionStatus] || STATUS_CONFIG.disconnected;

  return (
    <div className="flex items-center gap-2">
      <span
        title={config.label}
        className={`inline-block h-2 w-2 rounded-full ${
          connectionStatus === 'connecting' ? 'animate-pulse' : ''
        }`}
        style={{
          background: config.color,
          boxShadow: `0 0 6px 1px ${config.glow}`,
        }}
      />
      <span className="text-xs" style={{ color: config.color }}>{config.label}</span>
    </div>
  );
}
