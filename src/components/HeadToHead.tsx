import { useMemo, useState } from 'react';
import type { MatchupData } from '../types';
import { computeHeadToHead, computeLeaderboard, computePlayerMatchups } from '../lib/stats';
import SortableTable from './SortableTable';

function streakCell(type: 'win' | 'loss' | 'none', count: number): string {
  if (type === 'none' || count === 0) return '—';
  const label = type === 'win' ? 'W' : 'L';
  return `${count}${label}`;
}

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
    if (!filter) return records;
    return records.filter((r) => r.playerA === filter || r.playerB === filter);
  }, [records, filter]);

  const selectedPlayer = useMemo(
    () => computeLeaderboard(data).find((e) => e.player === filter),
    [data, filter]
  );

  const playerMatchups = useMemo(
    () => (filter ? computePlayerMatchups(data, filter) : []),
    [data, filter]
  );

  return (
    <section className="section">
      <h2>Head-to-Head</h2>

      <div className="filter-row">
        <label htmlFor="h2h-filter">Filter by Player:</label>
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

      {filter && selectedPlayer && (
        <div className="stat-grid">
          <div className="stat-card">
            <span className="stat-value">{selectedPlayer.wins}</span>
            <span className="stat-label">Wins</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{selectedPlayer.losses}</span>
            <span className="stat-label">Losses</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{selectedPlayer.total}</span>
            <span className="stat-label">Total</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">
              {(selectedPlayer.winRate * 100).toFixed(1)}%
            </span>
            <span className="stat-label">Overall Win Rate</span>
          </div>
          <div className="stat-card">
            <span className="stat-value" style={{ color: selectedPlayer.currentStreakType === 'win' ? 'var(--green)' : selectedPlayer.currentStreakType === 'loss' ? 'var(--red)' : undefined }}>
              {streakCell(selectedPlayer.currentStreakType, selectedPlayer.currentStreakCount)}
            </span>
            <span className="stat-label">Current Streak</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{selectedPlayer.longestWinStreak}W</span>
            <span className="stat-label">Best Win Streak</span>
          </div>
        </div>
      )}

      {filter ? (
        <div className="table-wrap">
          <SortableTable
            columns={[
              { key: 'opponent', label: 'Opponent' },
              { key: 'wins', label: 'Wins' },
              { key: 'losses', label: 'Losses' },
              { key: 'total', label: 'Total' },
              {
                key: 'winRate',
                label: 'Win Rate',
                sortValue: (r) => r.winRate,
                render: (r) => `${(r.winRate * 100).toFixed(1)}%`,
              },
              {
                key: 'currentStreak',
                label: 'Streak',
                sortValue: (r) => r.currentStreakCount,
                render: (r) => (
                  <span className={r.currentStreakType === 'win' ? 'streak-win' : r.currentStreakType === 'loss' ? 'streak-loss' : ''}>
                    {streakCell(r.currentStreakType, r.currentStreakCount)}
                  </span>
                ),
              },
              {
                key: 'lastResult',
                label: 'Last',
                sortValue: (r) => (r.lastResult === 'win' ? 1 : r.lastResult === 'loss' ? -1 : 0),
                render: (r) =>
                  r.lastResult ? (
                    <span className={r.lastResult === 'win' ? 'streak-win' : 'streak-loss'}>
                      {r.lastResult === 'win' ? 'W' : 'L'}
                    </span>
                  ) : '—',
              },
              {
                key: 'avgMargin',
                label: 'Avg Margin',
                sortValue: (r) => r.avgMargin ?? 0,
                render: (r) =>
                  r.avgMargin !== null
                    ? (r.avgMargin > 0 ? '+' : '') + r.avgMargin.toFixed(1)
                    : '—',
              },
            ]}
            rows={playerMatchups}
            rowKey={(r) => r.opponent}
            defaultSortKey="wins"
            defaultSortDir="desc"
            emptyMessage="No decided matchups for this player yet."
          />
        </div>
      ) : (
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
              {
                key: 'currentStreak',
                label: 'Hot Streak',
                sortValue: (r) => r.currentStreakCount,
                render: (r) =>
                  r.currentStreakPlayer && r.currentStreakCount > 0
                    ? `${r.currentStreakPlayer} ${r.currentStreakCount}${r.currentStreakPlayer === r.playerA ? 'W' : 'L'}`
                    : '—',
              },
              {
                key: 'lastWinner',
                label: 'Last Winner',
                sortValue: (r) => r.lastWinner ?? '',
                render: (r) => r.lastWinner ?? '—',
              },
              {
                key: 'avgMargin',
                label: 'Avg Margin',
                sortValue: (r) => r.avgMargin ?? 0,
                render: (r) =>
                  r.avgMargin !== null ? r.avgMargin.toFixed(1) : '—',
              },
              {
                key: 'biggestWin',
                label: 'Biggest Win',
                sortValue: (r) => r.biggestWinMargin ?? 0,
                render: (r) =>
                  r.biggestWinMargin !== null && r.biggestWinner
                    ? `${r.biggestWinner} (+${r.biggestWinMargin})`
                    : '—',
              },
            ]}
            rows={filtered}
            rowKey={(r) => `${r.playerA}-${r.playerB}`}
            defaultSortKey="playerA"
            emptyMessage="No decided matchups yet."
          />
        </div>
      )}
    </section>
  );
}