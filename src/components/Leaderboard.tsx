import { useState } from 'react';
import { useTournamentStore } from '../store/tournamentStore';
import { calculateLeaderboard, calculateTeamLeaderboard } from '../lib/leaderboard';
import { Trophy, ArrowUpDown, Trash2, Download } from 'lucide-react';
import type { Player, FixedTeam } from '../lib/types';
import { ConfirmModal } from './ConfirmModal';
import { exportLeaderboardPNG } from '../lib/exportLeaderboardCanvas';

const SORT_LABELS: Record<string, string> = {
  wins: 'Wins',
  points: 'Points',
  diff: 'Diff',
};

const SORT_ORDER: Array<'wins' | 'points' | 'diff'> = ['wins', 'points', 'diff'];

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
      <div className="glass-card empty-state">
        <Trophy size={48} className="empty-state-icon" />
        <p style={{ color: 'var(--text-muted)' }}>No match data available yet.</p>
      </div>
    );
  }

  return (
    <div className="glass-card">
      {/* ── Header ── */}
      <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <h2 className="flex items-center gap-2 text-gradient" style={{ fontSize: 'var(--font-size-xl)' }}>
          <Trophy size={20} />
          Leaderboard
        </h2>

        <div className="flex items-center gap-2">
          <button
            id="export-leaderboard-btn"
            className="btn btn-primary"
            onClick={handleExportPNG}
            title="Download PNG with transparent background"
            aria-label="Export full leaderboard as transparent PNG image"
            style={{ fontSize: 'var(--font-size-xs)', padding: '6px 12px', gap: '6px' }}
          >
            <Download size={14} />
            Export PNG
          </button>

          <button
            id="leaderboard-sort-btn"
            className="btn btn-outline"
            onClick={cycleSortBy}
            title="Toggle sorting"
            aria-label={`Currently sorted by ${SORT_LABELS[sortBy]}. Click to change.`}
            style={{ fontSize: 'var(--font-size-xs)', padding: '6px 12px', gap: '6px' }}
          >
            <ArrowUpDown size={14} />
            Sort: {SORT_LABELS[sortBy]}
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="table-wrapper">
        <table style={{ fontSize: 'var(--font-size-xs)' }}>
          <thead>
            <tr>
              <th style={{ width: '28px', textAlign: 'center', padding: '6px 4px' }}>#</th>
              <th style={{ padding: '6px 8px' }}>{isFixed ? 'Team' : 'Player'}</th>
              <th style={{ textAlign: 'center', width: '36px', padding: '6px 4px' }}>W</th>
              <th style={{ textAlign: 'center', width: '36px', padding: '6px 4px' }}>L</th>
              <th style={{ textAlign: 'center', width: '36px', padding: '6px 4px' }}>GP</th>
              <th style={{ textAlign: 'center', width: '44px', padding: '6px 4px' }}>Diff</th>
              <th style={{ textAlign: 'center', width: '44px', padding: '6px 4px' }}>Pts</th>
              <th style={{ textAlign: 'center', width: '44px', padding: '6px 4px' }}>Act</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((entry, idx) => {
              const isTop3 = idx < 3;
              const medalColors = ['#f59e0b', '#94a3b8', '#c2845a'];
              if (isFixed && teamLeaderboard) {
                const te = teamLeaderboard[idx] as { team: FixedTeam; members: Player[]; wins: number; losses: number; matchesPlayed: number; totalPoints: number; pointDiff: number };
                return (
                  <tr key={te.team.id} style={isTop3 ? { background: 'rgba(16,185,129,0.04)' } : {}}>
                    <td style={{ textAlign: 'center', fontWeight: 700, padding: '6px 4px' }}>
                      {isTop3 ? (
                        <span style={{ color: medalColors[idx] }}>
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>{idx + 1}</span>
                      )}
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      <div style={{ fontWeight: isTop3 ? 600 : 400 }}>{te.team.name}</div>
                      {te.members.length > 0 && (
                        <div style={{ fontSize: '0.7rem', lineHeight: 1.3, color: 'var(--text-muted)' }}>
                          {te.members.map(m => m.name).join(' & ')}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'center', color: 'var(--accent-primary)', fontWeight: 600, padding: '6px 4px' }}>{te.wins}</td>
                    <td style={{ textAlign: 'center', color: 'var(--danger)', padding: '6px 4px' }}>{te.losses}</td>
                    <td style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '6px 4px' }}>{te.matchesPlayed}</td>
                    <td style={{
                      textAlign: 'center',
                      fontWeight: 600,
                      padding: '6px 4px',
                      color: te.pointDiff > 0 ? 'var(--accent-primary)' : te.pointDiff < 0 ? 'var(--danger)' : 'var(--text-muted)',
                    }}>
                      {te.pointDiff > 0 ? '+' : ''}{te.pointDiff}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 600, padding: '6px 4px' }}>{te.totalPoints}</td>
                    <td style={{ textAlign: 'center', padding: '6px 4px' }}>
                      <button
                        id={`delete-team-${te.team.id}`}
                        className="btn btn-danger btn-icon"
                        style={{ padding: '4px', borderRadius: 'var(--radius-sm)', display: 'inline-flex' }}
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
                <tr key={pe.player.id} style={isTop3 ? { background: 'rgba(16,185,129,0.04)' } : {}}>
                  <td style={{ textAlign: 'center', fontWeight: 700, padding: '6px 4px' }}>
                    {isTop3 ? (
                      <span style={{ color: medalColors[idx] }}>
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>{idx + 1}</span>
                    )}
                  </td>
                  <td style={{ padding: '6px 8px' }}>
                    <span style={{ fontWeight: isTop3 ? 600 : 400 }}>{pe.player.name}</span>
                  </td>
                  <td style={{ textAlign: 'center', color: 'var(--accent-primary)', fontWeight: 600, padding: '6px 4px' }}>{pe.wins}</td>
                  <td style={{ textAlign: 'center', color: 'var(--danger)', padding: '6px 4px' }}>{pe.losses}</td>
                  <td style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '6px 4px' }}>{pe.matchesPlayed}</td>
                  <td style={{
                    textAlign: 'center',
                    fontWeight: 600,
                    padding: '6px 4px',
                    color: pe.pointDiff > 0 ? 'var(--accent-primary)' : pe.pointDiff < 0 ? 'var(--danger)' : 'var(--text-muted)',
                  }}>
                    {pe.pointDiff > 0 ? '+' : ''}{pe.pointDiff}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 600, padding: '6px 4px' }}>{pe.totalPoints}</td>
                  <td style={{ textAlign: 'center', padding: '6px 4px' }}>
                    <button
                      id={`delete-participant-${pe.player.id}`}
                      className="btn btn-danger btn-icon"
                      style={{ padding: '4px', borderRadius: 'var(--radius-sm)', display: 'inline-flex' }}
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
      <div style={{ marginTop: 'var(--space-4)', fontSize: 'var(--font-size-xs)', color: 'var(--text-subtle)' }}>
        Tie-breaker: {sortBy === 'wins' ? 'Wins → Diff → Pts' : sortBy === 'points' ? 'Pts → Wins → Diff' : 'Diff → Wins → Pts'}
      </div>
    </div>
  );
}

