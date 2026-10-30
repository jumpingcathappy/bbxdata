import { describe, it, expect } from 'vitest';
import { extractNameDate, effectiveBracketDate, computeEloRatings, computePlayerStreak } from '../stats';
import type { MatchupData } from '../../types';

describe('extractNameDate', () => {
  it('extracts YYYYMMDD from the bracket name', () => {
    expect(extractNameDate('adhoc 最強 20261023')).toBe('2026-10-23');
    expect(extractNameDate('adhoc 盃20260813-1')).toBe('2026-08-13');
  });

  it('returns null for names without a date', () => {
    expect(extractNameDate('CCeP x DWII 第九屆爆旋陀螺大賽 - 傷殘盃')).toBeNull();
    expect(extractNameDate('adhoc4')).toBeNull();
  });

  it('rejects impossible dates', () => {
    expect(extractNameDate('盃 20261399')).toBeNull();
    expect(extractNameDate('盃20260230')).toBeNull();
  });
});

describe('effectiveBracketDate', () => {
  it('prefers the name date over createdAt', () => {
    expect(
      effectiveBracketDate({ name: 'adhoc 最強 20261023', createdAt: '2026-10-22T07:31:07.290Z' }),
    ).toBe('2026-10-23');
  });

  it('falls back to createdAt when the name has no date', () => {
    expect(
      effectiveBracketDate({ name: '感恩盃', createdAt: '2026-06-09T10:18:00Z' }),
    ).toBe('2026-06-09T10:18:00Z');
  });
});

describe('date-in-name ordering effect', () => {
  // Bracket B was created LAST, but per its name date was played FIRST
  // (before C, which was created earlier). Stats must replay in play order.
  const data: MatchupData = {
    exportedAt: '',
    brackets: [
      {
        id: 'C',
        name: 'Cup C', // no name date -> createdAt is its play date
        type: 'single-elimination',
        createdAt: '2026-01-10T00:00:00Z',
        matches: [
          { id: 'c1', round: 1, playerA: 'Rockman', playerB: 'Alvin', winner: 'Alvin', scoreA: 1, scoreB: 4 },
        ],
      },
      {
        id: 'B',
        name: 'adhoc 20260105', // played 2026-01-05, BEFORE Cup C
        type: 'single-elimination',
        createdAt: '2026-01-20T00:00:00Z',
        matches: [
          { id: 'b1', round: 1, playerA: 'Rockman', playerB: 'Keith', winner: 'Rockman', scoreA: 4, scoreB: 0 },
        ],
      },
    ],
  };

  it('replays Elo in play order (name date) not creation order', () => {
    const ratings = computeEloRatings(data);
    const by = new Map(ratings.map((r) => [r.player, r.elo]));
    // Play order: Rockman beats Keith (1216), then Rockman loses as 1216 vs Alvin's 1200:
    // Keith 1184, Rockman ~1199, Alvin ~1217.
    expect(by.get('Rockman')).toBe(1199);

    // The real discriminator: Alvin's Elo. In play order Alvin beats Rockman AT 1216,
    // gaining less than if he had faced a 1200 Rockman first (creation order).
    const alvinPlayOrder = 1217; // beats 1216-rated Rockman as slight underdog
    // Creation order (C first) would give Alvin 1216: beat a fresh 1200 Rockman.
    const alvinCreationOrder = 1216;
    expect(by.get('Alvin')).toBe(alvinPlayOrder);
    expect(alvinPlayOrder).not.toBe(alvinCreationOrder);
  });

  it('orders per-player matches by effective date for streaks', () => {
    // P loses vs Q played Jan 3 (name date) but bracket created Jan 20,
    // then wins vs R played Jan 15 (createdAt). Play order: loss then win.
    const d: MatchupData = {
      exportedAt: '',
      brackets: [
        {
          id: 'loss-bracket',
          name: 'adhoc 20260103',
          type: 'single-elimination',
          createdAt: '2026-01-20T00:00:00Z',
          matches: [
            { id: 'x1', round: 1, playerA: 'P', playerB: 'Q', winner: 'Q', scoreA: 0, scoreB: 4 },
          ],
        },
        {
          id: 'win-bracket',
          name: 'Cup New', // no name date -> createdAt
          type: 'single-elimination',
          createdAt: '2026-01-15T00:00:00Z',
          matches: [
            { id: 'x2', round: 1, playerA: 'P', playerB: 'R', winner: 'P', scoreA: 4, scoreB: 1 },
          ],
        },
      ],
    };
    const s = computePlayerStreak(d, 'P');
    // Play order: loss (Jan 3) then win (Jan 15) => most recent is the WIN
    expect(s.currentType).toBe('win');
    expect(s.currentCount).toBe(1);
    // Longest win streak also 1 (single win in history)

    expect(s.longestWinStreak).toBe(1);
  });
});