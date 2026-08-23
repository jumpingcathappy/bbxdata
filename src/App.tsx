import { useEffect, useState } from 'react';
import type { MatchupData } from './types';
import { loadData } from './lib/loadData';
import { listenForSyncData, openSyncPopup } from './lib/sync';
import AuthGate from './components/AuthGate';
import Overview from './components/Overview';
import HeadToHead from './components/HeadToHead';
import Leaderboard from './components/Leaderboard';
import Brackets from './components/Brackets';
import Trends from './components/Trends';
import SyncButton from './components/SyncButton';

const AUTH_HASH = '0fa46c8cb639c882eba8fac0eb59c701a4735e16bc0b92a9da502a50e94ceb6b';

type Tab = 'overview' | 'headtohead' | 'leaderboard' | 'trends' | 'brackets';

function isAuthenticated(): boolean {
  return sessionStorage.getItem('auth') === AUTH_HASH;
}

export default function App() {
  const [authed, setAuthed] = useState(isAuthenticated());
  const [data, setData] = useState<MatchupData | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!authed) return;
    loadData().then(setData);
  }, [authed]);

  useEffect(() => {
    if (!authed) return;
    const stop = listenForSyncData((d) => {
      setData(d);
      setSyncing(false);
    });
    return stop;
  }, [authed]);

  const handleSync = () => {
    setSyncing(true);
    const popup = openSyncPopup();
    if (!popup) {
      alert('Popup blocked. Please allow popups for this site.');
      setSyncing(false);
      return;
    }
    window.setTimeout(() => setSyncing(false), 60000);
  };

  if (!authed) {
    return <AuthGate onAuth={() => setAuthed(true)} />;
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'headtohead', label: 'Head-to-Head' },
    { id: 'leaderboard', label: 'Leaderboard' },
    { id: 'trends', label: 'Trends' },
    { id: 'brackets', label: 'Brackets' },
  ];

  return (
    <div className="app">
      <header className="app-header">
        <h1>Matchup Dashboard</h1>
        <SyncButton onSync={handleSync} syncing={syncing} />
      </header>
      <nav className="tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`tab-btn${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <main>
        {data === null ? (
          <p className="empty">
            No data yet. Click Sync to pull your brackets from lvup.gg.
          </p>
        ) : (
          <>
            {tab === 'overview' && <Overview data={data} />}
            {tab === 'headtohead' && <HeadToHead data={data} />}
            {tab === 'leaderboard' && <Leaderboard data={data} />}
            {tab === 'trends' && <Trends data={data} />}
            {tab === 'brackets' && <Brackets data={data} />}
          </>
        )}
      </main>
    </div>
  );
}