import { useMemo, useState } from 'react';
import type { MatchupData } from '../types';
import { computeHeadToHead } from '../lib/stats';
import SortableTable from './SortableTable';

export default function HeadToHead({ data }: { data: MatchupData }) {
  const records = computeHeadToHead(data);
  const [filter, setFilter] = useState('');

  const players = useMemo(() => {
    const set = new Set<string>();
    for (const r of records) {
      set.add(r.playerA);
    }
    return Array.from(set).sort();
  }, [records]);

  const filtered = useMemo(() => {
    if (!filter) return records;
    return records.filter((r) => r.playerA === filter);
  }, [records, filter]);

  return (
    <section className="section">
      <h2>Head-to-Head</h2>

      <div className="filter-row">
        <label htmlFor="h2h-filter">Filter by Player A:</label>
        <select
          id="h2h-filter"
          className="input"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="">All players</option>
          {players.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div className="table-wrap">
        <SortableTable
          columns={[
            { key: 'playerA', label: 'Player A' },
            { key: 'playerB', label: 'Player B' },
            { key: 'aWins', label: 'A Wins' },
            { key: 'bWins', label: 'B Wins' },
            {
              key: 'winRate',
              label: 'A Win Rate',
              sortValue: (r) => r.winRate,
              render: (r) => `${(r.winRate * 100).toFixed(1)}%`,
            },
          ]}
          rows={filtered}
          rowKey={(r) => `${r.playerA}-${r.playerB}`}
          defaultSortKey="playerA"
          emptyMessage="No decided matchups yet."
        />
      </div>
    </section>
  );
}
