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

type ViewMode = 'cumulative' | 'rolling' | 'elo';

export default function Trends({ data }: { data: MatchupData }) {
  const trends = useMemo(() => computeWinRateTrend(data), [data]);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [focus, setFocus] = useState<string>('');
  const [view, setView] = useState<ViewMode>('cumulative');

  const visibleTrends = useMemo(
    () => trends.filter((t) => !hidden.has(t.player)),
    [trends, hidden],
  );

  // Y-axis range depends on view mode
  const { yMin, yMax, yFormat } = useMemo(() => {
    if (view === 'elo') {
      const allElos = trends.flatMap((t) => t.points.map((p) => p.elo));
      const min = allElos.length ? Math.min(...allElos) : 1000;
      const max = allElos.length ? Math.max(...allElos) : 1400;
      const pad = Math.max(20, (max - min) * 0.1);
      return {
        yMin: Math.floor((min - pad) / 10) * 10,
        yMax: Math.ceil((max + pad) / 10) * 10,
        yFormat: (v: number) => String(Math.round(v)),
      };
    }
    return {
      yMin: 0,
      yMax: 1,
      yFormat: (v: number) => `${(v * 100).toFixed(0)}%`,
    };
  }, [trends, view]);

  const maxMatches = useMemo(
    () => Math.max(1, ...trends.map((t) => t.points.length)),
    [trends],
  );

  const getValue = (point: { winRate: number; rollingWinRate: number; elo: number }): number => {
    if (view === 'elo') return point.elo;
    if (view === 'rolling') return point.rollingWinRate;
    return point.winRate;
  };

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
  const yScale = (v: number) => {
    const t = (v - yMin) / Math.max(1, yMax - yMin);
    return PAD.top + (1 - t) * plotH;
  };

  // Y-axis ticks
  const yTickCount = 5;
  const yTicks = Array.from({ length: yTickCount }, (_, i) =>
    yMin + (i * (yMax - yMin)) / (yTickCount - 1),
  );

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
        const y = yScale(getValue(p));
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  };

  // Focused player's match detail list
  const focusedTrend = focus ? trends.find((t) => t.player === focus) : null;

  const viewLabels: { id: ViewMode; label: string }[] = [
    { id: 'cumulative', label: 'Cumulative' },
    { id: 'rolling', label: 'Rolling (last 10)' },
    { id: 'elo', label: 'Elo Rating' },
  ];

  return (
    <section className="section">
      <h2>Win Rate Trends</h2>
      <p className="empty" style={{ marginBottom: 16 }}>
        {view === 'cumulative' && 'Cumulative win rate over time (chronological by bracket date & round).'}
        {view === 'rolling' && 'Rolling win rate over last 10 matches — stays responsive even at high match counts.'}
        {view === 'elo' && 'Elo rating over time — accounts for opponent strength, every match shifts the score.'}
      </p>

      {/* View toggle + Focus selector */}
      <div className="filter-row" style={{ flexWrap: 'wrap', gap: 16 }}>
        <div className="filter-row" style={{ gap: 6, marginBottom: 0 }}>
          {viewLabels.map((v) => (
            <button
              key={v.id}
              className={`tab-btn${view === v.id ? ' active' : ''}`}
              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
              onClick={() => setView(v.id)}
            >
              {v.label}
            </button>
          ))}
        </div>
        <div className="filter-row" style={{ gap: 10, marginBottom: 0 }}>
          <label htmlFor="trend-focus">Focus:</label>
          <select
            id="trend-focus"
            className="input"
            style={{ maxWidth: 200 }}
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
      </div>

      <div className="chart-container">
        <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="chart-svg">
          {/* Grid lines */}
          {yTicks.map((t, i) => (
            <g key={i}>
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
                {yFormat(t)}
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

          {/* 50% reference line (only for win rate modes) */}
          {view !== 'elo' && (
            <line
              x1={PAD.left} y1={yScale(0.5)}
              x2={CHART_W - PAD.right} y2={yScale(0.5)}
              className="chart-ref-line"
            />
          )}

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
                  const y = yScale(getValue(last));
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
                  <th>{view === 'elo' ? 'Δ Elo' : 'Win Rate After'}</th>
                  <th>{view === 'elo' ? 'Elo' : 'Record'}</th>
                </tr>
              </thead>
              <tbody>
                {focusedTrend.points.map((p, i) => {
                  const prevElo = i > 0 ? focusedTrend.points[i - 1].elo : 1200;
                  const delta = p.elo - prevElo;
                  return (
                    <tr key={i}>
                      <td>{p.matchIndex}</td>
                      <td>{p.opponent}</td>
                      <td>
                        <span className={p.won ? 'streak-win' : 'streak-loss'}>
                          {p.won ? 'Win' : 'Loss'}
                        </span>
                      </td>
                      <td>
                        {view === 'elo'
                          ? <span className={delta >= 0 ? 'streak-win' : 'streak-loss'}>
                              {delta >= 0 ? '+' : ''}{delta}
                            </span>
                          : `${(getValue(p) * 100).toFixed(1)}%`}
                      </td>
                      <td>
                        {view === 'elo' ? p.elo : `${p.wins}W–${p.total - p.wins}L`}
                      </td>
                    </tr>
                  );
                })}
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
          const last = t.points[t.points.length - 1];
          const metric = view === 'elo'
            ? `${last.elo}`
            : `${last.wins}W–${last.total - last.wins}L`;
          return (
            <button
              key={t.player}
              className={`chart-legend-btn${isHidden ? ' hidden' : ''}${focus === t.player ? ' focused' : ''}`}
              onClick={() => togglePlayer(t.player)}
            >
              <span className="chart-legend-dot" style={{ background: color }} />
              {t.player}
              <span className="chart-legend-meta">{` (${metric})`}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}