import type { MatchupData } from '../types';
import { computeOverall, computeLeaderboard } from '../lib/stats';
import SortableTable from './SortableTable';

function streakCell(type: 'win' | 'loss' | 'none', count: number): string {
  if (type === 'none' || count === 0) return '—';
  const label = type === 'win' ? 'W' : 'L';
  return `${count}${label}`;
}

export default function Overview({ data }: { data: MatchupData }) {
  const overall = computeOverall(data);
  const players = computeLeaderboard(data);

  return (
    <section className="section">
      <h2>Overview</h2>
      <p className="empty">Last exported: {data.exportedAt}</p>
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-value">{overall.decided}</div>
          <div className="stat-label">Decided</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{overall.undecided}</div>
          <div className="stat-label">Undecided</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{overall.total}</div>
          <div className="stat-label">Total Matches</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.brackets.length}</div>
          <div className="stat-label">Brackets</div>
        </div>
      </div>

      <h3>Overall Win Rates</h3>
      <div className="table-wrap">
        <SortableTable
          columns={[
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
              label: 'Current',
              sortValue: (e) => e.currentStreakCount,
              render: (e) => (
                <span className={e.currentStreakType === 'win' ? 'streak-win' : e.currentStreakType === 'loss' ? 'streak-loss' : ''}>
                  {streakCell(e.currentStreakType, e.currentStreakCount)}
                </span>
              ),
            },
            {
              key: 'longestWinStreak',
              label: 'Best Win Streak',
              sortValue: (e) => e.longestWinStreak,
              render: (e) => e.longestWinStreak > 0 ? `${e.longestWinStreak}W` : '—',
            },
          ]}
          rows={players}
          rowKey={(e) => e.player}
          defaultSortKey="wins"
          defaultSortDir="desc"
          emptyMessage="No players yet."
        />
      </div>
    </section>
  );
}