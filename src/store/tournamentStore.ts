import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Player, Tournament, Match, TournamentStoreState } from '../lib/types';
import { generateRounds, generateSingleMatch as generateSingleMatchUtil } from '../lib/matchmaking';
import { supabase } from '../utils/supabase';

interface TournamentActions {
  init: () => Promise<void>;
  fetchTournaments: () => Promise<void>;
  fetchTournamentById: (id: string) => Promise<void>;
  createTournament: (name: string, totalCourts: number, format: 'americano' | 'mexicano', pointsMode: 'total21' | 'free') => Promise<string>;
  deleteTournament: (id: string) => Promise<void>;
  setActiveTournament: (id: string | null) => void;
  updateTotalCourts: (courts: number) => Promise<void>;

  // Active tournament actions
  addPlayer: (name: string) => Promise<void>;
  removePlayer: (id: string) => Promise<void>;
  deletePlayerCompletely: (id: string) => Promise<void>;
  startTournament: () => Promise<void>;
  updateScore: (matchId: string, score1: number, score2: number) => Promise<void>;
  generateNextRound: () => Promise<void>;
  randomizePendingMatches: () => Promise<void>;
  generateSingleMatch: () => Promise<void>;
  swapMatchPlayer: (matchId: string, oldPlayerId: string, newPlayerId: string) => Promise<void>;
  finishTournament: () => Promise<void>;
  resetTournament: () => Promise<void>;

  subscribeToRealtime: () => () => void;
}

let inFlightFetchTournaments: Promise<void> | null = null;
const inFlightFetchById: Record<string, Promise<void> | undefined> = {};

