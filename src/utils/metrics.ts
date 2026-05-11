import { Transaction, PositionMeta, PositionSummary, PortfolioMetrics } from "../types";
import { getAssetCategory } from "./assetCategories";
import { getCurrentMonth, getPreviousMonth } from "./formatters";

export function buildPositionSummaries(
  transactions: Transaction[],
  metaList: PositionMeta[]
): PositionSummary[] {
  const metaMap = new Map(metaList.map((m) => [m.ticker, m]));

  // Group transactions by ticker
  const byTicker = transactions.reduce<Record<string, Transaction[]>>(
    (acc, tx) => {
      if (!acc[tx.ticker]) acc[tx.ticker] = [];
      acc[tx.ticker].push(tx);
      return acc;
    },
    {}
  );

  const estimateRemainingCostBasis = (txs: Transaction[]) => {
    const ordered = [...txs].sort((a, b) => {
      const byMonth = a.month.localeCompare(b.month);
      return byMonth !== 0 ? byMonth : a.timestamp.localeCompare(b.timestamp);
    });

    let sharesHeld = 0;
    let costBasis = 0;
    let cashInvested = 0;
    let totalSold = 0;
    let realizedPnl = 0;
    let sawShares = false;

    for (const tx of ordered) {
      const type = tx.type ?? "buy";
      const amount = tx.amount + (type === "buy" ? tx.fees ?? 0 : -(tx.fees ?? 0));

      if (type === "buy") {
        cashInvested += amount;
        costBasis += amount;
        if (tx.shares != null && tx.shares > 0) {
          sawShares = true;
          sharesHeld += tx.shares;
        }
        continue;
      }

      totalSold += tx.amount;
      if (sawShares && tx.shares != null && tx.shares > 0 && sharesHeld > 0) {
        const avgCost = costBasis / sharesHeld;
        const sharesSold = Math.min(tx.shares, sharesHeld);
        const removedBasis = Math.min(costBasis, sharesSold * avgCost);
        costBasis -= removedBasis;
        sharesHeld = Math.max(0, sharesHeld - sharesSold);
        realizedPnl += tx.amount - removedBasis - (tx.fees ?? 0);
      } else {
        costBasis = Math.max(0, costBasis - tx.amount);
      }
    }

    return {
      cashInvested,
      totalSold,
      realizedPnl,
      totalShares: sawShares ? sharesHeld : undefined,
      costBasis: Math.max(0, costBasis),
      avgCostBasis: sawShares && sharesHeld > 0 ? costBasis / sharesHeld : undefined,
    };
  };

  const activeTotalInvestedAll = Object.entries(byTicker).reduce((sum, [ticker, txs]) => {
    const meta = metaMap.get(ticker);
    if (meta?.isArchived) return sum;
    return sum + estimateRemainingCostBasis(txs).costBasis;
  }, 0);

  return Object.entries(byTicker)
    .map(([ticker, txs]) => {
      const meta: PositionMeta = metaMap.get(ticker) ?? { ticker };
      const basis = estimateRemainingCostBasis(txs);

      const months = txs.map((t) => t.month).sort();
      const firstMonth = months[0] ?? "";
      const lastMonth = months[months.length - 1] ?? "";

      return {
        ticker,
        meta,
        category: getAssetCategory(ticker),
        totalInvested: basis.costBasis,
        cashInvested: basis.cashInvested,
        totalSold: basis.totalSold,
        realizedPnl: basis.realizedPnl,
        transactionCount: txs.length,
        firstMonth,
        lastMonth,
        allocationPct: activeTotalInvestedAll > 0 ? (basis.costBasis / activeTotalInvestedAll) * 100 : 0,
        totalShares: basis.totalShares,
        avgCostBasis: basis.avgCostBasis,
      } satisfies PositionSummary;
    })
    .filter((p) => !p.meta.isArchived)
    .sort((a, b) => b.totalInvested - a.totalInvested);
}

export function buildPortfolioMetrics(
  transactions: Transaction[],
  positions: PositionSummary[]
): PortfolioMetrics {
  const totalInvested = positions.reduce((s, p) => s + p.totalInvested, 0);

  // Monthly totals
  const monthlyTotals = transactions.reduce<Record<string, number>>((acc, tx) => {
    const delta = (tx.type ?? "buy") === "buy" ? tx.amount : -tx.amount;
    acc[tx.month] = (acc[tx.month] || 0) + delta;
    return acc;
  }, {});

  const currentMonth = getCurrentMonth();
  const prevMonth = getPreviousMonth(currentMonth);
  const thisMonthTotal = monthlyTotals[currentMonth] ?? 0;
  const lastMonthTotal = monthlyTotals[prevMonth] ?? 0;
  const activeMonths = Object.keys(monthlyTotals).filter((m) => monthlyTotals[m] > 0).length;
  const avgMonthly = activeMonths > 0 ? totalInvested / activeMonths : 0;

  // Streak
  let streak = 0;
    const d = new Date();
  d.setDate(1);
  while (true) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!monthlyTotals[key] || monthlyTotals[key] <= 0) break;
    streak++;
    d.setMonth(d.getMonth() - 1);
  }

  // Category breakdown
  const categoryBreakdown = positions.reduce<Record<string, number>>((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + p.totalInvested;
    return acc;
  }, {});

  // Strategy breakdown — net of sells, drop empty buckets
  const strategyBreakdown = transactions.reduce<Record<string, number>>((acc, tx) => {
    const key = tx.strategy || "Untagged";
    const delta = (tx.type ?? "buy") === "buy" ? tx.amount : -tx.amount;
    acc[key] = (acc[key] || 0) + delta;
    return acc;
  }, {});
  for (const k of Object.keys(strategyBreakdown)) {
    if (strategyBreakdown[k] <= 0) delete strategyBreakdown[k];
  }

  return {
    totalInvested,
    positionCount: positions.length,
    transactionCount: transactions.length,
    thisMonthTotal,
    lastMonthTotal,
    momDelta: thisMonthTotal - lastMonthTotal,
    avgMonthly,
    streak,
    activeMonths,
    categoryBreakdown,
    strategyBreakdown,
  };
}

export function buildMonthlyChartData(
  transactions: Transaction[],
  tickers: string[]
): Array<Record<string, unknown>> {
  const byMonth: Record<string, Record<string, number>> = {};

  for (const tx of transactions) {
    const delta = (tx.type ?? "buy") === "buy" ? tx.amount : -tx.amount;
    if (!byMonth[tx.month]) byMonth[tx.month] = {};
    byMonth[tx.month][tx.ticker] = (byMonth[tx.month][tx.ticker] || 0) + delta;
  }

  const months = Object.keys(byMonth).sort();
  return months.map((month) => {
    const entry: Record<string, unknown> = { month };
    for (const ticker of tickers) {
      entry[ticker] = byMonth[month][ticker] || 0;
    }
    return entry;
  });
}

export function buildCumulativeData(
  monthlyData: Array<Record<string, unknown>>,
  tickers: string[]
): Array<Record<string, unknown>> {
  let running = 0;
  const tickerRunning: Record<string, number> = {};

  return monthlyData.map((row) => {
    const entry: Record<string, unknown> = { month: row.month };
    for (const ticker of tickers) {
      tickerRunning[ticker] = (tickerRunning[ticker] || 0) + ((row[ticker] as number) || 0);
      entry[ticker] = tickerRunning[ticker];
    }
    running += tickers.reduce((s, t) => s + ((row[t] as number) || 0), 0);
    entry.total = running;
    return entry;
  });
}
