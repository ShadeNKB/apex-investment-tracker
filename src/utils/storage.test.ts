import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  loadTransactions,
  loadPositionMeta,
  restoreFromFile,
  saveTransactions,
  loadDeletedIds,
  saveDeletedIds,
} from "./storage";
import { Transaction } from "../types";

const TX_KEY = "investment_spending";
const META_KEY = "apex_position_meta";

function fileFromJson(payload: unknown): File {
  return new File([JSON.stringify(payload)], "backup.json", {
    type: "application/json",
  });
}

describe("storage hardening", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("returns an empty transaction list when localStorage JSON is malformed", () => {
    localStorage.setItem(TX_KEY, "{bad json");

    expect(loadTransactions()).toEqual([]);
  });

  it("normalizes valid legacy transactions and drops invalid persisted rows", () => {
    localStorage.setItem(
      TX_KEY,
      JSON.stringify([
        {
          id: 123,
          month: "2026-05",
          ticker: " voo ",
          amount: "250.50",
          timestamp: "2026-05-01T00:00:00.000Z",
        },
        {
          id: 124,
          month: "bad",
          ticker: "",
          amount: -5,
          timestamp: "bad",
        },
      ])
    );

    expect(loadTransactions()).toEqual([
      {
        id: "123",
        month: "2026-05",
        ticker: "VOO",
        amount: 250.5,
        type: "buy",
        timestamp: "2026-05-01T00:00:00.000Z",
      },
    ]);
  });

  it("rejects restore files with invalid transaction rows instead of poisoning state", async () => {
    await expect(
      restoreFromFile(
        fileFromJson({
          version: 2,
          transactions: [{ id: 1, month: "2026-05", ticker: "", amount: 100 }],
          positionMeta: [],
        })
      )
    ).rejects.toThrow("valid transactions");
  });

  it("deduplicates transaction ids during restore", async () => {
    const result = await restoreFromFile(
      fileFromJson({
        version: 2,
        transactions: [
          { id: 1, month: "2026-05", ticker: "VOO", amount: 100, timestamp: "2026-05-01T00:00:00.000Z" },
          { id: 1, month: "2026-06", ticker: "QQQ", amount: 200, timestamp: "2026-06-01T00:00:00.000Z" },
        ],
        positionMeta: [{ ticker: " voo ", displayName: "S&P 500" }],
      })
    );

    expect(result.transactions).toHaveLength(2);
    expect(new Set(result.transactions.map((tx) => tx.id)).size).toBe(2);
    expect(result.meta).toEqual([{ ticker: "VOO", displayName: "S&P 500" }]);
  });

  it("restores v3 backups with sync tombstones", async () => {
    const result = await restoreFromFile(
      fileFromJson({
        version: 3,
        exportedAt: "2026-05-01T00:00:00.000Z",
        transactions: [
          { id: "tx-1", month: "2026-05", ticker: "VOO", amount: 100, timestamp: "2026-05-01T00:00:00.000Z" },
        ],
        positionMeta: [],
        deletedIds: ["deleted-tx", 123],
      })
    );

    expect(result.deletedIds).toEqual(["deleted-tx"]);
  });

  it("persists deleted ids defensively", () => {
    saveDeletedIds(["a", "b"]);

    expect(loadDeletedIds()).toEqual(["a", "b"]);
  });

  it("surfaces localStorage write failures to callers", () => {
    const tx: Transaction = {
      id: "tx-1",
      month: "2026-05",
      ticker: "VOO",
      amount: 100,
      type: "buy",
      timestamp: "2026-05-01T00:00:00.000Z",
    };
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });

    expect(() => saveTransactions([tx])).toThrow("Unable to save investment data");
  });

  it("returns an empty metadata list when localStorage JSON is malformed", () => {
    localStorage.setItem(META_KEY, "{bad json");

    expect(loadPositionMeta()).toEqual([]);
  });
});
