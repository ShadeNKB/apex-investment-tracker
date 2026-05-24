import { describe, expect, it } from "vitest";
import type { SyncPayload, Transaction } from "../types";
import {
  getSyncConfigError,
  mergeSyncPayloads,
  normalizeSupabaseAnonKey,
  normalizeSupabaseUrl,
  normalizeSyncPayload,
  syncPayloadsEqual,
} from "./syncService";

const tx = (overrides: Partial<Transaction>): Transaction => ({
  id: "tx-1",
  month: "2026-05",
  ticker: "VOO",
  amount: 100,
  type: "buy",
  timestamp: "2026-05-01T00:00:00.000Z",
  ...overrides,
});

const payload = (overrides: Partial<SyncPayload> = {}): SyncPayload => ({
  version: 3,
  exportedAt: "2026-05-01T00:00:00.000Z",
  transactions: [],
  positionMeta: [],
  deletedIds: [],
  ...overrides,
});

describe("sync service", () => {
  it("normalizes Supabase project URLs pasted from Data API settings", () => {
    expect(normalizeSupabaseUrl("https://example.supabase.co/rest/v1")).toBe("https://example.supabase.co");
    expect(normalizeSupabaseUrl("https://example.supabase.co/rest/v1/")).toBe("https://example.supabase.co");
    expect(normalizeSupabaseUrl(" https://example.supabase.co/ ")).toBe("https://example.supabase.co");
    expect(normalizeSupabaseAnonKey(" abc123 ")).toBe("abc123");
  });

  it("detects when the Supabase anon key env var is accidentally set to a URL", () => {
    expect(
      getSyncConfigError("https://example.supabase.co", "https://example.supabase.co")
    ).toMatch(/VITE_SUPABASE_ANON_KEY/);
  });

  it("rejects non-v3 or structurally invalid remote payloads", () => {
    expect(normalizeSyncPayload(null)).toBeNull();
    expect(normalizeSyncPayload({ version: 2, transactions: [], positionMeta: [] })).toBeNull();
    expect(normalizeSyncPayload({ version: 3, transactions: {}, positionMeta: [] })).toBeNull();
  });

  it("normalizes valid remote rows and filters invalid deleted ids", () => {
    expect(
      normalizeSyncPayload({
        version: 3,
        exportedAt: "2026-05-01T00:00:00.000Z",
        transactions: [
          { id: 1, month: "2026-05", ticker: " voo ", amount: "150", timestamp: "2026-05-01T00:00:00.000Z" },
          { id: 2, month: "bad", ticker: "QQQ", amount: 200 },
        ],
        positionMeta: [{ ticker: " voo ", strategy: "Core" }, { ticker: "" }],
        deletedIds: ["tx-deleted", 123],
      })
    ).toEqual({
      version: 3,
      exportedAt: "2026-05-01T00:00:00.000Z",
      transactions: [
        {
          id: "1",
          month: "2026-05",
          ticker: "VOO",
          amount: 150,
          type: "buy",
          timestamp: "2026-05-01T00:00:00.000Z",
        },
      ],
      positionMeta: [{ ticker: "VOO", strategy: "Core" }],
      deletedIds: ["tx-deleted"],
    });
  });

  it("unions tombstones and removes tombstoned transactions from both sides", () => {
    const merged = mergeSyncPayloads(
      payload({ transactions: [tx({ id: "local" })], deletedIds: ["remote"] }),
      payload({ transactions: [tx({ id: "remote" })], deletedIds: ["local"] })
    );

    expect(merged.transactions).toEqual([]);
    expect(new Set(merged.deletedIds)).toEqual(new Set(["remote", "local"]));
  });

  it("uses newer transaction updatedAt over older timestamp", () => {
    const merged = mergeSyncPayloads(
      payload({ transactions: [tx({ amount: 100, updatedAt: "2026-05-02T00:00:00.000Z" })] }),
      payload({ transactions: [tx({ amount: 200, updatedAt: "2026-05-03T00:00:00.000Z" })] })
    );

    expect(merged.transactions[0].amount).toBe(200);
  });

  it("falls back to timestamp when updatedAt is absent", () => {
    const merged = mergeSyncPayloads(
      payload({ transactions: [tx({ amount: 100, timestamp: "2026-05-02T00:00:00.000Z" })] }),
      payload({ transactions: [tx({ amount: 200, timestamp: "2026-05-03T00:00:00.000Z" })] })
    );

    expect(merged.transactions[0].amount).toBe(200);
  });

  it("merges position metadata by ticker updatedAt", () => {
    const merged = mergeSyncPayloads(
      payload({ positionMeta: [{ ticker: "VOO", strategy: "Core", updatedAt: "2026-05-01T00:00:00.000Z" }] }),
      payload({ positionMeta: [{ ticker: "VOO", strategy: "Growth", updatedAt: "2026-05-02T00:00:00.000Z" }] })
    );

    expect(merged.positionMeta).toEqual([{ ticker: "VOO", strategy: "Growth", updatedAt: "2026-05-02T00:00:00.000Z" }]);
  });

  it("compares payload content without exportedAt to suppress realtime echo pushes", () => {
    expect(syncPayloadsEqual(
      payload({ exportedAt: "2026-05-01T00:00:00.000Z", transactions: [tx({})] }),
      payload({ exportedAt: "2026-05-02T00:00:00.000Z", transactions: [tx({})] })
    )).toBe(true);
  });

  it("caps deleted ids at 2000", () => {
    const merged = mergeSyncPayloads(
      payload({ deletedIds: Array.from({ length: 1500 }, (_, i) => `l-${i}`) }),
      payload({ deletedIds: Array.from({ length: 1500 }, (_, i) => `r-${i}`) })
    );

    expect(merged.deletedIds).toHaveLength(2000);
    expect(merged.deletedIds[merged.deletedIds.length - 1]).toBe("l-1499");
  });

  it("keeps fresh local tombstones when remote has a large tombstone set", () => {
    const merged = mergeSyncPayloads(
      payload({ deletedIds: ["fresh-local-delete"] }),
      payload({ deletedIds: Array.from({ length: 2500 }, (_, i) => `old-remote-${i}`) })
    );

    expect(merged.deletedIds).toContain("fresh-local-delete");
  });
});
