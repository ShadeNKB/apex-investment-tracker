import { useState, useEffect, useMemo, useCallback } from "react";
import { Transaction, PositionMeta, PositionSummary, PortfolioMetrics } from "../types";
import {
  loadTransactions,
  saveTransactions,
  loadPositionMeta,
  savePositionMeta,
  upsertPositionMeta,
  downloadBackup,
  restoreFromFile,
  createTransactionId,
  clearPortfolioStorage,
} from "../utils/storage";
import {
  buildPositionSummaries,
  buildPortfolioMetrics,
  buildMonthlyChartData,
  buildCumulativeData,
} from "../utils/metrics";
import { useNotification } from "./useNotification";

export function usePortfolio() {
  const [transactions, setTransactions] = useState<Transaction[]>(() => loadTransactions());
  const [positionMeta, setPositionMeta] = useState<PositionMeta[]>(() => loadPositionMeta());
  const [loading] = useState(false);
  const { showNotification } = useNotification();

  // Transactions

  const addTransaction = useCallback(
    (data: Omit<Transaction, "id" | "timestamp">) => {
      const tx: Transaction = {
        ...data,
        id: createTransactionId(),
        timestamp: new Date().toISOString(),
      };
      const updated = [...transactions, tx];
      try {
        saveTransactions(updated);
        setTransactions(updated);
        showNotification("Transaction recorded", "success");
      } catch {
        showNotification("Could not save transaction. Export a backup before refreshing.", "error");
      }
    },
    [transactions, showNotification]
  );

  const updateTransaction = useCallback(
    (id: string, data: Omit<Transaction, "id" | "timestamp">) => {
      const updated = transactions.map((t) =>
        t.id === id ? { ...t, ...data, ticker: data.ticker.toUpperCase() } : t
      );
      try {
        saveTransactions(updated);
        setTransactions(updated);
        showNotification("Transaction updated", "success");
      } catch {
        showNotification("Could not save transaction update.", "error");
      }
    },
    [transactions, showNotification]
  );

  const deleteTransaction = useCallback(
    (id: string) => {
      const updated = transactions.filter((t) => t.id !== id);
      try {
        saveTransactions(updated);
        setTransactions(updated);
        showNotification("Transaction deleted", "success");
      } catch {
        showNotification("Could not delete transaction.", "error");
      }
    },
    [transactions, showNotification]
  );

  // Position metadata

  const updatePositionMeta = useCallback(
    (meta: PositionMeta) => {
      try {
        upsertPositionMeta(meta);
        setPositionMeta(loadPositionMeta());
        showNotification(`${meta.ticker} updated`, "success");
      } catch {
        showNotification("Could not save position details.", "error");
      }
    },
    [showNotification]
  );

  // Portfolio-level actions

  const clearAll = useCallback(() => {
    if (!window.confirm("Clear ALL data? This cannot be undone.")) return;
    setTransactions([]);
    setPositionMeta([]);
    try {
      clearPortfolioStorage();
      showNotification("All data cleared", "success");
    } catch {
      showNotification("Could not clear all local data.", "error");
    }
  }, [showNotification]);

  const backup = useCallback(() => {
    downloadBackup(transactions);
    showNotification("Backup downloaded", "success");
  }, [transactions, showNotification]);

  const restore = useCallback(
    async (file: File) => {
      try {
        const { transactions: txs, meta } = await restoreFromFile(file);
        setTransactions(txs);
        setPositionMeta(meta);
        saveTransactions(txs);
        savePositionMeta(meta);
        showNotification(`Restored ${txs.length} transactions`, "success");
      } catch (err) {
        showNotification(err instanceof Error ? err.message : "Invalid backup file", "error");
      }
    },
    [showNotification]
  );

  useEffect(() => {
    const syncFromStorage = (event: StorageEvent) => {
      if (event.key === "investment_spending") setTransactions(loadTransactions());
      if (event.key === "apex_position_meta") setPositionMeta(loadPositionMeta());
    };
    window.addEventListener("storage", syncFromStorage);
    return () => window.removeEventListener("storage", syncFromStorage);
  }, []);

  // Derived data

  const positions = useMemo(
    () => buildPositionSummaries(transactions, positionMeta),
    [transactions, positionMeta]
  );

  const metrics = useMemo(
    () => buildPortfolioMetrics(transactions, positions),
    [transactions, positions]
  );

  const tickers = useMemo(
    () => [...new Set(transactions.map((t) => t.ticker))].sort(),
    [transactions]
  );

  const availableMonths = useMemo(
    () =>
      [...new Set(transactions.map((t) => t.month))].sort().reverse(),
    [transactions]
  );

  const monthlyChartData = useMemo(
    () => buildMonthlyChartData(transactions, tickers),
    [transactions, tickers]
  );

  const cumulativeChartData = useMemo(
    () => buildCumulativeData(monthlyChartData, tickers),
    [monthlyChartData, tickers]
  );

  return {
    transactions,
    positionMeta,
    positions,
    metrics,
    tickers,
    availableMonths,
    monthlyChartData,
    cumulativeChartData,
    loading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    updatePositionMeta,
    clearAll,
    backup,
    restore,
  };
}
