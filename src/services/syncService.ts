// Cross-device sync layer.
// - Local-first: localStorage is source of truth, Supabase is a stateless relay.
// - Per-transaction Last-Write-Wins merge by `updatedAt ?? timestamp`.
// - Per-ticker Last-Write-Wins merge for positionMeta by `updatedAt`.
// - Tombstone set (`deletedIds`) is unioned across devices.
// - The Supabase JS SDK is lazy-loaded so unconfigured users never pay for it.

import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import type { SyncPayload, Transaction, PositionMeta } from "../types";
import { normalizeTransaction, normalizePositionMeta } from "../utils/storage";

const RAW_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const RAW_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const SUPABASE_URL = normalizeSupabaseUrl(RAW_SUPABASE_URL);
const SUPABASE_ANON_KEY = normalizeSupabaseAnonKey(RAW_SUPABASE_ANON_KEY);

export const syncConfigError = getSyncConfigError(RAW_SUPABASE_URL, RAW_SUPABASE_ANON_KEY);
export const syncEnabled = !!(SUPABASE_URL && SUPABASE_ANON_KEY && !syncConfigError);

const PAYLOAD_WARN_BYTES = 800 * 1024;
const TOMBSTONE_CAP = 2000;
const SYNC_POLL_INTERVAL_MS = 10_000;

// Module-level flag: blocks persistence listener from scheduling a push
// while applySync is writing remote data locally (prevents push-pull loops).
export const syncApplying = { value: false };

// ---------------------------------------------------------------------------
// Lazy-loaded Supabase client
// ---------------------------------------------------------------------------

let clientPromise: Promise<SupabaseClient | null> | null = null;

function getClient(): Promise<SupabaseClient | null> {
  if (!syncEnabled) return Promise.resolve(null);
  if (clientPromise) return clientPromise;
  clientPromise = import("@supabase/supabase-js").then((m) =>
    m.createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      realtime: { params: { eventsPerSecond: 2 } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
  );
  return clientPromise;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ts(value: string | undefined): number {
  return value ? new Date(value).getTime() : 0;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

export function normalizeSupabaseUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value.trim().replace(/\/rest\/v1\/?$/i, "").replace(/\/+$/, "");
}

export function normalizeSupabaseAnonKey(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value.trim();
}

export function getSyncConfigError(url: string | undefined, anonKey: string | undefined): string | null {
  const normalizedUrl = normalizeSupabaseUrl(url);
  const normalizedAnonKey = normalizeSupabaseAnonKey(anonKey);
  if (!normalizedUrl || !normalizedAnonKey) return null;
  if (/^https?:\/\//i.test(normalizedAnonKey)) {
    return "VITE_SUPABASE_ANON_KEY is set to a URL. Paste the anon/public API key instead.";
  }
  return null;
}

function payloadSignature(payload: SyncPayload): string {
  return JSON.stringify({
    transactions: payload.transactions,
    positionMeta: payload.positionMeta,
    deletedIds: payload.deletedIds,
  });
}

function sendSyncBroadcast(client: SupabaseClient, syncId: string, exportedAt: string): void {
  try {
    const channel = client.channel(`apex-sync:${syncId}`);
    let cleanedUp = false;
    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      void client.removeChannel(channel);
    };
    const timeout = setTimeout(cleanup, 3_000);

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        void channel
          .send({
            type: "broadcast",
            event: "sync",
            payload: { updatedAt: exportedAt },
          })
          .catch((error: unknown) => {
            if (import.meta.env.DEV) console.warn("[sync] broadcast failed", error);
          })
          .finally(() => {
            clearTimeout(timeout);
            cleanup();
          });
        return;
      }

      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        clearTimeout(timeout);
        cleanup();
      }
    });
  } catch (error) {
    if (import.meta.env.DEV) console.warn("[sync] broadcast setup failed", error);
  }
}

// ---------------------------------------------------------------------------
// Remote payload validation
// ---------------------------------------------------------------------------

export function normalizeSyncPayload(value: unknown): SyncPayload | null {
  if (!isRecord(value)) return null;
  if (value.version !== 3) return null;
  if (!Array.isArray(value.transactions) || !Array.isArray(value.positionMeta)) return null;
  if (value.deletedIds != null && !Array.isArray(value.deletedIds)) return null;

  const seenIds = new Set<string>();
  const transactions = value.transactions
    .map((row) => normalizeTransaction(row, seenIds))
    .filter((row): row is Transaction => row != null);

  const positionMeta = value.positionMeta
    .map(normalizePositionMeta)
    .filter((row): row is PositionMeta => row != null);

  const deletedIds = (value.deletedIds ?? []).filter((id): id is string => typeof id === "string");

  return {
    version: 3,
    exportedAt: typeof value.exportedAt === "string" ? value.exportedAt : new Date().toISOString(),
    transactions,
    positionMeta,
    deletedIds,
  };
}

export function syncPayloadsEqual(a: SyncPayload, b: SyncPayload): boolean {
  return payloadSignature(a) === payloadSignature(b);
}

// ---------------------------------------------------------------------------
// Merge logic
// ---------------------------------------------------------------------------

