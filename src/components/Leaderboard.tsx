import type { MatchupData } from '../types';
import { computeLeaderboard } from '../lib/stats';

export default function Leaderboard({ data }: { data: MatchupData }) {
  const entries = computeLeaderboard(data);

  return (
    <section>
      <h2>Leaderboard</h2>
      {entries.length === 0 ? (
        <p>No players yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>Wins</th>
              <th>Losses</th>
              <th>Total</th>
              <th>Win Rate</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => (
              <tr key={e.player}>
                <td>{i + 1}</td>
                <td>{e.player}</td>
                <td>{e.wins}</td>
                <td>{e.losses}</td>
                <td>{e.total}</td>
                <td>{(e.winRate * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
