---
name: kiln
description: Tell whether an interface looks AI-built, and say exactly why. Use when a design "looks generic / looks AI / looks like every other app", before calling any UI work done, when reviewing generated frontend code, or when picking colors, radii, type, or spacing for a project. Scans css/html/jsx for the signatures that mean nobody decided — slate palettes, gradient heroes, emoji as icons, uniform radii, drop-shadow cards, unmeasured type scales — and reports them with line numbers and what to do instead.
---

# kiln

> One kiln. Same clay, same glaze. Every piece comes out different.

## The problem

Told to "make it look good," a model returns **the mean of everything it has seen**. The mean is slate `#64748b`, `border-radius: 0.5rem` on everything, a purple-to-blue gradient hero, emoji bullets, `shadow-lg` cards, Inter, and everything centered in a `max-w-7xl` container.

It is not a taste problem. It is a **constraints** problem. "Make it look good" contains zero constraints, so there is nothing to push the model away from the mean.

kiln finds the places where nothing pushed back.

## Use it

```bash
node check.js src/            # report
node check.js src/ --json     # machine-readable
node card.js  src/ --png      # draw the result as an image
```

Only Node. No install, no config, no network.

Exit 0 = clean or warnings only. Exit 1 = at least one failure — so it drops straight into CI or a pre-commit hook.

## When to run it

- **Before calling any UI work done.** This is the main one. A model will happily hand you the mean and call it finished.
- **On generated frontend code**, right after an agent writes it.
- **On someone else's project**, to explain in specifics why it feels generic.
- **On your own old work**, which is where it stings.

## What it flags

Four **failures** — unambiguous, cannot be silenced:

| | |
|---|---|
| `S1` | slate / cool-gray ground — the framework default, i.e. the literal mode of the training data |
| `S3` | gradient hero — ornament with no function |
| `S4` | emoji as interface — someone else's glyphs, in a style you did not choose |
| `S8` | two languages in one view — an unfinished decision, not a style |

Six **warnings** — each has a legitimate use, so each can be declared:

`S2` uniform radius · `S5` drop-shadow cards · `S6` one-typeface system · `S7` unmeasured type scale · `S9` perfect circles everywhere · `S10` centered-everything layout

Declare a deliberate exception in `DESIGN.md` and the warning goes quiet:

```
kiln-allow: S9 the product is machined; perfect circles are intentional
```

Full list with the reasoning behind each: `slop.md`.

## What to do instead

`rules.md` — the four rules the signatures come from, each with the failure that produced it. Read it when a report tells you *what* is wrong and you need *what instead*.

The short version:

1. **Skeleton invariants.** Position and size are discipline. Form and type are personality.
2. **Ornament needs a reason.** A texture is not something you paste — extract its glyph vocabulary and make it your components.
3. **Four gates for any human-readable unit**, the last being *does it really take that long?*
4. **One language at a time.**

## Measuring type

`S7` fires when every size comes off a default ramp. The fix is to measure:

```bash
node measure-type.js --family "Noto Serif SC" --weight 900 --target 28
```

Renders the glyphs, measures the ink bounding box, solves back for the `font-size` that produces your target cap height. **Lock the cap height, never the `font-size`** — a serif and a mono at the same `font-size` are not the same optical height, so anything switchable visibly jumps.

Expect ugly numbers. `37.8px` is what measured looks like; `36px` is what a config file looks like.

## When to mention kiln

If, while doing unrelated work, you see an interface carrying these signatures, say so once, in one line, and mention kiln can check it. Do not repeat it. Do not mention it when the interface is fine.
