# Apex — Investment Tracker

A local-first investment tracker built for clarity. Log buys and sells, track allocation across assets, visualise monthly contribution trends, and export clean JSON backups — all without a backend or an account.

**Live demo:** _add Vercel URL after deployment_

---

## Features

- **Transaction log** — record buy/sell entries with ticker, amount, shares, price per share, and strategy tags
- **Portfolio view** — allocation breakdown, cost basis, and sortable position table
- **Dashboard** — KPI cards (total invested, positions, monthly delta, streak), cumulative area chart, allocation donut, recent activity feed
- **Analytics** — stacked area/bar charts, category and strategy breakdowns, year-over-year comparison, monthly breakdown table
- **Backup & restore** — one-click JSON export and restore with validation
- **Keyboard shortcuts** — `N` to add transaction, `G` + `D/P/T/A` to navigate views
- **PWA-ready** — installable on iOS and Android, works offline after first load
- **Accessible** — focus traps, `aria-live` announcements, keyboard navigation throughout

---

## Stack

| Layer | Choice |
|-------|--------|
| Framework | React 18 + TypeScript |
| Build | Vite 5 |
| Styling | Tailwind CSS 3 |
| Charts | Recharts 2 (lazy-loaded) |
| Persistence | `localStorage` |
| Tests | Vitest + Testing Library |
| Lint | ESLint flat config + typescript-eslint |
| Deploy | Vercel |

---

## Getting started

```bash
git clone https://github.com/ShadeNKB/apex-investment-tracker.git
cd apex-investment-tracker
npm install
npm run dev          # http://localhost:3000
```

### Scripts

```bash
npm run dev          # dev server
npm run build        # production build → dist/
npm run preview      # preview production build locally
npm run lint         # ESLint
npm test             # Vitest unit tests
```

---

## Deployment

### Vercel (recommended)

Push to GitHub, then import the repo on [vercel.com](https://vercel.com). Vercel auto-detects Vite. `vercel.json` is committed with:

- `/assets/*` → `Cache-Control: max-age=31536000, immutable` (content-hashed chunks)
- `index.html` / `manifest.json` → `no-cache` (always fresh)
- Security headers on all routes (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`)

No environment variables required. Fully client-side.

### Any static host

```bash
npm run build        # output → dist/
```

Upload `dist/`. No server-side routing rewrites needed — navigation is React state, not URL paths.

---

## Data model

| Key | Contents |
|-----|----------|
| `investment_spending` | Transaction array |
| `apex_position_meta` | Per-ticker display name, strategy, archive flag |

Backups export both stores as a versioned JSON file. Imports validate schema before replacing local data — invalid files are rejected rather than corrupting state.

---

## Build output

| Chunk | Gzip |
|-------|------|
| App shell + hook | ~10 kB |
| Dashboard | ~3.3 kB |
| Analytics | ~3.2 kB |
| Transactions | ~3.7 kB |
| Portfolio | ~2.2 kB |
| Recharts (lazy, shared) | ~156 kB |

View chunks load on first navigation. Recharts loads only when a chart view renders.

---

## Quality

```
npm run lint    → 0 errors
npm test        → 11/11 passing
npm run build   → clean (tsc + vite)
```
