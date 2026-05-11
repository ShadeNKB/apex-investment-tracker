import { useState } from "react";
import {
  LayoutDashboard,
  Briefcase,
  ArrowLeftRight,
  BarChart3,
  MoreHorizontal,
  Download,
  Upload,
  Trash2,
  X,
} from "lucide-react";
import { ViewId } from "../../types";

interface MobileNavProps {
  activeView: ViewId;
  onNavigate: (view: ViewId) => void;
  onBackup: () => void;
  onRestore: (file: File) => void;
  onClear: () => void;
  hasData: boolean;
}

const ITEMS: { id: ViewId; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard", label: "Home", icon: <LayoutDashboard size={18} /> },
  { id: "portfolio", label: "Portfolio", icon: <Briefcase size={18} /> },
  { id: "transactions", label: "Log", icon: <ArrowLeftRight size={18} /> },
  { id: "analytics", label: "Analytics", icon: <BarChart3 size={18} /> },
];

export function MobileNav({ activeView, onNavigate, onBackup, onRestore, onClear, hasData }: MobileNavProps) {
  const [showActions, setShowActions] = useState(false);

  const handleRestore = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) onRestore(file);
    };
    input.click();
    setShowActions(false);
  };

  return (
    <>
      {showActions && (
        <div className="lg:hidden fixed inset-0 z-[70] bg-black/40" onClick={() => setShowActions(false)}>
          <div
            className="absolute left-3 right-3 bottom-20 rounded-xl border border-[#243044] bg-[#0D1421] p-2 shadow-2xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-2 py-2">
              <p className="section-label">Data</p>
              <button className="btn-icon w-8 h-8" onClick={() => setShowActions(false)} aria-label="Close data actions">
                <X size={14} />
              </button>
            </div>
            <button
              onClick={() => { onBackup(); setShowActions(false); }}
              disabled={!hasData}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-ink-secondary hover:bg-[#131D2E] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download size={15} /> Export backup
            </button>
            <button
              onClick={handleRestore}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-ink-secondary hover:bg-[#131D2E]"
            >
              <Upload size={15} /> Import backup
            </button>
            {hasData && (
              <button
                onClick={() => { onClear(); setShowActions(false); }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-loss hover:bg-[#1F0708]"
              >
                <Trash2 size={15} /> Clear all data
              </button>
            )}
          </div>
        </div>
      )}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#060B14] border-t border-[#1A2435]"
        aria-label="Mobile navigation"
      >
        <div className="grid grid-cols-5 h-16 safe-area-inset-bottom">
          {ITEMS.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex flex-col items-center justify-center gap-1 transition-colors duration-150 cursor-pointer ${
                  isActive ? "text-profit" : "text-ink-muted"
                }`}
                aria-current={isActive ? "page" : undefined}
                aria-label={item.label}
              >
                {item.icon}
                <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
              </button>
            );
          })}
          <button
            onClick={() => setShowActions((v) => !v)}
            className={`flex flex-col items-center justify-center gap-1 transition-colors duration-150 cursor-pointer ${
              showActions ? "text-profit" : "text-ink-muted"
            }`}
            aria-label="Data actions"
            aria-expanded={showActions}
          >
            <MoreHorizontal size={18} />
            <span className="text-[10px] font-medium tracking-wide">Data</span>
          </button>
        </div>
      </nav>
    </>
  );
}
