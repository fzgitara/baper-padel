import { v4 as uuidv4 } from 'uuid';
import type { Match, Player } from './types';
import { calculateLeaderboard } from './leaderboard';

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const getPairKey = (id1: string, id2: string) => [id1, id2].sort().join('-');

function buildHistoryMaps(
  matches: Match[],
  activeIds: Set<string>
): {
  partnerships: Record<string, number>;
  opponents: Record<string, number>;
} {
  const partnerships: Record<string, number> = {};
  const opponents: Record<string, number> = {};

  matches.forEach(m => {
    const [p1, p2] = m.team1;
    const [p3, p4] = m.team2;

    if (activeIds.has(p1) && activeIds.has(p2)) {
      const k = getPairKey(p1, p2);
      partnerships[k] = (partnerships[k] || 0) + 1;
    }
    if (activeIds.has(p3) && activeIds.has(p4)) {
      const k = getPairKey(p3, p4);
      partnerships[k] = (partnerships[k] || 0) + 1;
    }

    m.team1.forEach(t1Id => {
      m.team2.forEach(t2Id => {
        if (activeIds.has(t1Id) && activeIds.has(t2Id)) {
          const k = getPairKey(t1Id, t2Id);
          opponents[k] = (opponents[k] || 0) + 1;
        }
      });
    });
  });

  return { partnerships, opponents };
}

function getMexicanoPairing(
  p1: Player,
  p2: Player,
  p3: Player,
  p4: Player,
  partnerships: Record<string, number>,
  opponents: Record<string, number>
): { team1: [string, string]; team2: [string, string] } {
  // Option 1: p1 & p2 vs p3 & p4
  const cost1 =
    (partnerships[getPairKey(p1.id, p2.id)] || 0) * 2 +
    (partnerships[getPairKey(p3.id, p4.id)] || 0) * 2 +
    (opponents[getPairKey(p1.id, p3.id)] || 0) +
    (opponents[getPairKey(p1.id, p4.id)] || 0) +
    (opponents[getPairKey(p2.id, p3.id)] || 0) +
    (opponents[getPairKey(p2.id, p4.id)] || 0) +
    0.2; // Non-canonical: slight bias away

  // Option 2: p1 & p3 vs p2 & p4  ← canonical Mexicano pattern (rank 1+3 vs 2+4)
  const cost2 =
    (partnerships[getPairKey(p1.id, p3.id)] || 0) * 2 +
    (partnerships[getPairKey(p2.id, p4.id)] || 0) * 2 +
    (opponents[getPairKey(p1.id, p2.id)] || 0) +
    (opponents[getPairKey(p1.id, p4.id)] || 0) +
    (opponents[getPairKey(p3.id, p2.id)] || 0) +
    (opponents[getPairKey(p3.id, p4.id)] || 0) +
    0.0; // Canonical: preferred by default

  // Option 3: p1 & p4 vs p2 & p3
  const cost3 =
    (partnerships[getPairKey(p1.id, p4.id)] || 0) * 2 +
    (partnerships[getPairKey(p2.id, p3.id)] || 0) * 2 +
    (opponents[getPairKey(p1.id, p2.id)] || 0) +
    (opponents[getPairKey(p1.id, p3.id)] || 0) +
    (opponents[getPairKey(p4.id, p2.id)] || 0) +
    (opponents[getPairKey(p4.id, p3.id)] || 0) +
    0.1;

  const options = [
    { team1: [p1, p2] as [Player, Player], team2: [p3, p4] as [Player, Player], cost: cost1 },
    { team1: [p1, p3] as [Player, Player], team2: [p2, p4] as [Player, Player], cost: cost2 },
    { team1: [p1, p4] as [Player, Player], team2: [p2, p3] as [Player, Player], cost: cost3 },
  ];

  const minCost = Math.min(...options.map(o => o.cost));
  const tied = options.filter(o => Math.abs(o.cost - minCost) <= 0.01);

  const best = tied.length === 1
    ? tied[0]
    : tied[Math.floor(Math.random() * tied.length)];

  return {
    team1: [best.team1[0].id, best.team1[1].id],
    team2: [best.team2[0].id, best.team2[1].id],
  };
}

