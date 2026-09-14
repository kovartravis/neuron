// Renders the social-preview image (Open Graph / Twitter card) used by the
// homepage and, as the default, by every docs page. Output is committed at
// site/public/og.png so the deploy doesn't depend on the CI runner's fonts;
// re-run this after changing the copy below:
//
//   cd site && node scripts/og-image.mjs
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, '../public/og.png');

const W = 1200;
const H = 630;

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f7f5f0"/>
      <stop offset="1" stop-color="#ece9e1"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect x="0" y="0" width="14" height="${H}" fill="#1a5f3f"/>

  <text x="88" y="118" font-family="Menlo, Consolas, 'DejaVu Sans Mono', monospace"
        font-size="30" fill="#1a5f3f" font-weight="700">neuron</text>
  <text x="210" y="118" font-family="-apple-system, 'Segoe UI', 'DejaVu Sans', Helvetica, Arial, sans-serif"
        font-size="26" fill="#7a7869">— memory for coding agents</text>

  <text font-family="-apple-system, 'Segoe UI', 'DejaVu Sans', Helvetica, Arial, sans-serif"
        font-size="64" font-weight="700" fill="#16150f" letter-spacing="-1.5">
    <tspan x="88" y="250">Stop re-explaining your</tspan>
    <tspan x="88" y="326">codebase to your AI agent.</tspan>
  </text>

  <text font-family="-apple-system, 'Segoe UI', 'DejaVu Sans', Helvetica, Arial, sans-serif"
        font-size="30" fill="#4a4941">
    <tspan x="88" y="400">Persistent, relevance-gated memory for Claude Code, Codex,</tspan>
    <tspan x="88" y="442">Cursor and Copilot CLI. Plain markdown in your repo. 100% offline.</tspan>
  </text>

  <rect x="88" y="500" width="640" height="64" rx="8" fill="#16150f"/>
  <text x="112" y="541" font-family="Menlo, Consolas, 'DejaVu Sans Mono', monospace"
        font-size="24" fill="#f7f5f0">$ npm install -g @kovartravis/neuron</text>

  <text x="${W - 88}" y="541" text-anchor="end"
        font-family="-apple-system, 'Segoe UI', 'DejaVu Sans', Helvetica, Arial, sans-serif"
        font-size="24" fill="#7a7869">kovartravis.github.io/neuron</text>
</svg>`;

await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(out);
console.log(`wrote ${out}`);
