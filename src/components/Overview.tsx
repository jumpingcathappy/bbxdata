import type { MatchupData } from '../types';
import { computeOverall } from '../lib/stats';

export default function Overview({ data }: { data: MatchupData }) {
  const overall = computeOverall(data);

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
    </section>
  );
}
