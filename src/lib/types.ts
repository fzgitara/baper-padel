export interface Player {
  id: string;
  name: string;
  active: boolean;
}

export interface GlobalPlayer {
  id: string;
  name: string;
}

export interface Match {
  id: string;
  tournament_id: string;
  round: number;
  team1: string[]; // Player IDs
  team2: string[]; // Player IDs
  score1: number | null;
  score2: number | null;
  status: 'pending' | 'completed';
}

export interface Tournament {
  id: string;
  name: string;
  createdAt: number;
  totalCourts: number;
  players: Player[];
  matches: Match[];
  status: 'setup' | 'active' | 'completed';
  format: 'americano' | 'mexicano';
  pointsMode: 'total21' | 'default';
  partnerMode: 'fixed' | 'rotating';
  teams: FixedTeam[];
}

export type PartnerMode = 'fixed' | 'rotating';
export interface FixedTeam {
  id: string;
  name: string;
  playerIds: string[]; // exactly 2 when fully configured
}

export interface TournamentStoreState {
  tournaments: Tournament[];
  globalPlayers: GlobalPlayer[];
  activeTournamentId: string | null;
  isInitialized: boolean;
  connectionStatus: 'connecting' | 'connected' | 'error' | 'disconnected';
  // Lazy loading pagination state for the tournament list
  tournamentsLoadedCount: number;
  hasMoreTournaments: boolean;
  isLoadingMore: boolean;
}

