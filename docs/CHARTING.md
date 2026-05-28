# Charting library — decision

> ADR-style note. Source of truth for why Apex uses Recharts and the bar to change it.

**Status:** Accepted — Recharts stays  
**Last reviewed:** 2026-05-28  
**Bundle impact:** `recharts` chunk = 415 kB raw / **108 kB gzip**, code-split into a dedicated route chunk

---

## The question

Apex's `recharts` chunk is the largest single asset in the build. Should we swap it for a smaller renderer?

## Current usage

Two views import Recharts. Nothing else does.

| View | Components used |
|---|---|
| `views/Dashboard.tsx` | `AreaChart`, `Area`, `PieChart`, `Pie`, `Cell`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `ResponsiveContainer` |
| `views/Analytics.tsx` | `AreaChart`, `Area`, `BarChart`, `Bar`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `ResponsiveContainer`, `Cell` |

Combined surface: **Area + Bar + Pie + axes + grid + tooltip**.

## Alternatives evaluated

| Library | Gzip | Pie? | Bar? | Area? | Verdict |
|---|---|---|---|---|---|
| **Recharts 2.8** (current) | 108 kB | ✅ | ✅ | ✅ | Baseline |
| Recharts 3.x | ~95 kB (est.) | ✅ | ✅ | ✅ | Marginal win, breaking API changes, not worth audit |
| **lightweight-charts** (TradingView) | ~45 kB | ❌ | ✅ | ✅ | Loses Pie — would need a second library or hand-rolled donut |
| **uPlot** | ~40 kB | ❌ | ❌ | ✅ | Line/area only. Wrong fit. |
| **Chart.js + react-chartjs-2** | ~60 kB | ✅ | ✅ | ✅ | Canvas-only — loses SVG accessibility/print parity, big rewrite |
| **Visx (modular d3)** | ~55 kB | ✅ | ✅ | ✅ | Component-by-component primitives — biggest rewrite, lowest payoff |

## Why Recharts stays

1. **The chunk is already isolated.** `vite.config.js` `manualChunks` peels Recharts into `recharts-*.js`, and the rolldown runtime only fetches it when the user opens Dashboard or Analytics. Portfolio and Transactions views never load it.
2. **The size budget is honest.** 108 kB gzip is one chunk that pays for **three chart families** (area, bar, pie) with accessibility, tooltips, and responsive containers. The closest "smaller" option (lightweight-charts at 45 kB) doesn't render Pie and would require a second library — netting little if any saving once a donut implementation is added.
3. **API stability.** Recharts components are declarative React. A swap to a canvas library or to lightweight-charts would mean rewriting both views from scratch and re-testing all interactions.
4. **No real complaint.** The largest gzipped page payload is Dashboard's first load: `index` (50 kB) + `Dashboard` (3 kB) + `recharts` (108 kB) ≈ 161 kB gzip. Acceptable for a finance dashboard.

## When to revisit

Open this file again and reconsider when **any** of these become true:

- Pie chart is removed from the product (would unblock lightweight-charts → ~63 kB saving)
- Bundle budget tightens below 80 kB gzip for the Dashboard/Analytics combined first paint
- Recharts ships a major breaking release that requires a forced upgrade
- Lighthouse Performance on a low-end Android device drops below 90 because of chart parse cost

Until then: ship product features, not chart libraries.
