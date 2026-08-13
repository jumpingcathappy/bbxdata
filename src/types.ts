export interface Match {
  id: string;
  round: number;
  playerA: string;
  playerB: string;
  winner: string | null;
  scoreA: number | null;
  scoreB: number | null;
}

export interface Bracket {
  id: string;
  name: string;
  type: string;
  createdAt: string;
  matches: Match[];
}

export interface MatchupData {
  exportedAt: string;
  brackets: Bracket[];
}
