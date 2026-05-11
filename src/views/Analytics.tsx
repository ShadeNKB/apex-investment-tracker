import { useMemo, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { PageHeader } from "../components/ui/PageHeader";
import { KPICard } from "../components/ui/KPICard";
import { PortfolioMetrics, Transaction } from "../types";
import {
  formatCurrency,
  formatMonth,
  formatMonthShort,
  getCurrentMonth,
} from "../utils/formatters";
import { CHART_COLORS } from "../utils/constants";
import { compactChartSeries } from "../utils/charting";

interface AnalyticsProps {
  metrics: PortfolioMetrics;
  transactions: Transaction[];
  monthlyChartData: Array<Record<string, unknown>>;
  cumulativeChartData: Array<Record<string, unknown>>;
  tickers: string[];
  onRequestAdd: () => void;
}

const VIEW_OPTS = [
  { value: "all", label: "All" },
  { value: "12", label: "12M" },
  { value: "6", label: "6M" },
] as const;
type ViewOpt = typeof VIEW_OPTS[number]["value"];

type ChartPayload = {
  name?: string;
  value?: number;
  color?: string;
};

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: ChartPayload[]; label?: unknown }) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (p.value || 0), 0);
  return (
    <div className="bg-[#131D2E] border border-[#243044] rounded-lg p-3 text-xs min-w-[150px]">
      <p className="text-ink-muted mb-2">{String(label ?? "")}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex justify-between gap-4 mb-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-ink-secondary">{p.name ?? ""}</span>
          </div>
          <span className="font-display font-semibold text-ink-primary">{formatCurrency(p.value ?? 0)}</span>
        </div>
      ))}
      {payload.length > 1 && total > 0 && (
        <div className="border-t border-[#1A2435] mt-1.5 pt-1.5 flex justify-between">
          <span className="text-ink-muted">Total</span>
          <span className="font-display font-bold text-profit">{formatCurrency(total)}</span>
        </div>
      )}
    </div>
  );
}

function CategoryBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-ink-secondary font-semibold font-display">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-ink-muted">{pct.toFixed(1)}%</span>
          <span className="font-display font-semibold text-ink-primary tabular-nums">{formatCurrency(value)}</span>
        </div>
      </div>
      <div className="h-1.5 bg-[#131D2E] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.75 }} />
      </div>
    </div>
  );
}

