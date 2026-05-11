import { describe, expect, it } from "vitest";
import { buildPortfolioMetrics, buildPositionSummaries } from "./metrics";
import { Transaction } from "../types";

const base = {
  month: "2026-05",
  timestamp: "2026-05-01T00:00:00.000Z",
} satisfies Pick<Transaction, "month" | "timestamp">;

describe("investment metrics", () => {
  it("reduces remaining cost basis on sells using average cost instead of sale proceeds", () => {
    const positions = buildPositionSummaries(
      [
        { ...base, id: "buy-1", ticker: "VOO", amount: 1000, type: "buy", shares: 10 },
        { ...base, id: "sell-1", ticker: "VOO", amount: 600, type: "sell", shares: 5 },
      ],
      []
    );

    expect(positions[0].totalShares).toBe(5);
    expect(positions[0].totalInvested).toBe(500);
    expect(positions[0].avgCostBasis).toBe(100);
    expect(positions[0].realizedPnl).toBe(100);
  });

  it("clamps oversold positions at zero shares and zero remaining cost basis", () => {
    const positions = buildPositionSummaries(
      [
        { ...base, id: "buy-1", ticker: "BTC", amount: 1000, type: "buy", shares: 1 },
        { ...base, id: "sell-1", ticker: "BTC", amount: 1200, type: "sell", shares: 2 },
      ],
      []
    );

    expect(positions[0].totalShares).toBe(0);
    expect(positions[0].totalInvested).toBe(0);
    expect(positions[0].realizedPnl).toBe(200);
  });

  it("uses active positions consistently for top-level total invested", () => {
    const transactions: Transaction[] = [
      { ...base, id: "active", ticker: "VOO", amount: 100, type: "buy" },
      { ...base, id: "archived", ticker: "QQQ", amount: 200, type: "buy" },
    ];
    const positions = buildPositionSummaries(transactions, [
      { ticker: "QQQ", isArchived: true },
    ]);
    const metrics = buildPortfolioMetrics(transactions, positions);

    expect(positions.map((p) => p.ticker)).toEqual(["VOO"]);
    expect(metrics.totalInvested).toBe(100);
  });
});