export const useTournamentStore = create<TournamentStoreState & TournamentActions>((set, get) => ({
  tournaments: [],
  globalPlayers: [],
  activeTournamentId: null,
  isInitialized: false,
  connectionStatus: 'connecting',

  subscribeToRealtime: () => {
    set({ connectionStatus: 'connecting' });

    const channel = supabase
      .channel('tournament-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments' },
        (payload) => {
          set((s) => {
            if (payload.eventType === 'DELETE') {
              return {
                tournaments: s.tournaments.filter(t => t.id !== payload.old.id),
                activeTournamentId: s.activeTournamentId === payload.old.id ? null : s.activeTournamentId
              };
            }
            const row: any = payload.new;
            const exists = s.tournaments.some(t => t.id === row.id);
            const patch = {
              id: row.id,
              name: row.name,
              createdAt: Number(row.created_at),
              totalCourts: row.total_courts || 1,
              status: row.status,
              format: row.format || 'americano',
              pointsMode: (row.points_mode as 'total21' | 'free') || 'total21',
            };
            return {
              tournaments: exists
                ? s.tournaments.map(t => t.id === row.id ? { ...t, ...patch } : t)
                : [...s.tournaments, { ...patch, players: [], matches: [] }]
            };
          });
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' },
        (payload) => {
          set((s) => {
            if (payload.eventType === 'DELETE') {
              return { globalPlayers: s.globalPlayers.filter(p => p.id !== payload.old.id) };
            }
            const row: any = payload.new;
            const exists = s.globalPlayers.some(p => p.id === row.id);
            return {
              globalPlayers: exists
                ? s.globalPlayers.map(p => p.id === row.id ? { ...p, ...row } : p)
                : [...s.globalPlayers, row]
            };
          });
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_participants' },
        (payload) => {
          set((s) => {
            const row: any = payload.eventType === 'DELETE' ? payload.old : payload.new;
            const gp = s.globalPlayers.find(p => p.id === row.player_id);
            return {
              tournaments: s.tournaments.map(t => {
                if (t.id !== row.tournament_id) return t;
                if (payload.eventType === 'DELETE') {
                  return { ...t, players: t.players.filter(p => p.id !== row.player_id) };
                }
                const exists = t.players.some(p => p.id === row.player_id);
                return {
                  ...t,
                  players: exists
                    ? t.players.map(p => p.id === row.player_id ? { ...p, active: row.active } : p)
                    : [...t.players, { id: row.player_id, name: gp?.name || 'Unknown', active: row.active }]
                };
              })
            };
          });
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' },
        (payload) => {
          set((s) => {
            const row: any = payload.eventType === 'DELETE' ? payload.old : payload.new;
            return {
              tournaments: s.tournaments.map(t => {
                if (t.id !== row.tournament_id) return t;
                if (payload.eventType === 'DELETE') {
                  return { ...t, matches: t.matches.filter(m => m.id !== row.id) };
                }
                const exists = t.matches.some(m => m.id === row.id);
                return {
                  ...t,
                  matches: exists
                    ? t.matches.map(m => m.id === row.id ? { ...m, ...row } : m)
                    : [...t.matches, row]
                };
              })
            };
          });
        }
      )
      .subscribe((status, err) => {
        const prevStatus = get().connectionStatus;

        if (status === 'SUBSCRIBED') {
          set({ connectionStatus: 'connected' });
          if (prevStatus === 'error' || prevStatus === 'disconnected') {
            const activeId = get().activeTournamentId;
            if (activeId) {
              get().fetchTournamentById(activeId);
            } else {
              get().fetchTournaments();
            }
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Realtime subscription issue:', status, err);
          set({ connectionStatus: 'error' });
        } else if (status === 'CLOSED') {
          set({ connectionStatus: 'disconnected' });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  },

  fetchTournaments: async () => {
    if (inFlightFetchTournaments) {
      return inFlightFetchTournaments;
    }

    inFlightFetchTournaments = (async () => {
      try {
        const [tRes, tpRes, pRes] = await Promise.all([
          supabase.from('tournaments').select('*').order('created_at', { ascending: false }),
          supabase.from('tournament_participants').select('*'),
          supabase.from('players').select('*')
        ]);

        if (tRes.error) console.error('Error fetching tournaments:', tRes.error);
        if (tpRes.error) console.error('Error fetching participants:', tpRes.error);
        if (pRes.error) console.error('Error fetching players:', pRes.error);

        const dbTournaments = tRes.data || [];
        const dbPlayers = pRes.data || [];
        const dbTp = tpRes.data || [];

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
            matches: [],
            format: t.format || 'americano',
            pointsMode: (t.points_mode as 'total21' | 'free') || 'total21'
          };
        });

        set({ tournaments: assembledTournaments, globalPlayers: dbPlayers, isInitialized: true });
      } finally {
        inFlightFetchTournaments = null;
      }
    })();

    return inFlightFetchTournaments;
  },

  fetchTournamentById: async (id: string) => {
    if (inFlightFetchById[id]) {
      return inFlightFetchById[id];
    }

    inFlightFetchById[id] = (async () => {
      try {
        const [tRes, tpRes, mRes, pRes] = await Promise.all([
          supabase.from('tournaments').select('*').eq('id', id).single(),
          supabase.from('tournament_participants').select('*').eq('tournament_id', id),
          supabase.from('matches').select('*').eq('tournament_id', id).order('round', { ascending: true }),
          supabase.from('players').select('*')
        ]);

        if (tRes.error) {
          console.error('Error fetching tournament by id:', tRes.error);
          return;
        }

        const t = tRes.data;
        const dbTp = tpRes.data || [];
        const dbMatches = mRes.data || [];
        const dbPlayers = pRes.data || [];

        const playersForT = dbTp.map((tp: any) => {
          const p = dbPlayers.find((p: any) => p.id === tp.player_id);
          return {
            id: p?.id || tp.player_id,
            name: p?.name || 'Unknown',
            active: tp.active
          };
        });

        const fetchedTournament: Tournament = {
          id: t.id,
          name: t.name,
          createdAt: Number(t.created_at),
          totalCourts: t.total_courts || 1,
          status: t.status,
          players: playersForT,
          matches: dbMatches,
          format: t.format || 'americano',
          pointsMode: (t.points_mode as 'total21' | 'free') || 'total21'
        };

        set((s) => {
          const exists = s.tournaments.some(curr => curr.id === id);
          return {
            tournaments: exists
              ? s.tournaments.map(curr => curr.id === id ? fetchedTournament : curr)
              : [...s.tournaments, fetchedTournament],
            globalPlayers: dbPlayers,
            activeTournamentId: id,
            isInitialized: true
          };
        });
      } finally {
        delete inFlightFetchById[id];
      }
    })();

    return inFlightFetchById[id];
  },

  init: async () => {
    await get().fetchTournaments();
  },

  createTournament: async (name, totalCourts, format, pointsMode) => {
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
      status: 'setup',
      format,
      pointsMode
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
      status: 'setup',
      format,
      points_mode: pointsMode
    });

    return id;
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

    const existingPlayer = t.players.find(p => p.id === globalPlayer!.id);
    if (existingPlayer && existingPlayer.active) {
      return; // Already active in tournament
    }

    const newPlayers: Player[] = existingPlayer
      ? t.players.map(p => p.id === globalPlayer!.id ? { ...p, active: true } : p)
      : [...t.players, { id: globalPlayer!.id, name: globalPlayer!.name, active: true }];

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
            newMatches = generateRounds(newPlayers, curr.matches, activeId, curr.totalCourts, curr.format);
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
    await supabase.from('tournament_participants').upsert({
      tournament_id: activeId,
      player_id: globalPlayer!.id,
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
          newMatches = generateRounds(newPlayers, curr.matches, activeId, curr.totalCourts, curr.format);
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

  deletePlayerCompletely: async (id) => {
    const state = get();
    const activeId = state.activeTournamentId;
    if (!activeId) return;

    const t = state.tournaments.find(x => x.id === activeId);
    if (!t) return;

    // Filter out player completely from tournament's players list
    const newPlayers = t.players.filter(p => p.id !== id);
    let newMatches = t.matches;
    let matchesToInsert: Match[] = [];

    // Optimistic
    set((s) => ({
      tournaments: s.tournaments.map(curr => {
        if (curr.id !== activeId) return curr;
        if (curr.status === 'active') {
          newMatches = generateRounds(newPlayers, curr.matches, activeId, curr.totalCourts, curr.format);
          matchesToInsert = newMatches.filter(m => !curr.matches.some(om => om.id === m.id));
        }
        return { ...curr, players: newPlayers, matches: newMatches };
      })
    }));

    // Delete completely from tournament_participants
    await supabase.from('tournament_participants').delete().eq('tournament_id', activeId).eq('player_id', id);

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

    const newMatches = generateRounds(t.players, t.matches, activeId, t.totalCourts, t.format);
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

    const newMatches = generateRounds(t.players, t.matches, activeId, t.totalCourts, t.format);
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
    const newMatches = generateRounds(t.players, completedMatches, activeId, t.totalCourts, t.format);
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

  generateSingleMatch: async () => {
    const state = get();
    const activeId = state.activeTournamentId;
    if (!activeId) return;

    const t = state.tournaments.find(x => x.id === activeId);
    if (!t || t.status !== 'active') return;

    // Only allow generating when there are no pending matches
    const hasPending = t.matches.some(m => m.status === 'pending');
    if (hasPending) return;

    // Always generate a new match (works even after all unique pairs are covered)
    const newMatch = generateSingleMatchUtil(t.players, t.matches, activeId, t.format);
    if (!newMatch) return;

    // Optimistic
    set((s) => ({
      tournaments: s.tournaments.map(curr => {
        if (curr.id !== activeId) return curr;
        return { ...curr, matches: [...curr.matches, newMatch] };
      })
    }));

    // Sync
    await supabase.from('matches').insert(newMatch);
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
      if (m.id !== matchId) return m;
      if (m.status !== 'pending') return m;

      const match = { ...m, team1: [...m.team1], team2: [...m.team2] };
      let changed = false;

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
