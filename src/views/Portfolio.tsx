import { lazy, Suspense, useMemo, useState } from "react";
import { Plus, Edit2, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { PositionSummary, PortfolioMetrics, PositionMeta, Transaction, SortDir } from "../types";
import {
  formatCurrency,
  formatCurrencyPrecise,
} from "../utils/formatters";
import { CHART_COLORS } from "../utils/constants";

const UpdatePriceModal = lazy(() =>
  import("../components/UpdatePriceModal").then((m) => ({ default: m.UpdatePriceModal }))
);

interface PortfolioProps {
  positions: PositionSummary[];
  metrics: PortfolioMetrics;
  onRequestAdd: () => void;
  onUpdateMeta: (meta: PositionMeta) => void;
}

type SortCol = "ticker" | "category" | "invested" | "allocation";

function SortHeader({ label, col, activeCol, dir, onClick, align = "left" }: {
  label: string; col: SortCol; activeCol: SortCol; dir: SortDir; onClick: () => void; align?: "left" | "right";
}) {
  const active = activeCol === col;
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 cursor-pointer hover:text-ink-secondary transition-colors ${
        align === "right" ? "ml-auto" : ""
      }`}
    >
      {label}
      {active
        ? dir === "asc" ? <ArrowUp size={10} className="text-profit" /> : <ArrowDown size={10} className="text-profit" />
        : <ArrowUpDown size={10} className="opacity-30" />}
    </button>
  );
}

export function Portfolio({
  positions,
  metrics,
  onRequestAdd,
  onUpdateMeta,
}: PortfolioProps) {
  const [updatingTicker, setUpdatingTicker] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortCol>("invested");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const updatingPosition = updatingTicker
    ? positions.find((p) => p.ticker === updatingTicker)
    : null;

  const toggleSort = (k: SortCol) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("desc"); }
  };

  const sortedPositions = useMemo(() => {
    const arr = [...positions];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "ticker": cmp = a.ticker.localeCompare(b.ticker); break;
        case "category": cmp = a.category.localeCompare(b.category); break;
        case "invested": cmp = a.totalInvested - b.totalInvested; break;
        case "allocation": cmp = a.allocationPct - b.allocationPct; break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [positions, sortKey, sortDir]);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Portfolio"
        subtitle={`${metrics.positionCount} ${metrics.positionCount === 1 ? "position" : "positions"}`}
        actions={
          <button onClick={onRequestAdd} className="btn-primary">
            <Plus size={15} />
            Add Transaction
          </button>
        }
      />

      {positions.length === 0 ? (
        <div className="card p-8 sm:p-12 flex flex-col items-center justify-center text-center">
          <p className="font-display font-semibold text-ink-secondary mb-2">No positions yet</p>
          <p className="text-sm text-ink-muted max-w-sm mb-5">Add your first transaction to see allocation, cost basis, and position-level details here.</p>
          <button onClick={onRequestAdd} className="btn-primary">
            <Plus size={15} />
            Add Transaction
          </button>
        </div>
      ) : (
        <>
          {/* Total invested summary */}
          <div className="card p-4 mb-4 flex flex-wrap items-baseline gap-4">
            <div>
              <p className="section-label mb-1">Total Invested</p>
              <p className="font-display font-bold text-xl text-ink-primary tabular-nums">
                {formatCurrency(metrics.totalInvested)}
              </p>
            </div>
          </div>

          {/* Positions table */}
          <div className="card">
            <div className="px-5 pt-4 pb-3 border-b border-[#1A2435]">
              <p className="section-label">Positions</p>
            </div>

            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="apex-table">
                <thead>
                  <tr>
                    <th><SortHeader label="Asset" col="ticker" activeCol={sortKey} dir={sortDir} onClick={() => toggleSort("ticker")} /></th>
                    <th><SortHeader label="Category" col="category" activeCol={sortKey} dir={sortDir} onClick={() => toggleSort("category")} /></th>
                    <th>Strategy</th>
                    <th className="text-right"><SortHeader label="Invested" col="invested" activeCol={sortKey} dir={sortDir} onClick={() => toggleSort("invested")} align="right" /></th>
                    <th className="text-right"><SortHeader label="Allocation" col="allocation" activeCol={sortKey} dir={sortDir} onClick={() => toggleSort("allocation")} align="right" /></th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPositions.map((pos, i) => (
                    <tr key={pos.ticker}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                            style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                          />
                          <div>
                            <p className="font-display font-bold text-sm text-ink-primary tracking-wide">
                              {pos.ticker}
                            </p>
                            {pos.meta.displayName && (
                              <p className="text-xs text-ink-muted truncate max-w-[140px]">
                                {pos.meta.displayName}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge badge-${pos.category.toLowerCase()}`}>
                          {pos.category}
                        </span>
                      </td>
                      <td>
                        {pos.meta.strategy ? (
                          <span className="text-xs text-ink-secondary">{pos.meta.strategy}</span>
                        ) : (
                          <span className="text-xs text-ink-muted">-</span>
                        )}
                      </td>
                      <td className="text-right">
                        <p className="font-display font-semibold text-sm tabular-nums text-ink-primary">
                          {formatCurrency(pos.totalInvested)}
                        </p>
                        {pos.avgCostBasis && (
                          <p className="text-xs text-ink-muted tabular-nums">
                            avg {formatCurrencyPrecise(pos.avgCostBasis)}
                          </p>
                        )}
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-[#131D2E] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(pos.allocationPct, 100)}%`,
                                backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                                opacity: 0.7,
                              }}
                            />
                          </div>
                          <span className="text-xs text-ink-muted tabular-nums w-10 text-right">
                            {pos.allocationPct.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="text-right">
                        <button
                          onClick={() => setUpdatingTicker(pos.ticker)}
                          className="btn-ghost py-1.5 px-2.5 text-xs gap-1"
                          aria-label={`Edit ${pos.ticker}`}
                        >
                          <Edit2 size={11} />
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden divide-y divide-[#1A2435]">
              {sortedPositions.map((pos, i) => (
                <div key={pos.ticker} className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-3 h-3 rounded-sm flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                      <div>
                        <p className="font-display font-bold text-sm text-ink-primary">{pos.ticker}</p>
                        {pos.meta.displayName && (
                          <p className="text-xs text-ink-muted">{pos.meta.displayName}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setUpdatingTicker(pos.ticker)}
                      className="btn-icon w-8 h-8"
                      aria-label={`Edit ${pos.ticker}`}
                    >
                      <Edit2 size={13} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-ink-muted mb-0.5">Invested</p>
                      <p className="font-display font-semibold text-ink-primary tabular-nums">{formatCurrency(pos.totalInvested)}</p>
                    </div>
                    <div>
                      <p className="text-ink-muted mb-0.5">Allocation</p>
                      <p className="font-display font-semibold text-ink-primary tabular-nums">{pos.allocationPct.toFixed(1)}%</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <span className={`badge badge-${pos.category.toLowerCase()}`}>{pos.category}</span>
                    {pos.meta.strategy && (
                      <span className="text-xs text-ink-muted">{pos.meta.strategy}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {updatingPosition && (
        <Suspense fallback={null}>
          <UpdatePriceModal
            position={updatingPosition}
            onSave={onUpdateMeta}
            onClose={() => setUpdatingTicker(null)}
          />
        </Suspense>
      )}
    </div>
  );
}
