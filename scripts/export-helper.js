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
