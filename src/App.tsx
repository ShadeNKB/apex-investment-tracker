import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Sidebar } from "./components/nav/Sidebar";
import { MobileNav } from "./components/nav/MobileNav";
import { usePortfolio } from "./hooks/usePortfolio";
import { useSyncState } from "./hooks/useSyncState";
import { SyncPanel } from "./components/SyncPanel";
import { ViewId } from "./types";

const Dashboard = lazy(() => import("./views/Dashboard").then((m) => ({ default: m.Dashboard })));
const Portfolio = lazy(() => import("./views/Portfolio").then((m) => ({ default: m.Portfolio })));
const Transactions = lazy(() => import("./views/Transactions").then((m) => ({ default: m.Transactions })));
const Analytics = lazy(() => import("./views/Analytics").then((m) => ({ default: m.Analytics })));
const AddTransactionModal = lazy(() =>
  import("./components/AddTransactionModal").then((m) => ({ default: m.AddTransactionModal }))
);

function LoadingScreen({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "grid gap-4 animate-fade-in" : "flex items-center justify-center min-h-screen bg-canvas"}>
      <div className={compact ? "grid grid-cols-2 lg:grid-cols-4 gap-3" : "flex flex-col items-center gap-3"}>
        {compact ? (
          <>
            <div className="skeleton h-28" />
            <div className="skeleton h-28" />
            <div className="skeleton h-28 hidden lg:block" />
            <div className="skeleton h-28 hidden lg:block" />
            <div className="skeleton h-72 col-span-2 lg:col-span-4" />
          </>
        ) : (
          <>
            <div className="w-7 h-7 border-2 border-[#1A2435] border-t-profit rounded-full animate-spin" />
            <p className="text-[11px] text-ink-muted tracking-widest uppercase font-semibold">
              Loading
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function App() {
  const [view, setView] = useState<ViewId>("dashboard");
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showSyncPanel, setShowSyncPanel] = useState(false);
  const scheduleSyncPushRef = useRef<() => void>(() => {});
  const requestAdd = useCallback(() => setShowAddTransaction(true), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement) {
        const t = e.target.tagName;
        if (t === "INPUT" || t === "TEXTAREA" || t === "SELECT" || e.target.isContentEditable) return;
      }
      if (e.key === "n" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        setShowAddTransaction(true);
        e.preventDefault();
      }
      if (e.key === "g") {
        const next = (k: string) => k === "d" ? "dashboard" : k === "p" ? "portfolio" : k === "t" ? "transactions" : k === "a" ? "analytics" : null;
        const onSecond = (e2: KeyboardEvent) => {
          const v = next(e2.key);
          if (v) setView(v as ViewId);
          window.removeEventListener("keydown", onSecond);
        };
        window.addEventListener("keydown", onSecond, { once: true });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const {
    transactions,
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
  } = usePortfolio({ onMutation: () => scheduleSyncPushRef.current() });

  const sync = useSyncState({ exportBackup, applySync });

  useEffect(() => {
    scheduleSyncPushRef.current = sync.schedulePush;
  }, [sync.schedulePush]);

  // Restore persisted sync ID on mount.
  useEffect(() => { sync.initSync(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-canvas flex">
      {/* Sidebar — desktop */}
      <Sidebar
        activeView={view}
        onNavigate={setView}
        onBackup={backup}
        onRestore={restore}
        onClear={clearAll}
        hasData={transactions.length > 0}
        cloudStatus={sync.cloudStatus}
        syncEnabled={sync.syncEnabled}
        onOpenSync={() => setShowSyncPanel(true)}
      />

      {/* Main content */}
      <main className="flex-1 min-w-0 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] lg:pb-0">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between px-4 py-4 border-b border-[#1A2435]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#071F14] border border-[#10D98A]/30 flex items-center justify-center">
              <span className="text-profit" style={{ fontSize: 12 }}>Up</span>
            </div>
            <span className="font-display font-bold text-sm text-ink-primary">Apex</span>
          </div>
          {transactions.length > 0 && (
            <span className="font-display font-bold text-base text-ink-primary tabular-nums">
              {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(metrics.totalInvested)}
            </span>
          )}
        </div>

        {/* Page content */}
        <div className="px-4 sm:px-6 lg:px-8 py-5 sm:py-6 lg:py-8 max-w-6xl mx-auto w-full">
          <Suspense fallback={<LoadingScreen compact />}>
            {view === "dashboard" && (
              <Dashboard
                metrics={metrics}
                positions={positions}
                transactions={transactions}
              cumulativeChartData={cumulativeChartData}
              tickers={tickers}
              onRequestAdd={requestAdd}
              onNavigate={setView}
            />
            )}
            {view === "portfolio" && (
              <Portfolio
              positions={positions}
              metrics={metrics}
              onRequestAdd={requestAdd}
              onUpdateMeta={updatePositionMeta}
            />
            )}
            {view === "transactions" && (
              <Transactions
                transactions={transactions}
                availableMonths={availableMonths}
              tickers={tickers}
              onRequestAdd={requestAdd}
              onUpdate={updateTransaction}
              onDelete={deleteTransaction}
              />
            )}
            {view === "analytics" && (
              <Analytics
                metrics={metrics}
                transactions={transactions}
                monthlyChartData={monthlyChartData}
                cumulativeChartData={cumulativeChartData}
                tickers={tickers}
                onRequestAdd={requestAdd}
              />
            )}
          </Suspense>
        </div>
      </main>

      {/* Mobile bottom nav */}
      <MobileNav
        activeView={view}
        onNavigate={setView}
        onBackup={backup}
        onRestore={restore}
        onClear={clearAll}
        hasData={transactions.length > 0}
        cloudStatus={sync.cloudStatus}
        syncEnabled={sync.syncEnabled}
        onOpenSync={() => setShowSyncPanel(true)}
      />

      {showAddTransaction && (
        <Suspense fallback={null}>
          <AddTransactionModal
            onAdd={addTransaction}
            onClose={() => setShowAddTransaction(false)}
          />
        </Suspense>
      )}

      {showSyncPanel && (
        <SyncPanel
          syncEnabled={sync.syncEnabled}
          syncId={sync.syncId}
          cloudStatus={sync.cloudStatus}
          syncError={sync.syncError ?? sync.syncConfigError}
          lastSyncAt={sync.lastSyncAt}
          onSetupSync={sync.setupSync}
          onDisconnectSync={sync.disconnectSync}
          onTriggerSync={sync.triggerSync}
          onClose={() => setShowSyncPanel(false)}
        />
      )}
    </div>
  );
}

export default App;
