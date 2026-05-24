import { useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  BarChart3, Layers, Calendar, TrendingUp, TrendingDown,
  Minus, Plus, ArrowRight,
} from "lucide-react";
import { KPICard } from "../components/ui/KPICard";
import { PageHeader } from "../components/ui/PageHeader";
import { PortfolioMetrics, PositionSummary, Transaction, ViewId } from "../types";
import { formatCurrency, formatCurrencyPrecise, formatMonth, getCurrentMonth } from "../utils/formatters";
import { CHART_COLORS } from "../utils/constants";
import { compactChartSeries } from "../utils/charting";

interface DashboardProps {
  metrics: PortfolioMetrics;
  positions: PositionSummary[];
  transactions: Transaction[];
  cumulativeChartData: Array<Record<string, unknown>>;
  tickers: string[];
  onRequestAdd: () => void;
  onNavigate: (view: ViewId) => void;
}

type ChartPayload = {
  name?: string;
  value?: number;
  payload?: {
    pct?: string;
  };
};

function MiniTooltip({ active, payload, label }: { active?: boolean; payload?: ChartPayload[]; label?: unknown }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#131D2E] border border-[#243044] rounded-lg p-2.5 text-xs min-w-[130px]">
      <p className="text-ink-muted mb-1.5">{String(label ?? "")}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex justify-between gap-3 mb-0.5">
          <span className="text-ink-secondary">{p.name ?? ""}</span>
          <span className="font-semibold font-display text-ink-primary">{formatCurrency(p.value ?? 0)}</span>
        </div>
      ))}
    </div>
  );
}

function AllocationTooltip({ active, payload }: { active?: boolean; payload?: ChartPayload[] }) {
  if (!active || !payload?.length) return null;
  const e = payload[0];
  return (
    <div className="bg-[#131D2E] border border-[#243044] rounded-lg p-2.5 text-xs">
      <p className="font-display font-bold text-ink-primary">{e.name ?? ""}</p>
      <p className="text-profit font-semibold">{formatCurrency(e.value ?? 0)}</p>
      <p className="text-ink-muted">{e.payload?.pct}% of portfolio</p>
    </div>
  );
}

