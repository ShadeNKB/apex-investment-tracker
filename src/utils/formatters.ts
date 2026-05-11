const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const compactCurrencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const preciseCurrencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(amount: number, compact = false): string {
  if (compact && Math.abs(amount) >= 1000) {
    return compactCurrencyFormatter.format(amount);
  }
  return currencyFormatter.format(amount);
}

export function formatCurrencyPrecise(amount: number): string {
  return preciseCurrencyFormatter.format(amount);
}

export function formatMonth(yyyyMM: string): string {
  if (!yyyyMM || !yyyyMM.includes("-")) return yyyyMM;
  const [year, month] = yyyyMM.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString(
    "en-US",
    { month: "short", year: "numeric" }
  );
}

export function formatMonthShort(yyyyMM: string): string {
  if (!yyyyMM || !yyyyMM.includes("-")) return yyyyMM;
  const [year, month] = yyyyMM.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString(
    "en-US",
    { month: "short", year: "2-digit" }
  );
}

export function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatPercent(value: number, decimals = 1, showSign = true): string {
  const sign = showSign && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function getPreviousMonth(yyyyMM: string): string {
  const [year, month] = yyyyMM.split("-").map(Number);
  const d = new Date(year, month - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthToDate(yyyyMM: string): Date {
  const [year, month] = yyyyMM.split("-").map(Number);
  return new Date(year, month - 1, 1);
}
