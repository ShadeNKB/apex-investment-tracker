import { useState, useEffect, useMemo, useCallback } from "react";
import { Transaction, PositionMeta, PositionSummary, PortfolioMetrics, SyncPayload } from "../types";
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
  loadDeletedIds,
  saveDeletedIds,
  addDeletedId,
} from "../utils/storage";
import {
  buildPositionSummaries,
  buildPortfolioMetrics,
  buildMonthlyChartData,
  buildCumulativeData,
} from "../utils/metrics";
import { useNotification } from "./useNotification";

interface UsePortfolioOptions {
  onMutation?: () => void;
}

export function usePortfolio({ onMutation }: UsePortfolioOptions = {}) {
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
        onMutation?.();
      } catch {
        showNotification("Could not save transaction. Export a backup before refreshing.", "error");
      }
    },
    [transactions, showNotification, onMutation]
  );

  const updateTransaction = useCallback(
    (id: string, data: Omit<Transaction, "id" | "timestamp">) => {
      const now = new Date().toISOString();
      const updated = transactions.map((t) =>
        t.id === id ? { ...t, ...data, ticker: data.ticker.toUpperCase(), updatedAt: now } : t
      );
      try {
        saveTransactions(updated);
        setTransactions(updated);
        showNotification("Transaction updated", "success");
        onMutation?.();
      } catch {
        showNotification("Could not save transaction update.", "error");
      }
    },
    [transactions, showNotification, onMutation]
  );

  const deleteTransaction = useCallback(
    (id: string) => {
      const updated = transactions.filter((t) => t.id !== id);
      try {
        addDeletedId(id);
        saveTransactions(updated);
        setTransactions(updated);
        showNotification("Transaction deleted", "success");
        onMutation?.();
      } catch {
        showNotification("Could not delete transaction.", "error");
      }
    },
    [transactions, showNotification, onMutation]
  );

  // Position metadata

  const updatePositionMeta = useCallback(
    (meta: PositionMeta) => {
      try {
        const metaWithTimestamp: PositionMeta = { ...meta, updatedAt: new Date().toISOString() };
        upsertPositionMeta(metaWithTimestamp);
        setPositionMeta(loadPositionMeta());
        showNotification(`${meta.ticker} updated`, "success");
        onMutation?.();
      } catch {
        showNotification("Could not save position details.", "error");
      }
    },
    [showNotification, onMutation]
  );

  // Portfolio-level actions

  const clearAll = useCallback(() => {
    if (!window.confirm("Clear ALL data? This cannot be undone.")) return;
    try {
      const deletedIds = [...new Set([...loadDeletedIds(), ...transactions.map((tx) => tx.id)])].slice(-2000);
      saveDeletedIds(deletedIds);
      clearPortfolioStorage({ keepDeletedIds: true });
      setTransactions([]);
      setPositionMeta([]);
      showNotification("All data cleared", "success");
      onMutation?.();
    } catch {
      showNotification("Could not clear all local data.", "error");
    }
  }, [transactions, showNotification, onMutation]);

  // Sync integration

  const exportBackup = useCallback((): SyncPayload => ({
    version: 3,
    exportedAt: new Date().toISOString(),
    transactions,
    positionMeta,
    deletedIds: loadDeletedIds(),
  }), [transactions, positionMeta]);

  const applySync = useCallback((payload: SyncPayload) => {
    setTransactions(payload.transactions);
    setPositionMeta(payload.positionMeta);
    saveTransactions(payload.transactions);
    savePositionMeta(payload.positionMeta);
    saveDeletedIds(payload.deletedIds);
  }, []);

  const backup = useCallback(() => {
    downloadBackup(transactions);
    showNotification("Backup downloaded", "success");
  }, [transactions, showNotification]);

  const restore = useCallback(
    async (file: File) => {
      try {
        const { transactions: txs, meta, deletedIds } = await restoreFromFile(file);
        setTransactions(txs);
        setPositionMeta(meta);
        saveTransactions(txs);
        savePositionMeta(meta);
        saveDeletedIds(deletedIds);
        showNotification(`Restored ${txs.length} transactions`, "success");
        onMutation?.();
      } catch (err) {
        showNotification(err instanceof Error ? err.message : "Invalid backup file", "error");
      }
    },
    [showNotification, onMutation]
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
    exportBackup,
    applySync,
  };
}
