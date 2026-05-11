import {
  LayoutDashboard,
  Briefcase,
  ArrowLeftRight,
  BarChart3,
  Download,
  Upload,
  Trash2,
  TrendingUp,
  Cloud,
  CloudOff,
} from "lucide-react";
import { ViewId, CloudStatus } from "../../types";

interface SidebarProps {
  activeView: ViewId;
  onNavigate: (view: ViewId) => void;
  onBackup: () => void;
  onRestore: (file: File) => void;
  onClear: () => void;
  hasData: boolean;
  cloudStatus: CloudStatus;
  syncEnabled: boolean;
  onOpenSync: () => void;
}

const NAV_ITEMS: { id: ViewId; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={16} /> },
  { id: "portfolio", label: "Portfolio", icon: <Briefcase size={16} /> },
  { id: "transactions", label: "Transactions", icon: <ArrowLeftRight size={16} /> },
  { id: "analytics", label: "Analytics", icon: <BarChart3 size={16} /> },
];

export function Sidebar({
  activeView,
  onNavigate,
  onBackup,
  onRestore,
  onClear,
  hasData,
  cloudStatus,
  syncEnabled,
  onOpenSync,
}: SidebarProps) {
  const handleRestore = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) onRestore(file);
    };
    input.click();
  };

  return (
    <aside className="hidden lg:flex flex-col w-[220px] flex-shrink-0 border-r border-[#1A2435] min-h-screen sticky top-0 self-start h-screen">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#1A2435]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-[#071F14] border border-[#10D98A]/30 flex items-center justify-center flex-shrink-0">
            <TrendingUp size={14} className="text-profit" />
          </div>
          <div>
            <p className="font-display font-bold text-sm text-ink-primary leading-none tracking-tight">
              Apex
            </p>
            <p className="text-[10px] text-ink-muted leading-none mt-0.5 tracking-widest uppercase font-medium">
              Investments
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer text-left ${
                isActive
                  ? "bg-[#131D2E] text-ink-primary border border-[#243044]"
                  : "text-ink-muted hover:text-ink-secondary hover:bg-[#0D1421]"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <span className={isActive ? "text-profit" : ""}>{item.icon}</span>
              <span className="font-sans">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Data actions */}
      <div className="px-3 py-4 border-t border-[#1A2435] space-y-0.5">
        {/* Sync entry */}
        <button
          onClick={onOpenSync}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-ink-muted hover:text-ink-secondary hover:bg-[#0D1421] transition-colors duration-150 cursor-pointer"
        >
          <SyncStatusIcon cloudStatus={cloudStatus} syncEnabled={syncEnabled} />
          <span>Sync</span>
          {cloudStatus === "synced" && (
            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-profit" />
          )}
          {cloudStatus === "error" && (
            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-loss" />
          )}
          {cloudStatus === "syncing" && (
            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-profit animate-pulse" />
          )}
        </button>

        <button
          onClick={onBackup}
          disabled={!hasData}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-ink-muted hover:text-ink-secondary hover:bg-[#0D1421] transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          <Download size={13} />
          <span>Export backup</span>
        </button>
        <button
          onClick={handleRestore}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-ink-muted hover:text-ink-secondary hover:bg-[#0D1421] transition-colors duration-150 cursor-pointer"
        >
          <Upload size={13} />
          <span>Import backup</span>
        </button>
        {hasData && (
          <button
            onClick={onClear}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-ink-muted hover:text-loss hover:bg-[#1F0708] transition-colors duration-150 cursor-pointer"
          >
            <Trash2 size={13} />
            <span>Clear all data</span>
          </button>
        )}
      </div>
    </aside>
  );
}

function SyncStatusIcon({ cloudStatus, syncEnabled }: { cloudStatus: CloudStatus; syncEnabled: boolean }) {
  if (!syncEnabled) return <CloudOff size={13} />;
  if (cloudStatus === "idle") return <Cloud size={13} />;
  return <Cloud size={13} className={cloudStatus === "error" ? "text-loss" : cloudStatus === "synced" ? "text-profit" : ""} />;
}
