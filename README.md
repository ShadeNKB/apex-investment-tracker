<p align="center">
  <img src="public/chart.svg" alt="Apex" width="80" height="80" />
</p>

<h1 align="center">Apex</h1>

<p align="center">
  <strong>Your portfolio, at a glance — no backend required.</strong><br/>
  A fast, local-first investment tracker with allocation breakdowns, contribution trends, and strategy-tagged positions.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React 18" />
  <img src="https://img.shields.io/badge/TypeScript-Strict-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript Strict" />
  <img src="https://img.shields.io/badge/PWA-Installable-8B5CF6?style=flat-square" alt="PWA" />
  <img src="https://img.shields.io/badge/bundle-~10%20KB%20gzip-22C55E?style=flat-square" alt="~10 KB gzip shell" />
  <img src="https://img.shields.io/badge/tests-11%20passing-22C55E?style=flat-square" alt="11 tests" />
  <img src="https://img.shields.io/badge/license-MIT-22D3EE?style=flat-square" alt="MIT" />
</p>

<p align="center">
  <a href="https://apex-investment-tracker.vercel.app"><strong>▶ Try the demo</strong></a>
  &nbsp;·&nbsp;
  <a href="#why-apex">Why Apex</a>
  &nbsp;·&nbsp;
  <a href="#highlights">Highlights</a>
  &nbsp;·&nbsp;
  <a href="#quick-start">Quick start</a>
  &nbsp;·&nbsp;
  <a href="#architecture">Architecture</a>
</p>

---

## Why Apex

Most investment dashboards require an account, an API key, or a subscription before you can see anything useful. Apex skips all of that.

- **Offline-first.** Every transaction is saved to `localStorage` — your data never leaves the browser.
- **Instant clarity.** Log a buy or sell, and every view — allocation donut, cumulative chart, cost basis — updates in real time.
- **Strategy-aware.** Tag positions with custom strategy labels (DCA, Growth, Hedge…) and filter your entire history by them.
- **Keyboard-driven.** `N` to add a transaction, `G` + `D/P/T/A` to navigate — never take your hands off the keyboard.
- **Installable.** Add to your home screen on iOS or Android and use it offline, exactly like a native app.

---

## Highlights

| | |
|---|---|
| **Dashboard** | KPI cards (total invested, positions, monthly delta, streak), cumulative area chart, allocation donut, recent activity feed |
| **Portfolio** | Cost basis per position, allocation bars, sortable table, per-ticker display names and strategy labels |
| **Transactions** | Full history with search, filters (month / asset / type), inline two-step delete confirmation, and edit-in-place |
| **Analytics** | Stacked area/bar trends, category and strategy breakdowns, year-over-year comparison, monthly breakdown table |
| **Backup & restore** | One-click JSON export and import with deep schema validation — invalid files are rejected, never silently corrupt state |
| **PWA** | Installable on iOS & Android, works offline after first load, respects iOS safe areas |
| **Accessible** | `aria-live` announcements, focus traps, keyboard navigation throughout |

---

## Try it

