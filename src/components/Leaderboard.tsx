import type { MatchupData } from '../types';
import { computeLeaderboard } from '../lib/stats';
import SortableTable from './SortableTable';

export default function Leaderboard({ data }: { data: MatchupData }) {
  const entries = computeLeaderboard(data);

  return (
    <section>
      <h2>Leaderboard</h2>
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
        ]}
        rows={entries}
        rowKey={(e) => e.player}
        defaultSortKey="wins"
        defaultSortDir="desc"
        emptyMessage="No players yet."
      />
    </section>
  );
}
