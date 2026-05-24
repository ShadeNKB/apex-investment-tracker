// Manages cross-device sync state for Apex.
// Mirrors the proven pattern from SpendTrack's useSyncStore but adapted
// for React custom hooks (no Zustand). Uses refs for always-fresh access
// inside async closures, avoiding stale closure bugs.

import { useState, useRef, useCallback, useEffect } from "react";
import type { CloudStatus, SyncPayload } from "../types";
import {
  syncEnabled,
  syncApplying,
  pushSync,
  pullSync,
  subscribeSync,
  mergeSyncPayloads,
  syncPayloadsEqual,
  syncConfigError,
} from "../services/syncService";
import { getSyncId, saveSyncId } from "../utils/storage";

interface SyncStateConfig {
  exportBackup: () => SyncPayload;
  applySync: (payload: SyncPayload) => void;
}

const PUSH_DEBOUNCE_MS = 3000;
const MAX_RETRY_DELAY_MS = 2 * 60 * 1000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function getSyncErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return "Could not reach sync server. Changes are saved locally and will retry.";
}

export function useSyncState({ exportBackup, applySync }: SyncStateConfig) {
  const [syncId, setSyncId] = useState<string | null>(null);
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>("idle");
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [syncError, setSyncError] = useState<string | null>(syncConfigError);

  // Mutable refs: always-current values accessible inside async closures
  // without stale-closure problems. Equivalent to Zustand's get().
  const syncIdRef = useRef<string | null>(null);
  const exportBackupRef = useRef(exportBackup);
  const applyRef = useRef(applySync);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const inFlightSyncIdRef = useRef<string | null>(null);
  const inFlightTokenRef = useRef<symbol | null>(null);
  const setupGenRef = useRef(0);
  const realtimeUnsubRef = useRef<(() => void) | null>(null);
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryAttemptRef = useRef(0);
  const triggerSyncRef = useRef<(explicitId?: string) => Promise<void>>(() => Promise.resolve());
  const dirtyDuringSyncRef = useRef(false);

  // Keep refs in sync with latest props/state without mutating refs during render.
  useEffect(() => { syncIdRef.current = syncId; }, [syncId]);
  useEffect(() => { exportBackupRef.current = exportBackup; }, [exportBackup]);
  useEffect(() => { applyRef.current = applySync; }, [applySync]);

  const clearTimers = useCallback(() => {
    if (pushTimerRef.current) { clearTimeout(pushTimerRef.current); pushTimerRef.current = null; }
    if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null; }
  }, []);

  // Core sync cycle: pull remote -> merge -> apply locally -> push merged.
  // Accepts an explicit `id` override for use during setupSync (before
  // setSyncId has propagated through React state).
  const triggerSync = useCallback(async (explicitId?: string): Promise<void> => {
    const id = explicitId ?? syncIdRef.current;
    if (!id || !syncEnabled) return;

    // Reuse only same-UUID in-flight syncs.
    if (inFlightRef.current && inFlightSyncIdRef.current === id) return inFlightRef.current;

    setCloudStatus("syncing");
    setSyncError(null);
    const syncToken = Symbol(id);
    inFlightSyncIdRef.current = id;
    inFlightTokenRef.current = syncToken;
    inFlightRef.current = (async () => {
      try {
        const remote = await pullSync(id);
        // Snapshot after the network read, not before it. Otherwise a local
        // edit made during the pull can be overwritten by the older snapshot.
        const local = exportBackupRef.current();
        const merged = remote ? mergeSyncPayloads(local, remote) : local;

        // Apply merged data locally. The syncApplying flag prevents the
        // onMutation callback from scheduling a redundant push during this write.
        syncApplying.value = true;
        try {
          applyRef.current(merged);
        } finally {
          syncApplying.value = false;
        }

        if (!remote || !syncPayloadsEqual(merged, remote)) {
          await pushSync(id, merged);
        }
        setCloudStatus("synced");
        setLastSyncAt(Date.now());
        retryAttemptRef.current = 0;
      } catch (err) {
        console.error("[sync] triggerSync failed", err);
        syncApplying.value = false;
        setCloudStatus("error");
        setSyncError(getSyncErrorMessage(err));
        // Exponential backoff: 3s, 6s, 12s, capped at 2 min.
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        retryAttemptRef.current = Math.min(retryAttemptRef.current + 1, 8);
        const delay = Math.min(MAX_RETRY_DELAY_MS, 1500 * Math.pow(2, retryAttemptRef.current));
        retryTimerRef.current = setTimeout(() => {
          retryTimerRef.current = null;
          triggerSyncRef.current().catch(() => {});
        }, delay);
        throw err;
      } finally {
        if (inFlightTokenRef.current === syncToken) {
          inFlightRef.current = null;
          inFlightSyncIdRef.current = null;
          inFlightTokenRef.current = null;
          if (dirtyDuringSyncRef.current) {
            dirtyDuringSyncRef.current = false;
            triggerSyncRef.current(id).catch((err) => console.error("[sync] follow-up sync", err));
          }
        }
      }
    })();
    return inFlightRef.current;
  }, []); // stable: reads from refs, no deps needed

  useEffect(() => {
    triggerSyncRef.current = triggerSync;
  }, [triggerSync]);

  const setupSync = useCallback(async (id: string, options?: { preserveOnFailure?: boolean }): Promise<void> => {
    if (!UUID_RE.test(id)) {
      saveSyncId(null);
      setSyncId(null);
      setCloudStatus("idle");
      setSyncError(null);
      return;
    }

    saveSyncId(id);
    const gen = ++setupGenRef.current;
    setSyncId(id);
    setSyncError(null);

    // Tear down any previous Realtime subscription.
    if (realtimeUnsubRef.current) {
      try { realtimeUnsubRef.current(); } finally { realtimeUnsubRef.current = null; }
    }

    // Pull, subscribe, then pull once more to close the small race window
    // between initial pull completion and the Realtime channel becoming ready.
    try {
      await triggerSync(id);
    } catch (err) {
      if (gen === setupGenRef.current) {
        if (!options?.preserveOnFailure) {
          saveSyncId(null);
          setSyncId(null);
        }
        setCloudStatus("error");
        clearTimers();
      }
      throw err;
    }
    if (gen !== setupGenRef.current) return; // superseded by a newer setupSync call

    realtimeUnsubRef.current = await subscribeSync(id, () => {
      if (gen !== setupGenRef.current) return; // stale subscription guard
      triggerSync(id).catch((err) => console.error("[sync] realtime trigger", err));
    });
    if (gen === setupGenRef.current) {
      triggerSync(id).catch((err) => console.error("[sync] post-subscribe sync", err));
    }
  }, [triggerSync, clearTimers]);

  const disconnectSync = useCallback(async () => {
    setupGenRef.current++;
    saveSyncId(null);
    setSyncId(null);
    setCloudStatus("idle");
    setSyncError(null);
    setLastSyncAt(null);
    clearTimers();
    retryAttemptRef.current = 0;
    if (realtimeUnsubRef.current) {
      try { realtimeUnsubRef.current(); } finally { realtimeUnsubRef.current = null; }
    }
  }, [clearTimers]);

  // Called after every local mutation (add/update/delete/restore).
  // Debounces pushes so rapid edits coalesce into a single round-trip.
  const schedulePush = useCallback(() => {
    if (!syncIdRef.current || !syncEnabled) return;
    if (syncApplying.value) return; // don't push while applying remote data
    if (inFlightRef.current) {
      dirtyDuringSyncRef.current = true;
      return;
    }
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(() => {
      pushTimerRef.current = null;
      triggerSync().catch((err) => console.error("[sync] scheduled push", err));
    }, PUSH_DEBOUNCE_MS);
  }, [triggerSync]);

  // On mount: restore the persisted sync ID and reconnect.
  const initSync = useCallback(() => {
    if (!syncEnabled) return;
    const saved = getSyncId();
    if (saved) {
      setupSync(saved, { preserveOnFailure: true }).catch((err) => console.error("[sync] initSync", err));
    }
  }, [setupSync]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      clearTimers();
      if (realtimeUnsubRef.current) {
        try { realtimeUnsubRef.current(); } finally { realtimeUnsubRef.current = null; }
      }
    };
  }, [clearTimers]);

  return {
    syncId,
    cloudStatus,
    syncError,
    lastSyncAt,
    syncEnabled,
    syncConfigError,
    initSync,
    setupSync,
    disconnectSync,
    triggerSync: () => triggerSync(),
    schedulePush,
  };
}
