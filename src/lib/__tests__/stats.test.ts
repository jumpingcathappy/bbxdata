import { describe, it, expect } from 'vitest';
import { computeOverall, computeHeadToHead, computeLeaderboard } from '../stats';
import type { MatchupData } from '../../types';

const data: MatchupData = {
  exportedAt: '2026-08-13T10:00:00Z',
  brackets: [
    {
      id: 'b1',
      name: 'B1',
      type: 'single-elimination',
      createdAt: '2026-07-01T00:00:00Z',
      matches: [
        { id: 'm1', round: 1, playerA: 'Alice', playerB: 'Bob', winner: 'Alice', scoreA: 2, scoreB: 1 },
        { id: 'm2', round: 1, playerA: 'Carol', playerB: 'Dave', winner: 'Dave', scoreA: 0, scoreB: 2 },
        { id: 'm3', round: 2, playerA: 'Alice', playerB: 'Dave', winner: 'Alice', scoreA: 2, scoreB: 0 },
        { id: 'm4', round: 2, playerA: 'Alice', playerB: 'Bob', winner: 'Bob', scoreA: 1, scoreB: 2 },
        { id: 'm5', round: 3, playerA: 'Carol', playerB: 'Dave', winner: null, scoreA: null, scoreB: null }
      ]
    }
  ]
};

describe('computeOverall', () => {
  it('counts wins, losses, total, and win rate from decided matches only', () => {
    const result = computeOverall(data);
    expect(result.wins).toBe(4);
    expect(result.losses).toBe(4);
    expect(result.total).toBe(8);
    expect(result.winRate).toBeCloseTo(0.5);
  });
});

describe('computeHeadToHead', () => {
  it('aggregates wins per unordered player pair', () => {
    const result = computeHeadToHead(data);
    const aliceBob = result.find(
      (r) =>
        (r.playerA === 'Alice' && r.playerB === 'Bob') ||
        (r.playerA === 'Bob' && r.playerB === 'Alice')
    );
    expect(aliceBob).toBeDefined();
    expect(aliceBob!.aWins).toBe(1);
    expect(aliceBob!.bWins).toBe(1);
  });
});

describe('computeHeadToHead swapped ordering', () => {
  it('routes wins correctly when the same pair has swapped player order', () => {
    const swappedData: MatchupData = {
      exportedAt: '2026-08-13T10:00:00Z',
      brackets: [
        {
          id: 'b1',
          name: 'B1',
          type: 'single-elimination',
          createdAt: '2026-07-01T00:00:00Z',
          matches: [
            { id: 'm1', round: 1, playerA: 'Bob', playerB: 'Alice', winner: 'Bob', scoreA: 2, scoreB: 1 },
            { id: 'm2', round: 1, playerA: 'Alice', playerB: 'Bob', winner: 'Alice', scoreA: 2, scoreB: 1 }
          ]
        }
      ]
    };
    const result = computeHeadToHead(swappedData);
    const rec = result.find((r) => r.playerA === 'Alice' && r.playerB === 'Bob');
    expect(rec).toBeDefined();
    expect(rec!.playerA).toBe('Alice');
    expect(rec!.playerB).toBe('Bob');
    expect(rec!.aWins).toBe(1); // Alice won once
    expect(rec!.bWins).toBe(1); // Bob won once
  });
});

describe('computeLeaderboard', () => {
  it('ranks players by wins then win rate', () => {
    const result = computeLeaderboard(data);
    expect(result[0].player).toBe('Alice');
    expect(result[0].wins).toBe(2);
    expect(result[0].losses).toBe(1);
    expect(result[0].total).toBe(3);
  });
});
