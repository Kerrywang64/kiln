#!/usr/bin/env node
/**
 * kiln card — run the check and draw the result as a shareable image.
 *
 *   node card.js [path]                  writes kiln-card.svg
 *   node card.js [path] -o out.svg       choose the filename
 *   node card.js [path] --png            also write a PNG (needs playwright)
 *
 * Colors come from DESIGN.md if the project has one, so every project's card
 * looks like that project. No DESIGN.md → ink on paper.
 */

'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const argv = process.argv.slice(2);
const target = argv.find(a => !a.startsWith('-')) || '.';
const oIdx = argv.indexOf('-o');
const outSvg = oIdx >= 0 ? argv[oIdx + 1] : 'kiln-card.svg';
const wantPng = argv.includes('--png');

const root = fs.existsSync(target) && fs.statSync(target).isDirectory() ? target : path.dirname(target);

// ---- run the check ----------------------------------------------------------
let report;
try {
  const raw = execFileSync(process.execPath,
    [path.join(__dirname, 'check.js'), target, '--json'],
    { encoding: 'utf8', maxBuffer: 1 << 24 });
  report = JSON.parse(raw);
} catch (e) {
  // check.js exits 1 when there are failures — that is expected, still parse it
  try { report = JSON.parse(e.stdout); }
  catch { console.error('could not run check.js'); process.exit(1); }
}

// ---- palette ----------------------------------------------------------------
const PALETTE = { bg: '#EFEDE6', ink: '#171614', sub: '#8A8378', accent: '#B03A2E', ok: '#7E9BA0' };

for (const name of ['DESIGN.md', 'design.md']) {
  const f = path.join(root, name);
  if (!fs.existsSync(f)) continue;
  const txt = fs.readFileSync(f, 'utf8');
  const grab = (label) => {
    const m = new RegExp(label + '\\s*[:\\-—]?\\s*(#[0-9a-fA-F]{3,8})').exec(txt);
    return m ? m[1] : null;
  };
  PALETTE.bg = grab('ground') || grab('bg') || PALETTE.bg;
  PALETTE.ink = grab('ink') || grab('text') || PALETTE.ink;
  PALETTE.accent = grab('accent') || PALETTE.accent;
  PALETTE.sub = grab('sub') || grab('muted') || PALETTE.sub;
  break;
}

// ---- content ----------------------------------------------------------------
const project = path.basename(path.resolve(root)) || 'project';
const fails = report.results.filter(r => r.level === 'fail');
const warns = report.results.filter(r => r.level === 'warn');
const clean = fails.length === 0 && warns.length === 0;

const verdict = fails.length
  ? 'this still reads as AI-built'
  : warns.length
    ? 'nothing disqualifying — but it has not decided much either'
    : 'nothing here reads as the mean';

const rows = [...fails, ...warns].slice(0, 7);

// ---- draw -------------------------------------------------------------------
const W = 1200, H = 675, M = 76;
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const mono = "'JetBrains Mono','SF Mono',ui-monospace,Menlo,Consolas,monospace";

let y = M + 30;
const parts = [];

parts.push(`<rect width="${W}" height="${H}" fill="${PALETTE.bg}"/>`);

