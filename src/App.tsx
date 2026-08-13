import { useEffect, useState } from 'react';
import type { MatchupData } from './types';
import { loadData } from './lib/loadData';
import { listenForSyncData, openSyncPopup } from './lib/sync';
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

  useEffect(() => {
    const stop = listenForSyncData((d) => {
      setData(d);
      setSyncing(false);
    });
    return stop;
  }, []);

  const handleSync = () => {
    setSyncing(true);
    const popup = openSyncPopup();
    if (!popup) {
      alert('Popup blocked. Please allow popups for this site.');
      setSyncing(false);
      return;
    }
    // Reset syncing state if the popup flow doesn't complete within 60s.
    window.setTimeout(() => setSyncing(false), 60000);
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