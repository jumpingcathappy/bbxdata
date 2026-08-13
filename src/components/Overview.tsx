import type { MatchupData } from '../types';
import { computeOverall, computeLeaderboard } from '../lib/stats';
import SortableTable from './SortableTable';

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
