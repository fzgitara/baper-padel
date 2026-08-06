import type { Match, Player, FixedTeam } from './types';

export interface LeaderboardEntry {
  player: Player;
  wins: number;
  losses: number;
  matchesPlayed: number;
  totalPoints: number;
  pointDiff: number;
}

export interface TeamLeaderboardEntry {
  team: FixedTeam;
  members: Player[];
  wins: number;
  losses: number;
  matchesPlayed: number;
  totalPoints: number;
  pointDiff: number;
}

export function calculateLeaderboard(
  players: Player[],
  matches: Match[],
  sortBy: 'wins' | 'points' | 'diff' = 'wins'
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
      if (b.pointDiff !== a.pointDiff) return b.pointDiff - a.pointDiff;
      return b.totalPoints - a.totalPoints;
    } else if (sortBy === 'points') {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.pointDiff - a.pointDiff;
    } else {
      if (b.pointDiff !== a.pointDiff) return b.pointDiff - a.pointDiff;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.totalPoints - a.totalPoints;
    }
  });

  return entries;
}

/**
 * Computes a team-based leaderboard for fixed-partner tournaments.
 * Stats are aggregated across each team's two players; since partners always
 * play (and win/lose) together, a single representative player's match stats
 * equal the team's stats.
 */
export function calculateTeamLeaderboard(
  teams: FixedTeam[],
  players: Player[],
  matches: Match[],
  sortBy: 'wins' | 'points' | 'diff' = 'wins'
): TeamLeaderboardEntry[] {
  const memberOf: Record<string, FixedTeam | undefined> = {};
  teams.forEach(t => t.playerIds.forEach(pid => (memberOf[pid] = t)));

  // Aggregate individual stats first (reuse core logic).
  const individual = calculateLeaderboard(players, matches, sortBy);
  const byPlayer: Record<string, LeaderboardEntry> = {};
  individual.forEach(e => (byPlayer[e.player.id] = e));

  const entries: TeamLeaderboardEntry[] = teams
    .filter(t => t.playerIds.length === 2)
    .map(t => {
      const members = t.playerIds
        .map(pid => players.find(p => p.id === pid))
        .filter((p): p is Player => Boolean(p));

      let wins = 0;
      let losses = 0;
      let matchesPlayed = 0;
      let totalPoints = 0;
      let pointDiff = 0;

      // Use the first player's stats (partners share the same match record).
      const rep = members[0] ? byPlayer[members[0].id] : undefined;
      if (rep) {
        wins = rep.wins;
        losses = rep.losses;
        matchesPlayed = rep.matchesPlayed;
        totalPoints = rep.totalPoints;
        pointDiff = rep.pointDiff;
      }

      return { team: t, members, wins, losses, matchesPlayed, totalPoints, pointDiff };
    });

  entries.sort((a, b) => {
    if (sortBy === 'wins') {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.pointDiff !== a.pointDiff) return b.pointDiff - a.pointDiff;
      return b.totalPoints - a.totalPoints;
    } else if (sortBy === 'points') {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.pointDiff - a.pointDiff;
    } else {
      if (b.pointDiff !== a.pointDiff) return b.pointDiff - a.pointDiff;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.totalPoints - a.totalPoints;
    }
  });

  return entries;
}

