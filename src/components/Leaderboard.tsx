import type { MatchupData } from '../types';
import { computeLeaderboard, computeEloRatings } from '../lib/stats';
import SortableTable from './SortableTable';

function streakCell(type: 'win' | 'loss' | 'none', count: number): string {
  if (type === 'none' || count === 0) return '—';
  const label = type === 'win' ? 'W' : 'L';
  return `${count}${label}`;
}

export default function Leaderboard({ data }: { data: MatchupData }) {
  const entries = computeLeaderboard(data);
  const eloRatings = computeEloRatings(data);
  const eloMap = new Map(eloRatings.map((e) => [e.player, e.elo]));

  // Merge Elo into leaderboard entries
  const merged = entries.map((e) => ({
    ...e,
    elo: eloMap.get(e.player) ?? 1200,
  }));

  return (
    <section className="section">
      <h2>Leaderboard</h2>
      <div className="table-wrap">
        <SortableTable
          columns={[
            {
              key: 'rank',
              label: '#',
              sortValue: (e) => e.elo,
              render: (_e, i) => String(i + 1),
            },
            { key: 'player', label: 'Player' },
            {
              key: 'elo',
              label: 'Elo',
              sortValue: (e) => e.elo,
              render: (e) => String(e.elo),
            },
            { key: 'wins', label: 'Wins' },
            { key: 'losses', label: 'Losses' },
            { key: 'total', label: 'Total' },
            {
              key: 'winRate',
              label: 'Win Rate',
              sortValue: (e) => e.winRate,
              render: (e) => `${(e.winRate * 100).toFixed(1)}%`,
            },
            {
              key: 'currentStreak',
              label: 'Current Streak',
              sortValue: (e) => e.currentStreakCount,
              render: (e) => (
                <span className={e.currentStreakType === 'win' ? 'streak-win' : e.currentStreakType === 'loss' ? 'streak-loss' : ''}>
                  {streakCell(e.currentStreakType, e.currentStreakCount)}
                </span>
              ),
            },
            {
              key: 'longestWinStreak',
              label: 'Longest Win Streak',
              sortValue: (e) => e.longestWinStreak,
              render: (e) => e.longestWinStreak > 0 ? `${e.longestWinStreak}W` : '—',
            },
          ]}
          rows={merged}
          rowKey={(e) => e.player}
          defaultSortKey="elo"
          defaultSortDir="desc"
          emptyMessage="No players yet."
        />
      </div>
    </section>
  );
}