#!/usr/bin/env node
/**
 * kiln check — fail an interface that looks AI-built.
 *
 *   node check.js [path]            scan a file or directory (default: cwd)
 *   node check.js [path] --json     machine-readable
 *   node check.js [path] --quiet    only the summary line
 *
 * Exit 0 = clean or warnings only.  Exit 1 = at least one FAIL.
 *
 * Declared exceptions: put a line in DESIGN.md like
 *     kiln-allow: S2 uniform radius is intentional, the product is machined
 * and that signature drops from WARN to note. FAILs cannot be silenced.
 */

'use strict';
const fs = require('fs');
const path = require('path');

const EXT = new Set(['.css', '.scss', '.sass', '.less', '.html', '.htm', '.vue', '.svelte',
  '.jsx', '.tsx', '.js', '.ts', '.astro']);   // markdown is documentation, not interface
const SKIP_DIR = new Set(['node_modules', '.git', 'dist', 'build', 'out', '.next',
  'coverage', 'vendor', '.venv', '__pycache__', 'release']);

// ---------- signatures -------------------------------------------------------

const SLATE_HEX = ['0f172a', '1e293b', '334155', '475569', '64748b', '94a3b8',
  'cbd5e1', 'e2e8f0', 'f1f5f9', 'f8fafc', '111827', '1f2937', '374151', '4b5563',
  '6b7280', '9ca3af', 'd1d5db', 'e5e7eb', 'f3f4f6', 'f9fafb'];
const BRANDS = new Set(['claude', 'github', 'openai', 'codex', 'kimi', 'qwen', 'gpt',
  'grok', 'gemini', 'npm', 'css', 'html', 'json', 'api', 'ui', 'ux', 'ai', 'pdf', 'svg',
  'mit', 'app', 'ios', 'mac', 'pc', 'web', 'sdk', 'cli', 'md', 'js', 'ts', 'px', 'rem',
  'token', 'tokens', 'agent', 'agents', 'skill', 'skills', 'prompt', 'hooks', 'x']);
const VIOLET_HEX = ['6366f1', '8b5cf6', 'a855f7', '7c3aed', '4f46e5', '818cf8', 'c084fc'];

