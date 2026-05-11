export interface Player {
  id: string;
  tournament_id: string;
  name: string;
  active: boolean;
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
  players: Player[];
  matches: Match[];
  status: 'setup' | 'active' | 'completed';
}

export interface TournamentStoreState {
  tournaments: Tournament[];
  activeTournamentId: string | null;
  isInitialized: boolean;
}