// mark: a filled disc cut by one off-centre gap — the width of the gap is the failure count
const gap = clean ? 4 : Math.min(26, 6 + fails.length * 5);
const cx = W - M - 42, cy = M + 12, r = 30;
parts.push(`<mask id="g"><rect x="${cx - r - 4}" y="${cy - r - 4}" width="${2 * r + 8}" height="${2 * r + 8}" fill="#fff"/>` +
  `<rect x="${cx - r + 2 * r * 0.38 - gap / 2}" y="${cy - r - 4}" width="${gap}" height="${2 * r + 8}" fill="#000"/></mask>` +
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fails.length ? PALETTE.accent : PALETTE.ok}" mask="url(#g)"/>`);

// header
parts.push(`<text x="${M}" y="${y}" font-family="${mono}" font-size="21" font-weight="700" letter-spacing="7" fill="${PALETTE.ink}">KILN</text>`);
parts.push(`<text x="${M + 118}" y="${y}" font-family="${mono}" font-size="21" letter-spacing="1" fill="${PALETTE.sub}">${esc(project)}</text>`);
y += 30;
parts.push(`<rect x="${M}" y="${y}" width="${W - M * 2}" height="1.5" fill="${PALETTE.ink}" opacity=".22"/>`);

// score
y += 118;
const big = clean ? 'CLEAN' : String(fails.length);
parts.push(`<text x="${M}" y="${y}" font-family="${mono}" font-size="${clean ? 92 : 132}" font-weight="700" fill="${fails.length ? PALETTE.accent : PALETTE.ok}" style="font-variant-numeric:lining-nums tabular-nums">${big}</text>`);
if (!clean) {
  const off = M + big.length * 82 + 22;
  parts.push(`<text x="${off}" y="${y - 46}" font-family="${mono}" font-size="26" letter-spacing="4" fill="${PALETTE.ink}">FAIL</text>`);
  parts.push(`<text x="${off}" y="${y - 6}" font-family="${mono}" font-size="26" letter-spacing="4" fill="${PALETTE.sub}">${warns.length} WARN</text>`);
}

// findings
y += 62;
if (rows.length) {
  for (const r of rows) {
    const isFail = r.level === 'fail';
    parts.push(`<rect x="${M}" y="${y - 12}" width="6" height="16" fill="${isFail ? PALETTE.accent : PALETTE.sub}" opacity="${isFail ? 1 : .5}"/>`);
    parts.push(`<text x="${M + 22}" y="${y}" font-family="${mono}" font-size="17" letter-spacing=".3" fill="${PALETTE.sub}">${r.id}</text>`);
    parts.push(`<text x="${M + 74}" y="${y}" font-family="${mono}" font-size="17" letter-spacing=".3" fill="${isFail ? PALETTE.ink : PALETTE.sub}">${esc(r.name)}</text>`);
    parts.push(`<text x="${W - M}" y="${y}" text-anchor="end" font-family="${mono}" font-size="17" fill="${PALETTE.sub}" opacity=".7" style="font-variant-numeric:lining-nums tabular-nums">${r.count}</text>`);
    y += 31;
  }
} else {
  parts.push(`<text x="${M}" y="${y}" font-family="${mono}" font-size="19" fill="${PALETTE.sub}">no signature of the mean found</text>`);
  y += 31;
}

// verdict + footer
parts.push(`<text x="${M}" y="${H - M - 26}" font-family="${mono}" font-size="21" fill="${PALETTE.ink}">${esc(verdict)}</text>`);
parts.push(`<text x="${M}" y="${H - M + 8}" font-family="${mono}" font-size="15" fill="${PALETTE.sub}" opacity=".75" style="font-variant-numeric:lining-nums tabular-nums">${report.scanned} file${report.scanned === 1 ? '' : 's'} scanned</text>`);
parts.push(`<text x="${W - M}" y="${H - M + 8}" text-anchor="end" font-family="${mono}" font-size="15" fill="${PALETTE.sub}" opacity=".6">kiln</text>`);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${parts.join('')}</svg>`;
fs.writeFileSync(outSvg, svg);
console.log(`wrote ${outSvg}  —  ${fails.length} fail, ${warns.length} warn`);

// ---- optional PNG -----------------------------------------------------------
if (wantPng) {
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch {
    console.log('(no PNG: playwright not installed. Open the SVG in a browser and screenshot it,');
    console.log(' or: npx playwright install chromium)');
    process.exit(0);
  }
  (async () => {
    const b = await chromium.launch();
    const pg = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
    await pg.setContent(`<style>*{margin:0}</style>${svg}`);
    await pg.waitForTimeout(300);
    const png = outSvg.replace(/\.svg$/, '') + '.png';
    await pg.screenshot({ path: png });
    await b.close();
    console.log(`wrote ${png}`);
  })();
}
