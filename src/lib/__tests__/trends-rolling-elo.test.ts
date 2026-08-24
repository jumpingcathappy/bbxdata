import { describe, it, expect } from 'vitest';
import { computeWinRateTrend } from '../stats';
import type { MatchupData } from '../../types';

describe('computeWinRateTrend rolling win rate', () => {
  it('computes rolling win rate over last 10 matches', () => {
    // Alice wins 5, then loses 5 (10 matches total)
    const matches = Array.from({ length: 10 }, (_, i) => ({
      id: `m${i}`, round: i + 1,
      playerA: 'Alice', playerB: 'Bob',
      winner: i < 5 ? 'Alice' : 'Bob',
      scoreA: i < 5 ? 2 : 0, scoreB: i < 5 ? 0 : 2,
    }));
    const data: MatchupData = {
      exportedAt: '',
      brackets: [{ id: 'b1', name: 'B1', type: 'single-elimination', createdAt: '2026-07-01', matches }],
    };
    const result = computeWinRateTrend(data);
    const alice = result.find((t) => t.player === 'Alice')!;

    // After 5 wins, rolling = 100%
    expect(alice.points[4].rollingWinRate).toBe(1);
    // After 5 wins + 5 losses (window=10), rolling = 50%
    expect(alice.points[9].rollingWinRate).toBeCloseTo(0.5, 10);
  });

  it('rolling window only looks at last 10 matches', () => {
    // Alice wins 10, then loses 1 (11 matches)
    const matches = Array.from({ length: 11 }, (_, i) => ({
      id: `m${i}`, round: i + 1,
      playerA: 'Alice', playerB: 'Bob',
      winner: i < 10 ? 'Alice' : 'Bob',
      scoreA: i < 10 ? 2 : 0, scoreB: i < 10 ? 0 : 2,
    }));
    const data: MatchupData = {
      exportedAt: '',
      brackets: [{ id: 'b1', name: 'B1', type: 'single-elimination', createdAt: '2026-07-01', matches }],
    };
    const result = computeWinRateTrend(data);
    const alice = result.find((t) => t.player === 'Alice')!;

    // After match 11: window = [W,W,W,W,W,W,W,W,W,W,L] but capped at 10
    // Last 10: [W,W,W,W,W,W,W,W,W,L] → 9/10 = 0.9
    expect(alice.points[10].rollingWinRate).toBeCloseTo(0.9, 10);
    // Cumulative would be 10/11 ≈ 0.909 — different from rolling
    expect(alice.points[10].winRate).not.toBeCloseTo(0.9, 10);
  });
});

describe('computeWinRateTrend Elo', () => {
  it('starts all players at 1200', () => {
    const data: MatchupData = {
      exportedAt: '',
      brackets: [{
        id: 'b1', name: 'B1', type: 'single-elimination', createdAt: '2026-07-01',
        matches: [
          { id: 'm1', round: 1, playerA: 'Alice', playerB: 'Bob', winner: 'Alice', scoreA: 2, scoreB: 0 },
        ],
      }],
    };
    const result = computeWinRateTrend(data);
    const alice = result.find((t) => t.player === 'Alice')!;
    const bob = result.find((t) => t.player === 'Bob')!;

    // Both start at 1200, Alice wins → Alice goes up, Bob goes down
    expect(alice.points[0].opponentEloBefore).toBe(1200);
    expect(alice.points[0].elo).toBeGreaterThan(1200);
    expect(bob.points[0].elo).toBeLessThan(1200);
  });

  it('winning against a higher-rated player gives more Elo', () => {
    // Build data where Bob has already won several matches (high Elo),
    // then Alice beats Bob — Alice should gain more than beating a rookie
    const earlyMatches = Array.from({ length: 5 }, (_, i) => ({
      id: `early${i}`, round: i + 1,
      playerA: 'Bob', playerB: `Rookie${i}`,
      winner: 'Bob', scoreA: 2, scoreB: 0,
    }));
    // Now Alice beats Bob
    const lateMatch = {
      id: 'late', round: 6,
      playerA: 'Alice', playerB: 'Bob',
      winner: 'Alice', scoreA: 2, scoreB: 0,
    };
    const data: MatchupData = {
      exportedAt: '',
      brackets: [{
        id: 'b1', name: 'B1', type: 'single-elimination', createdAt: '2026-07-01',
        matches: [...earlyMatches, lateMatch],
      }],
    };
    const result = computeWinRateTrend(data);
    const alice = result.find((t) => t.player === 'Alice')!;

    // Alice's only match is the win vs Bob
    expect(alice.points.length).toBe(1);
    // Alice's Elo gain should be significant (>15) because Bob is higher-rated
    expect(alice.points[0].elo - 1200).toBeGreaterThan(15);
  });

  it('Elo changes every match regardless of total match count', () => {
    // Even at match 20+, a win/loss should still cause a visible Elo change
    const matches = Array.from({ length: 20 }, (_, i) => ({
      id: `m${i}`, round: i + 1,
      playerA: 'Alice', playerB: 'Bob',
      winner: i % 2 === 0 ? 'Alice' : 'Bob',
      scoreA: i % 2 === 0 ? 2 : 0, scoreB: i % 2 === 0 ? 0 : 2,
    }));
    const data: MatchupData = {
      exportedAt: '',
      brackets: [{ id: 'b1', name: 'B1', type: 'single-elimination', createdAt: '2026-07-01', matches }],
    };
    const result = computeWinRateTrend(data);
    const alice = result.find((t) => t.player === 'Alice')!;

    // Check the last match still has a non-zero Elo change
    const lastIdx = alice.points.length - 1;
    const prevElo = alice.points[lastIdx - 1].elo;
    const currElo = alice.points[lastIdx].elo;
    expect(Math.abs(currElo - prevElo)).toBeGreaterThan(5);
  });

  it('opponentEloBefore reflects the opponent rating at match time', () => {
    const data: MatchupData = {
      exportedAt: '',
      brackets: [{
        id: 'b1', name: 'B1', type: 'single-elimination', createdAt: '2026-07-01',
        matches: [
          { id: 'm1', round: 1, playerA: 'Alice', playerB: 'Bob', winner: 'Alice', scoreA: 2, scoreB: 0 },
          { id: 'm2', round: 2, playerA: 'Alice', playerB: 'Bob', winner: 'Alice', scoreA: 2, scoreB: 0 },
        ],
      }],
    };
    const result = computeWinRateTrend(data);
    const alice = result.find((t) => t.player === 'Alice')!;

    // First match: Bob is 1200
    expect(alice.points[0].opponentEloBefore).toBe(1200);
    // Second match: Bob lost first match, so his Elo < 1200
    expect(alice.points[1].opponentEloBefore).toBeLessThan(1200);
  });
});