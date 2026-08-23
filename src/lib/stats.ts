import type { MatchupData, Match } from '../types';

// ── Chronological ordering helpers ──────────────────────────────

interface ChronologicalMatch {
  match: Match;
  bracketCreatedAt: string;
}

function chronoSort(a: ChronologicalMatch, b: ChronologicalMatch): number {
  const t = a.bracketCreatedAt.localeCompare(b.bracketCreatedAt);
  if (t !== 0) return t;
  return a.match.round - b.match.round;
}

function collectPlayerMatches(data: MatchupData, player: string): ChronologicalMatch[] {
  const out: ChronologicalMatch[] = [];
  for (const bracket of data.brackets) {
    for (const match of bracket.matches) {
      if (match.winner === null) continue;
      if (match.playerA === player || match.playerB === player) {
        out.push({ match, bracketCreatedAt: bracket.createdAt });
      }
    }
  }
  out.sort(chronoSort);
  return out;
}

function collectPairMatches(
  data: MatchupData,
  playerA: string,
  playerB: string,
): ChronologicalMatch[] {
  const out: ChronologicalMatch[] = [];
  for (const bracket of data.brackets) {
    for (const match of bracket.matches) {
      if (match.winner === null) continue;
      const isPair =
        (match.playerA === playerA && match.playerB === playerB) ||
        (match.playerA === playerB && match.playerB === playerA);
      if (isPair) out.push({ match, bracketCreatedAt: bracket.createdAt });
    }
  }
  out.sort(chronoSort);
  return out;
}

// ── Streak computation ────────────────────────────────────────────

export interface PlayerStreak {
  currentType: 'win' | 'loss' | 'none';
  currentCount: number;
  longestWinStreak: number;
}

export function computePlayerStreak(data: MatchupData, player: string): PlayerStreak {
  const matches = collectPlayerMatches(data, player);
  if (matches.length === 0) {
    return { currentType: 'none', currentCount: 0, longestWinStreak: 0 };
  }

  // Longest win streak
  let longest = 0;
  let run = 0;
  for (const cm of matches) {
    if (cm.match.winner === player) {
      run++;
      if (run > longest) longest = run;
    } else {
      run = 0;
    }
  }

  // Current streak (from the most recent match, scanning backwards)
  const lastWasWin = matches[matches.length - 1].match.winner === player;
  let count = 0;
  for (let i = matches.length - 1; i >= 0; i--) {
    const isWin = matches[i].match.winner === player;
    if (isWin === lastWasWin) count++;
    else break;
  }

  return {
    currentType: lastWasWin ? 'win' : 'loss',
    currentCount: count,
    longestWinStreak: longest,
  };
}

// ── Overall stats ────────────────────────────────────────────────

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

// ── Head-to-Head ─────────────────────────────────────────────────

export interface HeadToHeadRecord {
  playerA: string;
  playerB: string;
  aWins: number;
  bWins: number;
  winRate: number;
  currentStreakPlayer: string | null;
  currentStreakCount: number;
  lastWinner: string | null;
  avgMargin: number | null;
  biggestWinMargin: number | null;
  biggestWinner: string | null;
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
        rec = {
          playerA, playerB,
          aWins: 0, bWins: 0, winRate: 0,
          currentStreakPlayer: null,
          currentStreakCount: 0,
          lastWinner: null,
          avgMargin: null,
          biggestWinMargin: null,
          biggestWinner: null,
        };
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

