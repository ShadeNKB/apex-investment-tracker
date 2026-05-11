import { useState } from "react";
import { Plus } from "lucide-react";
import { Modal } from "./ui/Modal";
import { Transaction } from "../types";
import { GENERATE_MONTHS, STRATEGY_PRESETS } from "../utils/constants";
import { formatMonth } from "../utils/formatters";

interface AddTransactionModalProps {
  onAdd: (data: Omit<Transaction, "id" | "timestamp">) => void;
  onClose: () => void;
  defaultMonth?: string;
}

export function AddTransactionModal({ onAdd, onClose, defaultMonth }: AddTransactionModalProps) {
  const months = GENERATE_MONTHS();
  const [month, setMonth] = useState(defaultMonth ?? months[0]);
  const [ticker, setTicker] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"buy" | "sell">("buy");
  const [shares, setShares] = useState("");
  const [pricePerShare, setPricePerShare] = useState("");
  const [strategy, setStrategy] = useState("");
  const [notes, setNotes] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState("");

  const parsedAmount = parseFloat(amount);
  const parsedShares = shares ? parseFloat(shares) : undefined;
  const parsedPricePerShare = pricePerShare ? parseFloat(pricePerShare) : undefined;
  const canSubmit = month && ticker.trim() && !isNaN(parsedAmount) && parsedAmount > 0;

  const handleSubmit = () => {
    setError("");
    if (!canSubmit) { setError("Month, ticker, and a positive amount are required."); return; }
    if (parsedShares != null && (!Number.isFinite(parsedShares) || parsedShares <= 0)) {
      setError("Shares must be a positive number.");
      return;
    }
    if (parsedPricePerShare != null && (!Number.isFinite(parsedPricePerShare) || parsedPricePerShare <= 0)) {
      setError("Price per share must be a positive number.");
      return;
    }

    const data: Omit<Transaction, "id" | "timestamp"> = {
      month,
      ticker: ticker.trim().toUpperCase(),
      amount: parsedAmount,
      type,
      ...(parsedShares != null ? { shares: parsedShares } : {}),
      ...(parsedPricePerShare != null ? { pricePerShare: parsedPricePerShare } : {}),
      ...(strategy ? { strategy } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };

    onAdd(data);
    onClose();
  };

  return (
    <Modal title="Add Transaction" onClose={onClose}>
      <div className="space-y-4">
        {/* Type toggle */}
        <div>
          <label className="section-label block mb-2">Type</label>
          <div className="flex gap-2">
            {(["buy", "sell"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                aria-pressed={type === t}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold font-display capitalize transition-all duration-150 cursor-pointer border ${
                  type === t
                    ? t === "buy"
                      ? "bg-profit/10 text-profit border-profit/30"
                      : "bg-loss/10 text-loss border-loss/30"
                    : "bg-transparent text-ink-muted border-[#1A2435] hover:border-[#243044]"
                }`}
              >
                {t === "buy" ? "Buy / Invest" : "Sell / Exit"}
              </button>
            ))}
          </div>
        </div>

        {/* Month */}
        <div>
          <label htmlFor="tx-month" className="section-label block mb-2">Month</label>
          <select
            id="tx-month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="apex-select"
          >
            {months.map((m) => (
              <option key={m} value={m}>{formatMonth(m)}</option>
            ))}
          </select>
        </div>

        {/* Ticker + Amount row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="tx-ticker" className="section-label block mb-2">Ticker</label>
            <input
              id="tx-ticker"
              type="text"
              placeholder="VOO"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              maxLength={10}
              autoComplete="off"
              spellCheck={false}
              className="apex-input font-display font-bold tracking-widest uppercase"
            />
          </div>
          <div>
            <label htmlFor="tx-amount" className="section-label block mb-2">Amount ($)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted text-sm pointer-events-none">$</span>
              <input
                id="tx-amount"
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={0}
                step={0.01}
                className="apex-input pl-6"
              />
            </div>
          </div>
        </div>

        {/* Advanced toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs text-ink-muted hover:text-ink-secondary transition-colors cursor-pointer"
        >
          {showAdvanced ? "− Hide" : "+ Show"} advanced fields (shares, price, strategy, notes)
        </button>

        {showAdvanced && (
          <div className="space-y-3 pt-1 border-t border-[#1A2435]">
            {/* Shares + Price */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="tx-shares" className="section-label block mb-2">Shares / Units</label>
                <input
                  id="tx-shares"
                  type="number"
                  placeholder="0.00"
                  value={shares}
                  onChange={(e) => setShares(e.target.value)}
                  min={0}
                  step={0.001}
                  className="apex-input"
                />
              </div>
              <div>
                <label htmlFor="tx-price" className="section-label block mb-2">Price / Share ($)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted text-sm pointer-events-none">$</span>
                  <input
                    id="tx-price"
                    type="number"
                    placeholder="0.00"
                    value={pricePerShare}
                    onChange={(e) => setPricePerShare(e.target.value)}
                    min={0}
                    step={0.01}
                    className="apex-input pl-6"
                  />
                </div>
              </div>
            </div>

            {/* Strategy */}
            <div>
              <label htmlFor="tx-strategy" className="section-label block mb-2">Strategy Tag</label>
              <select
                id="tx-strategy"
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                className="apex-select"
              >
                <option value="">None</option>
                {STRATEGY_PRESETS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="tx-notes" className="section-label block mb-2">Journal Note</label>
              <textarea
                id="tx-notes"
                placeholder="Why you made this investment..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="apex-input resize-none"
              />
            </div>
          </div>
        )}

        {error && (
          <p className="text-loss text-xs animate-fade-in" role="alert">{error}</p>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="btn-ghost flex-1">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={!canSubmit} className="btn-primary flex-1">
            <Plus size={15} />
            Record
          </button>
        </div>
      </div>
    </Modal>
  );
}
