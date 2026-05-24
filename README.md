<p align="center">
  <img src="public/chart.svg" alt="Apex" width="80" height="80" />
</p>

<h1 align="center">Apex</h1>

<p align="center">
  <strong>Local-first investment tracking with optional UUID device pairing.</strong><br/>
  A fast portfolio dashboard for contributions, allocation, position strategy, and cross-device sync without app accounts.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React 18" />
  <img src="https://img.shields.io/badge/TypeScript-Strict-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript Strict" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite 8" />
  <img src="https://img.shields.io/badge/tests-31%20passing-22C55E?style=flat-square" alt="31 tests passing" />
  <img src="https://img.shields.io/badge/license-MIT-22D3EE?style=flat-square" alt="MIT" />
</p>

<p align="center">
  <a href="https://apex-investment-tracker.vercel.app"><strong>Try the demo</strong></a>
  &nbsp;|&nbsp;
  <a href="#highlights">Highlights</a>
  &nbsp;|&nbsp;
  <a href="#quick-start">Quick start</a>
  &nbsp;|&nbsp;
  <a href="docs/CROSS_DEVICE_SYNC.md">Cross-device sync</a>
  &nbsp;|&nbsp;
  <a href="#deployment">Deployment</a>
</p>

---

## Why Apex

Apex is designed for a personal portfolio workflow: quick logging, clear allocation, and reliable ownership of data.

- **Local-first by default.** The app works without accounts, servers, or environment variables.
- **Optional UUID sync.** Pair laptop, phone, tablet, browser profiles, and PWA installs with one shared sync code.
- **Finance-focused UX.** Track cost basis, contribution rhythm, allocation, categories, strategy tags, notes, and position metadata.
- **Backup remains available.** JSON export/import stays as a fallback rather than the main persistence workflow.
- **Production-oriented.** Strict TypeScript, lint/test/build gates, chunked chart views, and Vercel-ready headers.

---

## Highlights

| Area | Details |
| --- | --- |
| Dashboard | KPI cards, cumulative contribution chart, allocation donut, recent activity |
| Portfolio | Cost basis, allocation bars, position metadata, strategy labels, archive support |
| Transactions | Search, filters, pagination, edit-in-place, two-step delete confirmation |
| Analytics | Monthly trends, category and strategy breakdowns, yearly comparison |
| Sync | UUID device pairing via Supabase RPC and Realtime Broadcast |
| Backup | Versioned JSON export/import with runtime validation |
| Mobile | Bottom navigation, mobile data actions, accessible modals, safe-area handling |

---

## Quick Start

**Requirements:** Node.js 18+ and npm.

```bash
git clone https://github.com/ShadeNKB/apex-investment-tracker.git
cd apex-investment-tracker
npm install
npm run dev
```

Local-only mode requires no environment variables.

### Scripts

```bash
npm run dev          # Vite dev server
npm run typecheck    # TypeScript only
npm run build        # TypeScript + production build
npm run preview      # Preview built app
npm run lint         # ESLint
npm test             # Vitest
```

---

## Cross-Device Sync

Apex sync is optional. The browser remains the source of truth, while Supabase stores one JSON payload per UUID sync code.

The sync flow:

1. Device A generates a UUID sync code.
2. Device B joins with the same UUID.
3. Local data is pulled, merged, applied, and pushed.
4. Paired devices wake each other through UUID-scoped Supabase Realtime Broadcast.
5. Polling, focus, and online events act as fallback recovery.

Data access uses exact-key RPC functions:

- `pull_sync_bucket(bucket_id uuid)`
- `push_sync_bucket(bucket_id uuid, bucket_payload jsonb)`

The Supabase table is not directly granted to anon clients. Anyone with the UUID can still read/write that synced portfolio, so treat the sync code like a password.

Full guide: [docs/CROSS_DEVICE_SYNC.md](docs/CROSS_DEVICE_SYNC.md).

---

## Architecture

### Local State

| Key | Contents |
| --- | --- |
| `investment_spending` | Transaction array |
| `apex_position_meta` | Per-ticker display name, strategy, notes, archived flag |
| `apex_deleted_ids` | Deleted transaction tombstones for sync |
| `apex_sync_id` | Optional persisted UUID sync code |

### Sync Safety

- Transactions merge by `updatedAt ?? timestamp`.
- Position metadata merges by `updatedAt`.
- Deleted transaction IDs are tombstoned so remote devices do not resurrect them.
- Position metadata without a live transaction is pruned during sync so a cleared portfolio does not rehydrate stale ticker notes.
- Remote payloads are validated before applying locally.
- In-flight syncs are deduplicated.
- In-flight sync cycles are isolated per UUID, so changing pairing codes cannot attach to the wrong bucket.
- Local edits during an in-flight sync schedule a follow-up sync.
- Manual backup/import remains available if cloud sync is not configured.

### Performance

- Main views are lazy-loaded.
- Recharts is isolated into a vendor chunk.
- Large chart series are compacted into top assets plus `Other`.
- Transactions are paginated for large histories.

---

## Deployment

### Local-Only Deployment

Build and deploy `dist/` to any static host.

```bash
npm run build
```

### Sync-Enabled Deployment

1. Create a Supabase project.
2. Run `supabase/migrations/001_sync.sql` in the Supabase SQL Editor.
3. Add these environment variables in Vercel:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

4. Redeploy.
5. Pair devices through the app's Sync panel.

Use the anon public key only. Never use the service role key in the frontend.

---

## Quality Gates

Current verification target:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm audit --audit-level=moderate
```

Current coverage includes:

- storage hardening
- restore validation
- investment math
- chart compaction
- sync payload validation
- UUID pairing race protection
- tombstone merge/capping
- orphaned metadata pruning
- SyncPanel pairing states
- transaction share/price editing

---

## FAQ

<details>
<summary><b>Do I need an Apex account?</b></summary>
<br/>
No. Apex has no app account system. Local-only data stays in browser storage. Optional sync uses a UUID code as the shared secret.
</details>

<details>
<summary><b>Can anyone with the UUID access my data?</b></summary>
<br/>
Yes. Treat the UUID like a password. Anyone with it can read and update that synced portfolio.
</details>

<details>
<summary><b>What if Supabase is not configured?</b></summary>
<br/>
The app remains fully usable in local-only mode. Backup/export still works.
</details>

<details>
<summary><b>Does delete sync safely?</b></summary>
<br/>
Yes. Deleted transaction IDs are stored as tombstones and included in merge logic to prevent resurrection.
</details>

---

## Tech Stack

| Layer | Choice |
| --- | --- |
| Framework | React 18 + TypeScript |
| Build | Vite 8 |
| Styling | Tailwind CSS + custom design tokens |
| Charts | Recharts |
| State | Local React hooks + `localStorage` |
| Sync | Supabase RPC + Realtime Broadcast |
| Testing | Vitest + Testing Library |
| Deploy | Vercel/static hosting |

---

## License

[MIT](LICENSE) - built by [ShadeNKB](https://github.com/ShadeNKB)
