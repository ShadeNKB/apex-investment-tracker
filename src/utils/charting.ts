export interface CompactedChartSeries {
  data: Array<Record<string, unknown>>;
  tickers: string[];
  hiddenCount: number;
}

const OTHER_KEY = "Other";

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function compactChartSeries(
  data: Array<Record<string, unknown>>,
  tickers: string[],
  maxSeries = 8
): CompactedChartSeries {
  if (tickers.length <= maxSeries) {
    return { data, tickers, hiddenCount: 0 };
  }

  const scores = tickers.map((ticker) => {
    const score = data.reduce((sum, row) => sum + Math.abs(asNumber(row[ticker])), 0);
    return { ticker, score };
  });

  const visibleTickers = scores
    .sort((a, b) => b.score - a.score || a.ticker.localeCompare(b.ticker))
    .slice(0, maxSeries)
    .map((entry) => entry.ticker);
  const visibleSet = new Set(visibleTickers);
  const hiddenTickers = tickers.filter((ticker) => !visibleSet.has(ticker));

  const compacted = data.map((row) => {
    const next: Record<string, unknown> = { ...row };
    next[OTHER_KEY] = hiddenTickers.reduce((sum, ticker) => sum + asNumber(row[ticker]), 0);
    for (const ticker of hiddenTickers) delete next[ticker];
    return next;
  });

  return {
    data: compacted,
    tickers: [...visibleTickers, OTHER_KEY],
    hiddenCount: hiddenTickers.length,
  };
}
