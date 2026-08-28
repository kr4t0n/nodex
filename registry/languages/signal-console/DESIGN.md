# Signal Console

Dense instrumentation on a dark ground. Everything is monospace, everything sits
on a grid, and colour means something. Charts are read at a glance, from across a
room, by someone who is watching several at once.

This file is the written half of the design language. `tokens.json` holds the
values; this holds the reasoning values cannot carry.

## Visual atmosphere

- **Density** — packed. Small padding, tight gaps, many things visible at once.
- **Variance** — rigid. A character grid, not a composition. Interest comes from
  what the data is doing, not from the layout.
- **Motion** — live. Marks arrive fast, and anything representing current state
  keeps moving.

The reference feeling is a trading terminal or an operations wall, not a report.
If a chart looks like it belongs in a printed annual, it is wrong for this
language.

## Color calibration

Cool near-black ground, cool off-white ink, and **hue that carries meaning**.

| Token | Value | Role |
| --- | --- | --- |
| `--nx-bg` | `#0B0E13` | page ground |
| `--nx-surface` | `#12161D` | raised panel, card ground |
| `--nx-ink` | `#D7DEE8` | primary text and marks |
| `--nx-muted` | `#8A94A3` | subtitles, axis labels |
| `--nx-faint` | `#5A6472` | captions, the quietest rules |
| `--nx-grid` | `#1E242E` | gridlines, hairline separators |
| `--nx-accent` | `#4DD4A8` | the measured series, and `ok` |
| `--nx-warn` | `#E3B341` | degraded |
| `--nx-crit` | `#F0616D` | failing |

The ramp is **three ladders, not one**: neutrals for structure, an accent ladder
for magnitude, and the status pair for state. A chart picks one ladder for its
marks and leaves the rest neutral. Encoding magnitude in green while also using
green for health makes a tall green bar ambiguous between "a lot" and "fine",
which is the specific failure this rule exists to prevent.

Status colour is never decorative. If nothing is degraded, nothing on the page
is amber. A dashboard where amber is a brand colour has no way left to say
"look here".

Chart marks are drawn in JavaScript with literal hex from the ramp, so there is
no `var()` to reference and the conformance lint checks **membership of the
ramp** instead. Unlike mono-editorial's, this ramp was authored rather than
recorded, so it is a real scale and additions should be argued for rather than
absorbed.

## Typographic architecture

One face, monospace, 400 to 700. `--nx-font-sans` deliberately resolves to the
same stack: every primitive references it, so pointing it at a monospace face is
what makes the shared components read as console rather than as mono-editorial
wearing dark paint.

Tracking is **zero or positive, never negative**. Monospace is already evenly
spaced; tightening it reads as a rendering fault. This is a direct inversion of
mono-editorial's heading rule, and the two languages are a useful proof that
tracking belongs to the language rather than to good taste in general.

Numerals are the point. Anything numeric is tabular by default, so a column of
figures aligns on the digit and a value changing in place does not reflow the
row beside it.

## Component behaviors

Every card follows the same anatomy, in this order, always:

```
div.head    label on the left, current value on the right, one line
[the chart]
div.foot    SOURCE · WINDOW · UPDATED, uppercase
```

The head carries **the current value**, large and tabular, because the first
question asked of a live chart is "what is it now" and the second is "what has
it been doing". mono-editorial puts a sentence and reading instructions at the
top instead; that is the right call for a chart being studied and the wrong one
for a chart being scanned.

The foot is a status line, not a caption. Keep it uppercase, keep it three
segments, and keep `UPDATED` honest: a stale timestamp is information.

Interactive marks carry an SVG `<title>` so hovering yields a native tooltip
with no JavaScript. Prefer that over a custom tooltip layer.

## Layout principles

A twelve-column grid, `10px` gap, `20px` page padding, `3px` radius. Cards are
sized in whole columns and snap to a shared row height so a wall of them reads
as one instrument rather than as a collage.

Charts are drawn to fill their card. There is no generous margin: whitespace in
this language means "nothing is happening here", so it should be scarce and
truthful.

## Motion philosophy

Two rules, and the second is the one that separates this language from
mono-editorial:

1. **Marks arrive fast.** `0.35s`, ease-out, no stagger long enough to notice.
   A console that animates in slowly is lying about how fresh its data is.
2. **Anything representing current state keeps moving.** Live indicators,
   streaming series, and pending states loop. A live dot that has stopped
   pulsing is indistinguishable from a dead one, which is exactly the failure a
   status display must not have.

Looping is therefore permitted here and forbidden in mono-editorial. That is not
an inconsistency between the two languages; it is the clearest evidence that
motion is part of a design language rather than a global preference.

Every animated component must ship a `prefers-reduced-motion: reduce` block that
stops loops and resolves to the final state. This is not optional, and
`nodex lint` checks for it. A looping language has more to answer for here, not less.

## Runtime token bindings

The same rule is spelled differently per runtime. A `2px` mark stroke is:

- **Raw SVG** — `stroke-width="2"`
- **ECharts** — `lineStyle: { width: 2 }`, or `itemStyle.borderWidth`

Only these two runtimes exist. Do not introduce a third.

## Anti-patterns

- **Never** use hue for anything but meaning. Accent encodes the measured
  series, the status triad encodes state. A category coloured for variety, a
  gradient for depth, or a second accent for balance are all wrong. Categories
  are separated with the neutral ladder or with position, never with hue.
- **Never** put a mark below `1px`. A hairline is mono-editorial's signature and
  is unreadable here; anything thinner than the `1px` floor is a rendering
  accident rather than a choice. Structural rules may be `1px`; data marks read
  at `2px` and above.
- **Never** apply negative tracking. Monospace is evenly spaced by design.
- **Never** draw one mark per record past roughly fifty. This language
  aggregates: bucket, bin, or take the extremes. mono-editorial's ninety-day
  barcode is correct there and wrong here, and a chart that needs every record
  belongs in that language instead.
- **Never** use a radius above `3px`, a drop shadow, or a gradient. Depth is
  carried by `--nx-surface` against `--nx-bg`, and by nothing else.
- **Never** leave generous whitespace inside a card. Empty space here reads as
  missing data.
- **Never** loop an animation that does not represent live state. Motion means
  "this is current". A decorative shimmer spends the one signal the language has.
- **Never** reorder or drop the card anatomy. A chart with no current value in
  its head cannot be scanned, which is the only way charts here are read.
- **Never** use `Math.random()` for sample data. Use a deterministic hash so
  previews and screenshots reproduce exactly.
