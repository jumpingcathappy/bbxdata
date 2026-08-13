import type { MatchupData } from '../types';

export interface OverallStats {
  decided: number;
  undecided: number;
  total: number;
}

export function computeOverall(data: MatchupData): OverallStats {
  let decided = 0;
  let undecided = 0;
  for (const bracket of data.brackets) {
    for (const match of bracket.matches) {
      if (match.winner === null) undecided += 1;
      else decided += 1;
    }
  }
  return { decided, undecided, total: decided + undecided };
}

export interface HeadToHeadRecord {
  playerA: string;
  playerB: string;
  aWins: number;
  bWins: number;
  winRate: number;
}

export function computeHeadToHead(data: MatchupData): HeadToHeadRecord[] {
  const map = new Map<string, HeadToHeadRecord>();
  const key = (a: string, b: string) => [a, b].sort().join('\u0000');

  for (const bracket of data.brackets) {
    for (const match of bracket.matches) {
      if (match.winner === null) continue;
      const [playerA, playerB] = [match.playerA, match.playerB].sort();
      const k = key(match.playerA, match.playerB);
      let rec = map.get(k);
      if (!rec) {
        rec = { playerA, playerB, aWins: 0, bWins: 0, winRate: 0 };
        map.set(k, rec);
      }
      if (match.winner === playerA) rec.aWins += 1;
      else if (match.winner === playerB) rec.bWins += 1;
    }
  }

  const records = Array.from(map.values());
  for (const r of records) {
    const total = r.aWins + r.bWins;
    r.winRate = total === 0 ? 0 : r.aWins / total;
  }
  return records;
}

export interface LeaderboardEntry {
  player: string;
  wins: number;
  losses: number;
  total: number;
  winRate: number;
}

export interface PlayerMatchup {
  opponent: string;
  wins: number;
  losses: number;
  total: number;
  winRate: number;
}

export function computePlayerMatchups(
  data: MatchupData,
  player: string
): PlayerMatchup[] {
  const map = new Map<string, PlayerMatchup>();
  const ensure = (opponent: string): PlayerMatchup => {
    let e = map.get(opponent);
    if (!e) {
      e = { opponent, wins: 0, losses: 0, total: 0, winRate: 0 };
      map.set(opponent, e);
    }
    return e;
  };

  for (const bracket of data.brackets) {
    for (const match of bracket.matches) {
      if (match.winner === null) continue;
      if (match.playerA === player) {
        const rec = ensure(match.playerB);
        rec.total += 1;
        if (match.winner === player) rec.wins += 1;
        else rec.losses += 1;
      } else if (match.playerB === player) {
        const rec = ensure(match.playerA);
        rec.total += 1;
        if (match.winner === player) rec.wins += 1;
        else rec.losses += 1;
      }
    }
  }

  const entries = Array.from(map.values());
  for (const e of entries) {
    e.winRate = e.total === 0 ? 0 : e.wins / e.total;
  }
  entries.sort((x, y) => y.wins - x.wins || y.winRate - x.winRate);
  return entries;
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
