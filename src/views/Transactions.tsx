import { useState, useMemo, useEffect, useRef } from "react";
import {
  Plus, Edit2, Trash2, Save, X, ArrowUp, ArrowDown, ArrowUpDown,
  TrendingUp, TrendingDown, FileX,
} from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Transaction, SortDir } from "../types";
import {
  formatCurrency,
  formatCurrencyPrecise,
  formatMonth,
} from "../utils/formatters";
import { getAssetCategory } from "../utils/assetCategories";
import { GENERATE_MONTHS, STRATEGY_PRESETS } from "../utils/constants";

interface TransactionsProps {
  transactions: Transaction[];
  availableMonths: string[];
  tickers: string[];
  onRequestAdd: () => void;
  onUpdate: (id: string, data: Omit<Transaction, "id" | "timestamp">) => void;
  onDelete: (id: string) => void;
}

type SortKey = "month" | "ticker" | "amount" | "type";
const PAGE_SIZE = 25;

function SortBtn({ col, activeCol, dir, onClick }: {
  col: SortKey; activeCol: SortKey; dir: SortDir; onClick: () => void;
}) {
  const active = activeCol === col;
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-0.5 cursor-pointer hover:text-ink-secondary transition-colors"
    >
      {col.charAt(0).toUpperCase() + col.slice(1)}
      {active
        ? dir === "asc" ? <ArrowUp size={10} className="text-profit" /> : <ArrowDown size={10} className="text-profit" />
        : <ArrowUpDown size={10} className="opacity-30" />}
    </button>
  );
}

