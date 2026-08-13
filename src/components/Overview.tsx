import type { MatchupData } from '../types';
import { computeOverall, computeLeaderboard } from '../lib/stats';
import SortableTable from './SortableTable';

export default function Overview({ data }: { data: MatchupData }) {
  const overall = computeOverall(data);
  const players = computeLeaderboard(data);

  return (
    <section>
      <h2>Overview</h2>
      <p>Last exported: {data.exportedAt}</p>
      <ul>
        <li>Decided matches: {overall.decided}</li>
        <li>Undecided matches: {overall.undecided}</li>
        <li>Total matches: {overall.total}</li>
        <li>Brackets: {data.brackets.length}</li>
      </ul>

      <h3>Overall Win Rates</h3>
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
    </section>
  );
}