export function mergeSyncPayloads(local: SyncPayload, remote: SyncPayload): SyncPayload {
  // Union tombstones — once deleted on any device, stays deleted everywhere.
  const tombstones = new Set<string>([
    ...(remote.deletedIds ?? []),
    ...(local.deletedIds ?? []),
  ]);

  // Merge transactions — LWW per ID by updatedAt ?? timestamp.
  const localMap = new Map<string, Transaction>(local.transactions.map((t) => [t.id, t]));
  const remoteMap = new Map<string, Transaction>(remote.transactions.map((t) => [t.id, t]));
  const allTxIds = new Set<string>([...localMap.keys(), ...remoteMap.keys()]);

  const transactions: Transaction[] = [];
  for (const id of allTxIds) {
    if (tombstones.has(id)) continue;
    const l = localMap.get(id);
    const r = remoteMap.get(id);
    if (!l) { transactions.push(r!); continue; }
    if (!r) { transactions.push(l); continue; }
    const lTime = ts(l.updatedAt ?? l.timestamp);
    const rTime = ts(r.updatedAt ?? r.timestamp);
    transactions.push(lTime >= rTime ? l : r);
  }

  // Sort by date desc for consistent display order.
  transactions.sort((a, b) => {
    const aKey = a.date ?? a.month;
    const bKey = b.date ?? b.month;
    return bKey < aKey ? -1 : bKey > aKey ? 1 : 0;
  });

  // Merge positionMeta — LWW per ticker by updatedAt (falls back to 0 = remote wins on tie).
  const localMetaMap = new Map<string, PositionMeta>(local.positionMeta.map((m) => [m.ticker, m]));
  const remoteMetaMap = new Map<string, PositionMeta>(remote.positionMeta.map((m) => [m.ticker, m]));
  const allTickers = new Set<string>([...localMetaMap.keys(), ...remoteMetaMap.keys()]);

  const positionMeta: PositionMeta[] = [];
  const liveTickers = new Set(transactions.map((transaction) => transaction.ticker));
  for (const ticker of allTickers) {
    if (!liveTickers.has(ticker)) continue;
    const l = localMetaMap.get(ticker);
    const r = remoteMetaMap.get(ticker);
    if (!l) { positionMeta.push(r!); continue; }
    if (!r) { positionMeta.push(l); continue; }
    const lTime = ts(l.updatedAt);
    const rTime = ts(r.updatedAt);
    positionMeta.push(lTime >= rTime ? l : r);
  }

  // Cap tombstones. Remote IDs are inserted first so fresh local deletes survive
  // pruning even when the remote bucket already exceeds the cap.
  const cappedTombstones = [...tombstones].slice(-TOMBSTONE_CAP);

  return {
    version: 3,
    exportedAt: new Date().toISOString(),
    transactions,
    positionMeta,
    deletedIds: cappedTombstones,
  };
}

// ---------------------------------------------------------------------------
// Remote operations
// ---------------------------------------------------------------------------

export class PayloadTooLargeError extends Error {
  constructor(public bytes: number) {
    super(`Sync payload is ${(bytes / 1024).toFixed(0)} KB - too large to safely sync.`);
  }
}

export class RemotePayloadError extends Error {
  constructor() {
    super("Remote sync data is corrupted or uses an unsupported format.");
  }
}

export async function pushSync(syncId: string, data: SyncPayload): Promise<void> {
  const client = await getClient();
  if (!client) throw new Error("Sync not configured");

  const serialized = JSON.stringify(data);
  if (serialized.length > PAYLOAD_WARN_BYTES) {
    if (import.meta.env.DEV) {
      console.warn(`[sync] payload is ${(serialized.length / 1024).toFixed(0)} KB - approaching row limit`);
    }
    if (serialized.length > 1024 * 1024) throw new PayloadTooLargeError(serialized.length);
  }

  const { error } = await client
    .rpc("push_sync_bucket", { bucket_id: syncId, bucket_payload: data });
  if (error) throw error;

  sendSyncBroadcast(client, syncId, data.exportedAt);
}

export async function pullSync(syncId: string): Promise<SyncPayload | null> {
  const client = await getClient();
  if (!client) throw new Error("Sync not configured");
  const { data, error } = await client.rpc("pull_sync_bucket", { bucket_id: syncId });
  if (error) throw error;
  if (!data) return null;
  const normalized = normalizeSyncPayload(data);
  if (!normalized) throw new RemotePayloadError();
  return normalized;
}

/**
 * Subscribe to UUID-scoped realtime broadcasts with polling as a fallback.
 * Reads/writes still go through RPC functions, so anon clients do not need
 * broad table grants.
 */
export async function subscribeSync(
  syncId: string,
  onUpdate: () => void
): Promise<() => void> {
  const client = await getClient();
  if (!client) return () => {};

  let active = true;
  const channel: RealtimeChannel = client
    .channel(`apex-sync:${syncId}`, { config: { broadcast: { self: false } } })
    .on("broadcast", { event: "sync" }, () => {
      if (active) onUpdate();
    })
    .subscribe();

  const interval = setInterval(() => {
    if (active) onUpdate();
  }, SYNC_POLL_INTERVAL_MS);
  const onOnlineOrFocus = () => {
    if (active) onUpdate();
  };

  window.addEventListener("online", onOnlineOrFocus);
  window.addEventListener("focus", onOnlineOrFocus);

  return () => {
    active = false;
    clearInterval(interval);
    client.removeChannel(channel);
    window.removeEventListener("online", onOnlineOrFocus);
    window.removeEventListener("focus", onOnlineOrFocus);
  };
}
