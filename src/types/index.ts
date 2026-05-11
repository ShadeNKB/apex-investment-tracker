// Core transaction
// Backwards-compatible: existing records (id, month, ticker, amount, timestamp)
// remain valid. All new fields are optional.

export interface Transaction {
  id: string;
  ticker: string;
  month: string;           // YYYY-MM — primary time key (backwards compat)
  date?: string;           // YYYY-MM-DD — more precise date (new)
  amount: number;          // total $ amount invested / sold
  type?: "buy" | "sell";  // defaults to "buy" when absent
  shares?: number;         // units purchased (optional)
  pricePerShare?: number;  // price at time of purchase (optional)
  fees?: number;           // transaction fees (optional)
  strategy?: string;       // tag: "Core", "Growth", "Speculation", etc.
  notes?: string;          // free-form journal note
  timestamp: string;       // ISO string — creation time
  updatedAt?: string;      // ISO string — last edit time, used for LWW sync merge
}

// Legacy alias — keep for backwards compatibility
export type Investment = Transaction;

// Position metadata
// Manually-maintained per-ticker metadata stored separately.
// Enables current price tracking and PnL calculation.

export interface PositionMeta {
  ticker: string;
  displayName?: string;        // e.g. "Vanguard S&P 500 ETF"
  strategy?: string;           // position-level strategy override
  notes?: string;
  isArchived?: boolean;        // hide from active portfolio
  updatedAt?: string;          // ISO string — last edit time, used for LWW sync merge
  // Legacy — older backups may carry these; ignored by current UI
  currentPrice?: number;
  priceUpdatedAt?: string;
}

// Derived position summary
// Computed from transactions + position metadata. Never stored.

export interface PositionSummary {
  ticker: string;
  meta: PositionMeta;
  category: "ETF" | "Crypto" | "Stock";
  totalInvested: number;
  cashInvested: number;
  totalSold: number;
  realizedPnl: number;
  transactionCount: number;
  firstMonth: string;           // earliest YYYY-MM
  lastMonth: string;            // most recent YYYY-MM
  allocationPct: number;        // % of total portfolio
  totalShares?: number;         // when share-level data is recorded
  avgCostBasis?: number;        // $ per share, derived from buy txs
}

// Portfolio metrics
// Top-level aggregate metrics for the whole portfolio.

export interface PortfolioMetrics {
  totalInvested: number;
  positionCount: number;
  transactionCount: number;
  thisMonthTotal: number;
  lastMonthTotal: number;
  momDelta: number;
  avgMonthly: number;
  streak: number;               // consecutive months with investments
  activeMonths: number;
  // Category breakdown
  categoryBreakdown: Record<string, number>;
  // Strategy breakdown
  strategyBreakdown: Record<string, number>;
}

// Chart types

export interface ChartData {
  name: string;
  value: number;
  percentage?: string;
}

export interface MonthlyBarData {
  month: string;
  [ticker: string]: number | string;
}

export interface CumulativeDataPoint {
  month: string;
  total: number;
  [ticker: string]: number | string;
}

// Sync types

export type CloudStatus = "idle" | "syncing" | "synced" | "error";

export interface SyncPayload {
  version: 3;
  exportedAt: string;
  transactions: Transaction[];
  positionMeta: PositionMeta[];
  deletedIds: string[];
}

// UI types

export type NotificationType = "success" | "error" | "info";

export type ViewId = "dashboard" | "portfolio" | "transactions" | "analytics";

export type SortDir = "asc" | "desc";
