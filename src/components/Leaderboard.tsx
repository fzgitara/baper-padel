import { useState } from 'react';
import { useTournamentStore } from '../store/tournamentStore';
import { calculateLeaderboard, calculateTeamLeaderboard } from '../lib/leaderboard';
import { Trophy, ArrowUpDown, Trash2, Download } from 'lucide-react';
import type { Player, FixedTeam } from '../lib/types';
import { ConfirmModal } from './ConfirmModal';
import { exportLeaderboardPNG } from '../lib/exportLeaderboardCanvas';
import { card, muted, btnPrimary, btnOutline, btnIconDanger } from '../lib/ui';

const SORT_LABELS: Record<string, string> = {
  wins: 'Wins',
  points: 'Points',
  diff: 'Diff',
};

const SORT_ORDER: Array<'wins' | 'points' | 'diff'> = ['wins', 'points', 'diff'];

const thCls =
  'px-2 py-1.5 text-center text-[0.7rem] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400';
const tdCenterCls = 'px-2 py-1.5 text-center';
const winCls = 'font-semibold text-emerald-600 dark:text-emerald-400';
const lossCls = 'text-red-500 dark:text-red-400';
const mutedNumCls = 'text-slate-500 dark:text-slate-400';

export function Leaderboard() {
  const [sortBy, setSortBy] = useState<'wins' | 'points' | 'diff'>('wins');
  const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);
  const [teamToDelete, setTeamToDelete] = useState<FixedTeam | null>(null);
  const { tournaments, activeTournamentId, deletePlayerCompletely, removeTeam } = useTournamentStore();
  const activeTournament = tournaments.find(t => t.id === activeTournamentId);

  if (!activeTournament) return null;
  const { players, matches, partnerMode, teams } = activeTournament;

  const isFixed = partnerMode === 'fixed';
  const leaderboard = isFixed
    ? calculateTeamLeaderboard(teams || [], players, matches, sortBy)
    : calculateLeaderboard(players, matches, sortBy);

  const teamLeaderboard = isFixed ? (leaderboard as ReturnType<typeof calculateTeamLeaderboard>) : null;

  const cycleSortBy = () => {
    setSortBy(prev => {
      const idx = SORT_ORDER.indexOf(prev);
      return SORT_ORDER[(idx + 1) % SORT_ORDER.length];
    });
  };

  const handleConfirmDelete = () => {
    if (playerToDelete) {
      deletePlayerCompletely(playerToDelete.id);
      setPlayerToDelete(null);
    }
    if (teamToDelete) {
      removeTeam(teamToDelete.id);
      setTeamToDelete(null);
    }
  };

  const handleExportPNG = () => {
    if (activeTournament && leaderboard.length > 0) {
      exportLeaderboardPNG(activeTournament, undefined, teamLeaderboard || undefined);
    }
  };

  if (leaderboard.length === 0) {
    return (
      <div className={`${card} flex flex-col items-center justify-center gap-3 px-6 py-14 text-center`}>
        <Trophy size={48} className="text-slate-300 dark:text-slate-700" />
        <p className={muted}>No match data available yet.</p>
      </div>
    );
  }

  return (
    <div className={card}>
      {/* ── Header ── */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
          <Trophy size={20} className="text-emerald-600" />
          Leaderboard
        </h2>

        <div className="flex items-center gap-2">
          <button
            id="export-leaderboard-btn"
            className={btnPrimary}
            onClick={handleExportPNG}
            title="Download PNG with transparent background"
            aria-label="Export full leaderboard as transparent PNG image"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Export PNG</span>
          </button>

          <button
            id="leaderboard-sort-btn"
            className={btnOutline}
            onClick={cycleSortBy}
            title="Toggle sorting"
            aria-label={`Currently sorted by ${SORT_LABELS[sortBy]}. Click to change.`}
          >
            <ArrowUpDown size={14} />
            Sort: {SORT_LABELS[sortBy]}
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className={`${thCls} w-7`}>#</th>
              <th className={`${thCls} px-2 py-1.5 text-left`}>{isFixed ? 'Team' : 'Player'}</th>
              <th className={`${thCls} w-9`}>W</th>
              <th className={`${thCls} w-9`}>L</th>
              <th className={`${thCls} w-10`}>GP</th>
              <th className={`${thCls} w-12`}>Diff</th>
              <th className={`${thCls} w-12`}>Pts</th>
              <th className={`${thCls} w-12`}>Act</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((entry, idx) => {
              const isTop3 = idx < 3;
              const medalColors = ['#f59e0b', '#94a3b8', '#c2845a'];
              if (isFixed && teamLeaderboard) {
                const te = teamLeaderboard[idx] as { team: FixedTeam; members: Player[]; wins: number; losses: number; matchesPlayed: number; totalPoints: number; pointDiff: number };
                return (
                  <tr
                    key={te.team.id}
                    className={`border-t border-slate-100 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50 ${
                      isTop3 ? 'bg-emerald-50/40 dark:bg-emerald-500/5' : ''
                    }`}
                  >
                    <td className={`${tdCenterCls} font-bold`}>
                      {isTop3 ? (
                        <span style={{ color: medalColors[idx] }}>
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                        </span>
                      ) : (
                        <span className={mutedNumCls}>{idx + 1}</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      <div className={isTop3 ? 'font-semibold text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-200'}>
                        {te.team.name}
                      </div>
                      {te.members.length > 0 && (
                        <div className={`${mutedNumCls} text-[0.7rem] leading-tight`}>
                          {te.members.map(m => m.name).join(' & ')}
                        </div>
                      )}
                    </td>
                    <td className={`${tdCenterCls} ${winCls}`}>{te.wins}</td>
                    <td className={`${tdCenterCls} ${lossCls}`}>{te.losses}</td>
                    <td className={`${tdCenterCls} ${mutedNumCls}`}>{te.matchesPlayed}</td>
                    <td
                      className={`${tdCenterCls} font-semibold ${
                        te.pointDiff > 0 ? winCls : te.pointDiff < 0 ? lossCls : mutedNumCls
                      }`}
                    >
                      {te.pointDiff > 0 ? '+' : ''}{te.pointDiff}
                    </td>
                    <td className={`${tdCenterCls} font-semibold`}>{te.totalPoints}</td>
                    <td className={tdCenterCls}>
                      <button
                        id={`delete-team-${te.team.id}`}
                        className={btnIconDanger}
                        title={`Remove ${te.team.name}`}
                        onClick={() => setTeamToDelete(te.team)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              }
              const pe = entry as { player: Player; wins: number; losses: number; matchesPlayed: number; totalPoints: number; pointDiff: number };
              return (
                <tr
                  key={pe.player.id}
                  className={`border-t border-slate-100 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50 ${
                    isTop3 ? 'bg-emerald-50/40 dark:bg-emerald-500/5' : ''
                  }`}
                >
                  <td className={`${tdCenterCls} font-bold`}>
                    {isTop3 ? (
                      <span style={{ color: medalColors[idx] }}>
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                      </span>
                    ) : (
                      <span className={mutedNumCls}>{idx + 1}</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    <span className={isTop3 ? 'font-semibold text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-200'}>
                      {pe.player.name}
                    </span>
                  </td>
                  <td className={`${tdCenterCls} ${winCls}`}>{pe.wins}</td>
                  <td className={`${tdCenterCls} ${lossCls}`}>{pe.losses}</td>
                  <td className={`${tdCenterCls} ${mutedNumCls}`}>{pe.matchesPlayed}</td>
                  <td
                    className={`${tdCenterCls} font-semibold ${
                      pe.pointDiff > 0 ? winCls : pe.pointDiff < 0 ? lossCls : mutedNumCls
                    }`}
                  >
                    {pe.pointDiff > 0 ? '+' : ''}{pe.pointDiff}
                  </td>
                  <td className={`${tdCenterCls} font-semibold`}>{pe.totalPoints}</td>
                  <td className={tdCenterCls}>
                    <button
                      id={`delete-participant-${pe.player.id}`}
                      className={btnIconDanger}
                      title={`Remove ${pe.player.name}`}
                      onClick={() => setPlayerToDelete(pe.player)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Confirmation Modal ── */}
      <ConfirmModal
        isOpen={!!playerToDelete || !!teamToDelete}
        title={teamToDelete ? 'Remove Team?' : 'Remove Participant?'}
        message={
          teamToDelete ? (
            <>
              Are you sure you want to remove <strong>{teamToDelete.name}</strong> from this tournament?
            </>
          ) : (
            <>
              Are you sure you want to remove <strong>{playerToDelete?.name}</strong> from this tournament?
            </>
          )
        }
        confirmText="Remove"
        onConfirm={handleConfirmDelete}
        onClose={() => {
          setPlayerToDelete(null);
          setTeamToDelete(null);
        }}
      />

      {/* ── Tiebreaker footnote ── */}
      <div className={`${muted} mt-4 text-xs`}>
        Tie-breaker: {sortBy === 'wins' ? 'Wins → Diff → Pts' : sortBy === 'points' ? 'Pts → Wins → Diff' : 'Diff → Wins → Pts'}
      </div>
    </div>
  );
}