export function generateRounds(
  players: Player[],
  existingMatches: Match[],
  tournamentId: string,
  totalCourts: number,
  format: 'americano' | 'mexicano'
): Match[] {
  const completedMatches = existingMatches.filter(m => m.status === 'completed');
  const activePlayers = players.filter(p => p.active);

  if (activePlayers.length < 4) {
    return completedMatches;
  }

  const N = activePlayers.length;
  const targetPartnershipsCount = (N * (N - 1)) / 2;

  let currentMatches = [...completedMatches];
  const activeIds = new Set(activePlayers.map(p => p.id));

  const getActivePartnershipsCount = (matchesList: Match[]) => {
    const covered = new Set<string>();
    matchesList.forEach(m => {
      const [p1, p2] = m.team1;
      const [p3, p4] = m.team2;
      if (activeIds.has(p1) && activeIds.has(p2)) covered.add(getPairKey(p1, p2));
      if (activeIds.has(p3) && activeIds.has(p4)) covered.add(getPairKey(p3, p4));
    });
    return covered.size;
  };

  const maxRounds = Math.max(50, N * 4);
  const matchesPerRound = format === 'mexicano'
    ? Math.floor(N / 4)
    : Math.min(totalCourts, Math.floor(N / 4));

  if (matchesPerRound < 1) {
    return completedMatches;
  }

  const startRound =
    completedMatches.length > 0
      ? Math.max(...completedMatches.map(m => m.round)) + 1
      : 1;

  const endRound = format === 'mexicano' ? startRound : startRound + maxRounds;

  for (let r = startRound; r <= endRound; r++) {
    if (format !== 'mexicano') {
      if (getActivePartnershipsCount(currentMatches) >= targetPartnershipsCount) break;
    }

    const { partnerships, opponents } = buildHistoryMaps(currentMatches, activeIds);

    const playedCounts: Record<string, number> = {};
    activePlayers.forEach(p => (playedCounts[p.id] = 0));
    currentMatches.forEach(m => {
      [...m.team1, ...m.team2].forEach(pId => {
        if (playedCounts[pId] !== undefined) playedCounts[pId]++;
      });
    });

    let playersToPair: Player[];

    if (format === 'mexicano') {
      const leaderboard = calculateLeaderboard(activePlayers, currentMatches);
      const rankMap: Record<string, number> = {};
      leaderboard.forEach((entry, idx) => {
        rankMap[entry.player.id] = idx;
      });

      // Prioritize players with fewer matches played; use leaderboard rank as tiebreaker
      playersToPair = shuffle(activePlayers).sort((a, b) => {
        const playedDiff = playedCounts[a.id] - playedCounts[b.id];
        if (playedDiff !== 0) return playedDiff;
        return (rankMap[a.id] ?? 0) - (rankMap[b.id] ?? 0);
      });
    } else {
      // Americano: prioritize players who have played fewer matches
      const shuffled = shuffle(activePlayers);
      playersToPair = shuffled.sort((a, b) => playedCounts[a.id] - playedCounts[b.id]);
    }

    const numToPlay = matchesPerRound * 4;
    let available = playersToPair.slice(0, numToPlay);
    const roundMatches: Match[] = [];

    while (available.length >= 4) {
      if (format === 'mexicano') {
        const p1 = available.shift()!;
        const p2 = available.shift()!;
        const p3 = available.shift()!;
        const p4 = available.shift()!;

        const pairing = getMexicanoPairing(p1, p2, p3, p4, partnerships, opponents);

        roundMatches.push({
          id: uuidv4(),
          tournament_id: tournamentId,
          round: r,
          team1: pairing.team1,
          team2: pairing.team2,
          score1: null,
          score2: null,
          status: 'pending',
        });
      } else {
        const p1 = available.shift()!;

        available.sort(
          (a, b) =>
            (partnerships[getPairKey(p1.id, a.id)] || 0) -
            (partnerships[getPairKey(p1.id, b.id)] || 0)
        );
        const p2 = available.shift()!;

        const p3 = available.shift()!;

        available.sort(
          (a, b) =>
            (partnerships[getPairKey(p3.id, a.id)] || 0) -
            (partnerships[getPairKey(p3.id, b.id)] || 0)
        );
        const p4 = available.shift()!;

        roundMatches.push({
          id: uuidv4(),
          tournament_id: tournamentId,
          round: r,
          team1: [p1.id, p2.id],
          team2: [p3.id, p4.id],
          score1: null,
          score2: null,
          status: 'pending',
        });
      }
    }

    if (roundMatches.length === 0) break;

    currentMatches.push(...roundMatches);
  }

  return currentMatches;
}

