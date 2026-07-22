import { useState } from 'react';
import { useTournamentStore } from '../store/tournamentStore';
import { calculateLeaderboard } from '../lib/leaderboard';
import { Trophy, ArrowUpDown } from 'lucide-react';

const SORT_LABELS: Record<string, string> = {
  wins: 'Wins',
  points: 'Points',
  diff: 'Diff',
};

const SORT_ORDER: Array<'wins' | 'points' | 'diff'> = ['wins', 'points', 'diff'];

export function Leaderboard() {
  const [sortBy, setSortBy] = useState<'wins' | 'points' | 'diff'>('wins');
  const { tournaments, activeTournamentId } = useTournamentStore();
  const activeTournament = tournaments.find(t => t.id === activeTournamentId);

  if (!activeTournament) return null;
  const { players, matches } = activeTournament;

  const leaderboard = calculateLeaderboard(players, matches, sortBy);

  const cycleSortBy = () => {
    setSortBy(prev => {
      const idx = SORT_ORDER.indexOf(prev);
      return SORT_ORDER[(idx + 1) % SORT_ORDER.length];
    });
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

        <button
          id="leaderboard-sort-btn"
          className="btn btn-outline"
          onClick={cycleSortBy}
          title="Toggle sorting"
          aria-label={`Currently sorted by ${SORT_LABELS[sortBy]}. Click to change.`}
          style={{ fontSize: 'var(--font-size-sm)' }}
        >
          <ArrowUpDown size={14} />
          Sort: {SORT_LABELS[sortBy]}
        </button>
      </div>

      {/* ── Table ── */}
      <div className="table-wrapper">
        <table style={{ fontSize: 'var(--font-size-xs)' }}>
          <thead>
            <tr>
              <th style={{ width: '28px', textAlign: 'center', padding: '6px 4px' }}>#</th>
              <th style={{ padding: '6px 8px' }}>Player</th>
              <th style={{ textAlign: 'center', width: '36px', padding: '6px 4px' }}>W</th>
              <th style={{ textAlign: 'center', width: '36px', padding: '6px 4px' }}>L</th>
              <th style={{ textAlign: 'center', width: '36px', padding: '6px 4px' }}>GP</th>
              <th style={{ textAlign: 'center', width: '44px', padding: '6px 4px' }}>Pts</th>
              <th style={{ textAlign: 'center', width: '44px', padding: '6px 4px' }}>Diff</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((entry, idx) => {
              const isTop3 = idx < 3;
              const medalColors = ['#f59e0b', '#94a3b8', '#c2845a'];
              return (
                <tr key={entry.player.id} style={isTop3 ? { background: 'rgba(16,185,129,0.04)' } : {}}>
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
                    <span style={{ fontWeight: isTop3 ? 600 : 400 }}>{entry.player.name}</span>
                  </td>
                  <td style={{ textAlign: 'center', color: 'var(--accent-primary)', fontWeight: 600, padding: '6px 4px' }}>{entry.wins}</td>
                  <td style={{ textAlign: 'center', color: 'var(--danger)', padding: '6px 4px' }}>{entry.losses}</td>
                  <td style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '6px 4px' }}>{entry.matchesPlayed}</td>
                  <td style={{ textAlign: 'center', fontWeight: 600, padding: '6px 4px' }}>{entry.totalPoints}</td>
                  <td style={{
                    textAlign: 'center',
                    fontWeight: 600,
                    padding: '6px 4px',
                    color: entry.pointDiff > 0 ? 'var(--accent-primary)' : entry.pointDiff < 0 ? 'var(--danger)' : 'var(--text-muted)',
                  }}>
                    {entry.pointDiff > 0 ? '+' : ''}{entry.pointDiff}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Tiebreaker footnote ── */}
      <div style={{ marginTop: 'var(--space-4)', fontSize: 'var(--font-size-xs)', color: 'var(--text-subtle)' }}>
        Tie-breaker: {sortBy === 'wins' ? 'Wins → Diff → Pts' : sortBy === 'points' ? 'Pts → Wins → Diff' : 'Diff → Wins → Pts'}
      </div>
    </div>
  );
}
