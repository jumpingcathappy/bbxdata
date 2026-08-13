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
