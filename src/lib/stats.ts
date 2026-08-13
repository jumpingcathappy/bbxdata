import type { MatchupData } from '../types';

export interface OverallStats {
  wins: number;
  losses: number;
  total: number;
  winRate: number;
}

export function computeOverall(data: MatchupData): OverallStats {
  let wins = 0;
  let losses = 0;
  for (const bracket of data.brackets) {
    for (const match of bracket.matches) {
      if (match.winner === null) continue;
      wins += 1;
      losses += 1;
    }
  }
  const total = wins + losses;
  return { wins, losses, total, winRate: total === 0 ? 0 : wins / total };
}

export interface HeadToHeadRecord {
  playerA: string;
  playerB: string;
  aWins: number;
  bWins: number;
}

export function computeHeadToHead(data: MatchupData): HeadToHeadRecord[] {
  const map = new Map<string, HeadToHeadRecord>();
  const key = (a: string, b: string) => [a, b].sort().join('\u0000');

  for (const bracket of data.brackets) {
    for (const match of bracket.matches) {
      if (match.winner === null) continue;
      const k = key(match.playerA, match.playerB);
      let rec = map.get(k);
      if (!rec) {
        rec = { playerA: match.playerA, playerB: match.playerB, aWins: 0, bWins: 0 };
        map.set(k, rec);
      }
      if (match.winner === match.playerA) rec.aWins += 1;
      else if (match.winner === match.playerB) rec.bWins += 1;
    }
  }
  return Array.from(map.values());
}

export interface LeaderboardEntry {
  player: string;
  wins: number;
  losses: number;
  total: number;
  winRate: number;
}

export function computeLeaderboard(data: MatchupData): LeaderboardEntry[] {
  const map = new Map<string, LeaderboardEntry>();
  const ensure = (name: string): LeaderboardEntry => {
    let e = map.get(name);
    if (!e) {
      e = { player: name, wins: 0, losses: 0, total: 0, winRate: 0 };
      map.set(name, e);
    }
    return e;
  };

  for (const bracket of data.brackets) {
    for (const match of bracket.matches) {
      if (match.winner === null) continue;
      const a = ensure(match.playerA);
      const b = ensure(match.playerB);
      a.total += 1;
      b.total += 1;
      if (match.winner === match.playerA) a.wins += 1;
      else if (match.winner === match.playerB) b.wins += 1;
    }
  }

  const entries = Array.from(map.values());
  for (const e of entries) {
    e.losses = e.total - e.wins;
    e.winRate = e.total === 0 ? 0 : e.wins / e.total;
  }
  entries.sort((x, y) => y.wins - x.wins || y.winRate - x.winRate);
  return entries;
}
