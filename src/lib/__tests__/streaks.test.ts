import { describe, it, expect } from 'vitest';
import { computePlayerStreak, computeHeadToHead, computeLeaderboard } from '../stats';
import type { MatchupData } from '../../types';

// ── Streak tests ─────────────────────────────────────────────────

describe('computePlayerStreak', () => {
  it('returns none streak for a player with no matches', () => {
    const empty: MatchupData = { exportedAt: '', brackets: [] };
    const result = computePlayerStreak(empty, 'Nobody');
    expect(result.currentType).toBe('none');
    expect(result.currentCount).toBe(0);
    expect(result.longestWinStreak).toBe(0);
  });

  it('detects a current win streak', () => {
    const data: MatchupData = {
      exportedAt: '',
      brackets: [
        {
          id: 'b1', name: 'B1', type: 'single-elimination', createdAt: '2026-07-01',
          matches: [
            { id: 'm1', round: 1, playerA: 'Alice', playerB: 'Bob', winner: 'Alice', scoreA: 2, scoreB: 0 },
            { id: 'm2', round: 2, playerA: 'Alice', playerB: 'Carol', winner: 'Alice', scoreA: 2, scoreB: 1 },
            { id: 'm3', round: 3, playerA: 'Alice', playerB: 'Dave', winner: 'Alice', scoreA: 2, scoreB: 0 },
          ],
        },
      ],
    };
    const result = computePlayerStreak(data, 'Alice');
    expect(result.currentType).toBe('win');
    expect(result.currentCount).toBe(3);
    expect(result.longestWinStreak).toBe(3);
  });

  it('detects a current loss streak', () => {
    const data: MatchupData = {
      exportedAt: '',
      brackets: [
        {
          id: 'b1', name: 'B1', type: 'single-elimination', createdAt: '2026-07-01',
          matches: [
            { id: 'm1', round: 1, playerA: 'Alice', playerB: 'Bob', winner: 'Bob', scoreA: 0, scoreB: 2 },
            { id: 'm2', round: 2, playerA: 'Alice', playerB: 'Carol', winner: 'Carol', scoreA: 1, scoreB: 2 },
          ],
        },
      ],
    };
    const result = computePlayerStreak(data, 'Alice');
    expect(result.currentType).toBe('loss');
    expect(result.currentCount).toBe(2);
    expect(result.longestWinStreak).toBe(0);
  });

  it('finds longest win streak that is not the current streak', () => {
    // Alice won 3, then lost 1, then won 1
    // Longest = 3, current = 1W
    const data: MatchupData = {
      exportedAt: '',
      brackets: [
        {
          id: 'b1', name: 'B1', type: 'single-elimination', createdAt: '2026-07-01',
          matches: [
            { id: 'm1', round: 1, playerA: 'Alice', playerB: 'Bob', winner: 'Alice', scoreA: 2, scoreB: 0 },
            { id: 'm2', round: 1, playerA: 'Alice', playerB: 'Carol', winner: 'Alice', scoreA: 2, scoreB: 1 },
            { id: 'm3', round: 2, playerA: 'Alice', playerB: 'Dave', winner: 'Alice', scoreA: 2, scoreB: 0 },
            { id: 'm4', round: 2, playerA: 'Alice', playerB: 'Eve', winner: 'Eve', scoreA: 0, scoreB: 2 },
            { id: 'm5', round: 3, playerA: 'Alice', playerB: 'Frank', winner: 'Alice', scoreA: 2, scoreB: 1 },
          ],
        },
      ],
    };
    const result = computePlayerStreak(data, 'Alice');
    expect(result.currentType).toBe('win');
    expect(result.currentCount).toBe(1);
    expect(result.longestWinStreak).toBe(3);
  });

  it('orders matches chronologically across brackets', () => {
    // Two brackets: early bracket has a loss, later bracket has 2 wins
    // Current streak should be 2W (from the later bracket)
    const data: MatchupData = {
      exportedAt: '',
      brackets: [
        {
          id: 'b1', name: 'B1', type: 'single-elimination', createdAt: '2026-06-01',
          matches: [
            { id: 'm1', round: 1, playerA: 'Alice', playerB: 'Bob', winner: 'Bob', scoreA: 0, scoreB: 2 },
          ],
        },
        {
          id: 'b2', name: 'B2', type: 'single-elimination', createdAt: '2026-07-01',
          matches: [
            { id: 'm2', round: 1, playerA: 'Alice', playerB: 'Carol', winner: 'Alice', scoreA: 2, scoreB: 1 },
            { id: 'm3', round: 2, playerA: 'Alice', playerB: 'Dave', winner: 'Alice', scoreA: 2, scoreB: 0 },
          ],
        },
      ],
    };
    const result = computePlayerStreak(data, 'Alice');
    expect(result.currentType).toBe('win');
    expect(result.currentCount).toBe(2);
    expect(result.longestWinStreak).toBe(2);
  });

  it('break ties in createdAt by sorting by round', () => {
    // Same bracket, same createdAt — round order matters
    const data: MatchupData = {
      exportedAt: '',
      brackets: [
        {
          id: 'b1', name: 'B1', type: 'single-elimination', createdAt: '2026-07-01',
          matches: [
            { id: 'm2', round: 2, playerA: 'Alice', playerB: 'Carol', winner: 'Alice', scoreA: 2, scoreB: 1 },
            { id: 'm1', round: 1, playerA: 'Alice', playerB: 'Bob', winner: 'Bob', scoreA: 0, scoreB: 2 },
          ],
        },
      ],
    };
    const result = computePlayerStreak(data, 'Alice');
    // Chronological: m1 (round 1, loss), m2 (round 2, win) → current streak = 1W
    expect(result.currentType).toBe('win');
    expect(result.currentCount).toBe(1);
    expect(result.longestWinStreak).toBe(1);
  });
});

