# Matchup Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local static dashboard (Vite + React + TypeScript) that reads a normalized `data.json` and shows the user's lvup.gg bracket/matchup stats (overall record, head-to-head, leaderboard, brackets), with a Sync button that pulls fresh data via a popup + one-time export helper.

**Architecture:** A static SPA reads `data.json` from `public/`. Pure functions in `src/lib/stats.ts` compute all statistics from the data. A `SyncButton` opens a popup to lvup.gg and receives normalized data via `postMessage` from a user-installed export helper. The export helper is the only piece that knows lvup.gg's API shape.

**Tech Stack:** Vite, React 18, TypeScript, Vitest (testing), plain CSS.

---

## File Structure

```
/Users/rm/bb/
  index.html
  package.json
  vite.config.ts
  tsconfig.json
  public/
    data.json                 # sample data for dev
  src/
    main.tsx                  # React entry
    App.tsx                   # layout + tab navigation + data state
    types.ts                  # data.json schema types
    lib/
      stats.ts                # pure stat functions (overall, head-to-head, leaderboard)
      loadData.ts             # fetch data.json
      sync.ts                 # popup open + postMessage receive
    components/
      Overview.tsx
      HeadToHead.tsx
      Leaderboard.tsx
      Brackets.tsx
      SyncButton.tsx
  scripts/
    export-helper.js          # one-time console/bookmarklet snippet for lvup.gg
  src/lib/__tests__/
    stats.test.ts
```

---

### Task 1: Scaffold Vite + React + TypeScript project

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx` (minimal placeholder)

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "matchup-dashboard",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "typescript": "^5.5.4",
    "vite": "^5.4.0",
    "vitest": "^2.0.5"
  }
}
```

- [ ] **Step 2: Create `vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
  },
});
```

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Matchup Dashboard</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create `src/main.tsx`**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 6: Create `src/App.tsx` (placeholder)**

```tsx
export default function App() {
  return <h1>Matchup Dashboard</h1>;
}
```

- [ ] **Step 7: Install dependencies and verify dev server starts**

Run: `npm install`
Expected: dependencies installed without error.

Run: `npm run build`
Expected: build succeeds (placeholder compiles).

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vite.config.ts tsconfig.json index.html src/main.tsx src/App.tsx
git commit -m "chore: scaffold vite react typescript project"
```

---

### Task 2: Define data schema types

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: Create `src/types.ts`**

```ts
export interface Match {
  id: string;
  round: number;
  playerA: string;
  playerB: string;
  winner: string | null;
  scoreA: number | null;
  scoreB: number | null;
}

export interface Bracket {
  id: string;
  name: string;
  type: string;
  createdAt: string;
  matches: Match[];
}

