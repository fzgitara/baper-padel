import { v4 as uuidv4 } from 'uuid';
import type { Match, Player } from './types';

export function generateRounds(players: Player[], existingMatches: Match[], tournamentId: string, totalCourts: number): Match[] {
  const completedMatches = existingMatches.filter(m => m.status === 'completed');
  const activePlayers = players.filter(p => p.active);

  if (activePlayers.length < 4) {
    return completedMatches;
  }

  const N = activePlayers.length;
  const targetPartnershipsCount = (N * (N - 1)) / 2;
  
  let currentMatches = [...completedMatches];
  const getPairKey = (id1: string, id2: string) => [id1, id2].sort().join('-');

  const getActivePartnershipsCount = (matchesList: Match[]) => {
    const activeIds = new Set(activePlayers.map(p => p.id));
    const covered = new Set<string>();
    matchesList.forEach(m => {
      const p1 = m.team1[0];
      const p2 = m.team1[1];
      const p3 = m.team2[0];
      const p4 = m.team2[1];
      if (activeIds.has(p1) && activeIds.has(p2)) {
        covered.add(getPairKey(p1, p2));
      }
      if (activeIds.has(p3) && activeIds.has(p4)) {
        covered.add(getPairKey(p3, p4));
      }
    });
    return covered.size;
  };

  const maxRounds = Math.max(50, N * 4);
  const matchesPerRound = Math.min(totalCourts, Math.floor(N / 4));
  
  if (matchesPerRound < 1) {
    return completedMatches;
  }

  const startRound = completedMatches.length > 0 
    ? Math.max(...completedMatches.map(m => m.round)) + 1 
    : 1;

  for (let r = startRound; r <= startRound + maxRounds; r++) {
    const coveredCount = getActivePartnershipsCount(currentMatches);
    if (coveredCount >= targetPartnershipsCount) {
      break;
    }

    // Generate matches for this round
    const playedCounts: Record<string, number> = {};
    activePlayers.forEach(p => playedCounts[p.id] = 0);
    currentMatches.forEach(m => {
      [...m.team1, ...m.team2].forEach(pId => {
        if (playedCounts[pId] !== undefined) {
          playedCounts[pId]++;
        }
      });
    });

    const partnerships: Record<string, number> = {};
    currentMatches.forEach(m => {
      const k1 = getPairKey(m.team1[0], m.team1[1]);
      const k2 = getPairKey(m.team2[0], m.team2[1]);
      partnerships[k1] = (partnerships[k1] || 0) + 1;
      partnerships[k2] = (partnerships[k2] || 0) + 1;
    });

    // Sort players primarily by fewest matches played, and secondarily random
    const sortedPlayers = [...activePlayers].sort((a, b) => {
      if (playedCounts[a.id] !== playedCounts[b.id]) {
        return playedCounts[a.id] - playedCounts[b.id];
      }
      return Math.random() - 0.5;
    });

    const numToPlay = matchesPerRound * 4;
    const playersToPlay = sortedPlayers.slice(0, numToPlay);
    
    let available = [...playersToPlay];
    const roundMatches: Match[] = [];

    while (available.length >= 4) {
      const p1 = available.shift()!;
      
      // Find p2: minimize past partnerships
      available.sort((a, b) => {
        const aScore = partnerships[getPairKey(p1.id, a.id)] || 0;
        const bScore = partnerships[getPairKey(p1.id, b.id)] || 0;
        return aScore - bScore;
      });
      const p2 = available.shift()!;

      const p3 = available.shift()!;
      
      // Find p4: minimize past partnerships with p3
      available.sort((a, b) => {
        const aScore = partnerships[getPairKey(p3.id, a.id)] || 0;
        const bScore = partnerships[getPairKey(p3.id, b.id)] || 0;
        return aScore - bScore;
      });
      const p4 = available.shift()!;

      roundMatches.push({
        id: uuidv4(),
        tournament_id: tournamentId,
        round: r,
        team1: [p1.id, p2.id],
        team2: [p3.id, p4.id],
        score1: null,
        score2: null,
        status: 'pending'
      });
    }

    if (roundMatches.length === 0) {
      break;
    }

    currentMatches.push(...roundMatches);
  }

  return currentMatches;
}

export function generateSingleMatch(players: Player[], existingMatches: Match[], tournamentId: string): Match | null {
  const activePlayers = players.filter(p => p.active);
  if (activePlayers.length < 4) {
    return null;
  }

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
        if (m.status === 'completed') {
          completedCounts[pId]++;
        }
      }
    });
  });

  const getPairKey = (id1: string, id2: string) => [id1, id2].sort().join('-');
  const partnerships: Record<string, number> = {};
  existingMatches.forEach(m => {
    const k1 = getPairKey(m.team1[0], m.team1[1]);
    const k2 = getPairKey(m.team2[0], m.team2[1]);
    partnerships[k1] = (partnerships[k1] || 0) + 1;
    partnerships[k2] = (partnerships[k2] || 0) + 1;
  });

  const sortedPlayers = [...activePlayers].sort((a, b) => {
    if (completedCounts[a.id] !== completedCounts[b.id]) {
      return completedCounts[a.id] - completedCounts[b.id];
    }
    if (totalCounts[a.id] !== totalCounts[b.id]) {
      return totalCounts[a.id] - totalCounts[b.id];
    }
    return Math.random() - 0.5;
  });

  const playersToPlay = sortedPlayers.slice(0, 4);
  let available = [...playersToPlay];

  const p1 = available.shift()!;
  
  // Find p2: minimize past partnerships
  available.sort((a, b) => {
    const aScore = partnerships[getPairKey(p1.id, a.id)] || 0;
    const bScore = partnerships[getPairKey(p1.id, b.id)] || 0;
    return aScore - bScore;
  });
  const p2 = available.shift()!;

  const p3 = available.shift()!;
  
  // Find p4: minimize past partnerships with p3
  available.sort((a, b) => {
    const aScore = partnerships[getPairKey(p3.id, a.id)] || 0;
    const bScore = partnerships[getPairKey(p3.id, b.id)] || 0;
    return aScore - bScore;
  });
  const p4 = available.shift()!;

  const roundNum = existingMatches.length > 0
    ? Math.max(...existingMatches.map(m => m.round)) + 1
    : 1;

  return {
    id: uuidv4(),
    tournament_id: tournamentId,
    round: roundNum,
    team1: [p1.id, p2.id],
    team2: [p3.id, p4.id],
    score1: null,
    score2: null,
    status: 'pending'
  };
}
