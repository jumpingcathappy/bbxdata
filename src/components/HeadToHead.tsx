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
      set.add(r.playerB);
    }
    return Array.from(set).sort();
  }, [records]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return records;
    return records.filter(
      (r) =>
        r.playerA.toLowerCase().includes(q) ||
        r.playerB.toLowerCase().includes(q)
    );
  }, [records, filter]);

  return (
    <section>
      <h2>Head-to-Head</h2>

      <label>
        Filter by contestant:{' '}
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Type a player name…"
          list="h2h-players"
        />
        <datalist id="h2h-players">
          {players.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
      </label>

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
    </section>
  );
}
