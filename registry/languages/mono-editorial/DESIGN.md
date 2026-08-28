# Mono Editorial

Hairline data drawing on warm paper. Every mark is thin, every caption is small,
and the page is mostly empty. Charts are drawn to be read, not glanced at.

This file is the written half of the design language. `tokens.json` holds the
values; this holds the reasoning values cannot carry.

## Visual atmosphere

- **Density** — airy. Generous margins, one idea per card, nothing crowded.
- **Variance** — restrained. A predictable grid; the interest lives in the marks.
- **Motion** — quiet. Marks draw themselves once on arrival, then hold still.

The reference feeling is a printed statistical annual, not a dashboard. If a
chart looks like it belongs in a control room, it is wrong for this language.

## Color calibration

Warm off-white paper and near-black ink. There is no accent color and no hue at
all — every value is a warm grey. Emphasis comes from weight, size, and density
of marks, never from color.

| Token | Value | Role |
| --- | --- | --- |
| `--nx-bg` / `--nx-paper` | `#F0EFEB` | page and card ground |
| `--nx-ink` / `--nx-dark` | `#1C1C1A` | text, primary marks, inverted card ground |
| `--nx-muted` | `#8F8E88` | subtitles, axis labels, secondary marks |
| `--nx-faint` | `#C6C5BF` | captions, the quietest rules |
| `--nx-grid` | `#DEDDD6` | gridlines, hairline separators |

Cards may invert to ink ground with paper text. On inverted cards, captions drop
to `#55554F` so they recede the same amount they do on paper.

**No chart in the collection currently inverts.** Seven did — `circular-graph`,
`circular-graph-dense`, `dot-cascade`, `force-graph`, `force-graph-dense`,
`petal-rose`, and `thread-triptych` — and were moved onto paper so a page of
them reads as one language rather than two. The affordance and its CSS stay,
because inversion is a legitimate choice for a single card that has to stand
apart; it is just not something to reach for while building a set.

Note that only four carried the `card dark` modifier. The other three set a dark
background on `.card` itself, so grepping for the modifier finds the wrong
answer; check the resolved background instead.

Inverting is not a background swap. Mark colour encodes rank, so the ramp has to
be reversed with it: on ink the brightest mark carries the most, on paper the
darkest does. A card whose ground flipped but whose marks did not will read with
its emphasis exactly backwards.

Chart marks are drawn in JavaScript with literal hex from the warm-grey ramp in
`tokens.json`. That is deliberate: SVG attributes are set imperatively, so there
is no `var()` to reference. The conformance lint therefore checks that literals
are **members of the ramp**, not that they use custom properties.

Run it yourself with `nodex lint`. It checks this project's components against
this language and reports what fails, so a claim of conformance can be verified
rather than asserted.

Known debt: 37 distinct greys appear across the collection. The ramp in
`tokens.json` records the load-bearing steps; consolidating the rest is a
cleanup task, not a redesign.

## Typographic architecture

Inter throughout, 400 to 800. Nothing else.

The scale is small and tight. Card titles are `16.5px/700` at `-0.02em`, which
is barely larger than body text — the hierarchy comes from weight and from the
uppercase tracking of the captions, not from size jumps. Captions run `9.5px`
uppercase at `0.08em`, small enough to read as a printed credit line.

No chart currently uses that caption size: it belonged to the `div.src` footer,
which was removed. The token stays because it is the language's vocabulary for
an annotation smaller than a legend, and a consumer captioning their own data
needs a size to reach for. Do not read its absence from the shipped charts as a
reason to delete it.

Negative tracking on headings, positive tracking on anything uppercase. Never
the reverse.

## Component behaviors

Every chart card follows the same three-part anatomy, in this order, always:

```
h2.title      what the chart says, as a sentence
div.sub       the reading instructions — units, span, what one mark means
[the chart]
```

