#!/usr/bin/env node
/**
 * kiln measure-type — solve back for the font-size that produces a target cap height.
 *
 *   node measure-type.js --family "Noto Serif SC" --weight 900 --text 0732 --target 28
 *   node measure-type.js --family Lora --weight 700 --target 28 --css ./fonts/fonts.css
 *
 * Lock the cap height, never the font-size. A serif and a mono at the same
 * font-size are not the same optical height — the moment the family changes,
 * the protagonist visibly jumps.
 *
 * Requires playwright (chromium). If it is missing, this prints the manual
 * procedure instead of failing.
 */
'use strict';

const args = require('node:util').parseArgs({
  options: {
    family: { type: 'string' }, weight: { type: 'string', default: '700' },
    text: { type: 'string', default: '0732' }, target: { type: 'string', default: '28' },
    css: { type: 'string' }, json: { type: 'boolean', default: false },
  }, strict: false,
}).values;

if (!args.family) {
  console.error('usage: measure-type.js --family <name> [--weight 700] [--text 0732] [--target 28] [--css path]');
  process.exit(2);
}

let chromium;
try { ({ chromium } = require('playwright')); }
catch {
  console.log(`
playwright not installed — here is the manual procedure:

  1. Render "${args.text}" at font-size 100px in ${args.family} ${args.weight}.
  2. Screenshot it on a plain background and measure the INK bounding box height
     in pixels (the top of the tallest mark to the bottom of the lowest).
     Do not use the line box. Do not use cap-height metrics from the font file —
     measure what actually renders.
  3. font-size = 100 * ${args.target} / <measured ink height>

  Expect an ugly number. 37.3px is what measured looks like; 36px is what a
  config file looks like.
`);
  process.exit(0);
}

(async () => {
  const target = parseFloat(args.target);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const link = args.css ? `<link rel="stylesheet" href="file://${require('path').resolve(args.css)}">` : '';
  await page.setContent(`<!doctype html><meta charset="utf-8">${link}
    <style>body{margin:0}
      #s{position:absolute;top:0;left:0;font-family:'${args.family}';font-weight:${args.weight};
         font-size:100px;line-height:1;white-space:pre;
         font-variant-numeric:lining-nums tabular-nums}</style>
    <span id="s">${args.text}</span>`);
  await page.waitForTimeout(700);

  const ink = await page.evaluate(() => {
    const el = document.getElementById('s');
    const r = el.getBoundingClientRect();
    const c = document.createElement('canvas');
    c.width = Math.ceil(r.width) + 40; c.height = Math.ceil(r.height) + 80;
    const x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = '#000';
    x.font = `${getComputedStyle(el).fontWeight} 100px '${getComputedStyle(el).fontFamily.split(',')[0].replace(/['"]/g, '')}'`;
    x.textBaseline = 'alphabetic';
    x.fillText(el.textContent, 20, c.height - 40);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    let top = -1, bot = -1;
    for (let y = 0; y < c.height; y++) {
      for (let xx = 0; xx < c.width; xx++) {
        if (d[(y * c.width + xx) * 4] < 128) { if (top < 0) top = y; bot = y; break; }
      }
    }
    return top < 0 ? null : bot - top + 1;
  });

  await browser.close();

  if (!ink) { console.error('could not measure — is the family loaded? try --css'); process.exit(1); }
  const size = +(100 * target / ink).toFixed(1);
  const out = { family: args.family, weight: +args.weight, text: args.text,
    targetInkHeight: target, inkHeightAt100px: ink, fontSize: size };
  if (args.json) { console.log(JSON.stringify(out, null, 2)); return; }
  console.log(`
  ${args.family} ${args.weight}  "${args.text}"
  ink height at 100px : ${ink}px
  target ink height   : ${target}px

  font-size: ${size}px;
  font-variant-numeric: lining-nums tabular-nums;
`);
})();