| | Where | Notes |
|--|------|-------|
| **▶ Demo** | [apex-investment-tracker.vercel.app](https://apex-investment-tracker.vercel.app) | Add a few transactions and explore — data stays in your browser |
| **📱 Install** | Open the demo on your phone → Share → **Add to Home Screen** | Runs fullscreen, works offline |
| **🧹 Reset** | Sidebar → **Clear all data** | Wipes all transactions and position metadata |
| **💾 Backup** | Sidebar → **Export backup** | Downloads a versioned JSON snapshot |
| **💻 Self-host** | [Quick start ↓](#quick-start) | Clone and run in under a minute |

---

## Quick start

**Requirements:** Node.js 18+, npm

```bash
git clone https://github.com/ShadeNKB/apex-investment-tracker.git
cd apex-investment-tracker
npm install
npm run dev          # http://localhost:3000
```

No environment variables required. Fully client-side.

### Scripts

```bash
npm run dev          # Dev server with HMR
npm run build        # Production build → dist/
npm run preview      # Preview production build locally
npm run lint         # ESLint (0 errors)
npm test             # Vitest unit tests (11/11)
```

---

## Architecture

### Local-first by design

On load, the app hydrates from `localStorage`. Every action — logging a transaction, editing a position, changing a strategy tag — writes back immediately. There is no server in the hot path; latency is zero.

```
┌──────────────────────────────────────────────────┐
│  React 18 views (Dashboard / Portfolio / …)      │
│       │                                          │
│       ▼                                          │
│  usePortfolio hook  (single source of truth)     │
│       │                                          │
│       ▼                                          │
│  localStorage  (always available, never stale)   │
└──────────────────────────────────────────────────┘
```

All state is owned by a single `usePortfolio` hook. Views are lazy-loaded chunks — they don't download until first navigation. Recharts is isolated in its own manual chunk and only loads when a chart view renders.

### Data model

| Key | Contents |
|-----|----------|
| `investment_spending` | Transaction array |
| `apex_position_meta` | Per-ticker display name, strategy, archive flag |

Backups export both stores as a versioned JSON file. Imports validate schema before replacing local data.

### Performance

| Chunk | Gzip |
|-------|------|
| App shell + hook | ~10 KB |
| Dashboard | ~3.3 KB |
| Analytics | ~3.2 KB |
| Transactions | ~3.7 KB |
| Portfolio | ~2.2 KB |
| Recharts (lazy, shared) | ~156 KB |

View chunks load on first navigation. Recharts loads only when a chart view renders.

---

## Deployment

### Vercel (recommended)

Push to GitHub, then import the repo on [vercel.com](https://vercel.com). Vercel auto-detects Vite. `vercel.json` is committed with:

- `/assets/*` → `Cache-Control: max-age=31536000, immutable` (content-hashed chunks)
- `index.html` / `manifest.json` → `no-cache` (always fresh)
- Security headers on all routes (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`)

No environment variables required.

### Any static host

```bash
npm run build        # output → dist/
```

Upload `dist/`. No server-side routing rewrites needed — navigation is React state, not URL paths.

---

## Quality

```
npm run lint    → 0 errors
npm test        → 11/11 passing
npm run build   → clean (tsc + vite, 0 warnings)
```

- Strict TypeScript, no `any`
- Single-responsibility components, `useCallback` throughout for stable references
- No `!important` overrides — all variants use dedicated CSS classes
- Inline two-step delete confirmation — no native `window.confirm()`
- `aria-live` region at boot for screen reader toast announcements
- iOS safe-area insets on toast positioning

---

## FAQ

<details>
<summary><b>Do I need an account or API key?</b></summary>
<br/>
No. Apex has no backend. All data is stored in your browser's <code>localStorage</code>. Nothing leaves your device.
</details>

<details>
<summary><b>Where is my data stored?</b></summary>
<br/>
In <code>localStorage</code> under two keys: <code>investment_spending</code> (transactions) and <code>apex_position_meta</code> (position display names and strategy tags). You can export a JSON backup at any time from the sidebar.
</details>

<details>
<summary><b>Can I track multiple asset classes?</b></summary>
<br/>
Yes. Each transaction records a ticker, category (ETF, Stock, Crypto, Bond, Cash, Other), buy/sell type, amount, shares, price per share, and optional strategy tags. The Portfolio and Analytics views break down allocation across all categories.
</details>

<details>
<summary><b>Can I install it on my phone?</b></summary>
<br/>
Yes — it's a PWA. <b>iOS:</b> open the site in Safari → Share → <i>Add to Home Screen</i>. <b>Android:</b> Chrome menu → <i>Install app</i>. It runs fullscreen and works offline.
</details>

<details>
<summary><b>How do I move my data to a new browser?</b></summary>
<br/>
Sidebar → <b>Export backup</b>. On the new browser, sidebar → <b>Import backup</b>. All transactions and position metadata transfer in full.
</details>

<details>
<summary><b>What happens if I import a bad JSON file?</b></summary>
<br/>
The import validates the full schema before touching any local state. Invalid files are rejected with an error toast — your existing data is never overwritten.
</details>

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | React 18 + TypeScript (strict) |
| Build | Vite 5 |
| Styling | Tailwind CSS 3 + custom design tokens |
| Charts | Recharts 2 (lazy-loaded, manual chunk) |
| State | Single `usePortfolio` hook + `localStorage` |
| Testing | Vitest + Testing Library |
| Lint | ESLint flat config + typescript-eslint |
| Deploy | Vercel |

---

## License

[MIT](LICENSE) — built by [ShadeNKB](https://github.com/ShadeNKB)
