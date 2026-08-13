import { useState } from 'react';
import type { Bracket, MatchupData } from '../types';

function BracketCard({ bracket }: { bracket: Bracket }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(!open)}>
        {bracket.name} ({bracket.type}) — {bracket.matches.length} matches
      </button>
      {open && (
        <ul>
          {bracket.matches.map((m) => (
            <li key={m.id}>
              R{m.round}: {m.playerA} vs {m.playerB} — winner:{' '}
              {m.winner ?? 'undecided'}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Brackets({ data }: { data: MatchupData }) {
  return (
    <section>
      <h2>Brackets</h2>
      {data.brackets.length === 0 ? (
        <p>No brackets yet.</p>
      ) : (
        data.brackets.map((b) => <BracketCard key={b.id} bracket={b} />)
      )}
    </section>
  );
}
