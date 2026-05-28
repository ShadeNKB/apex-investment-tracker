/**
 * generate-icons.mjs
 * Generates PNG icons for Apex PWA from the brand colour.
 * Uses only Node built-ins + a tiny canvas approach via sharp if available,
 * otherwise falls back to writing raw PNG bytes for a solid-colour icon.
 *
 * Usage: node scripts/generate-icons.mjs
 */

import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "../public");
const require = createRequire(import.meta.url);

// Apex brand colours
const BG = "#060B14";      // canvas background
const ACCENT = "#22D3EE";  // cyan accent (from tailwind config)

// Try sharp first (fast, no system deps if on Node 18+)
async function trySharp(sizes) {
  const sharp = await import("sharp").catch(() => null);
  if (!sharp) return false;

  for (const size of sizes) {
    // Create a coloured SVG then rasterise
    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${BG}" rx="${size * 0.18}"/>
  <!-- Simple chart bars icon -->
  <g fill="${ACCENT}" opacity="0.95">
    <rect x="${size*0.15}" y="${size*0.55}" width="${size*0.14}" height="${size*0.3}" rx="2"/>
    <rect x="${size*0.35}" y="${size*0.38}" width="${size*0.14}" height="${size*0.47}" rx="2"/>
    <rect x="${size*0.55}" y="${size*0.25}" width="${size*0.14}" height="${size*0.60}" rx="2"/>
    <rect x="${size*0.75}" y="${size*0.42}" width="${size*0.10}" height="${size*0.43}" rx="2"/>
  </g>
</svg>`;
    await sharp.default(Buffer.from(svg))
      .png()
      .toFile(join(publicDir, `icon-${size}.png`));
    console.log(`[+] icon-${size}.png`);
  }
  return true;
}

// Pure-Node fallback — minimal valid PNG (1×1 scaled, solid colour)
// This is a proper 1×1 solid colour PNG, then we use a Node Buffer trick
// to create a valid coloured PNG without dependencies.
function writeSolidPng(size, hexBg, outPath) {
  // Parse hex
  const r = parseInt(hexBg.slice(1, 3), 16);
  const g = parseInt(hexBg.slice(3, 5), 16);
  const b = parseInt(hexBg.slice(5, 7), 16);

  // Build minimal PNG: signature + IHDR + IDAT (solid colour) + IEND
  function crc32(buf) {
    let c = 0xffffffff;
    const table = [];
    for (let i = 0; i < 256; i++) {
      let val = i;
      for (let j = 0; j < 8; j++) val = val & 1 ? 0xedb88320 ^ (val >>> 1) : val >>> 1;
      table[i] = val;
    }
    for (const byte of buf) c = table[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const typeB = Buffer.from(type);
    const crcBuf = Buffer.concat([typeB, data]);
    const crcVal = Buffer.alloc(4); crcVal.writeUInt32BE(crc32(crcBuf));
    return Buffer.concat([len, typeB, data, crcVal]);
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 2;   // colour type RGB
  // compress, filter, interlace = 0

  // Raw image: one scanline filter byte (0) + RGB per pixel, per row
  const row = Buffer.alloc(1 + size * 3);
  row[0] = 0;
  for (let x = 0; x < size; x++) { row[1 + x*3] = r; row[2 + x*3] = g; row[3 + x*3] = b; }
  const raw = Buffer.concat(Array(size).fill(row));

  // Deflate with zlib
  const zlib = require("zlib");
  const compressed = zlib.deflateSync(raw, { level: 9 });

  const idat = compressed;
  const iend = Buffer.alloc(0);

  const png = Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", iend),
  ]);

  writeFileSync(outPath, png);
  console.log(`[+] ${outPath} (solid colour fallback)`);
}

const sizes = [192, 512];

(async () => {
  mkdirSync(publicDir, { recursive: true });

  const usedSharp = await trySharp(sizes);
  if (!usedSharp) {
    console.log("[!] sharp not found — using solid-colour PNG fallback");
    for (const s of sizes) {
      writeSolidPng(s, BG, join(publicDir, `icon-${s}.png`));
    }
    // apple-touch-icon (180×180)
    writeSolidPng(180, BG, join(publicDir, "apple-touch-icon.png"));
  } else {
    // Also generate apple-touch-icon
    await trySharp([180]);
    const src = join(publicDir, "icon-180.png");
    const dest = join(publicDir, "apple-touch-icon.png");
    try {
      const { renameSync } = await import("fs");
      renameSync(src, dest);
      console.log("[+] apple-touch-icon.png");
    } catch {}
  }
  console.log("[✓] Icon generation complete");
})();
