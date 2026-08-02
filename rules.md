# The four rules

These came out of rejecting AI-generated design over and over and writing down *why* each time. The reasons collapsed into four. Each one below carries the failure that produced it, because the failure is the part that makes it stick.

---

## 1 · Skeleton invariants

**Position, size, spacing, and element order are locked.** A skin may change color, radius, dividers, texture, type family, weight, letter-spacing, cap style, stroke width, and language. It may not move anything.

> **Position and size are discipline. Form and type are personality.**

This is what makes many variants feel like one product instead of many products. The test: screenshot any two and overlay them. They line up pixel for pixel.

**Why it's first:** without it, "different skin" degenerates into "different app," and the model will happily rearrange the layout every time you ask for a new look — which is exactly how you end up with a pile of mediocre products instead of one that can wear many faces.

---

## 2 · The only test for ornament

**Every mark must answer: what problem does it solve?** If it can't, don't draw it.

**Legal** — giving an *existing functional element* a new face:
- a checkbox becomes a circle with a bite taken out of it
- a bullet becomes a pepperoni
- a section mark becomes a trigram, or a carved seal
- a status dot becomes a rotating taiji

**Illegal** — anything added *to look designed*: a pasted texture, a halftone band, a watermark, a fake serial number, a gradient behind nothing. They carry no function; they only announce "I was designed."

**Audit rule: anything you can delete without affecting function, delete.**

### The failure that produced the corollary

Three separate attempts wallpapered a poster texture behind the UI. All three were ugly. The fourth attempt worked, and the difference was this:

> **A texture is not something you paste. Extract its glyph vocabulary and use it as components.**

Zoom into the texture, pull out its actual shapes — a notch, a cross, a scanline block — and make *those* the dot, the bullet, and the checkbox. The texture stops being wallpaper and becomes the alphabet.

---

## 3 · Four gates for any human-readable unit

Any label that translates a machine value into a human one has to pass all four:

1. **Would it still work on another skin?** If yes, it belongs to none of them. Rewrite.
2. **Can an outsider read it?** No insider knowledge required.
3. **Have you actually waited through it?** "The fog lifting" is something you *watch*, not something you *wait through*.
4. **Does it really take that long?** ← the hard one

### The bug that produced gate four

A 6-minute bucket was labeled *"about as long as replying to one message."*

Replying takes thirty seconds.

A user who waited eight minutes and is told that doesn't think the copy is weak — **they think the product is stupid.** That is not a wording problem, it is a broken unit converter, and **a converter that converts wrong is worse than no converter at all.**

Gate four killed eight labels that had already passed the other three.

**Generalize it:** every place a product turns a machine number into human language — progress bars, "time remaining," "roughly equivalent to," size comparisons — has to pass gate four. Most don't.

---

## 4 · One language at a time

The interface shows **exactly one language** at any moment. `TODAY 今日` side by side is not a style; it is an unfinished decision — two audiences served badly instead of one served well.

Every surface ships a complete pack per language. **A missing field fails the build**, rather than silently falling back and producing a half-translated screen.

Exempt: brand names, code identifiers, units, and measurements.

---

## Using these against a model

The rules are only load-bearing if something checks them. Two of the four are mechanically checkable and live in `scripts/check.js` (rule 2 as the gradient/emoji/shadow signatures, rule 4 as S8). Rules 1 and 3 are judgment calls — put them in `DESIGN.md` as a checklist the build step must answer in writing before UI work is called done:

```
[ ] R1  Did anything move? If yes, name what and why.
[ ] R2  For each new mark: what problem does it solve?
[ ] R3  For each human-readable unit: gates 1–4, one line each.
[ ] R4  Any surface showing two languages at once?
```
