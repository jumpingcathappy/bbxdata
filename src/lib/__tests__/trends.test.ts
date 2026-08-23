import { describe, it, expect } from 'vitest';
import { computeWinRateTrend } from '../stats';
import type { MatchupData } from '../../types';

describe('computeWinRateTrend', () => {
  it('returns empty array for empty data', () => {
    const empty: MatchupData = { exportedAt: '', brackets: [] };
    expect(computeWinRateTrend(empty)).toEqual([]);
  });

  it('computes cumulative win rate per player chronologically', () => {
    const data: MatchupData = {
      exportedAt: '',
      brackets: [
        {
          id: 'b1', name: 'B1', type: 'single-elimination', createdAt: '2026-07-01',
          matches: [
            { id: 'm1', round: 1, playerA: 'Alice', playerB: 'Bob', winner: 'Alice', scoreA: 2, scoreB: 0 },
            { id: 'm2', round: 2, playerA: 'Alice', playerB: 'Carol', winner: 'Alice', scoreA: 2, scoreB: 1 },
            { id: 'm3', round: 3, playerA: 'Alice', playerB: 'Bob', winner: 'Bob', scoreA: 0, scoreB: 2 },
          ],
        },
      ],
    };
    const result = computeWinRateTrend(data);
    const alice = result.find((t) => t.player === 'Alice')!;
    expect(alice.points.length).toBe(3);
    // Match 1: win → 1/1 = 1.0
    expect(alice.points[0].winRate).toBe(1);
    expect(alice.points[0].won).toBe(true);
    expect(alice.points[0].opponent).toBe('Bob');
    // Match 2: win → 2/2 = 1.0
    expect(alice.points[1].winRate).toBe(1);
    // Match 3: loss → 2/3 ≈ 0.667
    expect(alice.points[2].winRate).toBeCloseTo(2 / 3, 5);
    expect(alice.points[2].won).toBe(false);
  });

  it('sorts points chronologically by bracket date then round', () => {
    const data: MatchupData = {
      exportedAt: '',
      brackets: [
        {
          id: 'b2', name: 'Later', type: 'single-elimination', createdAt: '2026-08-01',
          matches: [
            { id: 'm3', round: 1, playerA: 'Alice', playerB: 'Dave', winner: 'Alice', scoreA: 2, scoreB: 0 },
          ],
        },
        {
          id: 'b1', name: 'Earlier', type: 'single-elimination', createdAt: '2026-07-01',
          matches: [
            { id: 'm1', round: 2, playerA: 'Alice', playerB: 'Bob', winner: 'Bob', scoreA: 0, scoreB: 2 },
            { id: 'm2', round: 1, playerA: 'Alice', playerB: 'Carol', winner: 'Alice', scoreA: 2, scoreB: 1 },
          ],
        },
      ],
    };
    const result = computeWinRateTrend(data);
    const alice = result.find((t) => t.player === 'Alice')!;
    // Chronological: b1 round 1 (win vs Carol), b1 round 2 (loss vs Bob), b2 round 1 (win vs Dave)
    expect(alice.points[0].opponent).toBe('Carol');
    expect(alice.points[0].won).toBe(true);
    expect(alice.points[1].opponent).toBe('Bob');
    expect(alice.points[1].won).toBe(false);
    expect(alice.points[2].opponent).toBe('Dave');
    expect(alice.points[2].won).toBe(true);
  });

  it('includes both players from each match', () => {
    const data: MatchupData = {
      exportedAt: '',
      brackets: [
        {
          id: 'b1', name: 'B1', type: 'single-elimination', createdAt: '2026-07-01',
          matches: [
            { id: 'm1', round: 1, playerA: 'Alice', playerB: 'Bob', winner: 'Alice', scoreA: 2, scoreB: 1 },
          ],
        },
      ],
    };
    const result = computeWinRateTrend(data);
    expect(result.length).toBe(2);
    const alice = result.find((t) => t.player === 'Alice')!;
    const bob = result.find((t) => t.player === 'Bob')!;
    expect(alice.points[0].winRate).toBe(1);
    expect(bob.points[0].winRate).toBe(0);
  });

  it('sorts players by total matches (most active first)', () => {
    const data: MatchupData = {
      exportedAt: '',
      brackets: [
        {
          id: 'b1', name: 'B1', type: 'single-elimination', createdAt: '2026-07-01',
          matches: [
            { id: 'm1', round: 1, playerA: 'Alice', playerB: 'Bob', winner: 'Alice', scoreA: 2, scoreB: 0 },
            { id: 'm2', round: 2, playerA: 'Alice', playerB: 'Carol', winner: 'Alice', scoreA: 2, scoreB: 1 },
            { id: 'm3', round: 3, playerA: 'Bob', playerB: 'Carol', winner: 'Bob', scoreA: 2, scoreB: 0 },
          ],
        },
      ],
    };
    const result = computeWinRateTrend(data);
    // Alice: 2 matches, Bob: 2 matches, Carol: 2 matches — all equal
    expect(result.length).toBe(3);
    // Alice should be first (2 matches, same as others but appears first in data)
    expect(result[0].player).toBe('Alice');
  });

  it('skips undecided matches', () => {
    const data: MatchupData = {
      exportedAt: '',
      brackets: [
        {
          id: 'b1', name: 'B1', type: 'single-elimination', createdAt: '2026-07-01',
          matches: [
            { id: 'm1', round: 1, playerA: 'Alice', playerB: 'Bob', winner: 'Alice', scoreA: 2, scoreB: 0 },
            { id: 'm2', round: 2, playerA: 'Alice', playerB: 'Bob', winner: null, scoreA: null, scoreB: null },
          ],
        },
      ],
    };
    const result = computeWinRateTrend(data);
    const alice = result.find((t) => t.player === 'Alice')!;
    // Only 1 decided match → 1 trend point
    expect(alice.points.length).toBe(1);
    expect(alice.points[0].winRate).toBe(1);
  });
});