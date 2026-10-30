import { useMemo, useState } from 'react';
import type { MatchupData } from '../types';
import { computePlayerProfile, type PlayerMatchRecord } from '../lib/stats';

const CHART_W = 760;
const CHART_H = 220;
const PAD = { top: 16, right: 16, bottom: 26, left: 52 };

function shortDate(d: string): string {
  // '2026-10-23' or ISO createdAt fallback -> YYYY-MM-DD slice
  return d.slice(0, 10);
}

function fmtDate(d: string): string {
  const [y, m, day] = shortDate(d).split('-');
  if (!y || !m || !day) return d;
  return `${day}/${m}`;
}

export default function PlayerProfileView({ data }: { data: MatchupData }) {
  const players = useMemo(() => {
    const set = new Set<string>();
    for (const b of data.brackets) {
      for (const m of b.matches) {
        if (m.winner === null) continue;
        set.add(m.playerA);
        set.add(m.playerB);
      }
    }
    return Array.from(set).sort();
  }, [data]);

  const [player, setPlayer] = useState('');
  const profile = useMemo(
    () => (player ? computePlayerProfile(data, player) : null),
    [data, player],
  );

  // Elo timeline points
  const chart = useMemo(() => {
    if (!profile || profile.matches.length === 0) return null;
    const pts = profile.matches.map((m, i) => ({ x: i, elo: m.eloAfter, m }));
    const elos = [1200, ...pts.map((p) => p.elo)];
    const min = Math.min(...elos);
    const max = Math.max(...elos);
    const pad = Math.max(10, (max - min) * 0.12);
    const yMin = Math.floor((min - pad) / 20) * 20;
    const yMax = Math.ceil((max + pad) / 20) * 20;
    const xMax = Math.max(pts.length - 1, 1);
    // Keep the Elo=1200 start visible as point 0
    const all = [{ x: -1, elo: 1200, m: null as PlayerMatchRecord | null }, ...pts];
    const sx = (x: number) => PAD.left + ((x + 1) / (xMax + 1)) * (CHART_W - PAD.left - PAD.right);
    const sy = (v: number) => PAD.top + (1 - (v - yMin) / (yMax - yMin)) * (CHART_H - PAD.top - PAD.bottom);
    const path = all.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.x).toFixed(1)},${sy(p.elo).toFixed(1)}`).join(' ');
    return { all, pts, sx, sy, yMin, yMax, path, xMax };
  }, [profile]);

  if (players.length === 0) {
    return (
      <section className="section">
        <h2>Player Profile</h2>
        <p className="empty">No decided matches yet.</p>
      </section>
    );
  }

  return (
    <section className="section">
      <h2>Player Profile</h2>

      <div className="filter-row">
        <label htmlFor="pp-player">Player:</label>
        <select
          id="pp-player"
          className="input"
          value={player}
          onChange={(e) => setPlayer(e.target.value)}
        >
          <option value="">Select a player…</option>
          {players.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {profile && profile.matches.length === 0 && (
        <p className="empty">No decided matches for this player yet.</p>
      )}

      {profile && profile.matches.length > 0 && (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <span className="stat-value">{profile.currentElo}</span>
              <span className="stat-label">Current Elo</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{profile.peakElo}</span>
              <span className="stat-label">Peak Elo</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{profile.matches.filter((m) => m.won).length}W / {profile.matches.filter((m) => !m.won).length}L</span>
              <span className="stat-label">Record</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">
                {profile.bestWin ? `${fmtDate(profile.bestWin.date)} vs ${profile.bestWin.opponent} +${profile.bestWin.eloDelta}` : '—'}
              </span>
              <span className="stat-label">Best Win</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">
                {profile.worstLoss ? `${fmtDate(profile.worstLoss.date)} vs ${profile.worstLoss.opponent} ${profile.worstLoss.eloDelta}` : '—'}
              </span>
              <span className="stat-label">Worst Loss</span>
            </div>
          </div>

          {chart && (
            <div className="table-wrap">
              <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} width="100%" role="img" aria-label="Elo timeline">
                {/* y grid */}
                {[chart.yMin, (chart.yMin + chart.yMax) / 2, chart.yMax].map((v) => (
                  <g key={v}>
                    <line x1={PAD.left} x2={CHART_W - PAD.right} y1={chart.sy(v)} y2={chart.sy(v)} stroke="var(--border)" strokeWidth="1" />
                    <text x={PAD.left - 6} y={chart.sy(v) + 4} textAnchor="end" fontSize="11" fill="var(--muted-foreground)">{v}</text>
                  </g>
                ))}
                {/* start baseline */}
                <line x1={PAD.left} x2={CHART_W - PAD.right} y1={chart.sy(1200)} y2={chart.sy(1200)} stroke="var(--border)" strokeDasharray="4 4" strokeWidth="1" />
                <path d={chart.path} fill="none" stroke="var(--accent)" strokeWidth="2" />
                {chart.pts.map((p) => (
                  <g key={p.x}>
                    <circle cx={chart.sx(p.x)} cy={chart.sy(p.elo)} r="3.5" fill={p.m.won ? 'var(--green)' : 'var(--red)'} />
                    <title>
                      {`${fmtDate(p.m.date)} vs ${p.m.opponent} ${p.m.won ? 'W' : 'L'} ${p.m.eloDelta > 0 ? '+' : ''}${p.m.eloDelta} → ${p.m.eloAfter}`}
                    </title>
                  </g>
                ))}
              </svg>
            </div>
          )}

          <h3>Match History</h3>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Tournament</th>
                  <th>Rd</th>
                  <th>Opponent</th>
                  <th>Result</th>
                  <th>Score</th>
                  <th>Elo</th>
                  <th>Δ</th>
                </tr>
              </thead>
              <tbody>
                {[...profile.matches].reverse().map((m, i) => (
                  <tr key={m.bracketId + '-' + m.round + '-' + m.opponent + '-' + i}>
                    <td>{fmtDate(m.date)}</td>
                    <td className="pp-tournament">{m.tournament}</td>
                    <td>{m.round}</td>
                    <td>{m.opponent}</td>
                    <td>
                      <span className={m.won ? 'streak-win' : 'streak-loss'}>{m.won ? 'W' : 'L'}</span>
                    </td>
                    <td>{m.playerScore !== null ? `${m.playerScore}–${m.opponentScore}` : '—'}</td>
                    <td>{m.eloBefore} → {m.eloAfter}</td>
                    <td>
                      <span className={m.eloDelta >= 0 ? 'streak-win' : 'streak-loss'}>
                        {m.eloDelta > 0 ? '+' : ''}{m.eloDelta}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3>Matchup Breakdown</h3>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Opponent</th>
                  <th>W</th>
                  <th>L</th>
                  <th>Total</th>
                  <th>Win Rate</th>
                  <th>Avg Elo Δ vs Opp</th>
                </tr>
              </thead>
              <tbody>
                {profile.opponents.map((o) => (
                  <tr key={o.opponent}>
                    <td>{o.opponent}</td>
                    <td>{o.wins}</td>
                    <td>{o.losses}</td>
                    <td>{o.total}</td>
                    <td>{(o.wins / o.total * 100).toFixed(0)}%</td>
                    <td>
                      {o.avgEloDeltaAgainst !== null && (
                        <span className={o.avgEloDeltaAgainst >= 0 ? 'streak-win' : 'streak-loss'}>
                          {o.avgEloDeltaAgainst > 0 ? '+' : ''}{o.avgEloDeltaAgainst.toFixed(1)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}