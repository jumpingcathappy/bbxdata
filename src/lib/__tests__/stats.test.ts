import { describe, it, expect } from 'vitest';
import { computeOverall, computeHeadToHead, computeLeaderboard, computePlayerMatchups } from '../stats';
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
  it('counts decided, undecided, and total matches', () => {
    const result = computeOverall(data);
    expect(result.decided).toBe(4);
    expect(result.undecided).toBe(1);
    expect(result.total).toBe(5);
  });
});

describe('computeOverall edge cases', () => {
  it('returns zeros for empty data', () => {
    const empty: MatchupData = { exportedAt: '', brackets: [] };
    expect(computeOverall(empty)).toEqual({ decided: 0, undecided: 0, total: 0 });
  });

  it('counts all matches as undecided when no winners', () => {
    const allUndecided: MatchupData = {
      exportedAt: '',
      brackets: [
        {
          id: 'b1', name: 'B1', type: 'single-elimination', createdAt: '',
          matches: [
            { id: 'm1', round: 1, playerA: 'A', playerB: 'B', winner: null, scoreA: null, scoreB: null }
          ]
        }
      ]
    };
    expect(computeOverall(allUndecided)).toEqual({ decided: 0, undecided: 1, total: 1 });
  });
});

describe('computeLeaderboard edge cases', () => {
  it('returns empty array for empty data', () => {
    const empty: MatchupData = { exportedAt: '', brackets: [] };
    expect(computeLeaderboard(empty)).toEqual([]);
  });

  it('shows a winless player with 0% win rate', () => {
    const winless: MatchupData = {
      exportedAt: '',
      brackets: [
        {
          id: 'b1', name: 'B1', type: 'single-elimination', createdAt: '',
          matches: [
            { id: 'm1', round: 1, playerA: 'Alice', playerB: 'Bob', winner: 'Bob', scoreA: 0, scoreB: 2 }
          ]
        }
      ]
    };
    const result = computeLeaderboard(winless);
    const alice = result.find((e) => e.player === 'Alice');
    expect(alice).toBeDefined();
    expect(alice!.wins).toBe(0);
    expect(alice!.losses).toBe(1);
    expect(alice!.winRate).toBe(0);
  });

  it('aggregates a player across multiple brackets', () => {
    const multi: MatchupData = {
      exportedAt: '',
      brackets: [
        {
          id: 'b1', name: 'B1', type: 'single-elimination', createdAt: '',
          matches: [
            { id: 'm1', round: 1, playerA: 'Alice', playerB: 'Bob', winner: 'Alice', scoreA: 2, scoreB: 0 }
          ]
        },
        {
          id: 'b2', name: 'B2', type: 'single-elimination', createdAt: '',
          matches: [
            { id: 'm2', round: 1, playerA: 'Alice', playerB: 'Carol', winner: 'Alice', scoreA: 2, scoreB: 1 }
          ]
        }
      ]
    };
    const result = computeLeaderboard(multi);
    const alice = result.find((e) => e.player === 'Alice');
    expect(alice!.wins).toBe(2);
    expect(alice!.total).toBe(2);
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

describe('computeHeadToHead win rate', () => {
  it('computes playerA win rate as aWins / (aWins + bWins)', () => {
    const h2hData: MatchupData = {
      exportedAt: '2026-08-13T10:00:00Z',
      brackets: [
        {
          id: 'b1',
          name: 'B1',
          type: 'single-elimination',
          createdAt: '2026-07-01T00:00:00Z',
          matches: [
            { id: 'm1', round: 1, playerA: 'Alice', playerB: 'Bob', winner: 'Alice', scoreA: 2, scoreB: 1 },
            { id: 'm2', round: 1, playerA: 'Alice', playerB: 'Bob', winner: 'Alice', scoreA: 2, scoreB: 0 },
            { id: 'm3', round: 1, playerA: 'Alice', playerB: 'Bob', winner: 'Bob', scoreA: 1, scoreB: 2 }
          ]
        }
      ]
    };
    const result = computeHeadToHead(h2hData);
    const rec = result.find((r) => r.playerA === 'Alice' && r.playerB === 'Bob');
    expect(rec).toBeDefined();
    expect(rec!.aWins).toBe(2);
    expect(rec!.bWins).toBe(1);
    expect(rec!.winRate).toBeCloseTo(2 / 3);
  });

  it('returns 0 win rate when no matches between the pair', () => {
    const empty: MatchupData = { exportedAt: '', brackets: [] };
    expect(computeHeadToHead(empty)).toEqual([]);
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

describe('computePlayerMatchups', () => {
  it('shows a player record from their perspective regardless of A/B slot', () => {
    const result = computePlayerMatchups(data, 'Alice');
    // Alice vs Bob: Alice won m1, Bob won m4 -> 1-1
    const bob = result.find((r) => r.opponent === 'Bob');
    expect(bob).toBeDefined();
    expect(bob!.wins).toBe(1);
    expect(bob!.losses).toBe(1);
    expect(bob!.total).toBe(2);
    expect(bob!.winRate).toBeCloseTo(0.5);
    // Alice vs Dave: Alice won m3 -> 1-0
    const dave = result.find((r) => r.opponent === 'Dave');
    expect(dave).toBeDefined();
    expect(dave!.wins).toBe(1);
    expect(dave!.losses).toBe(0);
    expect(dave!.winRate).toBe(1);
  });

  it('returns empty array for a player with no matches', () => {
    expect(computePlayerMatchups(data, 'Nobody')).toEqual([]);
  });
});
