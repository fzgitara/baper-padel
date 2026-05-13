import { v4 as uuidv4 } from 'uuid';
import type { Match, Player } from './types';

export function generateRounds(players: Player[], existingMatches: Match[], tournamentId: string, totalCourts: number): Match[] {
  const completedMatches = existingMatches.filter(m => m.status === 'completed');
  const activePlayers = players.filter(p => p.active);

  if (activePlayers.length < 4) {
    return completedMatches;
  }

  const newMatches: Match[] = [];
  
  // Calculate matches played per active player to prioritize those with fewest matches
  const playedCounts: Record<string, number> = {};
  activePlayers.forEach(p => playedCounts[p.id] = 0);
  
  completedMatches.forEach(m => {
    [...m.team1, ...m.team2].forEach(pId => {
      if (playedCounts[pId] !== undefined) {
        playedCounts[pId]++;
      }
    });
  });

  // Track partnerships to avoid repeating teams
  const partnerships: Record<string, number> = {};
  const getPairKey = (id1: string, id2: string) => [id1, id2].sort().join('-');
  
  completedMatches.forEach(m => {
    const k1 = getPairKey(m.team1[0], m.team1[1]);
    const k2 = getPairKey(m.team2[0], m.team2[1]);
    partnerships[k1] = (partnerships[k1] || 0) + 1;
    partnerships[k2] = (partnerships[k2] || 0) + 1;
  });

  // Track opponents to avoid repeating opponents
  const opponents: Record<string, number> = {};
  completedMatches.forEach(m => {
    m.team1.forEach(p1 => {
      m.team2.forEach(p2 => {
        const k = getPairKey(p1, p2);
        opponents[k] = (opponents[k] || 0) + 1;
      });
    });
  });

  // Sort players primarily by fewest matches played, and secondarily random
  const sortedPlayers = [...activePlayers].sort((a, b) => {
    if (playedCounts[a.id] !== playedCounts[b.id]) {
      return playedCounts[a.id] - playedCounts[b.id];
    }
    return Math.random() - 0.5;
  });

  const maxPlayers = totalCourts * 4;
  const numToPlay = Math.min(Math.floor(sortedPlayers.length / 4) * 4, maxPlayers);
  const playersToPlay = sortedPlayers.slice(0, numToPlay);

  const roundNum = completedMatches.length > 0 
    ? Math.max(...completedMatches.map(m => m.round)) + 1 
    : 1;

  let available = [...playersToPlay];

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

    newMatches.push({
      id: uuidv4(),
      tournament_id: tournamentId,
      round: roundNum,
      team1: [p1.id, p2.id],
      team2: [p3.id, p4.id],
      score1: null,
      score2: null,
      status: 'pending'
    });
  }

  return [...completedMatches, ...newMatches];
}
