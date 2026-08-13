import { useMemo, useState } from 'react';

export interface SortableColumn<T> {
  key: string;
  label: string;
  /** Optional custom sort value; defaults to row[key]. */
  sortValue?: (row: T) => string | number;
  /** Optional custom cell renderer; defaults to String(row[key]). */
  render?: (row: T, index: number) => React.ReactNode;
}

interface SortableTableProps<T> {
  columns: SortableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  defaultSortKey?: string;
  defaultSortDir?: 'asc' | 'desc';
  emptyMessage?: string;
}

function compare(a: string | number, b: string | number): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

export default function SortableTable<T>({
  columns,
  rows,
  rowKey,
  defaultSortKey,
  defaultSortDir = 'asc',
  emptyMessage = 'No data.',
}: SortableTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey ?? null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(defaultSortDir);

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return rows;
    const getVal = col.sortValue ?? ((row: T) => (row as Record<string, unknown>)[sortKey] as string | number);
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => compare(getVal(a), getVal(b)) * dir);
  }, [rows, columns, sortKey, sortDir]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  if (rows.length === 0) {
    return <p>{emptyMessage}</p>;
  }

  return (
    <table>
      <thead>
        <tr>
          {columns.map((c) => (
            <th
              key={c.key}
              onClick={() => handleSort(c.key)}
              style={{ cursor: 'pointer', userSelect: 'none' }}
            >
              {c.label}
              {sortKey === c.key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sorted.map((row, i) => (
          <tr key={rowKey(row)}>
            {columns.map((c) => (
              <td key={c.key}>
                {c.render ? c.render(row, i) : String((row as Record<string, unknown>)[c.key])}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
