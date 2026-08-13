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

  // Phase 1: list the user's brackets (paginated via body.hasNext)
  const brackets = [];
  let cursor = 0;
  const size = 100;
  for (;;) {
    const list = await get(`/easy-brackets/users/me2?cursor=${cursor}&size=${size}`);
    const body = list.body || {};
    const items = Array.isArray(body.items) ? body.items : [];
    brackets.push(...items);
    if (!body.hasNext) break;
    cursor += size;
  }

  // Phase 2: normalize each bracket. Rosters are embedded in overlaySetting.rosters.
  const normalized = [];
  for (const b of brackets) {
    const id = b.easyBracketId;
    const type = (b.bracketType || '').toLowerCase();
    const rosters = (b.overlaySetting && b.overlaySetting.rosters) || [];
    const nameById = new Map(rosters.map((r) => [r.id, r.name || 'Unknown']));

    // matchResults is empty until brackets are played. Map best-effort when present.
    const matches = (b.matchResults || []).map((m) => ({
      id: m.matchId || m.id || '',
      round: m.round ?? 0,
      playerA: nameById.get(m.teamAId) || nameById.get(m.teamId) || 'Unknown',
      playerB: nameById.get(m.teamBId) || 'Unknown',
      winner: m.winnerTeamId ? nameById.get(m.winnerTeamId) : null,
      scoreA: m.scoreA ?? null,
      scoreB: m.scoreB ?? null,
    }));

    normalized.push({
      id,
      name: b.title || `Bracket ${id}`,
      type,
      createdAt: b.createdDatetime ? new Date(b.createdDatetime).toISOString() : '',
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
