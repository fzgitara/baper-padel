import type { Match, Player } from './types';

export interface LeaderboardEntry {
  player: Player;
  wins: number;
  losses: number;
  matchesPlayed: number;
  totalPoints: number;
  pointDiff: number;
}

export function calculateLeaderboard(
  players: Player[],
  matches: Match[],
  sortBy: 'wins' | 'points' = 'wins'
): LeaderboardEntry[] {
  const stats: Record<string, LeaderboardEntry> = {};

  players.forEach(p => {
    stats[p.id] = {
      player: p,
      wins: 0,
      losses: 0,
      matchesPlayed: 0,
      totalPoints: 0,
      pointDiff: 0
    };
  });

  const completedMatches = matches.filter(m => m.status === 'completed' && m.score1 !== null && m.score2 !== null);

  completedMatches.forEach(m => {
    const s1 = m.score1!;
    const s2 = m.score2!;

    m.team1.forEach(pId => {
      if (!stats[pId]) return;
      stats[pId].matchesPlayed++;
      stats[pId].totalPoints += s1;
      stats[pId].pointDiff += (s1 - s2);
      if (s1 > s2) stats[pId].wins++;
      else if (s1 < s2) stats[pId].losses++;
    });

    m.team2.forEach(pId => {
      if (!stats[pId]) return;
      stats[pId].matchesPlayed++;
      stats[pId].totalPoints += s2;
      stats[pId].pointDiff += (s2 - s1);
      if (s2 > s1) stats[pId].wins++;
      else if (s2 < s1) stats[pId].losses++;
    });
  });

  const entries = Object.values(stats);

  entries.sort((a, b) => {
    if (sortBy === 'wins') {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      return b.pointDiff - a.pointDiff;
    } else {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.pointDiff - a.pointDiff;
    }
  });

  return entries;
}
