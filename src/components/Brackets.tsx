import { useState } from 'react';
import type { Bracket, MatchupData } from '../types';
import SortableTable from './SortableTable';

function BracketMatches({ bracket }: { bracket: Bracket }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button className="btn-ghost" onClick={() => setOpen(!open)}>
        {open ? 'Hide matches' : 'Show matches'}
      </button>
      {open && (
        <ul className="match-list">
          {bracket.matches.map((m) => (
            <li key={m.id}>
              R{m.round}: {m.playerA} vs {m.playerB} — winner:{' '}
              {m.winner ? (
                <span className="winner">{m.winner}</span>
              ) : (
                <span className="undecided">undecided</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Brackets({ data }: { data: MatchupData }) {
  return (
    <section className="section">
      <h2>Brackets</h2>
      {data.brackets.length === 0 ? (
        <p className="empty">No brackets yet.</p>
      ) : (
        <div className="table-wrap">
          <SortableTable
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'type', label: 'Type' },
              {
                key: 'createdAt',
                label: 'Created',
                sortValue: (b) => b.createdAt,
                render: (b) =>
                  b.createdAt ? new Date(b.createdAt).toLocaleDateString() : '—',
              },
              {
                key: 'matches',
                label: 'Matches',
                sortValue: (b) => b.matches.length,
                render: (b) => String(b.matches.length),
              },
              {
                key: 'details',
                label: 'Details',
                sortValue: () => 0,
                render: (b) => <BracketMatches bracket={b} />,
              },
            ]}
            rows={data.brackets}
            rowKey={(b) => b.id}
            defaultSortKey="name"
            emptyMessage="No brackets yet."
          />
        </div>
      )}
    </section>
  );
}