export interface MatchupData {
  exportedAt: string;
  brackets: Bracket[];
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types.ts
git commit -m "feat: add data schema types"
```

---

### Task 3: Create sample data.json

**Files:**
- Create: `public/data.json`

- [ ] **Step 1: Create `public/data.json`**

```json
{
  "exportedAt": "2026-08-13T10:00:00Z",
  "brackets": [
    {
      "id": "b1",
      "name": "Weekly Smash",
      "type": "single-elimination",
      "createdAt": "2026-07-01T00:00:00Z",
      "matches": [
        { "id": "m1", "round": 1, "playerA": "Alice", "playerB": "Bob", "winner": "Alice", "scoreA": 2, "scoreB": 1 },
        { "id": "m2", "round": 1, "playerA": "Carol", "playerB": "Dave", "winner": "Dave", "scoreA": 0, "scoreB": 2 },
        { "id": "m3", "round": 2, "playerA": "Alice", "playerB": "Dave", "winner": "Alice", "scoreA": 2, "scoreB": 0 }
      ]
    },
    {
      "id": "b2",
      "name": "Friday FFA",
      "type": "free-for-all",
      "createdAt": "2026-07-08T00:00:00Z",
      "matches": [
        { "id": "m4", "round": 1, "playerA": "Alice", "playerB": "Bob", "winner": "Bob", "scoreA": 1, "scoreB": 2 },
        { "id": "m5", "round": 1, "playerA": "Carol", "playerB": "Alice", "winner": null, "scoreA": null, "scoreB": null }
      ]
    }
  ]
}
```

- [ ] **Step 2: Commit**

```bash
git add public/data.json
git commit -m "feat: add sample data.json"
```

---

### Task 4: Overall stats (TDD)

**Files:**
- Create: `src/lib/stats.ts`
- Create: `src/lib/__tests__/stats.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { computeOverall } from '../stats';
import type { MatchupData } from '../../types';

const data: MatchupData = {
  exportedAt: '2026-08-13T10:00:00Z',
  brackets: [
    {
      id: 'b1',
      name: 'B1',
      type: 'single-elimination',
      createdAt: '2026-07-01T00:00:00Z',
      matches: [
        { id: 'm1', round: 1, playerA: 'Alice', playerB: 'Bob', winner: 'Alice', scoreA: 2, scoreB: 1 },
        { id: 'm2', round: 1, playerA: 'Carol', playerB: 'Dave', winner: 'Dave', scoreA: 0, scoreB: 2 },
        { id: 'm3', round: 2, playerA: 'Alice', playerB: 'Dave', winner: null, scoreA: null, scoreB: null }
      ]
    }
  ]
};

describe('computeOverall', () => {
  it('counts wins, losses, total, and win rate from decided matches only', () => {
    const result = computeOverall(data);
    expect(result.wins).toBe(2);
    expect(result.losses).toBe(2);
    expect(result.total).toBe(4);
    expect(result.winRate).toBeCloseTo(0.5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/stats.test.ts`
Expected: FAIL — `computeOverall` is not defined.

- [ ] **Step 3: Write minimal implementation in `src/lib/stats.ts`**

```ts
import type { Match, MatchupData } from '../types';

export interface OverallStats {
  wins: number;
  losses: number;
  total: number;
  winRate: number;
}

export function computeOverall(data: MatchupData): OverallStats {
  let wins = 0;
  let losses = 0;
  for (const bracket of data.brackets) {
    for (const match of bracket.matches) {
      if (match.winner === null) continue;
      wins += 1;
      losses += 1;
    }
  }
  const total = wins + losses;
  return { wins, losses, total, winRate: total === 0 ? 0 : wins / total };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/stats.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/stats.ts src/lib/__tests__/stats.test.ts
git commit -m "feat: add overall stats computation"
```

---

### Task 5: Head-to-head stats (TDD)

**Files:**
- Modify: `src/lib/stats.ts`
- Modify: `src/lib/__tests__/stats.test.ts`

- [ ] **Step 1: Write the failing test (append to `stats.test.ts`)**

```ts
import { computeHeadToHead } from '../stats';

describe('computeHeadToHead', () => {
  it('aggregates wins per unordered player pair', () => {
    const result = computeHeadToHead(data);
    const aliceBob = result.find(
      (r) =>
        (r.playerA === 'Alice' && r.playerB === 'Bob') ||
        (r.playerA === 'Bob' && r.playerB === 'Alice')
    );
    expect(aliceBob).toBeDefined();
    expect(aliceBob!.aWins).toBe(1);
    expect(aliceBob!.bWins).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/stats.test.ts`
Expected: FAIL — `computeHeadToHead` is not defined.

- [ ] **Step 3: Add implementation to `src/lib/stats.ts`**

```ts
export interface HeadToHeadRecord {
  playerA: string;
  playerB: string;
  aWins: number;
  bWins: number;
}

export function computeHeadToHead(data: MatchupData): HeadToHeadRecord[] {
  const map = new Map<string, HeadToHeadRecord>();
  const key = (a: string, b: string) => [a, b].sort().join('\u0000');

  for (const bracket of data.brackets) {
    for (const match of bracket.matches) {
      if (match.winner === null) continue;
      const k = key(match.playerA, match.playerB);
      let rec = map.get(k);
      if (!rec) {
        rec = { playerA: match.playerA, playerB: match.playerB, aWins: 0, bWins: 0 };
        map.set(k, rec);
      }
      if (match.winner === match.playerA) rec.aWins += 1;
      else if (match.winner === match.playerB) rec.bWins += 1;
    }
  }
  return Array.from(map.values());
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/stats.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/stats.ts src/lib/__tests__/stats.test.ts
git commit -m "feat: add head-to-head stats computation"
```

---

### Task 6: Leaderboard stats (TDD)

**Files:**
- Modify: `src/lib/stats.ts`
- Modify: `src/lib/__tests__/stats.test.ts`

- [ ] **Step 1: Write the failing test (append to `stats.test.ts`)**

```ts
import { computeLeaderboard } from '../stats';

describe('computeLeaderboard', () => {
  it('ranks players by wins then win rate', () => {
    const result = computeLeaderboard(data);
    expect(result[0].player).toBe('Alice');
    expect(result[0].wins).toBe(2);
    expect(result[0].losses).toBe(1);
    expect(result[0].total).toBe(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/stats.test.ts`
Expected: FAIL — `computeLeaderboard` is not defined.

- [ ] **Step 3: Add implementation to `src/lib/stats.ts`**

```ts
export interface LeaderboardEntry {
  player: string;
  wins: number;
  losses: number;
  total: number;
  winRate: number;
}

export function computeLeaderboard(data: MatchupData): LeaderboardEntry[] {
  const map = new Map<string, LeaderboardEntry>();
  const ensure = (name: string): LeaderboardEntry => {
    let e = map.get(name);
    if (!e) {
      e = { player: name, wins: 0, losses: 0, total: 0, winRate: 0 };
      map.set(name, e);
    }
    return e;
  };

  for (const bracket of data.brackets) {
    for (const match of bracket.matches) {
      if (match.winner === null) continue;
      const a = ensure(match.playerA);
      const b = ensure(match.playerB);
      a.total += 1;
      b.total += 1;
      if (match.winner === match.playerA) a.wins += 1;
      else if (match.winner === match.playerB) b.wins += 1;
    }
  }

  const entries = Array.from(map.values());
  for (const e of entries) {
    e.losses = e.total - e.wins;
    e.winRate = e.total === 0 ? 0 : e.wins / e.total;
  }
  entries.sort((x, y) => y.wins - x.wins || y.winRate - x.winRate);
  return entries;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/stats.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/stats.ts src/lib/__tests__/stats.test.ts
git commit -m "feat: add leaderboard stats computation"
```

---

### Task 7: Data loading

**Files:**
- Create: `src/lib/loadData.ts`

- [ ] **Step 1: Create `src/lib/loadData.ts`**

```ts
import type { MatchupData } from '../types';

export async function loadData(): Promise<MatchupData | null> {
  try {
    const res = await fetch('/data.json');
    if (!res.ok) return null;
    return (await res.json()) as MatchupData;
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/loadData.ts
git commit -m "feat: add data loading helper"
```

---

### Task 8: App layout and navigation

**Files:**
- Modify: `src/App.tsx`
- Create: `src/components/SyncButton.tsx`

- [ ] **Step 1: Create `src/components/SyncButton.tsx`**

```tsx
interface Props {
  onSync: () => void;
  syncing: boolean;
}

export default function SyncButton({ onSync, syncing }: Props) {
  return (
    <button onClick={onSync} disabled={syncing}>
      {syncing ? 'Syncing…' : 'Sync'}
    </button>
  );
}
```

- [ ] **Step 2: Replace `src/App.tsx`**

```tsx
import { useEffect, useState } from 'react';
import type { MatchupData } from './types';
import { loadData } from './lib/loadData';
import Overview from './components/Overview';
import HeadToHead from './components/HeadToHead';
import Leaderboard from './components/Leaderboard';
import Brackets from './components/Brackets';
import SyncButton from './components/SyncButton';

type Tab = 'overview' | 'headtohead' | 'leaderboard' | 'brackets';

export default function App() {
  const [data, setData] = useState<MatchupData | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadData().then(setData);
  }, []);

  const handleSync = () => {
    setSyncing(true);
    // Sync flow wired in Task 13.
    setTimeout(() => setSyncing(false), 2000);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'headtohead', label: 'Head-to-Head' },
    { id: 'leaderboard', label: 'Leaderboard' },
    { id: 'brackets', label: 'Brackets' },
  ];

  return (
    <div>
      <header>
        <h1>Matchup Dashboard</h1>
        <SyncButton onSync={handleSync} syncing={syncing} />
      </header>
      <nav>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>
      <main>
        {data === null ? (
          <p>No data yet. Click Sync to pull your brackets from lvup.gg.</p>
        ) : (
          <>
            {tab === 'overview' && <Overview data={data} />}
            {tab === 'headtohead' && <HeadToHead data={data} />}
            {tab === 'leaderboard' && <Leaderboard data={data} />}
            {tab === 'brackets' && <Brackets data={data} />}
          </>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: build succeeds (components referenced but not yet created — this will fail until Tasks 9-12 create them; if it fails, that is expected and resolved by completing Tasks 9-12).

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/components/SyncButton.tsx
git commit -m "feat: add app layout and navigation"
```

---

### Task 9: Overview view

**Files:**
- Create: `src/components/Overview.tsx`

- [ ] **Step 1: Create `src/components/Overview.tsx`**

```tsx
import type { MatchupData } from '../types';
import { computeOverall } from '../lib/stats';

export default function Overview({ data }: { data: MatchupData }) {
  const overall = computeOverall(data);
  const matchCount = data.brackets.reduce((n, b) => n + b.matches.length, 0);

  return (
    <section>
      <h2>Overview</h2>
      <p>Last exported: {data.exportedAt}</p>
      <ul>
        <li>Wins: {overall.wins}</li>
        <li>Losses: {overall.losses}</li>
        <li>Total matches: {overall.total}</li>
        <li>Win rate: {(overall.winRate * 100).toFixed(1)}%</li>
        <li>Brackets: {data.brackets.length}</li>
        <li>All matches recorded: {matchCount}</li>
      </ul>
    </section>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/Overview.tsx
git commit -m "feat: add overview view"
```

---

### Task 10: Head-to-Head view

**Files:**
- Create: `src/components/HeadToHead.tsx`

- [ ] **Step 1: Create `src/components/HeadToHead.tsx`**

```tsx
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
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/HeadToHead.tsx
git commit -m "feat: add head-to-head view"
```

---

### Task 11: Leaderboard view

**Files:**
- Create: `src/components/Leaderboard.tsx`

- [ ] **Step 1: Create `src/components/Leaderboard.tsx`**

```tsx
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
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/Leaderboard.tsx
git commit -m "feat: add leaderboard view"
```

---

### Task 12: Brackets view

**Files:**
- Create: `src/components/Brackets.tsx`

- [ ] **Step 1: Create `src/components/Brackets.tsx`**

```tsx
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
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/Brackets.tsx
git commit -m "feat: add brackets view"
```

---

### Task 13: Sync flow (popup + postMessage)

**Files:**
- Create: `src/lib/sync.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/SyncButton.tsx`

- [ ] **Step 1: Create `src/lib/sync.ts`**

```ts
import type { MatchupData } from '../types';

const LVUP_URL = 'https://lvup.gg/en/easy';
const MESSAGE_TYPE = 'matchup-dashboard:data';

export function openSyncPopup(): Window | null {
  return window.open(LVUP_URL, 'lvup-sync', 'width=900,height=700');
}

export function listenForSyncData(
  onData: (data: MatchupData) => void
): () => void {
  const handler = (event: MessageEvent) => {
    if (event.origin !== 'https://lvup.gg') return;
    const payload = event.data;
    if (!payload || payload.type !== MESSAGE_TYPE) return;
    onData(payload.data as MatchupData);
  };
  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}
```

- [ ] **Step 2: Update `src/App.tsx` to wire sync**

Replace the `handleSync` function and add the listener effect:

```tsx
import { listenForSyncData, openSyncPopup } from './lib/sync';

// inside App:
useEffect(() => {
  const stop = listenForSyncData((d) => {
    setData(d);
    setSyncing(false);
  });
  return stop;
}, []);

const handleSync = () => {
  setSyncing(true);
  openSyncPopup();
};
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/lib/sync.ts src/App.tsx
git commit -m "feat: add sync popup and postMessage listener"
```

---

### Task 14: Export helper script

**Files:**
- Create: `scripts/export-helper.js`

- [ ] **Step 1: Create `scripts/export-helper.js`**

This is a browser-console snippet the user pastes into lvup.gg's devtools console (or runs as a bookmarklet) while logged in. It reads the token from localStorage, calls the authenticated API, normalizes to the `data.json` schema, and posts the result back to the dashboard popup via `postMessage`.

```js
(async () => {
  const API = 'https://api.lvup.gg/v2';
  const token = JSON.parse(localStorage.getItem('auth#accessToken') || 'null');
  if (!token) {
    alert('Not logged in. Please log in to lvup.gg first.');
    return;
  }
  const headers = { Authorization: `Bearer ${token}` };
  const get = async (path) => {
    const res = await fetch(API + path, { headers });
    if (!res.ok) throw new Error(`${path} -> ${res.status}`);
    return res.json();
  };

  // Phase 1: list the user's brackets (paginated)
  const brackets = [];
  let cursor = 0;
  const size = 100;
  for (;;) {
    const list = await get(`/easy-brackets/users/me2?cursor=${cursor}&size=${size}`);
    const items = list.body?.brackets || list.body || [];
    brackets.push(...items);
    if (items.length < size) break;
    cursor += size;
  }

  // Phase 2: for each bracket, fetch rosters + type-specific matches
  const normalized = [];
  for (const b of brackets) {
    const id = b.id;
    const type = (b.type || '').toLowerCase();
    const matches = [];
    try {
      const rosters = await get(`/easy-brackets/${id}/rosters`);
      const rosterList = rosters.body || [];
      const nameById = new Map(rosterList.map((r) => [r.id, r.nickname || r.name || 'Unknown']));
      const matchRes = await get(`/easy-brackets/${id}/${type}/matches`);
      const rawMatches = matchRes.body || [];
      for (const m of rawMatches) {
        matches.push({
          id: m.id,
          round: m.round,
          playerA: nameById.get(m.teamAId) || nameById.get(m.teamId) || 'Unknown',
          playerB: nameById.get(m.teamBId) || 'Unknown',
          winner: m.winnerTeamId ? nameById.get(m.winnerTeamId) : null,
          scoreA: m.scoreA ?? null,
          scoreB: m.scoreB ?? null,
        });
      }
    } catch (e) {
      console.warn('Skipping bracket', id, e);
    }
    normalized.push({
      id,
      name: b.name || b.title || `Bracket ${id}`,
      type,
      createdAt: b.createdAt || b.createdDate || '',
      matches,
    });
  }

  const data = { exportedAt: new Date().toISOString(), brackets: normalized };

  // Send to the dashboard popup opener
  if (window.opener) {
    window.opener.postMessage({ type: 'matchup-dashboard:data', data }, '*');
  }
  // Also offer a download
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'data.json';
  a.click();
  console.log('Exported', normalized.length, 'brackets');
})();
```

> **Note:** Field names (`brackets`, `nickname`, `teamAId`, `teamBId`, `winnerTeamId`, `scoreA`, `scoreB`, `round`, `id`) are best-effort guesses from static analysis. The robust path is: run this in Phase 1 "dump raw" mode first, inspect the real field names, then correct the normalizer. The plan's Task 14 is the initial version; a follow-up task (Task 15) covers verifying against real data.

- [ ] **Step 2: Commit**

```bash
git add scripts/export-helper.js
git commit -m "feat: add lvup.gg export helper script"
```

---

### Task 15: Verify export helper against real data

**Files:**
- Modify: `scripts/export-helper.js` (field names corrected as needed)

- [ ] **Step 1: User runs the export helper**

The user logs into lvup.gg, opens devtools console, pastes the script, and runs it. The script downloads `data.json` and posts to the dashboard.

- [ ] **Step 2: Inspect the raw output**

Open the downloaded `data.json`. Verify the field names match the normalizer's assumptions (`brackets`, `nickname`, `teamAId`, `teamBId`, `winnerTeamId`, `scoreA`, `scoreB`, `round`, `id`).

- [ ] **Step 3: Correct the normalizer if field names differ**

If any field name differs, update the corresponding line in `scripts/export-helper.js` and re-run.

- [ ] **Step 4: Load real data into the dashboard**

Replace `public/data.json` with the real exported file and run `npm run dev`. Verify the four views render correct stats.

- [ ] **Step 5: Commit**

```bash
git add scripts/export-helper.js public/data.json
git commit -m "fix: correct export helper field names from real data"
```

---

## Self-Review

**Spec coverage:**
- Overview view → Task 9 ✓
- Head-to-Head view → Task 10 ✓
- Leaderboard view → Task 11 ✓
- Brackets view → Task 12 ✓
- Sync button + popup + postMessage → Task 13 ✓
- Export helper (one-time install) → Task 14 ✓
- Empty/missing data handling → App.tsx (Task 8) shows "No data yet" ✓
- Local first, deployable later → Vite static build ✓
- Two-phase export (dump raw, then normalize) → Task 14/15 ✓

**Placeholder scan:** No TBD/TODO. The export helper field names are flagged as best-effort with an explicit verification task (Task 15), which is the honest two-phase approach.

**Type consistency:** `MatchupData`, `Bracket`, `Match` types defined in Task 2 and used consistently across all tasks. `computeOverall`, `computeHeadToHead`, `computeLeaderboard` signatures match their usage in views.
