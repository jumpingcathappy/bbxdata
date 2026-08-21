import type { MatchupData } from '../types';

const BASE = import.meta.env.BASE_URL;

export async function loadData(): Promise<MatchupData | null> {
  try {
    const res = await fetch(`${BASE}data.json`);
    if (!res.ok) return null;
    return (await res.json()) as MatchupData;
  } catch {
    return null;
  }
}
