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
}

export interface TournamentStoreState {
  tournaments: Tournament[];
  globalPlayers: GlobalPlayer[];
  activeTournamentId: string | null;
  isInitialized: boolean;
}
