import type { MatchupData, Match } from '../types';

// ── Effective date: prefer date embedded in bracket name ─────────

// Extract a YYYYMMDD date from the bracket name, e.g. "adhoc 最強 20261023".
// Returns it as a sortable string ("2026-10-23") or null when absent/invalid.
export function extractNameDate(name: string): string | null {
  const m = name.match(/\b(20\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\b/);
  if (!m) return null;
  const date = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00Z`);
  // Guard against impossible dates like 2026-02-30 (Date silently rolls over)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== `${m[1]}-${m[2]}-${m[3]}`) {
    return null;
  }
  return `${m[1]}-${m[2]}-${m[3]}`;
}

/**
 * Effective date used for chronological ordering of a bracket's matches.
 * The lvup.gg API only exposes bracket creation time, but brackets are often
 * created before (or long after) they are actually played. Players embed the
 * real play date in the bracket name ("adhoc 盃20260813-1"); when present it
 * wins, otherwise we fall back to the best available signal: createdAt.
 */
export function effectiveBracketDate(bracket: { name: string; createdAt: string }): string {
  const nameDate = extractNameDate(bracket.name);
  return nameDate ?? bracket.createdAt;
}

// ── Chronological ordering helpers ──────────────────────────────

interface ChronologicalMatch {
  match: Match;
  bracketDate: string;
}

function chronoSort(a: ChronologicalMatch, b: ChronologicalMatch): number {
  const t = a.bracketDate.localeCompare(b.bracketDate);
  if (t !== 0) return t;
  return a.match.round - b.match.round;
}

function collectPlayerMatches(data: MatchupData, player: string): ChronologicalMatch[] {
  const out: ChronologicalMatch[] = [];
  for (const bracket of data.brackets) {
    for (const match of bracket.matches) {
      if (match.winner === null) continue;
      if (match.playerA === player || match.playerB === player) {
        out.push({ match, bracketDate: effectiveBracketDate(bracket) });
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
      if (isPair) out.push({ match, bracketDate: effectiveBracketDate(bracket) });
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

// ── Win rate trend ───────────────────────────────────────────────

export interface TrendPoint {
  matchIndex: number;     // 1-based sequential index across the player's matches
  winRate: number;        // cumulative wins / total matches so far (0–1)
  rollingWinRate: number;  // rolling window win rate (last N matches, 0–1)
  elo: number;            // Elo rating after this match
  wins: number;
  total: number;
  opponent: string;
  opponentEloBefore: number; // opponent's Elo before this match (for context)
  won: boolean;
}

export interface PlayerTrend {
  player: string;
  points: TrendPoint[];
}

const ROLLING_WINDOW = 10;
const ELO_START = 1200;
const ELO_K = 32;

export function computeWinRateTrend(data: MatchupData): PlayerTrend[] {
  // Collect all matches with the bracket's effective date for sorting
  interface Entry { player: string; opponent: string; won: boolean; bracketDate: string; round: number; }
  const entries: Entry[] = [];
  for (const bracket of data.brackets) {
    const bracketDate = effectiveBracketDate(bracket);
    for (const match of bracket.matches) {
      if (match.winner === null) continue;
      const wonA = match.winner === match.playerA;
      entries.push({ player: match.playerA, opponent: match.playerB, won: wonA, bracketDate, round: match.round });
      entries.push({ player: match.playerB, opponent: match.playerA, won: !wonA, bracketDate, round: match.round });
    }
  }

  // Sort chronologically
  entries.sort((a, b) => {
    const t = a.bracketDate.localeCompare(b.bracketDate);
    if (t !== 0) return t;
    return a.round - b.round;
  });

  // Per-player state
  const cumulative = new Map<string, { wins: number; total: number }>();
  const rolling = new Map<string, boolean[]>(); // recent results (true=win)
  const eloMap = new Map<string, number>();      // current Elo per player
  const trends = new Map<string, TrendPoint[]>();

  const ensure = (name: string): TrendPoint[] => {
    let arr = trends.get(name);
    if (!arr) { arr = []; trends.set(name, arr); }
    return arr;
  };

  for (const e of entries) {
    // Cumulative
    const c = cumulative.get(e.player) ?? { wins: 0, total: 0 };
    c.total += 1;
    if (e.won) c.wins += 1;
    cumulative.set(e.player, c);

    // Rolling window
    const r = rolling.get(e.player) ?? [];
    r.push(e.won);
    if (r.length > ROLLING_WINDOW) r.shift();
    rolling.set(e.player, r);
    const rollingWins = r.filter(Boolean).length;
    const rollingRate = rollingWins / r.length;

    // Elo — both players must have an Elo before we can compute the update
    const playerElo = eloMap.get(e.player) ?? ELO_START;
    const oppElo = eloMap.get(e.opponent) ?? ELO_START;

    // Expected score
    const expected = 1 / (1 + Math.pow(10, (oppElo - playerElo) / 400));
    const actual = e.won ? 1 : 0;
    const newElo = playerElo + ELO_K * (actual - expected);

    // Store opponent's Elo before this match for context
    const oppEloBefore = oppElo;

    eloMap.set(e.player, newElo);

    const arr = ensure(e.player);
    arr.push({
      matchIndex: arr.length + 1,
      winRate: c.wins / c.total,
      rollingWinRate: rollingRate,
      elo: Math.round(newElo),
      wins: c.wins,
      total: c.total,
      opponent: e.opponent,
      opponentEloBefore: Math.round(oppEloBefore),
      won: e.won,
    });
  }

  const result = Array.from(trends.entries()).map(([player, points]) => ({ player, points }));
  result.sort((a, b) => b.points.length - a.points.length);
  return result;
}

// ── Elo Ratings ──────────────────────────────────────────────────

export interface EloRating {
  player: string;
  elo: number;
}
export function computeEloRatings(data: MatchupData): EloRating[] {
  const eloMap = new Map<string, number>();

  // Collect all decided matches with the bracket's effective date for chronological sort
  interface Entry { playerA: string; playerB: string; winner: string; bracketDate: string; round: number; }
  const entries: Entry[] = [];
  for (const bracket of data.brackets) {
    const bracketDate = effectiveBracketDate(bracket);
    for (const match of bracket.matches) {
      if (match.winner === null) continue;
      entries.push({
        playerA: match.playerA,
        playerB: match.playerB,
        winner: match.winner,
        bracketDate,
        round: match.round,
      });
    }
  }
  entries.sort((a, b) => {
    const t = a.bracketDate.localeCompare(b.bracketDate);
    if (t !== 0) return t;
    return a.round - b.round;
  });

  // Replay each match to compute final Elo
  for (const e of entries) {
    const aElo = eloMap.get(e.playerA) ?? ELO_START;
    const bElo = eloMap.get(e.playerB) ?? ELO_START;

    const expectedA = 1 / (1 + Math.pow(10, (bElo - aElo) / 400));
    const expectedB = 1 / (1 + Math.pow(10, (aElo - bElo) / 400));

    const actualA = e.winner === e.playerA ? 1 : 0;
    const actualB = e.winner === e.playerB ? 1 : 0;

    eloMap.set(e.playerA, aElo + ELO_K * (actualA - expectedA));
    eloMap.set(e.playerB, bElo + ELO_K * (actualB - expectedB));
  }

  const ratings: EloRating[] = [];
  for (const [player, elo] of eloMap.entries()) {
    ratings.push({ player, elo: Math.round(elo) });
  }
  // Sort by Elo descending
  ratings.sort((a, b) => b.elo - a.elo);
  return ratings;
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
// ── Player profile: Elo timeline + match history ─────────────────

export interface PlayerMatchRecord {
  date: string;          // effective play date (from bracket name or createdAt)
  tournament: string;    // bracket name
  bracketId: string;
  round: number;
  opponent: string;
  won: boolean;
  playerScore: number | null;
  opponentScore: number | null;
  eloBefore: number;     // rounded, 1200 start
  eloAfter: number;
  eloDelta: number;      // after - before, rounded
}

export interface PlayerOpponentElo {
  opponent: string;
  wins: number;
  losses: number;
  total: number;
  avgEloDeltaAgainst: number | null; // mean of player's Elo delta in matches vs this opponent
}

export interface PlayerProfile {
  player: string;
  currentElo: number;
  matches: PlayerMatchRecord[];              // chronological
  opponents: PlayerOpponentElo[];            // sorted by wins desc
  peakElo: number;
  bestWin: PlayerMatchRecord | null;         // biggest positive Elo delta
  worstLoss: PlayerMatchRecord | null;       // biggest negative Elo delta
}

/**
 * Replays all decided matches chronologically (same rules as the Elo
 * leaderboard: start 1200, K 32, name-date ordering) and records, for the
 * given player, every match with tournament context and Elo before/after.
 * Players with no decided matches get an empty profile (currentElo = 1200).
 */
export function computePlayerProfile(data: MatchupData, player: string): PlayerProfile {
  const bracketById = new Map(data.brackets.map((b) => [b.id, b]));

  interface Entry {
    playerA: string; playerB: string; winner: string;
    bracketDate: string; round: number; bracketId: string;
  }
  const entries: Entry[] = [];
  for (const bracket of data.brackets) {
    const bracketDate = effectiveBracketDate(bracket);
    for (const match of bracket.matches) {
      if (match.winner === null) continue;
      entries.push({
        playerA: match.playerA,
        playerB: match.playerB,
        winner: match.winner,
        bracketDate,
        round: match.round,
        bracketId: bracket.id,
      });
    }
  }
  entries.sort((a, b) => {
    const t = a.bracketDate.localeCompare(b.bracketDate);
    if (t !== 0) return t;
    return a.round - b.round;
  });

  const eloMap = new Map<string, number>();
  const matches: PlayerMatchRecord[] = [];
  const oppStats = new Map<string, { wins: number; losses: number; deltas: number[] }>();

  for (const e of entries) {
    const aElo = eloMap.get(e.playerA) ?? ELO_START;
    const bElo = eloMap.get(e.playerB) ?? ELO_START;
    const expectedA = 1 / (1 + Math.pow(10, (bElo - aElo) / 400));
    const expectedB = 1 / (1 + Math.pow(10, (aElo - bElo) / 400));
    const actualA = e.winner === e.playerA ? 1 : 0;
    const aNew = aElo + ELO_K * (actualA - expectedA);
    const bNew = bElo + ELO_K * ((1 - actualA) - expectedB);
    eloMap.set(e.playerA, aNew);
    eloMap.set(e.playerB, bNew);

    if (e.playerA !== player && e.playerB !== player) continue;

    const isA = e.playerA === player;
    const before = Math.round(isA ? aElo : bElo);
    const after = Math.round(isA ? aNew : bNew);
    const won = e.winner === player;
    const opponent = isA ? e.playerB : e.playerA;

    const bracket = bracketById.get(e.bracketId)!;
    const match = bracket.matches.find((m) => m.round === e.round && (m.playerA === player || m.playerB === player) && (m.winner === e.winner)) ?? null;
    const playerScore = match ? (match.playerA === player ? match.scoreA : match.scoreB) : null;
    const opponentScore = match ? (match.playerA === player ? match.scoreB : match.scoreA) : null;

    matches.push({
      date: e.bracketDate,
      tournament: bracket.name,
      bracketId: e.bracketId,
      round: e.round,
      opponent,
      won,
      playerScore,
      opponentScore,
      eloBefore: before,
      eloAfter: after,
      eloDelta: after - before,
    });

    const st = oppStats.get(opponent) ?? { wins: 0, losses: 0, deltas: [] };
    if (won) st.wins += 1; else st.losses += 1;
    st.deltas.push(after - before);
    oppStats.set(opponent, st);
  }

  const opponents: PlayerOpponentElo[] = Array.from(oppStats.entries()).map(([opponent, st]) => ({
    opponent,
    wins: st.wins,
    losses: st.losses,
    total: st.wins + st.losses,
    avgEloDeltaAgainst: st.deltas.length ? st.deltas.reduce((x, y) => x + y, 0) / st.deltas.length : null,
  }));
  opponents.sort((a, b) => b.wins - a.wins || a.losses - b.losses || a.opponent.localeCompare(b.opponent));

  const currentElo = Math.round(eloMap.get(player) ?? ELO_START);
  const best = matches.reduce<PlayerMatchRecord | null>((acc, m) => (!acc || m.eloDelta > acc.eloDelta ? m : acc), null);
  const worst = matches.reduce<PlayerMatchRecord | null>((acc, m) => (!acc || m.eloDelta < acc.eloDelta ? m : acc), null);

  return {
    player,
    currentElo,
    matches,
    opponents,
    peakElo: Math.max(ELO_START, ...matches.map((m) => m.eloAfter)),
    bestWin: best && best.eloDelta > 0 ? best : null,
    worstLoss: worst && worst.eloDelta < 0 ? worst : null,
  };
}
