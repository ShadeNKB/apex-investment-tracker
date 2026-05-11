import { describe, expect, it } from "vitest";
import { compactChartSeries } from "./charting";

describe("compactChartSeries", () => {
  it("keeps small ticker sets unchanged", () => {
    const data = [{ month: "2026-05", VOO: 100, QQQ: 50 }];

    expect(compactChartSeries(data, ["VOO", "QQQ"], 4)).toEqual({
      data,
      tickers: ["VOO", "QQQ"],
      hiddenCount: 0,
    });
  });

  it("keeps the largest series and groups the rest into Other", () => {
    const result = compactChartSeries(
      [
        { month: "2026-05", VOO: 100, QQQ: 80, BTC: 40, ETH: 30 },
        { month: "2026-06", VOO: 120, QQQ: 90, BTC: 10, ETH: 5 },
      ],
      ["VOO", "QQQ", "BTC", "ETH"],
      2
    );

    expect(result.tickers).toEqual(["VOO", "QQQ", "Other"]);
    expect(result.hiddenCount).toBe(2);
    expect(result.data).toEqual([
      { month: "2026-05", VOO: 100, QQQ: 80, Other: 70 },
      { month: "2026-06", VOO: 120, QQQ: 90, Other: 15 },
    ]);
  });
});
