import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Player, Tournament, Match, TournamentStoreState } from '../lib/types';
import { generateRounds } from '../lib/matchmaking';
import { supabase } from '../utils/supabase';

interface TournamentActions {
  init: () => Promise<void>;
  createTournament: (name: string, totalCourts: number) => Promise<void>;
  deleteTournament: (id: string) => Promise<void>;
  setActiveTournament: (id: string | null) => void;
  updateTotalCourts: (courts: number) => Promise<void>;

  // Active tournament actions
  addPlayer: (name: string) => Promise<void>;
  removePlayer: (id: string) => Promise<void>;
  startTournament: () => Promise<void>;
  updateScore: (matchId: string, score1: number, score2: number) => Promise<void>;
  generateNextRound: () => Promise<void>;
  randomizePendingMatches: () => Promise<void>;
  swapMatchPlayer: (matchId: string, oldPlayerId: string, newPlayerId: string) => Promise<void>;
  finishTournament: () => Promise<void>;
  resetTournament: () => Promise<void>;
}

export const useTournamentStore = create<TournamentStoreState & TournamentActions>((set, get) => ({
  tournaments: [],
  globalPlayers: [],
  activeTournamentId: null,
  isInitialized: false,

  init: async () => {
    // Fetch all data
    const [tRes, pRes, tpRes, mRes] = await Promise.all([
      supabase.from('tournaments').select('*'),
      supabase.from('players').select('*'),
      supabase.from('tournament_participants').select('*'),
      supabase.from('matches').select('*')
    ]);

    if (tRes.error) console.error(tRes.error);
    if (pRes.error) console.error(pRes.error);
    if (tpRes.error) console.error(tpRes.error);
    if (mRes.error) console.error(mRes.error);

    const dbTournaments = tRes.data || [];
    const dbPlayers = pRes.data || [];
    const dbTp = tpRes.data || [];
    const dbMatches = mRes.data || [];

    const assembledTournaments: Tournament[] = dbTournaments.map((t: any) => {
      const tps = dbTp.filter((tp: any) => tp.tournament_id === t.id);
      const playersForT = tps.map((tp: any) => {
        const p = dbPlayers.find((p: any) => p.id === tp.player_id);
        return {
          id: p?.id || tp.player_id,
          name: p?.name || 'Unknown',
          active: tp.active
        };
      });

      return {
        id: t.id,
        name: t.name,
        createdAt: Number(t.created_at),
        totalCourts: t.total_courts || 1,
        status: t.status,
        players: playersForT,
        matches: dbMatches.filter((m: any) => m.tournament_id === t.id)
      };
    });

    set({ tournaments: assembledTournaments, globalPlayers: dbPlayers, isInitialized: true });
  },

  createTournament: async (name, totalCourts) => {
    const id = uuidv4();
    const createdAt = Date.now();
    
    // Optimistic UI update
    const newTournament: Tournament = {
      id,
      name,
      createdAt,
      totalCourts,
      players: [],
      matches: [],
      status: 'setup'
    };

    set((state) => ({ 
      tournaments: [...state.tournaments, newTournament],
      activeTournamentId: id
    }));

    // Sync to Supabase
    await supabase.from('tournaments').insert({
      id,
      name,
      created_at: createdAt,
      total_courts: totalCourts,
      status: 'setup'
    });
  },

  updateTotalCourts: async (courts) => {
    const state = get();
    const activeId = state.activeTournamentId;
    if (!activeId) return;

    // Optimistic
    set((s) => ({
      tournaments: s.tournaments.map(curr => 
        curr.id === activeId ? { ...curr, totalCourts: courts } : curr
      )
    }));

    // Sync
    await supabase.from('tournaments').update({ total_courts: courts }).eq('id', activeId);
  },

  deleteTournament: async (id) => {
    // Optimistic
    set((state) => ({
      tournaments: state.tournaments.filter(t => t.id !== id),
      activeTournamentId: state.activeTournamentId === id ? null : state.activeTournamentId
    }));

    // Sync
    await supabase.from('tournaments').delete().eq('id', id);
  },

  setActiveTournament: (id) => set({ activeTournamentId: id }),

  addPlayer: async (name) => {
    const state = get();
    const activeId = state.activeTournamentId;
    if (!activeId) return;

    const t = state.tournaments.find(x => x.id === activeId);
    if (!t) return;

    let globalPlayer = state.globalPlayers.find(p => p.name.toLowerCase() === name.toLowerCase());
    let isNewGlobal = false;
    if (!globalPlayer) {
      globalPlayer = { id: uuidv4(), name };
      isNewGlobal = true;
    }

    if (t.players.some(p => p.id === globalPlayer!.id)) {
      return; // Already in tournament
    }

    const newPlayer: Player = { id: globalPlayer.id, name: globalPlayer.name, active: true };
    const newPlayers = [...t.players, newPlayer];
    
    let newMatches = t.matches;
    let matchesToInsert: Match[] = [];

    // Optimistic
    set((s) => {
      const newGlobalPlayers = isNewGlobal ? [...s.globalPlayers, globalPlayer!] : s.globalPlayers;
      return {
        globalPlayers: newGlobalPlayers,
        tournaments: s.tournaments.map(curr => {
          if (curr.id !== activeId) return curr;
          if (curr.status === 'active') {
            newMatches = generateRounds(newPlayers, curr.matches, activeId, curr.totalCourts);
            matchesToInsert = newMatches.filter(m => !curr.matches.some(om => om.id === m.id));
          }
          return { ...curr, players: newPlayers, matches: newMatches };
        })
      };
    });

    // Sync Player
    if (isNewGlobal) {
      await supabase.from('players').insert(globalPlayer);
    }
    await supabase.from('tournament_participants').insert({
      tournament_id: activeId,
      player_id: globalPlayer.id,
      active: true
    });

    // Sync Matches if regenerated
    if (matchesToInsert.length > 0) {
      // Delete old pending matches first
      await supabase.from('matches').delete().eq('tournament_id', activeId).eq('status', 'pending');
      await supabase.from('matches').insert(matchesToInsert);
    }
  },

  removePlayer: async (id) => {
    const state = get();
    const activeId = state.activeTournamentId;
    if (!activeId) return;

    const t = state.tournaments.find(x => x.id === activeId);
    if (!t) return;

    const newPlayers = t.players.map(p => p.id === id ? { ...p, active: false } : p);
    let newMatches = t.matches;
    let matchesToInsert: Match[] = [];

    // Optimistic
    set((s) => ({
      tournaments: s.tournaments.map(curr => {
        if (curr.id !== activeId) return curr;
        if (curr.status === 'active') {
          newMatches = generateRounds(newPlayers, curr.matches, activeId, curr.totalCourts);
          matchesToInsert = newMatches.filter(m => !curr.matches.some(om => om.id === m.id));
        }
        return { ...curr, players: newPlayers, matches: newMatches };
      })
    }));

    // Sync Player
    await supabase.from('tournament_participants').update({ active: false }).eq('tournament_id', activeId).eq('player_id', id);

    // Sync Matches if regenerated
    if (matchesToInsert.length > 0) {
      await supabase.from('matches').delete().eq('tournament_id', activeId).eq('status', 'pending');
      await supabase.from('matches').insert(matchesToInsert);
    }
  },

  startTournament: async () => {
    const state = get();
    const activeId = state.activeTournamentId;
    if (!activeId) return;

    const t = state.tournaments.find(x => x.id === activeId);
    if (!t) return;
    if (t.players.filter(p => p.active).length < 4) return;

    const newMatches = generateRounds(t.players, t.matches, activeId, t.totalCourts);
    const matchesToInsert = newMatches.filter(m => !t.matches.some(om => om.id === m.id));

    // Optimistic
    set((s) => ({
      tournaments: s.tournaments.map(curr => {
        if (curr.id !== activeId) return curr;
        return { ...curr, status: 'active', matches: newMatches };
      })
    }));

    // Sync
    await supabase.from('tournaments').update({ status: 'active' }).eq('id', activeId);
    if (matchesToInsert.length > 0) {
      await supabase.from('matches').insert(matchesToInsert);
    }
  },

  generateNextRound: async () => {
    const state = get();
    const activeId = state.activeTournamentId;
    if (!activeId) return;

    const t = state.tournaments.find(x => x.id === activeId);
    if (!t || t.status !== 'active') return;

    const newMatches = generateRounds(t.players, t.matches, activeId, t.totalCourts);
    const matchesToInsert = newMatches.filter(m => !t.matches.some(om => om.id === m.id));

    // Optimistic
    set((s) => ({
      tournaments: s.tournaments.map(curr => {
        if (curr.id !== activeId) return curr;
        return { ...curr, matches: newMatches };
      })
    }));

    // Sync
    if (matchesToInsert.length > 0) {
      await supabase.from('matches').insert(matchesToInsert);
    }
  },

  randomizePendingMatches: async () => {
    const state = get();
    const activeId = state.activeTournamentId;
    if (!activeId) return;

    const t = state.tournaments.find(x => x.id === activeId);
    if (!t || t.status !== 'active') return;

    const completedMatches = t.matches.filter(m => m.status === 'completed');
    const newMatches = generateRounds(t.players, completedMatches, activeId, t.totalCourts);
    const matchesToInsert = newMatches.filter(m => !completedMatches.some(om => om.id === m.id));

    // Optimistic
    set((s) => ({
      tournaments: s.tournaments.map(curr => {
        if (curr.id !== activeId) return curr;
        return { ...curr, matches: newMatches };
      })
    }));

    // Sync
    await supabase.from('matches').delete().eq('tournament_id', activeId).eq('status', 'pending');
    if (matchesToInsert.length > 0) {
      await supabase.from('matches').insert(matchesToInsert);
    }
  },

  updateScore: async (matchId, score1, score2) => {
    const state = get();
    const activeId = state.activeTournamentId;
    if (!activeId) return;

    // Optimistic
    set((s) => ({
      tournaments: s.tournaments.map(curr => {
        if (curr.id !== activeId) return curr;
        const newMatches = curr.matches.map(m => 
          m.id === matchId 
            ? { ...m, score1, score2, status: 'completed' as const } 
            : m
        );
        return { ...curr, matches: newMatches };
      })
    }));

    // Sync
    await supabase.from('matches').update({ 
      score1, 
      score2, 
      status: 'completed' 
    }).eq('id', matchId);
  },

  swapMatchPlayer: async (matchId, oldPlayerId, newPlayerId) => {
    if (oldPlayerId === newPlayerId) return;

    const state = get();
    const activeId = state.activeTournamentId;
    if (!activeId) return;

    const t = state.tournaments.find(x => x.id === activeId);
    if (!t) return;

    const matchesToUpdate: Match[] = [];

    const newMatches = t.matches.map(m => {
      if (m.status !== 'pending') return m;

      const match = { ...m, team1: [...m.team1], team2: [...m.team2] };
      let changed = false;

      if (match.id === matchId) {
        const oldInTeam1 = match.team1.indexOf(oldPlayerId);
        const oldInTeam2 = match.team2.indexOf(oldPlayerId);
        const newInTeam1 = match.team1.indexOf(newPlayerId);
        const newInTeam2 = match.team2.indexOf(newPlayerId);

        if (newInTeam1 !== -1 || newInTeam2 !== -1) {
          // Swap within the same match
          if (oldInTeam1 !== -1) match.team1[oldInTeam1] = newPlayerId;
          if (oldInTeam2 !== -1) match.team2[oldInTeam2] = newPlayerId;
          if (newInTeam1 !== -1) match.team1[newInTeam1] = oldPlayerId;
          if (newInTeam2 !== -1) match.team2[newInTeam2] = oldPlayerId;
          changed = true;
        } else {
          // Just replace
          if (oldInTeam1 !== -1) { match.team1[oldInTeam1] = newPlayerId; changed = true; }
          if (oldInTeam2 !== -1) { match.team2[oldInTeam2] = newPlayerId; changed = true; }
        }
      } else if (match.team1.includes(newPlayerId) || match.team2.includes(newPlayerId)) {
        // Swap newPlayer with oldPlayer in another pending match
        const newInTeam1 = match.team1.indexOf(newPlayerId);
        const newInTeam2 = match.team2.indexOf(newPlayerId);
        if (newInTeam1 !== -1) { match.team1[newInTeam1] = oldPlayerId; changed = true; }
        if (newInTeam2 !== -1) { match.team2[newInTeam2] = oldPlayerId; changed = true; }
      }

      if (changed) matchesToUpdate.push(match);
      return match;
    });

    if (matchesToUpdate.length === 0) return;

    // Optimistic
    set((s) => ({
      tournaments: s.tournaments.map(curr => {
        if (curr.id !== activeId) return curr;
        return { ...curr, matches: newMatches };
      })
    }));

    // Sync
    for (const m of matchesToUpdate) {
      await supabase.from('matches').update({ team1: m.team1, team2: m.team2 }).eq('id', m.id);
    }
  },

  finishTournament: async () => {
    const state = get();
    const activeId = state.activeTournamentId;
    if (!activeId) return;

    // Optimistic
    set((s) => ({
      tournaments: s.tournaments.map(curr => {
        if (curr.id !== activeId) return curr;
        return { ...curr, status: 'completed' as const };
      })
    }));

    // Sync
    await supabase.from('tournaments').update({ status: 'completed' }).eq('id', activeId);
  },

  resetTournament: async () => {
    const state = get();
    const activeId = state.activeTournamentId;
    if (!activeId) return;

    // Optimistic
    set((s) => ({
      tournaments: s.tournaments.map(curr => {
        if (curr.id !== activeId) return curr;
        return { ...curr, players: [], matches: [], status: 'setup' as const };
      })
    }));

    // Sync
    await supabase.from('tournaments').update({ status: 'setup' }).eq('id', activeId);
    await supabase.from('tournament_participants').delete().eq('tournament_id', activeId);
    await supabase.from('matches').delete().eq('tournament_id', activeId);
  }
}));