The drawing is **left-aligned to the title, never centred**. Every SVG carries
`preserveAspectRatio="xMinYMid meet"` and no `margin: 0 auto`. A chart with a
`max-height` reaches its cap before it runs out of width, so in any container
wider than its aspect ratio needs there is slack — and the default `xMidYMid`
spends that slack centring the drawing away from the title and subtitle sitting
at the card's left edge. Left-aligned, a wall of these cards shares one starting
edge and reads as a set. Centred, each one floats at its own offset.

This aligns the SVG's own box. A chart that centres its composition *inside* its
viewBox — a donut, a network — still sits wherever it was drawn, because that is
a property of the drawing rather than of the box. Fix those by moving the marks
in the viewBox, not by re-centring the box.

The subtitle is not decoration. It tells the reader what one mark represents,
which is the only way a one-mark-per-record chart is legible. Write it as
instructions, not as a description.

There is deliberately **no footer credit line.** An earlier anatomy ended each
card with a `div.src` reading `CHART TYPE · LANGUAGE · DATA SOURCE`, and it was
removed for two reasons. It states facts the manifest already records, so it
went stale the moment a component was renamed or moved — 53 of 64 ended up
naming a design language that had never existed. And it is the only left-aligned
element under a chart that centres itself, so it read as misalignment on every
card wide enough to letterbox.

A caption naming the *data* rather than the component is a different thing and
still belongs, when a chart genuinely needs sourcing. Write it as a `div.note`.

Interactive marks carry an SVG `<title>` child so hovering yields a native
tooltip with no JavaScript. Prefer that over a custom tooltip layer.

## Layout principles

Two-column grid, `22px` gap, `40px` page padding, `24px` card radius. A card may
span both columns when its chart needs width — a 90-day barcode does, a donut
does not.

Wide cards may split into a `250px` text column beside the chart. Use that when
the chart genuinely needs prose to be read correctly, and put real reasoning
there rather than filler.

## Motion philosophy

One rule: **marks draw themselves when they scroll into view, and clicking
replays.** Nothing animates on a loop, nothing animates on hover except the
native tooltip.

Implemented as an IntersectionObserver at `0.3` threshold that disconnects after
firing once, plus a click handler that clears and redraws. Three keyframes are
available — `draw` for stroke-dashoffset reveals, `pop` for marks scaling in,
`fade` for labels — and stagger delays are computed per index so a field of
marks arrives as a wave rather than all at once.

Every animated component must ship a `prefers-reduced-motion: reduce` block that
disables the animations and resets `stroke-dashoffset` to `0`. This is not
optional, and `nodex lint` checks for it.

## Runtime token bindings

The same rule is spelled differently per runtime. A `0.8px` hairline is:

- **Raw SVG** — `stroke-width="0.8"`
- **ECharts** — `lineStyle: { width: 0.8 }`, or `itemStyle.borderWidth`

Only these two runtimes exist in this language. Do not introduce a third.

## Anti-patterns

- **Never** exceed `1.4px` on a stroke that reads as a *line* — axes, rules,
  connectors, series lines, stems, leaders. Hairlines are the language; a 2px
  line reads as a different product.
  The exception, and it is a real one: where the stroke **is** the area rather
  than an outline, its width encodes magnitude and may be as thick as the data
  demands. Sankey flows, streamgraph ribbons, violin bodies, box plots, and
  histogram bands all legitimately draw at 2px and above. The test is whether
  thinning the stroke would lose information. If it would only make the chart
  more delicate, thin it.
- **Never** introduce a hue. No blue, no accent, no semantic red or green.
- **Never** aggregate in `close-read` mode. One mark per record, always — if
  there are 90 days, draw 90 marks.
- **Never** fill a large area where a hairline will carry the same information.
- **Never** use a drop shadow, a gradient, or a border-radius above `24px`.
- **Never** reorder or drop the card anatomy. A chart without a `.sub` is not
  readable in this language.
- **Never** animate on a loop or on hover.
- **Never** use `Math.random()` for sample data. Use a deterministic hash so
  previews and screenshots reproduce exactly.
