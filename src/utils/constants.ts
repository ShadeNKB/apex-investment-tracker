// Generate last N months (newest first), spanning multiple years
export const GENERATE_MONTHS = (count = 36): string[] => {
  const months: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    );
  }
  return months;
};

export const CHART_COLORS = [
  "#10D98A", // emerald   — position 0
  "#4B8EFF", // blue      — position 1
  "#F0A500", // amber     — position 2
  "#F472B6", // pink      — position 3
  "#A78BFA", // violet    — position 4
  "#FB923C", // orange    — position 5
  "#2DD4BF", // teal      — position 6
  "#818CF8", // indigo    — position 7
  "#FCD34D", // yellow    — position 8
  "#34D399", // green-400 — position 9
];

export const STRATEGY_PRESETS = [
  "Core Holdings",
  "Growth",
  "Dividend",
  "Speculation",
  "Hedge",
  "Emergency Fund",
];

export const CATEGORY_LABEL: Record<string, string> = {
  ETF: "ETF",
  Stock: "Stock",
  Crypto: "Crypto",
};
