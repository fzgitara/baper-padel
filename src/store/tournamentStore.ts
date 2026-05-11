import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { Player, Tournament, TournamentStoreState } from '../lib/types';
import { generateRounds } from '../lib/matchmaking';

interface TournamentActions {
  createTournament: (name: string) => void;
  deleteTournament: (id: string) => void;
  setActiveTournament: (id: string | null) => void;

  // Active tournament actions
  addPlayer: (name: string) => void;
  removePlayer: (id: string) => void;
  startTournament: () => void;
  updateScore: (matchId: string, score1: number, score2: number) => void;
  generateNextRound: () => void;
  resetTournament: () => void;
}

export const useTournamentStore = create<TournamentStoreState & TournamentActions>()(
  persist(
    (set) => ({
      tournaments: [],
      activeTournamentId: null,

      createTournament: (name) => set((state) => {
        const newTournament: Tournament = {
          id: uuidv4(),
          name,
          createdAt: Date.now(),
          players: [],
          matches: [],
          status: 'setup'
        };
        return { 
          tournaments: [...state.tournaments, newTournament],
          activeTournamentId: newTournament.id
        };
      }),

      deleteTournament: (id) => set((state) => ({
        tournaments: state.tournaments.filter(t => t.id !== id),
        activeTournamentId: state.activeTournamentId === id ? null : state.activeTournamentId
      })),

      setActiveTournament: (id) => set({ activeTournamentId: id }),

      addPlayer: (name) => set((state) => {
        if (!state.activeTournamentId) return state;
        const newPlayer: Player = { id: uuidv4(), name, active: true };
        
        const updatedTournaments = state.tournaments.map(t => {
          if (t.id !== state.activeTournamentId) return t;
          const newPlayers = [...t.players, newPlayer];
          const newMatches = t.status === 'active' ? generateRounds(newPlayers, t.matches) : t.matches;
          return { ...t, players: newPlayers, matches: newMatches };
        });

        return { tournaments: updatedTournaments };
      }),

      removePlayer: (id) => set((state) => {
        if (!state.activeTournamentId) return state;
        
        const updatedTournaments = state.tournaments.map(t => {
          if (t.id !== state.activeTournamentId) return t;
          const newPlayers = t.players.map(p => p.id === id ? { ...p, active: false } : p);
          const newMatches = t.status === 'active' ? generateRounds(newPlayers, t.matches) : t.matches;
          return { ...t, players: newPlayers, matches: newMatches };
        });

        return { tournaments: updatedTournaments };
      }),

      startTournament: () => set((state) => {
        if (!state.activeTournamentId) return state;

        const updatedTournaments = state.tournaments.map(t => {
          if (t.id !== state.activeTournamentId) return t;
          if (t.players.filter(p => p.active).length < 4) return t;
          return { 
            ...t, 
            status: 'active' as const, 
            matches: generateRounds(t.players, t.matches) 
          };
        });

        return { tournaments: updatedTournaments };
      }),

      generateNextRound: () => set((state) => {
        if (!state.activeTournamentId) return state;

        const updatedTournaments = state.tournaments.map(t => {
          if (t.id !== state.activeTournamentId) return t;
          if (t.status !== 'active') return t;
          return { ...t, matches: generateRounds(t.players, t.matches) };
        });

        return { tournaments: updatedTournaments };
      }),

      updateScore: (matchId, score1, score2) => set((state) => {
        if (!state.activeTournamentId) return state;

        const updatedTournaments = state.tournaments.map(t => {
          if (t.id !== state.activeTournamentId) return t;
          const newMatches = t.matches.map(m => 
            m.id === matchId 
              ? { ...m, score1, score2, status: 'completed' as const } 
              : m
          );
          return { ...t, matches: newMatches };
        });

        return { tournaments: updatedTournaments };
      }),

      resetTournament: () => set((state) => {
        if (!state.activeTournamentId) return state;

        const updatedTournaments = state.tournaments.map(t => {
          if (t.id !== state.activeTournamentId) return t;
          return { ...t, players: [], matches: [], status: 'setup' as const };
        });

        return { tournaments: updatedTournaments };
      })
    }),
    {
      name: 'padel-tournament-storage',
    }
  )
);
