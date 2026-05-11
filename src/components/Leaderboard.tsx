import { useState } from 'react';
import { useTournamentStore } from '../store/tournamentStore';
import { calculateLeaderboard } from '../lib/leaderboard';
import { Trophy, ArrowUpDown } from 'lucide-react';

export function Leaderboard() {
  const [sortBy, setSortBy] = useState<'wins' | 'points'>('wins');
  const { tournaments, activeTournamentId } = useTournamentStore();
  const activeTournament = tournaments.find(t => t.id === activeTournamentId);

  if (!activeTournament) return null;
  const { players, matches } = activeTournament;

  const leaderboard = calculateLeaderboard(players, matches, sortBy);

  if (leaderboard.length === 0) {
    return (
      <div className="glass-card flex flex-col items-center justify-center gap-4" style={{ padding: '40px 20px' }}>
        <Trophy size={48} className="text-muted" style={{ opacity: 0.2 }} />
        <p style={{ color: 'var(--text-muted)' }}>No match data available yet.</p>
      </div>
    );
  }

  return (
    <div className="glass-card">
      <div className="flex justify-between items-center" style={{ marginBottom: '24px' }}>
        <h2 className="flex items-center gap-2 text-gradient">
          <Trophy size={24} />
          Leaderboard
        </h2>
        
        <button 
          className="btn btn-outline" 
          onClick={() => setSortBy(prev => prev === 'wins' ? 'points' : 'wins')}
          title="Toggle Sorting"
        >
          <ArrowUpDown size={16} />
          Sorted by: {sortBy === 'wins' ? 'Wins' : 'Total Points'}
        </button>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th style={{ width: '50px', textAlign: 'center' }}>#</th>
              <th>Player</th>
              <th style={{ textAlign: 'center' }}>Wins</th>
              <th style={{ textAlign: 'center' }}>Losses</th>
              <th style={{ textAlign: 'center', display: 'none' }} className="md:table-cell">Played</th>
              <th style={{ textAlign: 'center' }}>Points</th>
              <th style={{ textAlign: 'center' }}>Diff</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((entry, idx) => (
              <tr key={entry.player.id} style={{ opacity: entry.player.active ? 1 : 0.5 }}>
                <td style={{ textAlign: 'center', fontWeight: 600 }}>{idx + 1}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <span style={{ fontWeight: 500 }}>{entry.player.name}</span>
                    {!entry.player.active && <span className="badge badge-pending" style={{ fontSize: '0.6rem' }}>Removed</span>}
                  </div>
                </td>
                <td style={{ textAlign: 'center', color: 'var(--accent-primary)', fontWeight: 600 }}>{entry.wins}</td>
                <td style={{ textAlign: 'center', color: 'var(--danger)' }}>{entry.losses}</td>
                <td style={{ textAlign: 'center', display: 'none', color: 'var(--text-muted)' }} className="md:table-cell">{entry.matchesPlayed}</td>
                <td style={{ textAlign: 'center', fontWeight: 600 }}>{entry.totalPoints}</td>
                <td style={{ textAlign: 'center', color: entry.pointDiff > 0 ? 'var(--accent-primary)' : entry.pointDiff < 0 ? 'var(--danger)' : 'inherit' }}>
                  {entry.pointDiff > 0 ? '+' : ''}{entry.pointDiff}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div style={{ marginTop: '16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        Tie-breakers applied: {sortBy === 'wins' ? 'Wins > Points > Diff' : 'Points > Wins > Diff'}
      </div>
    </div>
  );
}
