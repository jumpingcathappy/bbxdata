import type { MatchupData } from '../types';

const BASE = import.meta.env.BASE_URL;
const ENC_KEY = 'bbxdat4-3ncrypt10n-k3y-2026';

function xorDecode(encoded: string): string {
  const b64 = atob(encoded);
  let result = '';
  for (let i = 0; i < b64.length; i++) {
    result += String.fromCharCode(b64.charCodeAt(i) ^ ENC_KEY.charCodeAt(i % ENC_KEY.length));
  }
  return result;
}

export async function loadData(): Promise<MatchupData | null> {
  try {
    const res = await fetch(`${BASE}data.enc`);
    if (!res.ok) return null;
    const encoded = await res.text();
    const json = xorDecode(encoded);
    return JSON.parse(json) as MatchupData;
  } catch {
    return null;
  }
}