    // Enhanced stats: chronological matches between this pair
    const chrono = collectPairMatches(data, r.playerA, r.playerB);
    if (chrono.length > 0) {
      // Last winner
      r.lastWinner = chrono[chrono.length - 1].match.winner;

      // Current streak: scan backwards from most recent
      const lastWinner = chrono[chrono.length - 1].match.winner;
      let streakCount = 0;
      for (let i = chrono.length - 1; i >= 0; i--) {
        if (chrono[i].match.winner === lastWinner) streakCount++;
        else break;
      }
      r.currentStreakPlayer = lastWinner;
      r.currentStreakCount = streakCount;

      // Score margins
      const margins: { winner: string; margin: number }[] = [];
      for (const cm of chrono) {
        const m = cm.match;
        if (m.scoreA !== null && m.scoreB !== null) {
          const margin = Math.abs(m.scoreA - m.scoreB);
          margins.push({ winner: m.winner!, margin });
        }
      }
      if (margins.length > 0) {
        r.avgMargin = margins.reduce((s, x) => s + x.margin, 0) / margins.length;
        const biggest = margins.reduce((best, x) => (x.margin > best.margin ? x : best));
        r.biggestWinMargin = biggest.margin;
        r.biggestWinner = biggest.winner;
      }
    }
  }

  return records;
}

// ── Leaderboard ──────────────────────────────────────────────────

export interface LeaderboardEntry {
  player: string;
  wins: number;
  losses: number;
  total: number;
  winRate: number;
  currentStreakType: 'win' | 'loss' | 'none';
  currentStreakCount: number;
  longestWinStreak: number;
}

export interface PlayerMatchup {
  opponent: string;
  wins: number;
  losses: number;
  total: number;
  winRate: number;
  currentStreakType: 'win' | 'loss' | 'none';
  currentStreakCount: number;
  lastResult: 'win' | 'loss' | null;
  avgMargin: number | null;
}

export function computePlayerMatchups(
  data: MatchupData,
  player: string,
): PlayerMatchup[] {
  const map = new Map<string, PlayerMatchup>();
  const ensure = (opponent: string): PlayerMatchup => {
    let e = map.get(opponent);
    if (!e) {
      e = {
        opponent, wins: 0, losses: 0, total: 0, winRate: 0,
        currentStreakType: 'none', currentStreakCount: 0,
        lastResult: null, avgMargin: null,
      };
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

    // Chronological matches between player and this opponent
    const chrono = collectPairMatches(data, player, e.opponent);
    if (chrono.length > 0) {
      // Last result from player's perspective
      const last = chrono[chrono.length - 1];
      e.lastResult = last.match.winner === player ? 'win' : 'loss';

      // Current streak from player's perspective
      const lastWasWin = last.match.winner === player;
      let count = 0;
      for (let i = chrono.length - 1; i >= 0; i--) {
        const isWin = chrono[i].match.winner === player;
        if (isWin === lastWasWin) count++;
        else break;
      }
      e.currentStreakType = lastWasWin ? 'win' : 'loss';
      e.currentStreakCount = count;

      // Average margin from player's perspective (positive = player wins by more)
      const scored = chrono.filter(
        (cm) => cm.match.scoreA !== null && cm.match.scoreB !== null,
      );
      if (scored.length > 0) {
        const playerScore = (cm: typeof scored[number]) => {
          return cm.match.playerA === player ? cm.match.scoreA! : cm.match.scoreB!;
        };
        const oppScore = (cm: typeof scored[number]) => {
          return cm.match.playerA === player ? cm.match.scoreB! : cm.match.scoreA!;
        };
        e.avgMargin = scored.reduce((s, cm) => s + (playerScore(cm) - oppScore(cm)), 0) / scored.length;
      }
    }
  }

  entries.sort((x, y) => y.wins - x.wins || y.winRate - x.winRate);
  return entries;
}

export function computeLeaderboard(data: MatchupData): LeaderboardEntry[] {
  const map = new Map<string, LeaderboardEntry>();
  const ensure = (name: string): LeaderboardEntry => {
    let e = map.get(name);
    if (!e) {
      e = {
        player: name, wins: 0, losses: 0, total: 0, winRate: 0,
        currentStreakType: 'none', currentStreakCount: 0, longestWinStreak: 0,
      };
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
    const streak = computePlayerStreak(data, e.player);
    e.currentStreakType = streak.currentType;
    e.currentStreakCount = streak.currentCount;
    e.longestWinStreak = streak.longestWinStreak;
  }

  entries.sort((x, y) => y.wins - x.wins || y.winRate - x.winRate);
  return entries;
}