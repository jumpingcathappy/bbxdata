import { describe, it, expect } from 'vitest';
import { extractNameDate, effectiveBracketDate, computeEloRatings, computePlayerStreak, computePlayerProfile } from '../stats';
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
describe('computePlayerProfile', () => {
  // Two tournaments A and B on the same day; B's bracket has 2 rounds.
  const data: MatchupData = {
    exportedAt: '',
    brackets: [
      {
        id: 't1',
        name: 'adhoc 20260301',
        type: 'single-elimination',
        createdAt: '2026-02-20T00:00:00Z',
        matches: [
          { id: 'm1', round: 1, playerA: 'X', playerB: 'Y', winner: 'X', scoreA: 4, scoreB: 1 },
        ],
      },
      {
        id: 't2',
        name: 'Cup B', // no date -> createdAt
        type: 'single-elimination',
        createdAt: '2026-03-05T00:00:00Z',
        matches: [
          { id: 'm2', round: 1, playerA: 'X', playerB: 'Z', winner: 'Z', scoreA: 2, scoreB: 4 },
          { id: 'm3', round: 2, playerA: 'X', playerB: 'Y', winner: 'X', scoreA: 4, scoreB: 3 },
        ],
      },
    ],
  };

  it('produces chronological match records with tournament, scores and Elo deltas', () => {
    const profile = computePlayerProfile(data, 'X');
    expect(profile.matches).toHaveLength(3);
    // Order: t1 (Mar 1 via name date) first, then t2 rounds 1-2 (Mar 5 via createdAt)
    expect(profile.matches[0]).toMatchObject({
      tournament: 'adhoc 20260301',
      opponent: 'Y',
      won: true,
      playerScore: 4,
      opponentScore: 1,
      eloBefore: 1200,
    });
    expect(profile.matches[0].eloDelta).toBeGreaterThan(0);
    // Second match is the LOSS vs Z within tournament t2
    expect(profile.matches[1]).toMatchObject({ tournament: 'Cup B', opponent: 'Z', won: false });
    expect(profile.matches[1].eloDelta).toBeLessThan(0);
    // Most recent: win vs Y again
    expect(profile.matches[2]).toMatchObject({ opponent: 'Y', won: true });

    // Current Elo matches the replay
    expect(profile.currentElo).toBe(profile.matches[2].eloAfter);
    // Peak and best/worst
    expect(profile.peakElo).toBe(Math.max(...profile.matches.map((m) => m.eloAfter)));
    expect(profile.bestWin!.opponent).toBe('Y');
    expect(profile.worstLoss!.opponent).toBe('Z');
  });

  it('per-opponent breakdown aggregates wins/losses and avg Elo delta', () => {
    const profile = computePlayerProfile(data, 'X');
    const vsY = profile.opponents.find((o) => o.opponent === 'Y')!;
    expect(vsY.wins).toBe(2);
    expect(vsY.losses).toBe(0);
    expect(vsY.avgEloDeltaAgainst).toBeCloseTo(
      (profile.matches[0].eloDelta + profile.matches[2].eloDelta) / 2,
      5,
    );
    const vsZ = profile.opponents.find((o) => o.opponent === 'Z')!;
    expect(vsZ.wins).toBe(0);
    expect(vsZ.losses).toBe(1);
  });

  it('returns an empty profile for a player with no matches', () => {
    const p = computePlayerProfile(data, 'Nobody');
    expect(p.matches).toHaveLength(0);
    expect(p.opponents).toHaveLength(0);
    expect(p.currentElo).toBe(1200);
  });
});
