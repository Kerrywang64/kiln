# AI-slop signatures

What `check.js` looks for, and why each one is evidence of the mean rather than a decision.

A signature is only listed here if it is **mechanically detectable** and **almost always unchosen**. Anything that requires taste to judge belongs in `rules.md`, not here.

---

## S1 · The slate ground

**Detect:** Tailwind `slate-*` / `gray-*` / `zinc-*` / `neutral-*` used as page background or primary surface; or raw hex in the cool-gray band `#0f172a #1e293b #334155 #475569 #64748b #94a3b8 #cbd5e1 #e2e8f0 #f1f5f9 #f8fafc`.

**Why it's slop:** it is the default of the most-used CSS framework, so it is the literal mode of the training distribution. Nobody picked it; it was there.

**What to do instead:** pick a ground with a temperature. Warm paper, cool celadon, true black, kiln-dark. A neutral that has a hue is a decision; a neutral that has none is an absence.

---

## S2 · Uniform radius

**Detect:** the same `border-radius` value on ≥ 4 distinct rule sets, especially `0.5rem` / `8px` / `0.75rem` / `12px` / `rounded-lg` / `rounded-xl`.

**Why it's slop:** radius is one of the cheapest carriers of character, and making it uniform throws that away. Real systems vary radius by role — a card, a chip, and a checkbox are not the same object.

**Instead:** at most two radii, assigned by role, and state which role gets which. Or zero radius everywhere, which is also a decision.

---

## S3 · Gradient hero

**Detect:** `linear-gradient` / `radial-gradient` with ≥ 2 color stops applied to `body`, a hero section, or a full-width container; Tailwind `bg-gradient-to-*` with `from-`/`to-`; the purple→blue pair `#6366f1 #8b5cf6 #a855f7 #7c3aed #4f46e5`.

**Why it's slop:** a gradient background is ornament with no function. It fails rule 2 outright — delete it and nothing stops working.

**Instead:** if the surface needs depth, get it from material (a paper grain, a glaze band 3px tall, a single hairline). Depth from texture is cheap and specific; depth from gradient is expensive and generic.

---

## S4 · Emoji as interface

**Detect:** an emoji codepoint used as a list bullet, a section marker, a button icon, or a heading prefix in markup or JSX.

**Why it's slop:** emoji are someone else's glyphs. Every product that uses them looks like every other product that uses them, and they carry a vendor's drawing style you did not choose.

**Instead:** four glyphs of your own — dot, section mark, bullet, checkbox — pulled from the material in Q3. See `glyphs.md`.

---

## S5 · Drop-shadow cards

**Detect:** `shadow-lg` / `shadow-xl` / `shadow-2xl`, or `box-shadow` with blur ≥ 15px, on more than 2 rule sets.

**Why it's slop:** it is a 2016 material-design reflex. It says "this is a card" to a viewer who already knows it is a card.

**Instead:** separate surfaces with a line, a ground shift, or nothing. If you need elevation, one shadow, on one element, for a real reason (a floating panel over content).

---

## S6 · One-typeface systems

**Detect:** exactly one `font-family` stack in the whole project, and it is `Inter` / `system-ui` / `-apple-system` / `Roboto` / `Arial`.

**Why it's slop:** type is half the design. One neutral grotesque for everything is the same as not choosing.

**Instead:** at minimum a display face and a text face that are not siblings. The display face carries the personality; the text face stays out of the way.

---

## S7 · Unmeasured type scale

**Detect:** `font-size` values that are all multiples of 4 or all from `{12,14,16,18,20,24,30,36,48,60}` (the Tailwind default ramp).

**Why it's slop:** those numbers came from a config file, not from the design. And when the type family changes, they no longer produce the same optical size — a serif and a mono at `40px` differ in cap height by a lot, so anything switchable visibly jumps.

**Instead:** measure. `measure-type.js` renders the glyphs you actually care about, measures the ink bounding box, and solves back for the `font-size` that produces your target cap height. Lock the cap height. Expect ugly numbers like `37.3px` — ugly numbers are the sign it was measured.

---

## S8 · Mixed language in one view

**Detect:** CJK and Latin word characters adjacent in the same text node, excluding brand names, code identifiers, and units.

**Why it's slop:** `TODAY 今日` is not bilingual design, it is an unfinished decision — two audiences served badly instead of one served well.

**Instead:** ship complete packs per language and switch the whole surface at once. A missing field should fail the build.

---

## S9 · Perfect circles everywhere

**Detect:** `border-radius: 50%` on more than 2 rule sets.

**Why it's slop:** not always wrong — but a true circle is the default a machine reaches for. Hand-made and material-derived forms are almost never perfectly round.

**Instead:** if the material in Q3 is thrown, pinched, cut, or worn, use asymmetric radii (e.g. `52% 48% 50% 50% / 50% 52% 48% 50%`). If the material is machined, keep the circle and say so in `DESIGN.md`.

---

## S10 · Centered-everything layout

**Detect:** `mx-auto` combined with `max-w-*` on ≥ 3 top-level sections, plus `text-center` on headings.

**Why it's slop:** centering is what you do when you have not decided where the eye goes.

**Instead:** pick an edge. Asymmetry is a decision and reads as one.

---

## Severity

`check.js` reports **fail** for S1, S3, S4, S8 — these are unambiguous. It reports **warn** for the rest, because each has a legitimate use that `DESIGN.md` may declare. A declared exception in `DESIGN.md` silences a warning; nothing silences a fail.
