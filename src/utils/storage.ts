import { PositionMeta, SyncPayload, Transaction } from "../types";

const TX_KEY = "investment_spending";
const META_KEY = "apex_position_meta";
const DELETED_IDS_KEY = "apex_deleted_ids";
const SYNC_ID_KEY = "apex_sync_id";
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T/;

type RecordLike = Record<string, unknown>;

function isRecord(value: unknown): value is RecordLike {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function positiveNumber(value: unknown): number | undefined {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function optionalPositiveNumber(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  return positiveNumber(value);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function createTransactionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeId(value: unknown, seenIds?: Set<string>): string {
  const raw = typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
  const base = raw || createTransactionId();

  if (!seenIds) return base;
  if (!seenIds.has(base)) {
    seenIds.add(base);
    return base;
  }

  let next = createTransactionId();
  while (seenIds.has(next)) next = createTransactionId();
  seenIds.add(next);
  return next;
}

export function normalizeTransaction(value: unknown, seenIds?: Set<string>): Transaction | null {
  if (!isRecord(value)) return null;

  const month = typeof value.month === "string" ? value.month.trim() : "";
  const ticker = typeof value.ticker === "string" ? value.ticker.trim().toUpperCase() : "";
  const amount = positiveNumber(value.amount);
  const type = value.type === "sell" ? "sell" : "buy";
  const timestamp =
    typeof value.timestamp === "string" && ISO_RE.test(value.timestamp)
      ? value.timestamp
      : new Date().toISOString();

  if (!MONTH_RE.test(month) || !ticker || amount == null) return null;

  const shares = optionalPositiveNumber(value.shares);
  const pricePerShare = optionalPositiveNumber(value.pricePerShare);
  const fees = optionalPositiveNumber(value.fees);
  const strategy = optionalString(value.strategy);
  const notes = optionalString(value.notes);

  const updatedAt =
    typeof value.updatedAt === "string" && ISO_RE.test(value.updatedAt)
      ? value.updatedAt
      : undefined;

  return {
    id: normalizeId(value.id, seenIds),
    month,
    ticker,
    amount,
    type,
    timestamp,
    ...(typeof value.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.date) ? { date: value.date } : {}),
    ...(shares != null ? { shares } : {}),
    ...(pricePerShare != null ? { pricePerShare } : {}),
    ...(fees != null ? { fees } : {}),
    ...(strategy ? { strategy } : {}),
    ...(notes ? { notes } : {}),
    ...(updatedAt ? { updatedAt } : {}),
  };
}

export function normalizePositionMeta(value: unknown): PositionMeta | null {
  if (!isRecord(value)) return null;
  const ticker = typeof value.ticker === "string" ? value.ticker.trim().toUpperCase() : "";
  if (!ticker) return null;

  const displayName = optionalString(value.displayName);
  const strategy = optionalString(value.strategy);
  const notes = optionalString(value.notes);
  const currentPrice = optionalPositiveNumber(value.currentPrice);
  const priceUpdatedAt = optionalString(value.priceUpdatedAt);

  const updatedAt =
    typeof value.updatedAt === "string" && ISO_RE.test(value.updatedAt)
      ? value.updatedAt
      : undefined;

  return {
    ticker,
    ...(displayName ? { displayName } : {}),
    ...(strategy ? { strategy } : {}),
    ...(notes ? { notes } : {}),
    ...(value.isArchived === true ? { isArchived: true } : {}),
    ...(currentPrice != null ? { currentPrice } : {}),
    ...(priceUpdatedAt ? { priceUpdatedAt } : {}),
    ...(updatedAt ? { updatedAt } : {}),
  };
}

function readJsonArray(key: string): unknown[] {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return [];
    const parsed: unknown = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const saveTransactions = (data: Transaction[]): void => {
  try {
    localStorage.setItem(TX_KEY, JSON.stringify(data));
  } catch {
    throw new Error("Unable to save investment data");
  }
};

export const loadTransactions = (): Transaction[] => {
  const seenIds = new Set<string>();
  return readJsonArray(TX_KEY)
    .map((row) => normalizeTransaction(row, seenIds))
    .filter((row): row is Transaction => row != null);
};

export const saveInvestments = saveTransactions;
export const loadInvestments = loadTransactions;

export const savePositionMeta = (data: PositionMeta[]): void => {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(data));
  } catch {
    throw new Error("Unable to save position metadata");
  }
};

export const clearPortfolioStorage = ({ keepDeletedIds = false }: { keepDeletedIds?: boolean } = {}): void => {
  localStorage.removeItem(TX_KEY);
  localStorage.removeItem(META_KEY);
  if (!keepDeletedIds) localStorage.removeItem(DELETED_IDS_KEY);
};

// ---------------------------------------------------------------------------
// Sync ID persistence
// ---------------------------------------------------------------------------

export const getSyncId = (): string | null => {
  try {
    return localStorage.getItem(SYNC_ID_KEY);
  } catch {
    return null;
  }
};

export const saveSyncId = (id: string | null): void => {
  try {
    if (id) localStorage.setItem(SYNC_ID_KEY, id);
    else localStorage.removeItem(SYNC_ID_KEY);
  } catch {
    // Swallow — sync ID loss is non-fatal
  }
};

// ---------------------------------------------------------------------------
// Tombstone set for deleted transaction IDs
// ---------------------------------------------------------------------------

const TOMBSTONE_CAP = 2000;

export const loadDeletedIds = (): string[] => {
  try {
    const raw = localStorage.getItem(DELETED_IDS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
};

export const saveDeletedIds = (ids: string[]): void => {
  try {
    localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(ids));
  } catch {
    // Swallow — tombstone loss is non-fatal (deleted items may briefly reappear on remote sync)
  }
};

export const addDeletedId = (id: string): void => {
  const existing = loadDeletedIds();
  if (existing.includes(id)) return;
  const updated = [...existing, id].slice(-TOMBSTONE_CAP);
  saveDeletedIds(updated);
};

export const loadPositionMeta = (): PositionMeta[] => {
  return readJsonArray(META_KEY)
    .map(normalizePositionMeta)
    .filter((row): row is PositionMeta => row != null);
};

export const upsertPositionMeta = (meta: PositionMeta): void => {
  const existing = loadPositionMeta();
  const normalized = normalizePositionMeta(meta);
  if (!normalized) return;
  const idx = existing.findIndex((m) => m.ticker === normalized.ticker);
  if (idx >= 0) existing[idx] = { ...existing[idx], ...normalized };
  else existing.push(normalized);
  savePositionMeta(existing);
};

export const downloadBackup = (transactions: Transaction[]): void => {
  const payload: SyncPayload = {
    version: 3,
    exportedAt: new Date().toISOString(),
    transactions,
    positionMeta: loadPositionMeta(),
    deletedIds: loadDeletedIds(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `apex_backup_${new Date().toISOString().split("T")[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

export const restoreFromFile = (
  file: File
): Promise<{ transactions: Transaction[]; meta: PositionMeta[]; deletedIds: string[] }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const parsed: unknown = JSON.parse(String(e.target?.result ?? ""));
        const seenIds = new Set<string>();
        const normalizePayload = (transactions: unknown, meta: unknown) => {
          if (!Array.isArray(transactions)) throw new Error("Backup must contain transactions");
          const normalizedTransactions = transactions
            .map((row) => normalizeTransaction(row, seenIds))
            .filter((row): row is Transaction => row != null);

          if (transactions.length > 0 && normalizedTransactions.length === 0) {
            throw new Error("Backup contains no valid transactions");
          }
          if (normalizedTransactions.length !== transactions.length) {
            throw new Error("Backup contains invalid transaction rows");
          }

          const normalizedMeta = Array.isArray(meta)
            ? meta.map(normalizePositionMeta).filter((row): row is PositionMeta => row != null)
            : [];
          return { transactions: normalizedTransactions, meta: normalizedMeta, deletedIds: [] };
        };

        if (isRecord(parsed) && (parsed.version === 2 || parsed.version === 3)) {
          const restored = normalizePayload(parsed.transactions, parsed.positionMeta);
          const deletedIds = parsed.version === 3 && Array.isArray(parsed.deletedIds)
            ? parsed.deletedIds.filter((id): id is string => typeof id === "string")
            : [];
          resolve({ ...restored, deletedIds });
        } else if (Array.isArray(parsed)) {
          resolve(normalizePayload(parsed, []));
        } else {
          reject(new Error("Unrecognised backup format"));
        }
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error("Unable to read backup file"));
    reader.readAsText(file);
  });
};