export function Dashboard({
  metrics,
  positions,
  transactions,
  cumulativeChartData,
  tickers,
  onRequestAdd,
  onNavigate,
}: DashboardProps) {
  const momColor = metrics.momDelta > 0 ? "profit" : metrics.momDelta < 0 ? "loss" : "muted";
  const MomIcon = metrics.momDelta > 0 ? TrendingUp : metrics.momDelta < 0 ? TrendingDown : Minus;

  // Recent 5 transactions
  const recentTx = useMemo(
    () => [...transactions].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 5),
    [transactions]
  );

  // Allocation donut
  const allocationData = useMemo(
    () =>
      positions.map((p, i) => ({
        name: p.ticker,
        value: p.totalInvested,
        pct: p.allocationPct.toFixed(1),
        fill: CHART_COLORS[i % CHART_COLORS.length],
      })),
    [positions]
  );

  const recentChart = useMemo(
    () => compactChartSeries(cumulativeChartData.slice(-6), tickers, 6),
    [cumulativeChartData, tickers]
  );

  // Largest position
  const largestPosition = positions[0];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Dashboard"
        subtitle={new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        actions={
          <button onClick={onRequestAdd} className="btn-primary">
            <Plus size={15} />
            Add Transaction
          </button>
        }
      />

      {transactions.length === 0 ? (
        /* Empty state */
        <div className="card p-8 sm:p-16 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#071F14] border border-[#10D98A]/20 flex items-center justify-center mb-4">
            <TrendingUp size={24} className="text-profit" />
          </div>
          <h2 className="font-display font-bold text-lg text-ink-primary mb-2">
            Start tracking your portfolio
          </h2>
          <p className="text-sm text-ink-muted max-w-xs mb-6 leading-relaxed">
            Log your first transaction to see your total invested, allocation breakdown, and monthly contributions.
          </p>
          <button onClick={onRequestAdd} className="btn-primary">
            <Plus size={15} />
            Add your first transaction
          </button>
        </div>
      ) : (
        <>
          {/* KPI Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <KPICard
              label="Total Invested"
              value={formatCurrency(metrics.totalInvested)}
              sub={`${metrics.transactionCount} transactions`}
              subColor="muted"
              icon={<BarChart3 size={14} />}
            />
            <KPICard
              label="Positions"
              value={String(metrics.positionCount)}
              sub={largestPosition ? `Largest: ${largestPosition.ticker} (${largestPosition.allocationPct.toFixed(0)}%)` : `${metrics.positionCount === 1 ? "asset" : "assets"} tracked`}
              subColor="muted"
              icon={<Layers size={14} />}
            />
            <KPICard
              label={formatMonth(getCurrentMonth())}
              value={metrics.thisMonthTotal > 0 ? formatCurrency(metrics.thisMonthTotal) : "-"}
              sub={
                metrics.thisMonthTotal > 0
                  ? `${metrics.momDelta >= 0 ? "+" : ""}${formatCurrency(metrics.momDelta)} vs last month`
                  : "No investments yet"
              }
              subColor={momColor}
              icon={<MomIcon size={14} />}
            />
            <KPICard
              label="Avg / Month"
              value={metrics.avgMonthly > 0 ? formatCurrency(metrics.avgMonthly) : "-"}
              sub={metrics.streak > 0 ? `${metrics.streak}-month streak` : `${metrics.activeMonths} active months`}
              subColor={metrics.streak >= 3 ? "profit" : "muted"}
              icon={<Calendar size={14} />}
            />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            {/* Cumulative area chart */}
            <figure className="lg:col-span-2 card p-5" aria-label="Six-month cumulative invested chart">
              <div className="flex items-center justify-between mb-5">
                <figcaption>
                  <p className="section-label">Cumulative Invested</p>
                  {recentChart.hiddenCount > 0 && (
                    <p className="text-xs text-ink-muted mt-1">Top {recentChart.tickers.length - 1} assets plus Other</p>
                  )}
                </figcaption>
                <button
                  onClick={() => onNavigate("analytics")}
                  className="text-xs text-ink-muted hover:text-ink-secondary flex items-center gap-1 cursor-pointer transition-colors"
                >
                  Full view <ArrowRight size={11} />
                </button>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={recentChart.data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    {recentChart.tickers.map((ticker, i) => (
                      <linearGradient key={ticker} id={`dash-grad-${ticker}`} x1="0" y1="0" x2="0" y2="1">
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
                    tickFormatter={(v) => v.split(" ")[0]}
                  />
                  <YAxis
                    tick={{ fill: "#4A5B73", fontSize: 11, fontFamily: "Inter" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => formatCurrency(v, true)}
                    width={52}
                  />
                  <Tooltip content={<MiniTooltip />} cursor={{ stroke: "#243044", strokeWidth: 1 }} />
                  {recentChart.tickers.map((ticker, i) => (
                    <Area
                      key={ticker}
                      type="monotone"
                      dataKey={ticker}
                      stackId="1"
                      stroke={CHART_COLORS[i % CHART_COLORS.length]}
                      strokeWidth={2}
                      fill={`url(#dash-grad-${ticker})`}
                      dot={false}
                      activeDot={{ r: 3, strokeWidth: 0 }}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </figure>

            {/* Allocation donut */}
            <figure className="card p-5" aria-label="Portfolio allocation chart">
              <div className="flex items-center justify-between mb-5">
                <figcaption>
                  <p className="section-label">Allocation</p>
                  <p className="text-xs text-ink-muted mt-1">{positions.length} active positions</p>
                </figcaption>
                <button
                  onClick={() => onNavigate("portfolio")}
                  className="text-xs text-ink-muted hover:text-ink-secondary flex items-center gap-1 cursor-pointer transition-colors"
                >
                  Details <ArrowRight size={11} />
                </button>
              </div>
              {allocationData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie
                        data={allocationData}
                        cx="50%"
                        cy="50%"
                        innerRadius={42}
                        outerRadius={64}
                        paddingAngle={3}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {allocationData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<AllocationTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-2 space-y-1.5">
                    {allocationData.slice(0, 5).map((entry, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: entry.fill }} />
                          <span className="text-xs text-ink-secondary font-display font-semibold">{entry.name}</span>
                        </div>
                        <span className="text-xs text-ink-muted">{entry.pct}%</span>
                      </div>
                    ))}
                    {allocationData.length > 5 && (
                      <p className="text-xs text-ink-muted text-right">+{allocationData.length - 5} more</p>
                    )}
                  </div>
                </>
              ) : null}
            </figure>
          </div>

          {/* Recent activity */}
          <div className="card">
            <div className="px-5 pt-4 pb-3 border-b border-[#1A2435] flex items-center justify-between">
              <p className="section-label">Recent Activity</p>
              <button
                onClick={() => onNavigate("transactions")}
                className="text-xs text-ink-muted hover:text-ink-secondary flex items-center gap-1 cursor-pointer transition-colors"
              >
                View all <ArrowRight size={11} />
              </button>
            </div>
            <div className="divide-y divide-[#1A2435]">
              {recentTx.map((tx) => (
                <div key={tx.id} className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-[#0D1421]/60 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        (tx.type ?? "buy") === "buy" ? "bg-profit/10" : "bg-loss/10"
                      }`}
                    >
                      {(tx.type ?? "buy") === "buy"
                        ? <TrendingUp size={13} className="text-profit" />
                        : <TrendingDown size={13} className="text-loss" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-display font-bold text-sm text-ink-primary truncate">{tx.ticker}</p>
                      <p className="text-xs text-ink-muted">{formatMonth(tx.month)}{tx.strategy ? ` - ${tx.strategy}` : ""}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`font-display font-semibold text-sm tabular-nums ${
                      (tx.type ?? "buy") === "buy" ? "text-ink-primary" : "text-loss"
                    }`}>
                      {(tx.type ?? "buy") === "sell" ? "-" : ""}{formatCurrency(tx.amount)}
                    </p>
                    {tx.shares && tx.pricePerShare && (
                      <p className="text-xs text-ink-muted tabular-nums">
                        {tx.shares} x {formatCurrencyPrecise(tx.pricePerShare)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

    </div>
  );
}
