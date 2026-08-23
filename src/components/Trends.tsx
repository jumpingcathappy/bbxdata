import { useMemo, useState } from 'react';
import type { MatchupData } from '../types';
import { computeWinRateTrend, type PlayerTrend } from '../lib/stats';

// Distinct colors for player lines
const COLORS = [
  '#6366f1', '#f59e0b', '#34d399', '#f87171', '#a78bfa',
  '#22d3ee', '#fb923c', '#e879f9', '#4ade80', '#facc15',
  '#60a5fa', '#f472b6', '#2dd4bf', '#c084fc', '#fcd34d',
];

const CHART_W = 800;
const CHART_H = 400;
const PAD = { top: 20, right: 20, bottom: 40, left: 50 };

export default function Trends({ data }: { data: MatchupData }) {
  const trends = useMemo(() => computeWinRateTrend(data), [data]);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [focus, setFocus] = useState<string>('');

  const visibleTrends = useMemo(
    () => trends.filter((t) => !hidden.has(t.player)),
    [trends, hidden],
  );

  const maxMatches = useMemo(
    () => Math.max(1, ...trends.map((t) => t.points.length)),
    [trends],
  );

  const togglePlayer = (player: string) => {
    setFocus('');
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(player)) next.delete(player);
      else next.add(player);
      return next;
    });
  };

  const focusPlayer = (player: string) => {
    if (!player) {
      setFocus('');
      setHidden(new Set());
      return;
    }
    setFocus(player);
    setHidden(new Set(trends.filter((t) => t.player !== player).map((t) => t.player)));
  };

  if (trends.length === 0) {
    return (
      <section className="section">
        <h2>Win Rate Trends</h2>
        <p className="empty">No decided matches yet.</p>
      </section>
    );
  }

  // Chart geometry
  const plotW = CHART_W - PAD.left - PAD.right;
  const plotH = CHART_H - PAD.top - PAD.bottom;
  const xScale = (i: number) => PAD.left + (i / Math.max(1, maxMatches - 1)) * plotW;
  const yScale = (rate: number) => PAD.top + (1 - rate) * plotH;

  // Y-axis ticks (0%, 25%, 50%, 75%, 100%)
  const yTicks = [0, 0.25, 0.5, 0.75, 1];
  // X-axis ticks
  const xTickCount = Math.min(maxMatches, 8);
  const xTicks = Array.from({ length: xTickCount }, (_, i) =>
    Math.round((i * (maxMatches - 1)) / Math.max(1, xTickCount - 1)) + 1,
  );

  const playerColor = (player: string) => {
    const idx = trends.findIndex((t) => t.player === player);
    return COLORS[idx % COLORS.length];
  };

  const buildPath = (trend: PlayerTrend): string => {
    if (trend.points.length === 0) return '';
    return trend.points
      .map((p, i) => {
        const x = xScale(p.matchIndex);
        const y = yScale(p.winRate);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  };

  // Focused player's match detail list
  const focusedTrend = focus ? trends.find((t) => t.player === focus) : null;

  return (
    <section className="section">
      <h2>Win Rate Trends</h2>
      <p className="empty" style={{ marginBottom: 16 }}>
        Cumulative win rate over time (chronological by bracket date &amp; round).
      </p>

      {/* Focus selector */}
      <div className="filter-row">
        <label htmlFor="trend-focus">Focus Player:</label>
        <select
          id="trend-focus"
          className="input"
          value={focus}
          onChange={(e) => focusPlayer(e.target.value)}
        >
          <option value="">All players</option>
          {trends.map((t) => (
            <option key={t.player} value={t.player}>
              {t.player}
            </option>
          ))}
        </select>
        {focus && (
          <button className="btn-ghost" onClick={() => focusPlayer('')}>
            Show All
          </button>
        )}
      </div>

      <div className="chart-container">
        <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="chart-svg">
          {/* Grid lines */}
          {yTicks.map((t) => (
            <g key={t}>
              <line
                x1={PAD.left} y1={yScale(t)}
                x2={CHART_W - PAD.right} y2={yScale(t)}
                className="chart-grid"
              />
              <text
                x={PAD.left - 8} y={yScale(t) + 4}
                className="chart-axis-label"
                textAnchor="end"
              >
                {(t * 100).toFixed(0)}%
              </text>
            </g>
          ))}

          {/* X-axis labels */}
          {xTicks.map((t) => (
            <text
              key={t}
              x={xScale(t)} y={CHART_H - PAD.bottom + 18}
              className="chart-axis-label"
              textAnchor="middle"
            >
              {t}
            </text>
          ))}

          {/* X-axis title */}
          <text
            x={PAD.left + plotW / 2} y={CHART_H - 4}
            className="chart-axis-title"
            textAnchor="middle"
          >
            Match Number
          </text>

          {/* 50% reference line */}
          <line
            x1={PAD.left} y1={yScale(0.5)}
            x2={CHART_W - PAD.right} y2={yScale(0.5)}
            className="chart-ref-line"
          />

          {/* Player lines */}
          {visibleTrends.map((trend) => {
            const color = playerColor(trend.player);
            const dimmed = focus && focus !== trend.player;
            return (
              <g key={trend.player} style={dimmed ? { display: 'none' } : undefined}>
                <path
                  d={buildPath(trend)}
                  fill="none"
                  stroke={color}
                  strokeWidth={focus === trend.player ? 3 : 2}
                  className="chart-line"
                />
                {/* End dot + label */}
                {trend.points.length > 0 && (() => {
                  const last = trend.points[trend.points.length - 1];
                  const x = xScale(last.matchIndex);
                  const y = yScale(last.winRate);
                  return (
                    <>
                      <circle cx={x} cy={y} r={3.5} fill={color} />
                      <text
                        x={x + 6} y={y + 4}
                        className="chart-end-label"
                        fill={color}
                      >
                        {trend.player}
                      </text>
                    </>
                  );
                })()}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Focused player match history */}
      {focusedTrend && (
        <div className="trend-detail">
          <h3>{focus}'s Match-by-Match History</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Opponent</th>
                  <th>Result</th>
                  <th>Win Rate After</th>
                  <th>Record</th>
                </tr>
              </thead>
              <tbody>
                {focusedTrend.points.map((p, i) => (
                  <tr key={i}>
                    <td>{p.matchIndex}</td>
                    <td>{p.opponent}</td>
                    <td>
                      <span className={p.won ? 'streak-win' : 'streak-loss'}>
                        {p.won ? 'Win' : 'Loss'}
                      </span>
                    </td>
                    <td>{(p.winRate * 100).toFixed(1)}%</td>
                    <td>{p.wins}W–{p.total - p.wins}L</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Player toggles */}
      <div className="chart-legend">
        {trends.map((t) => {
          const color = playerColor(t.player);
          const isHidden = hidden.has(t.player);
          return (
            <button
              key={t.player}
              className={`chart-legend-btn${isHidden ? ' hidden' : ''}${focus === t.player ? ' focused' : ''}`}
              onClick={() => togglePlayer(t.player)}
            >
              <span className="chart-legend-dot" style={{ background: color }} />
              {t.player}
              <span className="chart-legend-meta">
                {' '}({t.points[t.points.length - 1].wins}W–{t.points[t.points.length - 1].total - t.points[t.points.length - 1].wins}L)
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}