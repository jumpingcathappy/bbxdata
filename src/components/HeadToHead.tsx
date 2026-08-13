import type { MatchupData } from '../types';
import { computeHeadToHead } from '../lib/stats';

export default function HeadToHead({ data }: { data: MatchupData }) {
  const records = computeHeadToHead(data);

  return (
    <section>
      <h2>Head-to-Head</h2>
      {records.length === 0 ? (
        <p>No decided matchups yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Player A</th>
              <th>Player B</th>
              <th>A Wins</th>
              <th>B Wins</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={`${r.playerA}-${r.playerB}`}>
                <td>{r.playerA}</td>
                <td>{r.playerB}</td>
                <td>{r.aWins}</td>
                <td>{r.bWins}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