const SIG = [
  { id: 'S1', level: 'fail', name: 'slate ground',
    why: 'the default palette of the most-used CSS framework — the literal mode of the training data. Nobody picked it.',
    fix: 'give the neutral a temperature. A neutral with a hue is a decision; a neutral without one is an absence.',
    scan: (t) => {
      const hits = [];
      const hex = new RegExp('#(' + SLATE_HEX.join('|') + ')\\b', 'gi');
      let m; while ((m = hex.exec(t))) hits.push(m);
      const tw = /\b(?:bg|from|via|to|text|border)-(?:slate|gray|zinc|neutral|cool-?gray)-(?:[5-9]0|[1-9]00)\b/g;
      while ((m = tw.exec(t))) hits.push(m);
      return hits.length >= 3 ? hits : [];
    } },

  { id: 'S3', level: 'fail', name: 'gradient hero',
    why: 'ornament with no function. Delete it and nothing stops working — that fails rule 2 outright.',
    fix: 'get depth from material instead: a paper grain, a 3px glaze band, one hairline.',
    scan: (t) => {
      const hits = []; let m;
      // A gradient is only slop when it is the BACKGROUND OF SOMETHING BIG.
      // A 3px glaze band, an SVG stroke, or a 12px dot is a component, not a hero.
      const isSmallOrVector = (ctx) =>
        /<linearGradient|<radialGradient|stroke\s*=|fill\s*=\s*["']url\(|gradientUnits/.test(ctx) ||
        /(?:width|height)\s*:\s*(?:[0-9]|1[0-9]|2[0-3])(?:\.\d+)?px/.test(ctx) ||
        /\$\{[^}]*\}px/.test(ctx);           // templated component sizes
      const isBig = (ctx) =>
        /\b(?:body|html)\s*[,{]|\.hero|\[class\*?=["']?hero|min-height\s*:\s*100|height\s*:\s*100v|100vh|100vw|padding\s*:\s*[6-9]\d|padding\s*:\s*\d{3}/.test(ctx);

      const g = /(?:linear|radial|conic)-gradient\s*\(([^)]{20,})/g;
      while ((m = g.exec(t))) {
        const ctx = t.slice(Math.max(0, m.index - 220), m.index + 220);
        if (isSmallOrVector(ctx)) continue;
        const stops = (m[1].match(/#[0-9a-f]{3,8}|rgba?\(/gi) || []).length;
        if (isBig(ctx) || stops >= 3) hits.push(m);
      }
      const tw = /\bbg-gradient-to-[a-z]{1,2}\b/g;
      while ((m = tw.exec(t))) hits.push(m);
      const v = new RegExp('#(' + VIOLET_HEX.join('|') + ')\\b', 'gi');
      while ((m = v.exec(t))) {
        const ctx = t.slice(Math.max(0, m.index - 160), m.index + 160);
        if (/gradient/i.test(ctx)) hits.push(m);   // violet only counts inside a gradient
      }
      return hits;
    } },

  { id: 'S4', level: 'fail', name: 'emoji as interface',
    why: "emoji are someone else's glyphs, in a drawing style you did not choose. Every product using them looks like every other product using them.",
    fix: 'four glyphs of your own — dot, section mark, bullet, checkbox — pulled from your material.',
    scan: (t) => {
      const hits = [];
      // emoji immediately before a label, or as a list marker
      const re = /(?:^|\n)\s*(?:[-*]\s*)?([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}])\s*\S/gu;
      let m; while ((m = re.exec(t))) hits.push(m);
      const inline = /(?:>|["'`])\s*([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}])\s*[\p{L}]/gu;
      while ((m = inline.exec(t))) hits.push(m);
      return hits;
    } },

  { id: 'S8', level: 'fail', name: 'two languages in one view',
    why: '「TODAY 今日」 is not bilingual design, it is an unfinished decision — two audiences served badly instead of one served well.',
    fix: 'ship complete packs per language; switch the whole surface at once. A missing field should fail the build.',
    scan: (t) => {
      const hits = [];
      // a short Latin word touching a short CJK run — i.e. a label and its translation
      const re = /([A-Za-z]{2,10})[ \u00b7\u2022]{0,2}([\u4e00-\u9fff]{1,4})|([\u4e00-\u9fff]{1,4})[ \u00b7\u2022]{0,2}([A-Za-z]{2,10})/g;
      let m;
      while ((m = re.exec(t))) {
        const word = (m[1] || m[4] || '');
        if (BRANDS.has(word.toLowerCase())) continue;            // brand names are exempt
        const raw = lineAt(t, m.index);
        if (raw.length > 400) continue;                          // minified data / bundles
        if (/https?:|<code|<pre/.test(raw)) continue;
        // judge on the TEXT, not the markup: strip tags and attributes first
        const text = raw
          .replace(/<[^>]*>/g, ' ')
          .replace(/\bclass\s*=\s*["'][^"']*["']/g, ' ')
          .replace(/[{}`$]/g, ' ');
        const pair = new RegExp(
          escapeRe(m[0].trim()).replace(/\s+/g, '\\s*'), '');
        const at = text.search(pair);
        if (at < 0) continue;                                    // it only existed inside markup
        const near = text.slice(Math.max(0, at - 6), at + m[0].length + 6);
        if (/[0-9@#$_=]|[A-Za-z]\/[A-Za-z]|[A-Za-z]-[A-Za-z]|[A-Za-z]\.[A-Za-z]/.test(near)) continue;
        hits.push(m);
      }
      return hits.length >= 2 ? hits : [];
    } },

  { id: 'S2', level: 'warn', name: 'uniform radius',
    why: 'radius is one of the cheapest carriers of character. Making it uniform throws that away.',
    fix: 'at most two radii, assigned by role, and say in DESIGN.md which role gets which.',
    scan: (t) => {
      const counts = new Map(); const first = new Map();
      let m;
      const re = /border-radius\s*:\s*([0-9.]+(?:px|rem|em))/g;
      while ((m = re.exec(t))) { bump(counts, first, m[1], m); }
      const tw = /\brounded-(lg|xl|2xl|md)\b/g;
      while ((m = tw.exec(t))) { bump(counts, first, m[1], m); }
      const hits = [];
      for (const [v, n] of counts) if (n >= 4) hits.push(first.get(v));
      return hits;
    } },

  { id: 'S5', level: 'warn', name: 'drop-shadow cards',
    why: 'a 2016 material-design reflex. It says "this is a card" to a viewer who already knows it is a card.',
    fix: 'separate surfaces with a line or a ground shift. If you need elevation, one shadow, one element, one reason.',
    scan: (t) => {
      const hits = []; let m;
      const tw = /\bshadow-(lg|xl|2xl)\b/g;
      while ((m = tw.exec(t))) hits.push(m);
      const css = /box-shadow\s*:([^;}]+)/g;
      while ((m = css.exec(t))) {
        const lens = (m[1].match(/(\d+(?:\.\d+)?)px/g) || []).map(v => parseFloat(v));
        if (lens.length && Math.max(...lens) >= 15) hits.push(m);
      }
      return hits.length >= 3 ? hits : [];
    } },

  { id: 'S7', level: 'warn', name: 'unmeasured type scale',
    why: 'those numbers came from a config file, not from your design — and they stop being the same optical size the moment the family changes.',
    fix: 'measure. scripts/measure-type.js solves back for a fixed cap height. Expect ugly numbers; ugly numbers mean measured.',
    scan: (t) => {
      const RAMP = new Set(['12', '14', '16', '18', '20', '24', '30', '36', '48', '60', '72']);
      const seen = new Set(); const hits = []; let m;
      const re = /font-size\s*:\s*(\d+(?:\.\d+)?)px/g;
      while ((m = re.exec(t))) { seen.add(m[1]); if (RAMP.has(m[1])) hits.push(m); }
      // only complain if EVERY size is off the default ramp-ish grid
      if (seen.size < 3) return [];
      const offGrid = [...seen].filter(v => !RAMP.has(v) && (+v % 2 !== 0));
      return offGrid.length === 0 ? hits.slice(0, 3) : [];
    } },

  { id: 'S9', level: 'warn', name: 'perfect circles everywhere',
    why: 'a true circle is the default a machine reaches for. Hand-made and material-derived forms are almost never perfectly round.',
    fix: 'if your material is thrown, pinched, cut or worn, use asymmetric radii. If it is machined, keep the circle and say so.',
    scan: (t) => {
      const hits = []; let m;
      const re = /border-radius\s*:\s*50%/g;
      while ((m = re.exec(t))) hits.push(m);
      const tw = /\brounded-full\b/g;
      while ((m = tw.exec(t))) hits.push(m);
      return hits.length >= 5 ? hits : [];
    } },

  { id: 'S10', level: 'warn', name: 'centered-everything layout',
    why: 'centering is what you do when you have not decided where the eye goes.',
    fix: 'pick an edge. Asymmetry is a decision and reads as one.',
    scan: (t) => {
      const hits = []; let m;
      const tw = /\bmx-auto\b[^"'`]*\bmax-w-/g;
      while ((m = tw.exec(t))) hits.push(m);
      const css = /max-width\s*:\s*\d+[a-z%]*\s*;\s*margin\s*:\s*0\s+auto|margin\s*:\s*0\s+auto\s*;\s*[^}]*max-width\s*:/g;
      while ((m = css.exec(t))) hits.push(m);
      return hits.length >= 3 ? hits : [];
    } },

  { id: 'S6', level: 'warn', name: 'one-typeface system',
    why: 'type is half the design. One neutral grotesque for everything is the same as not choosing.',
    fix: 'a display face and a text face that are not siblings. Display carries personality; text stays out of the way.',
    scan: () => [], // handled project-wide below
  },
];

// ---------- helpers ----------------------------------------------------------

function escapeRe(x) { return x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function bump(counts, first, key, m) {
  counts.set(key, (counts.get(key) || 0) + 1);
  if (!first.has(key)) first.set(key, m);
}
function lineAt(text, idx) {
  const s = text.lastIndexOf('\n', idx) + 1;
  let e = text.indexOf('\n', idx); if (e < 0) e = text.length;
  return text.slice(s, e);
}
function lineNo(text, idx) { return text.slice(0, idx).split('\n').length; }

function walk(p, out = []) {
  let st; try { st = fs.statSync(p); } catch { return out; }
  if (st.isFile()) { if (EXT.has(path.extname(p))) out.push(p); return out; }
  if (!st.isDirectory()) return out;
  for (const e of fs.readdirSync(p)) {
    if (SKIP_DIR.has(e) || e.startsWith('.') && e !== '.') continue;
    walk(path.join(p, e), out);
  }
  return out;
}

function readAllowlist(root) {
  const allow = new Map();
  for (const name of ['DESIGN.md', 'design.md']) {
    const f = path.join(root, name);
    if (!fs.existsSync(f)) continue;
    for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
      const m = /kiln-allow:\s*(S\d+)\s*(.*)/i.exec(line);
      if (m) allow.set(m[1].toUpperCase(), (m[2] || '').trim());
    }
  }
  return allow;
}

// ---------- run --------------------------------------------------------------

const args = process.argv.slice(2);
const target = args.find(a => !a.startsWith('--')) || '.';
const asJson = args.includes('--json');
const quiet = args.includes('--quiet');
const root = fs.existsSync(target) && fs.statSync(target).isDirectory() ? target : path.dirname(target);

const files = walk(target);
const allow = readAllowlist(root);
const found = new Map(); // id -> {sig, hits:[{file,line,text}]}
const families = new Set();

for (const f of files) {
  let text; try { text = fs.readFileSync(f, 'utf8'); } catch { continue; }
  const rel = path.relative(process.cwd(), f) || f;

  let fm;
  const ff = /font-family\s*:\s*([^;{}]+)/g;
  while ((fm = ff.exec(text))) {
    const first = fm[1].split(',')[0].replace(/['"]/g, '').trim().toLowerCase();
    if (first && !first.startsWith('var(')) families.add(first);
  }

  for (const sig of SIG) {
    const hits = sig.scan(text, rel);
    if (!hits.length) continue;
    if (!found.has(sig.id)) found.set(sig.id, { sig, hits: [] });
    const seenLines = new Set(found.get(sig.id).hits.filter(x => x.file === rel).map(x => x.line));
    for (const h of hits) {
      const ln = lineNo(text, h.index);
      if (seenLines.has(ln)) continue;
      seenLines.add(ln);
      found.get(sig.id).hits.push({ file: rel, line: ln, text: lineAt(text, h.index).trim().slice(0, 110) });
      if (seenLines.size >= 4) break;
    }
  }
}

const GENERIC = new Set(['inter', 'system-ui', '-apple-system', 'roboto', 'arial',
  'helvetica', 'helvetica neue', 'segoe ui', 'sans-serif']);
const realFamilies = [...families].filter(f => !GENERIC.has(f));
if (files.length && realFamilies.length === 0 && families.size > 0) {
  const s6 = SIG.find(s => s.id === 'S6');
  found.set('S6', { sig: s6, hits: [{ file: '(project)', line: 0,
    text: 'only generic families found: ' + [...families].join(', ') }] });
}

// ---------- report -----------------------------------------------------------

const results = [...found.values()].map(({ sig, hits }) => ({
  id: sig.id,
  name: sig.name,
  level: allow.has(sig.id) && sig.level === 'warn' ? 'note' : sig.level,
  allowed: allow.get(sig.id) || null,
  why: sig.why, fix: sig.fix,
  count: hits.length, hits: hits.slice(0, 4),
})).sort((a, b) => (a.level === 'fail' ? -1 : 1) - (b.level === 'fail' ? -1 : 1));

const fails = results.filter(r => r.level === 'fail');
const warns = results.filter(r => r.level === 'warn');

if (asJson) {
  console.log(JSON.stringify({ scanned: files.length, fails: fails.length, warns: warns.length, results }, null, 2));
} else if (quiet) {
  console.log(`kiln: ${files.length} files · ${fails.length} fail · ${warns.length} warn`);
} else {
  const B = '\x1b[1m', D = '\x1b[2m', R = '\x1b[0m', RED = '\x1b[31m', YEL = '\x1b[33m', GRN = '\x1b[32m';
  console.log(`\n${B}kiln${R} ${D}— ${files.length} files scanned${R}\n`);
  if (!results.length) {
    console.log(`  ${GRN}clean.${R} Nothing here reads as the mean.\n`);
  }
  for (const r of results) {
    const tag = r.level === 'fail' ? `${RED}FAIL${R}` : r.level === 'warn' ? `${YEL}WARN${R}` : `${D}note${R}`;
    console.log(`  ${tag}  ${B}${r.id} ${r.name}${R} ${D}(${r.count})${R}`);
    console.log(`        ${D}why  ${R}${r.why}`);
    console.log(`        ${D}fix  ${R}${r.fix}`);
    if (r.allowed) console.log(`        ${D}declared in DESIGN.md: ${r.allowed}${R}`);
    for (const h of r.hits) console.log(`        ${D}${h.file}:${h.line}${R}  ${h.text}`);
    console.log('');
  }
  const verdict = fails.length
    ? `${RED}${fails.length} fail${R}, ${warns.length} warn — this still reads as AI-built.`
    : warns.length
      ? `${YEL}0 fail${R}, ${warns.length} warn — nothing disqualifying, but it has not decided much either.`
      : `${GRN}0 fail, 0 warn.${R}`;
  console.log(`  ${verdict}\n`);
}

process.exit(fails.length ? 1 : 0);