export function Transactions({
  transactions,
  availableMonths,
  tickers,
  onRequestAdd,
  onUpdate,
  onDelete,
}: TransactionsProps) {
  const months = GENERATE_MONTHS();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [filterMonth, setFilterMonth] = useState("");
  const [filterTicker, setFilterTicker] = useState("");
  const [filterType, setFilterType] = useState("");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("month");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);

  // Edit state
  const [editMonth, setEditMonth] = useState("");
  const [editTicker, setEditTicker] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editType, setEditType] = useState<"buy" | "sell">("buy");
  const [editShares, setEditShares] = useState("");
  const [editPricePerShare, setEditPricePerShare] = useState("");
  const [editStrategy, setEditStrategy] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editError, setEditError] = useState("");

  const requestDelete = (id: string) => {
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    setPendingDeleteId(id);
    deleteTimerRef.current = setTimeout(() => setPendingDeleteId(null), 3500);
  };
  const confirmDelete = (id: string) => {
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    setPendingDeleteId(null);
    onDelete(id);
  };
  const cancelDelete = () => {
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    setPendingDeleteId(null);
  };

  useEffect(() => () => { if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current); }, []);

  const startEdit = (tx: Transaction) => {
    setEditMonth(tx.month);
    setEditTicker(tx.ticker);
    setEditAmount(String(tx.amount));
    setEditType(tx.type ?? "buy");
    setEditShares(tx.shares != null ? String(tx.shares) : "");
    setEditPricePerShare(tx.pricePerShare != null ? String(tx.pricePerShare) : "");
    setEditStrategy(tx.strategy ?? "");
    setEditNotes(tx.notes ?? "");
    setEditError("");
    setEditingId(tx.id);
  };

  const saveEdit = (tx: Transaction) => {
    const amt = parseFloat(editAmount);
    const shares = editShares ? parseFloat(editShares) : undefined;
    const pricePerShare = editPricePerShare ? parseFloat(editPricePerShare) : undefined;
    if (!editMonth || !editTicker.trim() || isNaN(amt) || amt <= 0) {
      setEditError("Month, ticker, and a positive amount are required.");
      return;
    }
    if (shares != null && (!Number.isFinite(shares) || shares <= 0)) {
      setEditError("Shares must be a positive number.");
      return;
    }
    if (pricePerShare != null && (!Number.isFinite(pricePerShare) || pricePerShare <= 0)) {
      setEditError("Price per share must be a positive number.");
      return;
    }
    onUpdate(tx.id, {
      ...tx,
      month: editMonth,
      ticker: editTicker.trim().toUpperCase(),
      amount: amt,
      type: editType,
      shares,
      pricePerShare,
      strategy: editStrategy || undefined,
      notes: editNotes.trim() || undefined,
    });
    setEditingId(null);
    setEditError("");
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const sorted = useMemo(() => {
    let filtered = transactions;
    if (filterMonth) filtered = filtered.filter((t) => t.month === filterMonth);
    if (filterTicker) filtered = filtered.filter((t) => t.ticker === filterTicker);
    if (filterType) filtered = filtered.filter((t) => (t.type ?? "buy") === filterType);
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (t) => t.ticker.toLowerCase().includes(q) || t.month.includes(q) || (t.notes ?? "").toLowerCase().includes(q)
      );
    }
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "month") cmp = a.month.localeCompare(b.month);
      else if (sortKey === "ticker") cmp = a.ticker.localeCompare(b.ticker);
      else if (sortKey === "amount") cmp = a.amount - b.amount;
      else if (sortKey === "type") cmp = (a.type ?? "buy").localeCompare(b.type ?? "buy");
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [transactions, filterMonth, filterTicker, filterType, search, sortKey, sortDir]);

  const hasFilters = filterMonth || filterTicker || filterType || search;
  const totalFiltered = sorted.reduce(
    (s, t) => ((t.type ?? "buy") === "buy" ? s + t.amount : s - t.amount),
    0
  );
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const showPagination = sorted.length > PAGE_SIZE;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Transactions"
        subtitle={`${transactions.length} total entries`}
        actions={
          <button onClick={onRequestAdd} className="btn-primary">
            <Plus size={15} />
            Add
          </button>
        }
      />

      {/* Filters */}
      <div className="card p-4 mb-4">
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search ticker, month, notes..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="apex-input text-xs py-2 w-full sm:w-52"
            aria-label="Search"
          />
          <select aria-label="Filter by month" value={filterMonth} onChange={(e) => { setFilterMonth(e.target.value); setPage(1); }} className="apex-select text-xs py-2 w-auto">
            <option value="">All months</option>
            {availableMonths.map((m) => <option key={m} value={m}>{formatMonth(m)}</option>)}
          </select>
          <select aria-label="Filter by asset" value={filterTicker} onChange={(e) => { setFilterTicker(e.target.value); setPage(1); }} className="apex-select text-xs py-2 w-auto">
            <option value="">All assets</option>
            {tickers.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select aria-label="Filter by transaction type" value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }} className="apex-select text-xs py-2 w-auto">
            <option value="">All types</option>
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
          </select>
          {hasFilters && (
            <button
              onClick={() => { setFilterMonth(""); setFilterTicker(""); setFilterType(""); setSearch(""); setPage(1); }}
              className="btn-ghost text-xs py-2"
            >
              <X size={12} /> Clear
            </button>
          )}
          {hasFilters && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-ink-muted">{sorted.length} results</span>
              <span className="text-xs font-display font-semibold text-ink-primary">
                {formatCurrency(totalFiltered)}
              </span>
            </div>
          )}
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <FileX size={28} className="text-ink-muted mb-3" />
          <p className="font-display font-semibold text-ink-secondary">No transactions yet</p>
          <p className="text-sm text-ink-muted mt-1 mb-5 max-w-sm">Log buys and sells to power your portfolio, allocation, and analytics views.</p>
          <button onClick={onRequestAdd} className="btn-primary">
            <Plus size={15} />
            Add Transaction
          </button>
        </div>
      ) : (
        <div className="card">
          {/* Desktop table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="apex-table">
              <thead>
                <tr>
                  <th><SortBtn col="month" activeCol={sortKey} dir={sortDir} onClick={() => toggleSort("month")} /></th>
                  <th><SortBtn col="ticker" activeCol={sortKey} dir={sortDir} onClick={() => toggleSort("ticker")} /></th>
                  <th>Category</th>
                  <th><SortBtn col="type" activeCol={sortKey} dir={sortDir} onClick={() => toggleSort("type")} /></th>
                  <th><SortBtn col="amount" activeCol={sortKey} dir={sortDir} onClick={() => toggleSort("amount")} /></th>
                  <th>Shares / Price</th>
                  <th>Strategy</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((tx) => (
                  <tr key={tx.id}>
                    {editingId === tx.id ? (
                      <>
                        <td>
                          <select value={editMonth} onChange={(e) => setEditMonth(e.target.value)} className="apex-select text-xs py-1.5 w-36">
                            {months.map((m) => <option key={m} value={m}>{formatMonth(m)}</option>)}
                          </select>
                        </td>
                        <td>
                          <input
                            type="text"
                            value={editTicker}
                            onChange={(e) => setEditTicker(e.target.value.toUpperCase())}
                            className="apex-input text-xs py-1.5 font-display font-bold w-24 uppercase tracking-widest"
                            maxLength={10}
                          />
                        </td>
                        <td>
                          <span className={`badge badge-${getAssetCategory(editTicker).toLowerCase()}`}>
                            {getAssetCategory(editTicker)}
                          </span>
                        </td>
                        <td>
                          <select value={editType} onChange={(e) => setEditType(e.target.value as "buy" | "sell")} className="apex-select text-xs py-1.5 w-24">
                            <option value="buy">Buy</option>
                            <option value="sell">Sell</option>
                          </select>
                        </td>
                        <td>
                          <div className="relative w-28">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted text-xs pointer-events-none">$</span>
                            <input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="apex-input text-xs py-1.5 pl-5 w-full" />
                          </div>
                        </td>
                        <td>
                          <div className="grid grid-cols-2 gap-2 min-w-[160px]">
                            <input
                              type="number"
                              value={editShares}
                              onChange={(e) => setEditShares(e.target.value)}
                              className="apex-input text-xs py-1.5"
                              aria-label="Shares"
                              min={0}
                              step={0.0001}
                              placeholder="Shares"
                            />
                            <input
                              type="number"
                              value={editPricePerShare}
                              onChange={(e) => setEditPricePerShare(e.target.value)}
                              className="apex-input text-xs py-1.5"
                              aria-label="Price per share"
                              min={0}
                              step={0.01}
                              placeholder="Price"
                            />
                          </div>
                        </td>
                        <td>
                          <select value={editStrategy} onChange={(e) => setEditStrategy(e.target.value)} className="apex-select text-xs py-1.5 w-36">
                            <option value="">None</option>
                            {STRATEGY_PRESETS.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td>
                          <div className="flex items-center justify-end gap-1.5">
                            <button onClick={() => saveEdit(tx)} className="btn-primary py-1.5 px-2.5 text-xs"><Save size={11} />Save</button>
                            <button onClick={() => setEditingId(null)} className="btn-ghost py-1.5 px-2 text-xs"><X size={11} /></button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td><span className="text-sm text-ink-secondary">{formatMonth(tx.month)}</span></td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${
                              (tx.type ?? "buy") === "buy" ? "bg-profit/10" : "bg-loss/10"
                            }`}>
                              {(tx.type ?? "buy") === "buy"
                                ? <TrendingUp size={10} className="text-profit" />
                                : <TrendingDown size={10} className="text-loss" />}
                            </div>
                            <span className="font-display font-bold text-sm tracking-wide">{tx.ticker}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`badge badge-${getAssetCategory(tx.ticker).toLowerCase()}`}>
                            {getAssetCategory(tx.ticker)}
                          </span>
                        </td>
                        <td>
                          <span className={`text-xs font-semibold capitalize ${(tx.type ?? "buy") === "buy" ? "text-profit" : "text-loss"}`}>
                            {tx.type ?? "buy"}
                          </span>
                        </td>
                        <td>
                          <span className="font-display font-semibold text-sm tabular-nums">
                            {formatCurrency(tx.amount)}
                          </span>
                        </td>
                        <td>
                          {tx.shares && tx.pricePerShare ? (
                            <span className="text-xs text-ink-muted tabular-nums">
                              {tx.shares} x {formatCurrencyPrecise(tx.pricePerShare)}
                            </span>
                          ) : (
                            <span className="text-xs text-ink-muted">-</span>
                          )}
                        </td>
                        <td>
                          {tx.strategy ? (
                            <span className="text-xs text-ink-secondary">{tx.strategy}</span>
                          ) : (
                            <span className="text-xs text-ink-muted">-</span>
                          )}
                        </td>
                        <td>
                          <div className="flex items-center justify-end gap-1">
                            {pendingDeleteId === tx.id ? (
                              <>
                                <button onClick={() => confirmDelete(tx.id)} className="btn-danger py-1 px-2.5 text-xs">Delete</button>
                                <button onClick={cancelDelete} className="btn-ghost py-1 px-2 text-xs"><X size={11} /></button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => startEdit(tx)} className="btn-icon w-7 h-7" aria-label="Edit"><Edit2 size={12} /></button>
                                <button onClick={() => requestDelete(tx.id)} className="btn-icon btn-icon-danger w-7 h-7" aria-label="Delete"><Trash2 size={12} /></button>
                              </>
                            )}
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="lg:hidden divide-y divide-[#1A2435]">
            {pageItems.map((tx) => (
              <div key={tx.id} className="p-4">
                {editingId === tx.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <select value={editMonth} onChange={(e) => setEditMonth(e.target.value)} className="apex-select text-xs py-2">
                        {months.map((m) => <option key={m} value={m}>{formatMonth(m)}</option>)}
                      </select>
                      <select value={editType} onChange={(e) => setEditType(e.target.value as "buy" | "sell")} className="apex-select text-xs py-2">
                        <option value="buy">Buy</option>
                        <option value="sell">Sell</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={editTicker}
                        onChange={(e) => setEditTicker(e.target.value.toUpperCase())}
                        className="apex-input text-xs py-2 font-display font-bold uppercase tracking-widest"
                        maxLength={10}
                        aria-label="Ticker"
                      />
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted text-xs pointer-events-none">$</span>
                        <input
                          type="number"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          className="apex-input text-xs py-2 pl-5"
                          aria-label="Amount"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="number"
                        value={editShares}
                        onChange={(e) => setEditShares(e.target.value)}
                        className="apex-input text-xs py-2"
                        aria-label="Shares"
                        min={0}
                        step={0.0001}
                        placeholder="Shares"
                      />
                      <input
                        type="number"
                        value={editPricePerShare}
                        onChange={(e) => setEditPricePerShare(e.target.value)}
                        className="apex-input text-xs py-2"
                        aria-label="Price per share"
                        min={0}
                        step={0.01}
                        placeholder="Price / share"
                      />
                    </div>
                    <select value={editStrategy} onChange={(e) => setEditStrategy(e.target.value)} className="apex-select text-xs py-2">
                      <option value="">No strategy</option>
                      {STRATEGY_PRESETS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      rows={2}
                      className="apex-input resize-none text-xs"
                      placeholder="Notes"
                    />
                    {editError && <p className="text-loss text-xs" role="alert">{editError}</p>}
                    <div className="flex gap-2">
                      <button onClick={() => saveEdit(tx)} className="btn-primary flex-1 py-2 text-xs"><Save size={12} />Save</button>
                      <button onClick={() => { setEditingId(null); setEditError(""); }} className="btn-ghost flex-1 py-2 text-xs"><X size={12} />Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        (tx.type ?? "buy") === "buy" ? "bg-profit/10" : "bg-loss/10"
                      }`}>
                        {(tx.type ?? "buy") === "buy"
                          ? <TrendingUp size={14} className="text-profit" />
                          : <TrendingDown size={14} className="text-loss" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-display font-bold text-sm text-ink-primary">{tx.ticker}</span>
                          <span className={`badge badge-${getAssetCategory(tx.ticker).toLowerCase()}`}>{getAssetCategory(tx.ticker)}</span>
                        </div>
                        <p className="text-xs text-ink-muted">{formatMonth(tx.month)}{tx.strategy ? ` - ${tx.strategy}` : ""}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-display font-semibold text-sm tabular-nums">{formatCurrency(tx.amount)}</span>
                      {pendingDeleteId === tx.id ? (
                        <>
                          <button onClick={() => confirmDelete(tx.id)} className="btn-danger py-1.5 px-2.5 text-xs">Delete</button>
                          <button onClick={cancelDelete} className="btn-icon w-8 h-8" aria-label="Cancel delete"><X size={13} /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(tx)} className="btn-icon w-8 h-8" aria-label="Edit"><Edit2 size={13} /></button>
                          <button onClick={() => requestDelete(tx.id)} className="btn-icon btn-icon-danger w-8 h-8" aria-label="Delete"><Trash2 size={13} /></button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {sorted.length === 0 && (
            <div className="p-8 text-center text-sm text-ink-muted">No results match your filters.</div>
          )}

          {showPagination && (
            <div className="px-4 py-3 border-t border-[#1A2435] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-xs text-ink-muted">
                Showing {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, sorted.length)} of {sorted.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  className="btn-ghost py-2 text-xs"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                <span className="text-xs text-ink-muted tabular-nums">
                  {currentPage} / {totalPages}
                </span>
                <button
                  className="btn-ghost py-2 text-xs"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
