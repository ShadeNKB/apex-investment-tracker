/**
 * generate-og.mjs
 * Generates a 1200×630 Open Graph / Twitter card image for Apex.
 * Run via: node scripts/generate-og.mjs
 */

import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "../public");

// Apex brand
const BG = "#060B14";
const PANEL = "#0E1422";
const ACCENT = "#22D3EE";
const TEXT = "#F1F5F9";
const MUTED = "#94A3B8";
const GRID = "#1E293B";

const W = 1200;
const H = 630;

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${BG}"/>
      <stop offset="100%" stop-color="#0A1220"/>
    </linearGradient>
    <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${ACCENT}" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="${ACCENT}" stop-opacity="0"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- background -->
  <rect width="${W}" height="${H}" fill="url(#bg)"/>

  <!-- subtle grid -->
  <g stroke="${GRID}" stroke-width="1" opacity="0.4">
    ${Array.from({ length: 12 }, (_, i) => `<line x1="${i * 100}" y1="0" x2="${i * 100}" y2="${H}"/>`).join("")}
    ${Array.from({ length: 7 }, (_, i) => `<line x1="0" y1="${i * 100}" x2="${W}" y2="${i * 100}"/>`).join("")}
  </g>

  <!-- left content -->
  <g transform="translate(80, 110)">
    <!-- logo mark -->
    <rect x="0" y="0" width="72" height="72" rx="16" fill="${PANEL}" stroke="${GRID}" stroke-width="1"/>
    <g transform="translate(0, 0)" fill="${ACCENT}">
      <rect x="14" y="42" width="10" height="22" rx="2"/>
      <rect x="28" y="30" width="10" height="34" rx="2"/>
      <rect x="42" y="18" width="10" height="46" rx="2"/>
      <rect x="56" y="28" width="8"  height="36" rx="2"/>
    </g>

    <!-- title -->
    <text x="0" y="170" font-family="Space Grotesk, -apple-system, system-ui, sans-serif"
          font-size="96" font-weight="700" fill="${TEXT}" letter-spacing="-2">Apex</text>

    <!-- tagline -->
    <text x="0" y="230" font-family="Inter, system-ui, sans-serif"
          font-size="32" font-weight="500" fill="${TEXT}" opacity="0.92">
      Local-first investment tracker
    </text>

    <!-- subtitle -->
    <text x="0" y="280" font-family="Inter, system-ui, sans-serif"
          font-size="22" font-weight="400" fill="${MUTED}">
      Portfolio, allocation, contributions — no accounts, your data.
    </text>

    <!-- feature chips -->
    <g transform="translate(0, 340)" font-family="Inter, system-ui, sans-serif" font-size="18" font-weight="500">
      <g>
        <rect x="0" y="0" width="170" height="44" rx="22" fill="${PANEL}" stroke="${ACCENT}" stroke-width="1" stroke-opacity="0.4"/>
        <text x="85" y="29" fill="${ACCENT}" text-anchor="middle">Cross-device sync</text>
      </g>
      <g transform="translate(186, 0)">
        <rect x="0" y="0" width="130" height="44" rx="22" fill="${PANEL}" stroke="${ACCENT}" stroke-width="1" stroke-opacity="0.4"/>
        <text x="65" y="29" fill="${ACCENT}" text-anchor="middle">PWA install</text>
      </g>
      <g transform="translate(332, 0)">
        <rect x="0" y="0" width="160" height="44" rx="22" fill="${PANEL}" stroke="${ACCENT}" stroke-width="1" stroke-opacity="0.4"/>
        <text x="80" y="29" fill="${ACCENT}" text-anchor="middle">Strict TypeScript</text>
      </g>
    </g>
  </g>

  <!-- right side chart -->
  <g transform="translate(720, 170)">
    <!-- panel -->
    <rect x="0" y="0" width="400" height="320" rx="20" fill="${PANEL}" stroke="${GRID}" stroke-width="1"/>

    <!-- KPI -->
    <text x="32" y="56" font-family="Inter, system-ui, sans-serif" font-size="14" font-weight="500" fill="${MUTED}" letter-spacing="2">PORTFOLIO VALUE</text>
    <text x="32" y="98" font-family="Space Grotesk, sans-serif" font-size="38" font-weight="700" fill="${TEXT}">$128,540.22</text>
    <text x="32" y="128" font-family="Inter, sans-serif" font-size="16" font-weight="600" fill="#22C55E">▲ +12.4% YTD</text>

    <!-- area chart -->
    <g transform="translate(28, 160)" filter="url(#glow)">
      <!-- area fill -->
      <path d="M 0 110 L 30 90 L 60 95 L 90 70 L 120 75 L 150 50 L 180 55 L 210 35 L 240 40 L 270 25 L 300 30 L 330 15 L 344 10 L 344 130 L 0 130 Z"
            fill="url(#area)"/>
      <!-- line -->
      <path d="M 0 110 L 30 90 L 60 95 L 90 70 L 120 75 L 150 50 L 180 55 L 210 35 L 240 40 L 270 25 L 300 30 L 330 15 L 344 10"
            fill="none" stroke="${ACCENT}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      <!-- end dot -->
      <circle cx="344" cy="10" r="5" fill="${ACCENT}"/>
      <circle cx="344" cy="10" r="10" fill="${ACCENT}" opacity="0.25"/>
    </g>
  </g>

  <!-- footer -->
  <g transform="translate(80, 560)">
    <text font-family="JetBrains Mono, monospace" font-size="16" font-weight="500" fill="${MUTED}">
      github.com/ShadeNKB/apex-investment-tracker
    </text>
  </g>
</svg>`.trim();

const sharp = (await import("sharp")).default;
await sharp(Buffer.from(svg)).png().toFile(join(publicDir, "og.png"));
console.log("[+] public/og.png (1200×630)");
