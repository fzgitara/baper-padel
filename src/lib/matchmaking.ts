import { v4 as uuidv4 } from 'uuid';
import type { Match, Player, FixedTeam } from './types';
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

/**
 * For Americano format: given 4 players and the set of already-covered
 * partnership pairs, pick the pairing that maximises NEW (uncovered) pairs.
 * Ties are broken randomly.
 */
function getBestAmericanoPairing(
  p1: Player,
  p2: Player,
  p3: Player,
  p4: Player,
  coveredPairs: Set<string>
): { team1: [string, string]; team2: [string, string] } {
  const uncovered = (a: string, b: string) => (coveredPairs.has(getPairKey(a, b)) ? 0 : 1);

  const options = [
    // Option A: p1+p2 vs p3+p4
    {
      team1: [p1, p2] as [Player, Player],
      team2: [p3, p4] as [Player, Player],
      score: uncovered(p1.id, p2.id) + uncovered(p3.id, p4.id),
    },
    // Option B: p1+p3 vs p2+p4
    {
      team1: [p1, p3] as [Player, Player],
      team2: [p2, p4] as [Player, Player],
      score: uncovered(p1.id, p3.id) + uncovered(p2.id, p4.id),
    },
    // Option C: p1+p4 vs p2+p3
    {
      team1: [p1, p4] as [Player, Player],
      team2: [p2, p3] as [Player, Player],
      score: uncovered(p1.id, p4.id) + uncovered(p2.id, p3.id),
    },
  ];

  const maxScore = Math.max(...options.map(o => o.score));
  const tied = options.filter(o => o.score === maxScore);
  const best = tied[Math.floor(Math.random() * tied.length)];

  return {
    team1: [best.team1[0].id, best.team1[1].id],
    team2: [best.team2[0].id, best.team2[1].id],
  };
}

/**
 * Returns the maximum number of NEW (uncovered) partnership pairs that can
 * be produced by any of the 3 possible pairings of 4 players.
 */
function maxNewPairs(a: Player, b: Player, c: Player, d: Player, coveredPairs: Set<string>): number {
  const u = (x: string, y: string) => (coveredPairs.has(getPairKey(x, y)) ? 0 : 1);
  return Math.max(
    u(a.id, b.id) + u(c.id, d.id),
    u(a.id, c.id) + u(b.id, d.id),
    u(a.id, d.id) + u(b.id, c.id),
  );
}

/**
 * From a list of players (sorted by fewest matches played), choose the group
 * of 4 that can produce the most NEW partnership pairs.
 * Considers only the top candidates (up to 8) to keep it efficient.
 */
