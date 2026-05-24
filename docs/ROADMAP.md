# Apex Roadmap

## Completed

- Local-first portfolio tracking with transaction logging, allocation views, analytics, backup/import, and mobile navigation.
- Optional UUID pairing through Supabase RPC plus Realtime Broadcast and polling/focus/online fallback.
- Sync hardening for tombstones, last-write-wins transaction/meta merges, payload validation, same-UUID in-flight dedupe, and stale metadata pruning.
- Production polish for lazy-loaded views, chart chunking, pagination, modal accessibility, safe-area mobile spacing, and share/price edit correction.
- Public deployment path through Vercel with optional Supabase environment variables.

## Follow-Ups

- Validate live laptop-phone production sync after the deployed `VITE_SUPABASE_ANON_KEY` is confirmed correct.
- Add route-level Playwright regression tests for add, edit, backup, restore, and sync entry flows.
- Add PNG/maskable app icons if Apex is positioned as a full installable PWA.
- Evaluate Recharts 3 or a lighter chart renderer if bundle size becomes a priority.