// ── Enhanced H2H tests ──────────────────────────────────────────

describe('computeHeadToHead enhanced stats', () => {
  it('computes last winner and current streak for a pair', () => {
    const data: MatchupData = {
      exportedAt: '',
      brackets: [
        {
          id: 'b1', name: 'B1', type: 'single-elimination', createdAt: '2026-07-01',
          matches: [
            { id: 'm1', round: 1, playerA: 'Alice', playerB: 'Bob', winner: 'Alice', scoreA: 2, scoreB: 1 },
            { id: 'm2', round: 2, playerA: 'Alice', playerB: 'Bob', winner: 'Alice', scoreA: 2, scoreB: 0 },
            { id: 'm3', round: 3, playerA: 'Alice', playerB: 'Bob', winner: 'Bob', scoreA: 0, scoreB: 2 },
          ],
        },
      ],
    };
    const result = computeHeadToHead(data);
    const rec = result.find((r) => r.playerA === 'Alice' && r.playerB === 'Bob')!;
    expect(rec.lastWinner).toBe('Bob');
    expect(rec.currentStreakPlayer).toBe('Bob');
    expect(rec.currentStreakCount).toBe(1);
  });

  it('computes avg margin and biggest win', () => {
    const data: MatchupData = {
      exportedAt: '',
      brackets: [
        {
          id: 'b1', name: 'B1', type: 'single-elimination', createdAt: '2026-07-01',
          matches: [
            { id: 'm1', round: 1, playerA: 'Alice', playerB: 'Bob', winner: 'Alice', scoreA: 2, scoreB: 0 },
            { id: 'm2', round: 2, playerA: 'Alice', playerB: 'Bob', winner: 'Bob', scoreA: 1, scoreB: 2 },
          ],
        },
      ],
    };
    const result = computeHeadToHead(data);
    const rec = result.find((r) => r.playerA === 'Alice' && r.playerB === 'Bob')!;
    // Margins: |2-0|=2 (Alice won), |1-2|=1 (Bob won)
    expect(rec.avgMargin).toBeCloseTo(1.5);
    expect(rec.biggestWinMargin).toBe(2);
    expect(rec.biggestWinner).toBe('Alice');
  });

  it('handles matches with null scores gracefully', () => {
    const data: MatchupData = {
      exportedAt: '',
      brackets: [
        {
          id: 'b1', name: 'B1', type: 'single-elimination', createdAt: '2026-07-01',
          matches: [
            { id: 'm1', round: 1, playerA: 'Alice', playerB: 'Bob', winner: 'Alice', scoreA: null, scoreB: null },
          ],
        },
      ],
    };
    const result = computeHeadToHead(data);
    const rec = result.find((r) => r.playerA === 'Alice' && r.playerB === 'Bob')!;
    expect(rec.avgMargin).toBeNull();
    expect(rec.biggestWinMargin).toBeNull();
    expect(rec.biggestWinner).toBeNull();
  });

  it('handles empty data', () => {
    const empty: MatchupData = { exportedAt: '', brackets: [] };
    expect(computeHeadToHead(empty)).toEqual([]);
  });
});

// ── Leaderboard streak integration ───────────────────────────────

describe('computeLeaderboard streaks', () => {
  it('includes current and longest streak in leaderboard entries', () => {
    const data: MatchupData = {
      exportedAt: '',
      brackets: [
        {
          id: 'b1', name: 'B1', type: 'single-elimination', createdAt: '2026-07-01',
          matches: [
            { id: 'm1', round: 1, playerA: 'Alice', playerB: 'Bob', winner: 'Alice', scoreA: 2, scoreB: 0 },
            { id: 'm2', round: 2, playerA: 'Alice', playerB: 'Bob', winner: 'Alice', scoreA: 2, scoreB: 1 },
          ],
        },
      ],
    };
    const result = computeLeaderboard(data);
    const alice = result.find((e) => e.player === 'Alice')!;
    expect(alice.currentStreakType).toBe('win');
    expect(alice.currentStreakCount).toBe(2);
    expect(alice.longestWinStreak).toBe(2);

    const bob = result.find((e) => e.player === 'Bob')!;
    expect(bob.currentStreakType).toBe('loss');
    expect(bob.currentStreakCount).toBe(2);
    expect(bob.longestWinStreak).toBe(0);
  });
});