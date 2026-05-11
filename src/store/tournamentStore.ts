import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Player, Tournament, Match, TournamentStoreState } from '../lib/types';
import { generateRounds } from '../lib/matchmaking';
import { supabase } from '../utils/supabase';

interface TournamentActions {
  init: () => Promise<void>;
  createTournament: (name: string) => Promise<void>;
  deleteTournament: (id: string) => Promise<void>;
  setActiveTournament: (id: string | null) => void;

  // Active tournament actions
  addPlayer: (name: string) => Promise<void>;
  removePlayer: (id: string) => Promise<void>;
  startTournament: () => Promise<void>;
  updateScore: (matchId: string, score1: number, score2: number) => Promise<void>;
  generateNextRound: () => Promise<void>;
  resetTournament: () => Promise<void>;
}

export const useTournamentStore = create<TournamentStoreState & TournamentActions>((set, get) => ({
  tournaments: [],
  activeTournamentId: null,
  isInitialized: false,

  init: async () => {
    // Fetch all data
    const [tRes, pRes, mRes] = await Promise.all([
      supabase.from('tournaments').select('*'),
      supabase.from('players').select('*'),
      supabase.from('matches').select('*')
    ]);

    if (tRes.error) console.error(tRes.error);
    if (pRes.error) console.error(pRes.error);
    if (mRes.error) console.error(mRes.error);

    const dbTournaments = tRes.data || [];
    const dbPlayers = pRes.data || [];
    const dbMatches = mRes.data || [];

    const assembledTournaments: Tournament[] = dbTournaments.map((t: any) => ({
      id: t.id,
      name: t.name,
      createdAt: Number(t.created_at),
      status: t.status,
      players: dbPlayers.filter((p: any) => p.tournament_id === t.id),
      matches: dbMatches.filter((m: any) => m.tournament_id === t.id)
    }));

    set({ tournaments: assembledTournaments, isInitialized: true });
  },

  createTournament: async (name) => {
    const id = uuidv4();
    const createdAt = Date.now();
    
    // Optimistic UI update
    const newTournament: Tournament = {
      id,
      name,
      createdAt,
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
      status: 'setup'
    });
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

    const newPlayer: Player = { id: uuidv4(), tournament_id: activeId, name, active: true };
    const newPlayers = [...t.players, newPlayer];
    
    let newMatches = t.matches;
    let matchesToInsert: Match[] = [];

    // Optimistic
    set((s) => ({
      tournaments: s.tournaments.map(curr => {
        if (curr.id !== activeId) return curr;
        if (curr.status === 'active') {
          newMatches = generateRounds(newPlayers, curr.matches, activeId);
          matchesToInsert = newMatches.filter(m => !curr.matches.some(om => om.id === m.id));
        }
        return { ...curr, players: newPlayers, matches: newMatches };
      })
    }));

    // Sync Player
    await supabase.from('players').insert(newPlayer);

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
          newMatches = generateRounds(newPlayers, curr.matches, activeId);
          matchesToInsert = newMatches.filter(m => !curr.matches.some(om => om.id === m.id));
        }
        return { ...curr, players: newPlayers, matches: newMatches };
      })
    }));

    // Sync Player
    await supabase.from('players').update({ active: false }).eq('id', id);

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

    const newMatches = generateRounds(t.players, t.matches, activeId);
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

    const newMatches = generateRounds(t.players, t.matches, activeId);
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
    await supabase.from('players').delete().eq('tournament_id', activeId);
    await supabase.from('matches').delete().eq('tournament_id', activeId);
  }
}));
