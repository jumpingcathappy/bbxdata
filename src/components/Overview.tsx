import type { MatchupData } from '../types';
import { computeOverall, computeLeaderboard } from '../lib/stats';

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
      {players.length === 0 ? (
        <p>No players yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Player</th>
              <th>Wins</th>
              <th>Losses</th>
              <th>Total</th>
              <th>Win Rate</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p.player}>
                <td>{p.player}</td>
                <td>{p.wins}</td>
                <td>{p.losses}</td>
                <td>{p.total}</td>
                <td>{(p.winRate * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