function selectBestGroup(
  sortedPlayers: Player[],
  coveredPairs: Set<string>
): [Player, Player, Player, Player] {
  const candidates = sortedPlayers.slice(0, Math.min(8, sortedPlayers.length));
  let bestGroup: [Player, Player, Player, Player] = [
    candidates[0], candidates[1], candidates[2], candidates[3],
  ];
  let bestScore = -1;

  for (let i = 0; i < candidates.length - 3; i++) {
    for (let j = i + 1; j < candidates.length - 2; j++) {
      for (let k = j + 1; k < candidates.length - 1; k++) {
        for (let l = k + 1; l < candidates.length; l++) {
          const score = maxNewPairs(
            candidates[i], candidates[j], candidates[k], candidates[l],
            coveredPairs
          );
          if (score > bestScore) {
            bestScore = score;
            bestGroup = [candidates[i], candidates[j], candidates[k], candidates[l]];
          }
        }
      }
    }
  }

  return bestGroup;
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
  const activeIds = new Set(activePlayers.map(p => p.id));

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

  // ── Mexicano ──────────────────────────────────────────────────────────────
  if (format === 'mexicano') {
    const currentMatches = [...completedMatches];
    const { partnerships, opponents } = buildHistoryMaps(currentMatches, activeIds);

    const playedCounts: Record<string, number> = {};
    activePlayers.forEach(p => (playedCounts[p.id] = 0));
    currentMatches.forEach(m => {
      [...m.team1, ...m.team2].forEach(pId => {
        if (playedCounts[pId] !== undefined) playedCounts[pId]++;
      });
    });

    const leaderboard = calculateLeaderboard(activePlayers, currentMatches);
    const rankMap: Record<string, number> = {};
    leaderboard.forEach((entry, idx) => { rankMap[entry.player.id] = idx; });

    const playersToPair = shuffle(activePlayers).sort((a, b) => {
      const playedDiff = playedCounts[a.id] - playedCounts[b.id];
      if (playedDiff !== 0) return playedDiff;
      return (rankMap[a.id] ?? 0) - (rankMap[b.id] ?? 0);
    });

    const available: Player[] = [...playersToPair];
    const roundMatches: Match[] = [];

    while (available.length >= 4) {
      const p1 = available.shift()!;
      const p2 = available.shift()!;
      const p3 = available.shift()!;
      const p4 = available.shift()!;
      const pairing = getMexicanoPairing(p1, p2, p3, p4, partnerships, opponents);
      roundMatches.push({
        id: uuidv4(),
        tournament_id: tournamentId,
        round: startRound,
        team1: pairing.team1,
        team2: pairing.team2,
        score1: null,
        score2: null,
        status: 'pending',
      });
    }

    return [...currentMatches, ...roundMatches];
  }

  // ── Americano ─────────────────────────────────────────────────────────────
  // Goal: pre-generate ALL rounds until every possible partner pair has
  // appeared in a pending match (complete Americano schedule).
  //
  // Key design decisions:
  //  - coveredPairs is updated in REAL TIME after every match (including
  //    within the same round across multiple courts), so later courts can
  //    see what partnerships the earlier courts already claimed.
  //  - selectBestGroup picks the 4 players (from fewest-played candidates)
  //    whose best pairing option covers the most NEW pairs.
  //  - getBestAmericanoPairing then picks the pairing option that covers
  //    the most new pairs; ties broken randomly.

  const targetPairCount = (N * (N - 1)) / 2;

  // Seed covered pairs from completed matches only (pending will be regenerated).
  const coveredPairs = new Set<string>();
  completedMatches.forEach(m => {
    const [p1, p2] = m.team1;
    const [p3, p4] = m.team2;
    if (activeIds.has(p1) && activeIds.has(p2)) coveredPairs.add(getPairKey(p1, p2));
    if (activeIds.has(p3) && activeIds.has(p4)) coveredPairs.add(getPairKey(p3, p4));
  });

  // Seed play counts from completed matches only.
  const playedCounts: Record<string, number> = {};
  activePlayers.forEach(p => (playedCounts[p.id] = 0));
  completedMatches.forEach(m => {
    [...m.team1, ...m.team2].forEach(pId => {
      if (playedCounts[pId] !== undefined) playedCounts[pId]++;
    });
  });

  const currentMatches = [...completedMatches];
  const maxRounds = startRound + Math.max(50, N * 4);

  for (let r = startRound; r <= maxRounds; r++) {
    // Stop once every unique partnership has been scheduled.
    if (coveredPairs.size >= targetPairCount) break;

    const roundMatches: Match[] = [];
    const usedInRound = new Set<string>();

    for (let court = 0; court < matchesPerRound; court++) {
      if (coveredPairs.size >= targetPairCount) break;

      // Available players for this court: not already used in this round,
      // sorted by fewest matches played (shuffle breaks ties randomly).
      const available = shuffle(activePlayers)
        .filter(p => !usedInRound.has(p.id))
        .sort((a, b) => playedCounts[a.id] - playedCounts[b.id]);

      if (available.length < 4) break;

      // Pick the 4-player group that can cover the most new partnership pairs.
      const [p1, p2, p3, p4] = selectBestGroup(available, coveredPairs);

      // Among the 3 pairing options, choose the one covering the most new pairs.
      const pairing = getBestAmericanoPairing(p1, p2, p3, p4, coveredPairs);

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

      // Update tracking immediately so the next court in this round
      // benefits from knowing what's already been covered.
      usedInRound.add(p1.id); usedInRound.add(p2.id);
      usedInRound.add(p3.id); usedInRound.add(p4.id);
      playedCounts[p1.id]++; playedCounts[p2.id]++;
      playedCounts[p3.id]++; playedCounts[p4.id]++;
      coveredPairs.add(getPairKey(pairing.team1[0], pairing.team1[1]));
      coveredPairs.add(getPairKey(pairing.team2[0], pairing.team2[1]));
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
    // Americano: build covered pairs from ALL existing matches (completed + pending)
    // so we don't repeat what's already scheduled.
    const coveredPairs = new Set<string>();
    existingMatches.forEach(m => {
      const [p1, p2] = m.team1;
      const [p3, p4] = m.team2;
      if (activeIds.has(p1) && activeIds.has(p2)) coveredPairs.add(getPairKey(p1, p2));
      if (activeIds.has(p3) && activeIds.has(p4)) coveredPairs.add(getPairKey(p3, p4));
    });

    const shuffled = shuffle(activePlayers);
    const sortedPlayers = shuffled.sort((a, b) => {
      if (completedCounts[a.id] !== completedCounts[b.id])
        return completedCounts[a.id] - completedCounts[b.id];
      return totalCounts[a.id] - totalCounts[b.id];
    });

    const [p1, p2, p3, p4] = selectBestGroup(sortedPlayers, coveredPairs);
    const pairing = getBestAmericanoPairing(p1, p2, p3, p4, coveredPairs);

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
  }
}

/* ── FIXED PARTNER MODE ──────────────────────────────────────────────────────
 * Players are grouped into fixed partnerships ("teams"). Matches always pair
 * one fixed team against another, so partners never change. A full schedule is
 * a round-robin: every 2-player team plays every other 2-player team once.
 */

/** Stable team-vs-team key for scheduling. */
function teamPairKey(teamAId: string, teamBId: string): string {
  return [teamAId, teamBId].sort().join('-');
}

/** Given two player ids, find the FixedTeam that contains them (either order). */
function findTeamByPlayers(teams: FixedTeam[], p1: string, p2: string): FixedTeam | undefined {
  return teams.find(
    t =>
      (t.playerIds[0] === p1 && t.playerIds[1] === p2) ||
      (t.playerIds[0] === p2 && t.playerIds[1] === p1)
  );
}

/**
 * Generates all fixed-team matches (full round-robin schedule) for a fixed
 * partner tournament. Existing completed matches are preserved; pending
 * matches are regenerated so every remaining team pair is covered. Matches are
 * grouped into rounds honouring the total court count.
 */
export function generateFixedMatches(
  teams: FixedTeam[],
  existingMatches: Match[],
  tournamentId: string,
  totalCourts: number
): Match[] {
  const completedMatches = existingMatches.filter(m => m.status === 'completed');
  const playableTeams = teams.filter(t => t.playerIds.length === 2);

  if (playableTeams.length < 2) {
    return completedMatches;
  }

  const targetPairCount = (playableTeams.length * (playableTeams.length - 1)) / 2;

  const playedPairs = new Set<string>();
  completedMatches.forEach(m => {
    const t1 = findTeamByPlayers(teams, m.team1[0], m.team1[1]);
    const t2 = findTeamByPlayers(teams, m.team2[0], m.team2[1]);
    if (t1 && t2) playedPairs.add(teamPairKey(t1.id, t2.id));
  });

  const currentMatches = [...completedMatches];
  const startRound =
    completedMatches.length > 0
      ? Math.max(...completedMatches.map(m => m.round)) + 1
      : 1;

  const maxRounds = startRound + Math.max(50, playableTeams.length * 4);

  for (let r = startRound; r <= maxRounds; r++) {
    if (playedPairs.size >= targetPairCount) break;

    const roundMatches: Match[] = [];

    for (let court = 0; court < totalCourts; court++) {
      if (playedPairs.size >= targetPairCount) break;

      // Pick the pair of teams that has faced off the fewest times.
      let best: [FixedTeam, FixedTeam] | null = null;
      for (let i = 0; i < playableTeams.length; i++) {
        for (let j = i + 1; j < playableTeams.length; j++) {
          const a = playableTeams[i];
          const b = playableTeams[j];
          if (a.id === b.id) continue;
          if (!playedPairs.has(teamPairKey(a.id, b.id))) {
            best = [a, b];
            break;
          }
        }
        if (best) break;
      }

      if (!best) {
        // All pairs already scheduled — stop.
        break;
      }
      const [a, b] = best;
      roundMatches.push({
        id: uuidv4(),
        tournament_id: tournamentId,
        round: r,
        team1: [...a.playerIds] as [string, string],
        team2: [...b.playerIds] as [string, string],
        score1: null,
        score2: null,
        status: 'pending',
      });

      playedPairs.add(teamPairKey(a.id, b.id));
    }

    if (roundMatches.length === 0) break;
    currentMatches.push(...roundMatches);
  }

  return currentMatches;
}

/**
 * Generates a single pending match for a fixed partner tournament, preferring
 * a team pair that has not played yet (ties broken randomly).
 */
export function generateSingleFixedMatch(
  teams: FixedTeam[],
  existingMatches: Match[],
  tournamentId: string
): Match | null {
  const playableTeams = teams.filter(t => t.playerIds.length === 2);
  if (playableTeams.length < 2) return null;

  const completedMatches = existingMatches.filter(m => m.status === 'completed');

  const playedPairs = new Set<string>();
  existingMatches.forEach(m => {
    const t1 = findTeamByPlayers(teams, m.team1[0], m.team1[1]);
    const t2 = findTeamByPlayers(teams, m.team2[0], m.team2[1]);
    if (t1 && t2) playedPairs.add(teamPairKey(t1.id, t2.id));
  });

  const candidates: [FixedTeam, FixedTeam][] = [];
  for (let i = 0; i < playableTeams.length; i++) {
    for (let j = i + 1; j < playableTeams.length; j++) {
      const a = playableTeams[i];
      const b = playableTeams[j];
      if (!playedPairs.has(teamPairKey(a.id, b.id))) {
        candidates.push([a, b]);
      }
    }
  }

  // All pairs already played → still allow generating extra matches.
  if (candidates.length === 0) {
    candidates.push([playableTeams[0], playableTeams[1]]);
  }

  const shuffledCandidates = shuffle(candidates);
  const pick = shuffledCandidates[0];

  const roundNum =
    completedMatches.length > 0
      ? Math.max(...completedMatches.map(m => m.round)) + 1
      : 1;

  return {
    id: uuidv4(),
    tournament_id: tournamentId,
    round: roundNum,
    team1: [...pick[0].playerIds] as [string, string],
    team2: [...pick[1].playerIds] as [string, string],
    score1: null,
    score2: null,
    status: 'pending',
  };
}