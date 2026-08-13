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
