import { useEffect, useRef, useState } from "react";
import {
  Cloud,
  CloudOff,
  Copy,
  Check,
  Link2,
  Link2Off,
  RefreshCw,
  AlertCircle,
  Loader2,
  Smartphone,
  Monitor,
  ShieldCheck,
} from "lucide-react";
import type { CloudStatus } from "../types";
import { useNotification } from "../hooks/useNotification";
import { Modal } from "./ui/Modal";

interface SyncPanelProps {
  syncEnabled: boolean;
  syncId: string | null;
  cloudStatus: CloudStatus;
  lastSyncAt: number | null;
  onSetupSync: (id: string) => Promise<void>;
  onDisconnectSync: () => void;
  onTriggerSync: () => Promise<void>;
  onClose: () => void;
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function SyncPanel({
  syncEnabled,
  syncId,
  cloudStatus,
  lastSyncAt,
  onSetupSync,
  onDisconnectSync,
  onTriggerSync,
  onClose,
}: SyncPanelProps) {
  return (
    <Modal title="Sync across devices" onClose={onClose} width="max-w-md">
      <div className="pb-[env(safe-area-inset-bottom)]">
          {!syncEnabled ? (
            <NotConfigured />
          ) : !syncId ? (
            <SetupView
              onSetupSync={onSetupSync}
              onClose={onClose}
            />
          ) : (
            <ConnectedView
              syncId={syncId}
              cloudStatus={cloudStatus}
              lastSyncAt={lastSyncAt}
              onTriggerSync={onTriggerSync}
              onDisconnectSync={onDisconnectSync}
            />
          )}
      </div>
    </Modal>
  );
}

function NotConfigured() {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-[#243044] bg-[#131D2E] p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-ink-primary">
          <CloudOff size={14} className="text-ink-muted" />
          Sync not configured
        </div>
        <p className="text-[12px] text-ink-muted leading-relaxed">
          Cross-device sync uses Supabase as a private relay. Your data stays local-first; Supabase is only used to move changes between your devices.
        </p>
        <ol className="flex flex-col gap-2 mt-1">
          {[
            <>Create a free project at <span className="font-mono text-ink-secondary">supabase.com</span></>,
            <>Run <span className="font-mono text-ink-secondary">supabase/migrations/001_sync.sql</span> in your project's SQL editor</>,
            <>Add <span className="font-mono text-ink-secondary">VITE_SUPABASE_URL</span> and <span className="font-mono text-ink-secondary">VITE_SUPABASE_ANON_KEY</span> to Vercel env vars</>,
            <>Redeploy; sync activates automatically</>,
          ].map((step, i) => (
            <li key={i} className="flex gap-2.5 text-[12px] text-ink-muted">
              <span className="shrink-0 inline-flex h-4 w-4 items-center justify-center rounded-full bg-profit/15 text-profit text-[10px] font-semibold mt-0.5">
                {i + 1}
              </span>
              <span className="leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function SetupView({
  onSetupSync,
  onClose,
}: {
  onSetupSync: (id: string) => Promise<void>;
  onClose: () => void;
}) {
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState("");
  const [connecting, setConnecting] = useState(false);
  const { showNotification } = useNotification();

  const handleGenerate = async () => {
    const id = crypto.randomUUID();
    setConnecting(true);
    try {
      await onSetupSync(id);
      showNotification("Sync code generated. Enter it on your other device.", "success");
    } catch {
      showNotification("Failed to set up sync. Check your connection.", "error");
    } finally {
      setConnecting(false);
    }
  };

  const handleConnect = async () => {
    const trimmed = codeInput.trim().toLowerCase();
    if (!trimmed) return;
    if (!UUID_RE.test(trimmed)) {
      setCodeError("Paste the full UUID sync code from your other device.");
      showNotification("Invalid sync code", "error");
      return;
    }
    setConnecting(true);
    try {
      await onSetupSync(trimmed);
      showNotification("Connected. Portfolio synced.", "success");
      setCodeInput("");
      onClose();
    } catch {
      showNotification("Failed to connect. Check your sync code.", "error");
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Explainer */}
      <div className="rounded-xl border border-profit/15 bg-profit/[0.04] p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-ink-primary">
          <Cloud size={14} className="text-profit" />
          Link your devices
        </div>
        <p className="text-[12px] text-ink-secondary leading-relaxed">
          Generate a sync code on one device, then paste it on every other device. No accounts, no passwords; the code is the shared secret.
        </p>
        <div className="grid grid-cols-2 gap-2 mt-1">
          {[
            { label: "On this device", sub: "Generate a sync code" },
            { label: "On other devices", sub: "Sync -> paste it here" },
          ].map((step, i) => (
            <div key={i} className="rounded-lg bg-[#131D2E] border border-[#1A2435] p-2.5 flex items-start gap-2">
              <span className="shrink-0 mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-profit/15 text-profit text-[10px] font-semibold">
                {i + 1}
              </span>
              <div>
                <div className="text-[11px] font-medium text-ink-primary">{step.label}</div>
                <div className="text-[10px] text-ink-muted leading-snug">{step.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Generate */}
      <button
        onClick={handleGenerate}
        disabled={connecting}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {connecting ? <Loader2 size={14} className="animate-spin" /> : <Cloud size={14} />}
        {connecting ? "Setting up..." : "Generate sync code for this device"}
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-[#1A2435]" />
        <span className="text-[11px] text-ink-muted">or join an existing one</span>
        <div className="flex-1 h-px bg-[#1A2435]" />
      </div>

      {/* Connect */}
      <div className="flex gap-2">
        <input
          className="input flex-1 min-w-0 text-sm"
          placeholder="Paste sync code from another device"
          value={codeInput}
          onChange={(e) => { setCodeInput(e.target.value); setCodeError(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") handleConnect(); }}
          aria-invalid={codeError ? "true" : "false"}
          aria-describedby={codeError ? "sync-code-error" : undefined}
          spellCheck={false}
          autoComplete="off"
        />
        <button
          onClick={handleConnect}
          disabled={!codeInput.trim() || connecting}
          className="btn-primary flex items-center gap-1.5 px-3 whitespace-nowrap disabled:opacity-40"
        >
          {connecting ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
          Connect
        </button>
      </div>
      {codeError && (
        <p id="sync-code-error" className="-mt-2 text-[11px] text-loss">
          {codeError}
        </p>
      )}

      {/* Privacy note */}
      <div className="flex items-start gap-2 text-[11px] text-ink-muted leading-relaxed">
        <ShieldCheck size={12} className="shrink-0 mt-0.5 text-profit/70" />
        Treat the sync code like a password. Anyone with it can read and write your portfolio data. Don't share it in chats or screenshots.
      </div>
    </div>
  );
}

function ConnectedView({
  syncId,
  cloudStatus,
  lastSyncAt,
  onTriggerSync,
  onDisconnectSync,
}: {
  syncId: string;
  cloudStatus: CloudStatus;
  lastSyncAt: number | null;
  onTriggerSync: () => Promise<void>;
  onDisconnectSync: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const { showNotification } = useNotification();
  const copyResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (copyResetTimer.current) clearTimeout(copyResetTimer.current); }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(syncId);
      setCopied(true);
      if (copyResetTimer.current) clearTimeout(copyResetTimer.current);
      copyResetTimer.current = setTimeout(() => { setCopied(false); copyResetTimer.current = null; }, 2000);
    } catch {
      showNotification("Could not copy sync code", "error");
    }
  };

  const handleManualSync = async () => {
    try {
      await onTriggerSync();
      showNotification("Synced", "success");
    } catch {
      showNotification("Sync failed", "error");
    }
  };

  const dotClass =
    cloudStatus === "synced" ? "bg-profit" :
    cloudStatus === "syncing" ? "bg-profit animate-pulse" :
    cloudStatus === "error" ? "bg-loss" : "bg-white/20";

  const statusLabel =
    cloudStatus === "syncing" ? "Syncing..." :
    cloudStatus === "synced" ? (lastSyncAt ? `Synced - ${timeAgo(lastSyncAt)}` : "Synced") :
    cloudStatus === "error" ? "Sync failed" : "Ready";

  const statusColor =
    cloudStatus === "synced" ? "text-profit" :
    cloudStatus === "syncing" ? "text-profit" :
    cloudStatus === "error" ? "text-loss" : "text-ink-muted";

  return (
    <div className="flex flex-col gap-3">
      {/* Status card */}
      <div className="rounded-xl border border-[#243044] bg-[#131D2E] p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${dotClass}`} />
            <span className={`text-[12px] font-medium ${statusColor}`}>{statusLabel}</span>
          </div>
          <button
            onClick={handleManualSync}
            disabled={cloudStatus === "syncing"}
            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-ink-muted hover:text-ink-primary hover:bg-[#1A2435] transition disabled:opacity-40"
            title="Sync now"
          >
            <RefreshCw size={13} className={cloudStatus === "syncing" ? "animate-spin" : ""} />
          </button>
        </div>

        {cloudStatus === "error" && (
          <div className="flex items-center gap-2 rounded-lg bg-loss/10 border border-loss/20 px-3 py-2 text-[11px] text-loss">
            <AlertCircle size={12} className="shrink-0" />
            Could not reach sync server. Changes saved locally and will push when connection is restored.
          </div>
        )}

        {/* Sync code display */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-ink-muted">Your sync code</span>
            <button
              onClick={handleCopy}
              className="text-[11px] inline-flex items-center gap-1 text-profit/80 hover:text-profit transition"
            >
              {copied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
            </button>
          </div>
          <button
            onClick={handleCopy}
            className="text-left flex items-center gap-2 rounded-lg border border-[#243044] bg-[#0D1421] px-3 py-2 hover:border-profit/30 transition"
            title="Tap to copy"
          >
            <span className="flex-1 font-mono text-[11px] text-ink-secondary truncate select-all">
              {syncId}
            </span>
          </button>
        </div>
      </div>

      {/* "Now what" panel */}
      {(
        <div className="rounded-xl border border-profit/15 bg-profit/[0.04] p-3.5 flex flex-col gap-2.5">
          <div className="text-[12px] font-semibold text-ink-primary inline-flex items-center gap-1.5">
            <Smartphone size={12} className="text-profit" /> Link your phone in 3 steps
          </div>
          <ol className="flex flex-col gap-1.5 text-[11px] text-ink-secondary leading-relaxed">
            <li className="flex gap-2">
              <span className="shrink-0 inline-flex h-4 w-4 items-center justify-center rounded-full bg-profit/15 text-profit text-[10px] font-semibold">1</span>
              Open <span className="font-mono text-ink-primary mx-1">{typeof window !== "undefined" ? window.location.host : "this site"}</span> on your phone.
            </li>
            <li className="flex gap-2">
              <span className="shrink-0 inline-flex h-4 w-4 items-center justify-center rounded-full bg-profit/15 text-profit text-[10px] font-semibold">2</span>
              Tap the <strong className="text-ink-primary">...</strong> menu, then <strong className="text-ink-primary">Sync</strong>.
            </li>
            <li className="flex gap-2">
              <span className="shrink-0 inline-flex h-4 w-4 items-center justify-center rounded-full bg-profit/15 text-profit text-[10px] font-semibold">3</span>
              Paste the sync code above into <strong className="text-ink-primary">Connect</strong>.
            </li>
          </ol>
          <div className="text-[10px] text-ink-muted inline-flex items-center gap-1.5 pt-1 border-t border-[#1A2435] mt-1">
            <Monitor size={10} /> Same flow on any laptop, tablet, or browser profile.
          </div>
        </div>
      )}

      {/* Disconnect */}
      <div className="border-t border-[#1A2435] pt-3">
        {confirmDisconnect ? (
          <div className="rounded-xl border border-warn/30 bg-warn/[0.07] p-3.5 flex flex-col gap-2.5">
            <p className="text-[12px] text-ink-muted">
              Disconnect sync? Your local portfolio data stays intact; other devices will stop syncing.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { onDisconnectSync(); setConfirmDisconnect(false); }}
                className="flex-1 py-2 rounded-lg text-[12px] font-medium text-warn bg-warn/20 border border-warn/30 hover:bg-warn/30 transition"
              >
                Disconnect
              </button>
              <button
                onClick={() => setConfirmDisconnect(false)}
                className="flex-1 btn-ghost py-2 text-[12px]"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDisconnect(true)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] text-ink-muted hover:text-ink-primary hover:bg-[#131D2E] transition"
          >
            <Link2Off size={13} /> Disconnect sync
          </button>
        )}
      </div>
    </div>
  );
}
