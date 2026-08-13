# Personal Matchup Dashboard — Design

**Date:** 2026-08-13
**Status:** Approved (pending user review of this written spec)

## Goal

A personal matchup dashboard for the user (emsdrockmanchan@gmail.com) who runs
tournament brackets on lvup.gg. The dashboard shows head-to-head records, overall
records, and a player leaderboard, all derived from the user's own bracket data
stored on lvup.gg.

## Scope

- **In scope:** A static web app (Vite + React + TypeScript) that reads a
  normalized `data.json` and renders four views (Overview, Head-to-Head,
  Leaderboard, Brackets). A "Sync" button that opens a popup to lvup.gg and
  pulls the user's bracket data via a one-time-installed export helper.
- **Out of scope:** Live multi-user support, a backend server, a database,
  editing brackets, or scraping data for anyone other than the user.

## Architecture

```
lvup.gg (user's brackets)
   │  (authenticated API, Bearer token from localStorage)
   ▼
Export helper (runs in lvup.gg page, one-time install)
   │  (postMessage → dashboard popup)
   ▼
data.json (normalized schema)
   │
   ▼
Static dashboard (Vite + React) — reads data.json, renders views
```

Key principle: **the export helper is the only piece that knows lvup.gg's API
shape.** The dashboard reads only the normalized `data.json`. If lvup.gg changes
its API, only the export helper needs fixing.

## Data format (data.json)

```json
{
  "exportedAt": "2026-08-13T10:00:00Z",
  "brackets": [
    {
      "id": "bracket-1",
      "name": "Weekly Smash",
      "type": "single-elimination",
      "createdAt": "2026-07-01T00:00:00Z",
      "matches": [
        {
          "id": "m1",
          "round": 1,
          "playerA": "Alice",
          "playerB": "Bob",
          "winner": "Alice",
          "scoreA": 2,
          "scoreB": 1
        }
      ]
    }
  ]
}
```

## Authentication & sync

- lvup.gg uses its own JWT auth (Google login via their membership SDK at
  `auth.lvup.gg`). The API accepts lvup.gg's JWT, not a raw Google token.
- Tokens live in `localStorage` on the **lvup.gg domain**. The dashboard runs on
  `localhost` (a different origin), so it cannot read lvup.gg's session directly.
- **Sync flow (Option 1, approved):**
  1. User clicks **Sync** in the dashboard.
  2. Dashboard opens a popup to lvup.gg. If not logged in, the user completes
     Google login there (their normal flow — the app never handles their password).
  3. A **one-time-installed export helper** (pasted into lvup.gg's console once,
     or a bookmarklet) runs against the user's live session, calls the
     authenticated API, and sends the data back to the dashboard via `postMessage`.
  4. Dashboard stores the data and refreshes the stats.
- **One-time setup:** the user pastes a short snippet into lvup.gg's console once
  to install the export helper. After that, Sync is one click.

### Export helper phases

1. **Phase 1 — Dump raw data:** The helper reads the token from
   `localStorage['auth#accessToken']`, calls the API, and downloads all raw
   responses. No field-name assumptions.
2. **Phase 2 — Normalize:** Inspect the actual field names in the raw dump, then
   write the normalizer that converts it into the clean `data.json` schema.

### API endpoints used by the export helper

- `GET /easy-brackets/users/me2?cursor=0&size=N` — list the user's brackets (paginated)
- `GET /easy-brackets/{id}` — bracket basic info
- `GET /easy-brackets/{id}/rosters` — players/teams in each bracket
- `GET /easy-brackets/{id}/{type}/matches` — matches per bracket type
  (single-elimination, double-elimination, free-for-all)

## Dashboard views

- **Overview** — overall record (wins/losses/win rate), total matches, number of
  brackets, recent activity, "last exported" timestamp.
- **Head-to-Head** — table of player pairs with records ("Alice vs Bob: 5-2").
  Click a pair to see match history.
- **Leaderboard** — players ranked by wins and win rate, with total matches played.
- **Brackets** — list of brackets with details (type, date, match count),
  expandable to see matches.

## Tech stack

- **Vite + React + TypeScript.** Fast dev server, one-command build producing a
  static folder deployable to Netlify/Vercel/GitHub Pages later.
- `data.json` sits in the `public/` folder. Moving to hosted later = upload the
  build folder.

## Error handling & edge cases

- **Empty/missing data** — if `data.json` is missing or empty, show a friendly
  "run the export" message instead of a blank page.
- **Unknown players** — matches with a missing player name are labeled "Unknown"
  and don't break the leaderboard.
- **Byes/forfeits** — matches with no recorded winner are excluded from win/loss
  stats but still listed.
- **Data refresh** — "Last exported" timestamp on the Overview shows data freshness.

## Deployment path

- **Now:** local (`localhost`), reads `data.json` from `public/`.
- **Later:** upload the build folder to Netlify/Vercel/GitHub Pages. The export
  helper and data format stay the same.
