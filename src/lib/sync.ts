import type { MatchupData } from '../types';

const LVUP_URL = 'https://lvup.gg/en/easy';
const MESSAGE_TYPE = 'matchup-dashboard:data';

function isValidMatchupData(d: unknown): d is MatchupData {
  if (typeof d !== 'object' || d === null) return false;
  const obj = d as Record<string, unknown>;
  return (
    typeof obj.exportedAt === 'string' &&
    Array.isArray(obj.brackets)
  );
}

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
    if (!isValidMatchupData(payload.data)) {
      console.warn('Ignoring malformed sync data from lvup.gg');
      return;
    }
    onData(payload.data);
  };
  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}
