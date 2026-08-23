import type { MatchupData } from '../types';
import { computeLeaderboard } from '../lib/stats';
import SortableTable from './SortableTable';

function streakCell(type: 'win' | 'loss' | 'none', count: number): string {
  if (type === 'none' || count === 0) return '—';
  const label = type === 'win' ? 'W' : 'L';
  return `${count}${label}`;
}

export default function Leaderboard({ data }: { data: MatchupData }) {
  const entries = computeLeaderboard(data);

  return (
    <section className="section">
      <h2>Leaderboard</h2>
      <div className="table-wrap">
        <SortableTable
          columns={[
            {
              key: 'rank',
              label: '#',
              sortValue: (e) => e.wins,
              render: (_e, i) => String(i + 1),
            },
            { key: 'player', label: 'Player' },
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
          rows={entries}
          rowKey={(e) => e.player}
          defaultSortKey="wins"
          defaultSortDir="desc"
          emptyMessage="No players yet."
        />
      </div>
    </section>
  );
}