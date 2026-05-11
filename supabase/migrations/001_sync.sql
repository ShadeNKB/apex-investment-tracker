-- Apex Investment Tracker optional cross-device sync.
-- No auth is used. The sync UUID is a bearer secret: anyone with it can
-- read/write that bucket through the RPC functions below.

create table if not exists public.sync_buckets (
  sync_id uuid primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.sync_buckets enable row level security;

-- Keep the table itself private to anon clients. The app only receives access
-- to exact-key RPC functions, so the anon key cannot list every sync bucket.
revoke all on table public.sync_buckets from anon;
revoke all on table public.sync_buckets from authenticated;

drop policy if exists "anon can read sync buckets" on public.sync_buckets;
drop policy if exists "anon can upsert sync buckets" on public.sync_buckets;
drop policy if exists "anon can update sync buckets" on public.sync_buckets;

create or replace function public.pull_sync_bucket(bucket_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select payload
  from public.sync_buckets
  where sync_id = bucket_id
$$;

create or replace function public.push_sync_bucket(bucket_id uuid, bucket_payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.sync_buckets (sync_id, payload, updated_at)
  values (bucket_id, bucket_payload, now())
  on conflict (sync_id)
  do update set
    payload = excluded.payload,
    updated_at = excluded.updated_at;
end;
$$;

grant execute on function public.pull_sync_bucket(uuid) to anon;
grant execute on function public.push_sync_bucket(uuid, jsonb) to anon;