export function Analytics({
  metrics,
  transactions,
  monthlyChartData,
  cumulativeChartData,
  tickers,
  onRequestAdd,
}: AnalyticsProps) {
  const [trendView, setTrendView] = useState<ViewOpt>("all");
  const [chartMode, setChartMode] = useState<"monthly" | "cumulative">("cumulative");

  const displayData = useMemo(() => {
    const base = chartMode === "cumulative" ? cumulativeChartData : monthlyChartData;
    if (trendView === "6") return base.slice(-6);
    if (trendView === "12") return base.slice(-12);
    return base;
  }, [chartMode, cumulativeChartData, monthlyChartData, trendView]);
  const compactedTrend = useMemo(
    () => compactChartSeries(displayData, tickers, 8),
    [displayData, tickers]
  );

  // Best and worst months
  const monthlyTotals = useMemo(() => {
    return transactions.reduce<Record<string, number>>((acc, tx) => {
      const delta = (tx.type ?? "buy") === "buy" ? tx.amount : -tx.amount;
      acc[tx.month] = (acc[tx.month] || 0) + delta;
      return acc;
    }, {});
  }, [transactions]);

  const monthlyEntries = Object.entries(monthlyTotals).sort(([, a], [, b]) => b - a);
  const bestMonth = monthlyEntries[0];
  const recentMonths = Object.keys(monthlyTotals).sort().slice(-3);
  const recentAvg = recentMonths.length > 0
    ? recentMonths.reduce((s, m) => s + (monthlyTotals[m] || 0), 0) / recentMonths.length
    : 0;

  // Strategy breakdown
  const strategyEntries = Object.entries(metrics.strategyBreakdown)
    .sort(([, a], [, b]) => b - a);
  const strategyColors = ["#10D98A", "#4B8EFF", "#F0A500", "#F472B6", "#A78BFA", "#FB923C"];

  // Category breakdown
  const categoryEntries = Object.entries(metrics.categoryBreakdown)
    .sort(([, a], [, b]) => b - a);
  const categoryColors: Record<string, string> = { ETF: "#4B8EFF", Stock: "#F0A500", Crypto: "#C084FC" };

  // YoY data
  const yoyData = useMemo(() => {
    const byYear: Record<string, number> = {};
    for (const tx of transactions) {
      const year = tx.month.split("-")[0];
      const delta = (tx.type ?? "buy") === "buy" ? tx.amount : -tx.amount;
      byYear[year] = (byYear[year] || 0) + delta;
    }
    return Object.entries(byYear).sort(([a], [b]) => a.localeCompare(b)).map(([year, total]) => ({ year, total }));
  }, [transactions]);

  if (transactions.length === 0) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Analytics" subtitle="Investment insights and trends" />
        <div className="card p-8 sm:p-12 text-center flex flex-col items-center">
          <p className="font-display font-semibold text-ink-secondary mb-2">No data yet</p>
          <p className="text-sm text-ink-muted max-w-sm mb-5">Add a transaction to unlock trend charts, strategy breakdowns, and monthly run-rate analysis.</p>
          <button onClick={onRequestAdd} className="btn-primary">Add Transaction</button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader title="Analytics" subtitle="Investment insights and performance" />

      {/* Key metrics row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          label="Total Invested"
          value={formatCurrency(metrics.totalInvested)}
          sub={`over ${metrics.activeMonths} months`}
          subColor="muted"
        />
        <KPICard
          label="Monthly Average"
          value={formatCurrency(metrics.avgMonthly)}
          sub={`${metrics.streak > 0 ? `${metrics.streak}-month streak` : "no current streak"}`}
          subColor={metrics.streak >= 3 ? "profit" : "muted"}
        />
        <KPICard
          label="Best Month"
          value={bestMonth ? formatCurrency(bestMonth[1]) : "—"}
          sub={bestMonth ? formatMonth(bestMonth[0]) : ""}
          subColor="profit"
        />
        <KPICard
          label="3M Run Rate"
          value={recentAvg > 0 ? formatCurrency(recentAvg) : "—"}
          sub="avg of last 3 months"
          subColor="muted"
        />
      </div>

      {/* Main trend chart */}
      <figure className="card p-5" aria-label={`${chartMode} investment trend chart`}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <figcaption className="mr-2">
              <p className="section-label">Trend</p>
              {compactedTrend.hiddenCount > 0 && (
                <p className="text-xs text-ink-muted mt-1">Top {compactedTrend.tickers.length - 1} series plus Other</p>
              )}
            </figcaption>
            {/* Chart mode */}
            <div className="flex items-center gap-1 bg-[#060B14] border border-[#1A2435] rounded-lg p-1">
              {(["cumulative", "monthly"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setChartMode(m)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all duration-150 cursor-pointer capitalize ${
                    chartMode === m
                      ? "bg-[#131D2E] text-ink-primary border border-[#243044]"
                      : "text-ink-muted hover:text-ink-secondary"
                  }`}
                >
                  {m === "cumulative" ? "Cumulative" : "Monthly"}
                </button>
              ))}
            </div>
          </div>
          {/* Time range */}
          <div className="flex items-center gap-1 bg-[#060B14] border border-[#1A2435] rounded-lg p-1">
            {VIEW_OPTS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTrendView(opt.value)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all duration-150 cursor-pointer ${
                  trendView === opt.value
                    ? "bg-[#131D2E] text-ink-primary border border-[#243044]"
                    : "text-ink-muted hover:text-ink-secondary"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={compactedTrend.data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <defs>
              {compactedTrend.tickers.map((ticker, i) => (
                <linearGradient key={ticker} id={`anlyt-grad-${ticker}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1A2435" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: "#4A5B73", fontSize: 11, fontFamily: "Inter" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => formatMonthShort(v)}
            />
            <YAxis
              tick={{ fill: "#4A5B73", fontSize: 11, fontFamily: "Inter" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => formatCurrency(v, true)}
              width={56}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#243044", strokeWidth: 1 }} />
            {compactedTrend.tickers.map((ticker, i) => (
              <Area
                key={ticker}
                type="monotone"
                dataKey={ticker}
                stackId="1"
                stroke={CHART_COLORS[i % CHART_COLORS.length]}
                strokeWidth={2}
                fill={`url(#anlyt-grad-${ticker})`}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </figure>

      {/* Second row: Category + Strategy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category breakdown */}
        <div className="card p-5">
          <p className="section-label mb-4">By Category</p>
          <div className="space-y-3">
            {categoryEntries.map(([cat, val]) => (
              <CategoryBar
                key={cat}
                label={cat}
                value={val}
                total={metrics.totalInvested}
                color={categoryColors[cat] ?? CHART_COLORS[0]}
              />
            ))}
          </div>
        </div>

        {/* Strategy breakdown */}
        <div className="card p-5">
          <p className="section-label mb-4">By Strategy</p>
          {strategyEntries.length === 1 && strategyEntries[0][0] === "Untagged" ? (
            <p className="text-sm text-ink-muted">
              No strategy tags set. Add strategy tags to transactions to unlock this view.
            </p>
          ) : (
            <div className="space-y-3">
              {strategyEntries.map(([strat, val], i) => (
                <CategoryBar
                  key={strat}
                  label={strat}
                  value={val}
                  total={metrics.totalInvested}
                  color={strategyColors[i % strategyColors.length]}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* YoY comparison */}
      {yoyData.length > 1 && (
        <div className="card p-5">
          <p className="section-label mb-5">Year-over-Year</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={yoyData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1A2435" vertical={false} />
              <XAxis dataKey="year" tick={{ fill: "#4A5B73", fontSize: 11, fontFamily: "Space Grotesk", fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#4A5B73", fontSize: 11, fontFamily: "Inter" }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCurrency(v, true)} width={52} />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
                content={({ active, payload, label }: { active?: boolean; payload?: ChartPayload[]; label?: unknown }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-[#131D2E] border border-[#243044] rounded-lg p-2.5 text-xs">
                      <p className="text-ink-muted mb-1">{String(label ?? "")}</p>
                      <p className="font-display font-bold text-ink-primary">{formatCurrency(payload[0].value ?? 0)}</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={48}>
                {yoyData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Monthly breakdown table */}
      <div className="card">
        <div className="px-5 pt-4 pb-3 border-b border-[#1A2435]">
          <p className="section-label">Monthly Breakdown</p>
        </div>
        <div className="overflow-x-auto">
          <table className="apex-table">
            <thead>
              <tr>
                <th>Month</th>
                <th className="text-right">Invested</th>
                <th className="text-right">vs Avg</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(monthlyTotals)
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([month, total]) => {
                  const delta = total - metrics.avgMonthly;
                  const isCurrent = month === getCurrentMonth();
                  return (
                    <tr key={month}>
                      <td>
                        <span className={`text-sm ${isCurrent ? "text-profit font-semibold" : "text-ink-secondary"}`}>
                          {formatMonth(month)}{isCurrent ? " ·" : ""}
                          {isCurrent && <span className="text-xs ml-1 text-profit/70">current</span>}
                        </span>
                      </td>
                      <td className="text-right">
                        <span className="font-display font-semibold text-sm tabular-nums">
                          {formatCurrency(total)}
                        </span>
                      </td>
                      <td className="text-right">
                        <span className={`text-xs font-semibold tabular-nums ${delta >= 0 ? "text-profit" : "text-loss"}`}>
                          {delta >= 0 ? "+" : ""}{formatCurrency(delta)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