export function generateSingleMatch(
  players: Player[],
  existingMatches: Match[],
  tournamentId: string,
  format: 'americano' | 'mexicano'
): Match | null {
  const activePlayers = players.filter(p => p.active);
  if (activePlayers.length < 4) return null;

  const activeIds = new Set(activePlayers.map(p => p.id));

  const completedMatches = existingMatches.filter(m => m.status === 'completed');

  const completedCounts: Record<string, number> = {};
  const totalCounts: Record<string, number> = {};
  activePlayers.forEach(p => {
    completedCounts[p.id] = 0;
    totalCounts[p.id] = 0;
  });

  existingMatches.forEach(m => {
    [...m.team1, ...m.team2].forEach(pId => {
      if (totalCounts[pId] !== undefined) {
        totalCounts[pId]++;
        if (m.status === 'completed') completedCounts[pId]++;
      }
    });
  });

  const { partnerships, opponents } = buildHistoryMaps(existingMatches, activeIds);

  const roundNum =
    completedMatches.length > 0
      ? Math.max(...completedMatches.map(m => m.round)) + 1
      : 1;

  if (format === 'mexicano') {
    const leaderboard = calculateLeaderboard(activePlayers, completedMatches);
    const rankMap: Record<string, number> = {};
    leaderboard.forEach((entry, idx) => {
      rankMap[entry.player.id] = idx;
    });

    const playersToPair = shuffle(activePlayers)
      .sort((a, b) => (rankMap[a.id] ?? 0) - (rankMap[b.id] ?? 0))
      .slice(0, 4);

    const [p1, p2, p3, p4] = playersToPair;
    const pairing = getMexicanoPairing(p1, p2, p3, p4, partnerships, opponents);

    return {
      id: uuidv4(),
      tournament_id: tournamentId,
      round: roundNum,
      team1: pairing.team1,
      team2: pairing.team2,
      score1: null,
      score2: null,
      status: 'pending',
    };
  } else {
    const shuffled = shuffle(activePlayers);
    const sortedPlayers = shuffled.sort((a, b) => {
      if (completedCounts[a.id] !== completedCounts[b.id])
        return completedCounts[a.id] - completedCounts[b.id];
      return totalCounts[a.id] - totalCounts[b.id];
    });

    let available = sortedPlayers.slice(0, 4);

    const p1 = available.shift()!;
    available.sort(
      (a, b) =>
        (partnerships[getPairKey(p1.id, a.id)] || 0) -
        (partnerships[getPairKey(p1.id, b.id)] || 0)
    );
    const p2 = available.shift()!;

    const p3 = available.shift()!;
    available.sort(
      (a, b) =>
        (partnerships[getPairKey(p3.id, a.id)] || 0) -
        (partnerships[getPairKey(p3.id, b.id)] || 0)
    );
    const p4 = available.shift()!;

    return {
      id: uuidv4(),
      tournament_id: tournamentId,
      round: roundNum,
      team1: [p1.id, p2.id],
      team2: [p3.id, p4.id],
      score1: null,
      score2: null,
      status: 'pending',
    };
  }
}