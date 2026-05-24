# Cross-Device Sync Setup

Apex works fully offline with no environment variables. Cross-device pairing is optional and uses Supabase as a UUID-scoped relay.

## How It Works

- One device generates a UUID sync code.
- Other devices join with the same UUID.
- Every device keeps its own local copy in `localStorage`.
- Supabase stores one JSON payload per UUID so devices can pull, merge, and push.
- Realtime Broadcast wakes paired devices immediately; polling/focus/online events act as fallback recovery.
- There is no account system in Apex. The UUID is the shared secret.

Anyone with the UUID can read and update that synced portfolio. Treat the sync code like a password.

## 1. Create Supabase Project

1. Open [Supabase Dashboard](https://supabase.com/dashboard).
2. Create a new project.
3. Wait for the database to finish provisioning.

## 2. Run The Migration

Open the project SQL editor and run:

```sql
-- Use the committed file:
-- supabase/migrations/001_sync.sql
```

The migration creates:

- `public.sync_buckets`
- `public.pull_sync_bucket(bucket_id uuid)`
- `public.push_sync_bucket(bucket_id uuid, bucket_payload jsonb)`

The table is private to anon clients. The browser app only gets exact-key RPC access.

## 3. Add Environment Variables

In Vercel, add:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

For local development, copy `.env.example` to `.env.local` and fill the same values.

## 4. Deploy

Redeploy the app after adding env vars.

Local-only mode remains available if these variables are missing.

## 5. Pair Devices

1. Open Apex on the first device.
2. Open `Sync`.
3. Generate a sync code.
4. Copy the UUID.
5. Open Apex on another device.
6. Open `Sync`.
7. Paste the UUID and connect.

The same UUID can be used across phone, desktop, tablet, browser profiles, and PWA installs.

## Expected Behaviour

- Add/edit/delete syncs across devices.
- Deleted transactions stay deleted through tombstones.
- Newer edits win by `updatedAt`.
- Switching to a different UUID while another sync is in flight does not reuse the old bucket's request.
- Position metadata is kept only for tickers with live merged transactions, preventing old notes from returning after a full clear.
- Corrupted remote payloads are rejected before applying locally.
- Offline edits stay local and retry when connectivity returns.
- Paired devices update through UUID-scoped Realtime Broadcast plus safe RPC pull/merge.

## Validation Checklist

Run locally before deploying:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm audit --audit-level=moderate
```

After deployment:

1. Pair two browser profiles with the same UUID.
2. Add a transaction on profile A.
3. Confirm profile B receives it after realtime broadcast or fallback polling/focus/manual sync.
4. Edit the transaction on B.
5. Confirm A receives the newer edit.
6. Delete the transaction on A.
7. Confirm B does not resurrect it after reload.
