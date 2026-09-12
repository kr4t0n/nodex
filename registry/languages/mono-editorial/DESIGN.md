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
| `--nx-markMuted` | `#6A6963` | middle-value matrix cells and product labels |
| `--nx-markQuiet` | `#B0AFA9` | low-value matrix cells and descending spend bars |
| `--nx-plotGrid` | `#E3E2DB` | bowed matrix guides |
| `--nx-plotFaint` | `#D8D6CE` | measured zeroes in the matrix |
| `--nx-plotFloor` | `#CFCEC7` | the line chart's barcode floor |

The chart roles name paints already used by the retained specimens. Their tone
relationships are preserved when moving paint into tokens.

Cards may invert to ink ground with paper text. On inverted cards,
`--nx-onDarkMuted` is `#8F8E88` and `--nx-onDarkFaint` is `#55554F`. The current
chart specimens stay on paper. Inversion remains a choice for a card that needs
to stand apart, not something to reach for while building a set.

Inverting is not a background swap. Mark colour encodes rank, so the ramp has to
be reversed with it: on ink the brightest mark carries the most, on paper the
darkest does. A card whose ground flipped but whose marks did not will read with
its emphasis exactly backwards.

Chart paint references semantic CSS variables directly. `tokens.json` is the
authority; the build generates its stylesheet. Do not copy literal colors into
the component or maintain a second JavaScript palette. Direct references also
let a consumer override tokens on a containing element without a root alias
retaining the old value.

## Typographic architecture

Inter throughout, 400 to 800. Nothing else.

The scale is small and tight. Card titles are `16.5px/700` at `-0.02em`, which
is barely larger than body text — the hierarchy comes from weight and from the
uppercase tracking of the captions, not from size jumps. Captions run `9.5px`
uppercase at `0.08em`, small enough to read as a printed credit line. The axis
token remains `8px`; individual annotations retain their existing proportions.

Negative tracking on headings, positive tracking on anything uppercase. Never
the reverse. The generated token stylesheet bundles the configured Inter face
for previews and copied components.

Shared primitives consume these roles directly: Card and Dialog titles follow
`cardTitle`, Card padding follows `space.cardPadding`, and captions follow
`caption`. Control, action, prose and stat roles preserve the existing primitive
scale. Their spacing and interaction timing are tokenized too; control feedback
uses `motion.control`, independently of chart `motion.draw`. Scoped overrides
apply to the rendered primitives without changing their native behavior.

## Component behaviors

**A chart is the drawing and nothing else.** The card holds the marks; whatever
names the chart is printed by whatever embeds it. The title and type live in the
manifest, where the consumer, CLI and gallery all read them. A component does
not repeat that heading or add a source footer to a Mono Editorial drawing.

The drawing is **left-aligned, never centred**. When a drawing reaches its size
limit, unused space belongs after it. A wall of cards shares one starting edge
and reads as a set; each drawing should not float at its own offset. Preserve
the composition inside the chart as well as the alignment of its outer box.

**Annotation is not a heading, and still belongs.** A note explains the marks
and sits in the composition; a title names the component and belongs to whatever
is listing it. Keep each specimen's existing annotation rather than adding
explanatory sections around it.

Hairline line places one dot per supplied day above a barcode floor. The stems
keep the spacing between days visible, hollow dots indicate weekends, and the
two highest observations carry sparse, rounded labels. Its annotation remains
`ONE DOT = ONE DAY · HOLLOW = WEEKEND`.

Arc matrix places product rows on shallow bowed guides, with city labels angled
along the top. Cell area encodes accounts; tone reinforces the same count with
fixed thresholds at 12 and 25. A measured zero is a pinprick, not a missing
observation. The largest cells carry their values without labelling the whole
matrix. Preserve the existing 27-unit column spacing, 29-unit row spacing and
16-unit bow when mapping that composition through the chart's scales.

Dual area aligns descending ad-spend bars above a rising sign-up area across
the same ordered days. Spend uses thousands of dollars; sign-ups are counts.
Its two scales start at zero, with the spend direction reversed. Preserve the
55% band-width bars, the open gap between plots and the original 580/320 plot
proportions. The ink area fades from 22% opacity to transparent toward zero;
this retained data encoding is an exception to the ban on decorative gradients.
Aligned pointers inspect both measures with one combined tooltip. Missing
measures keep their calendar position; they are not zeroes or interpolated data.

Recharts supplies the scales, series and tooltip navigation. Matrix guides and
custom cells live inside that composition. Hover exposes the observation, and
the library's accessibility layer supports keyboard inspection. These are
interactive library tooltips, not native SVG title popups. Chart data comes from
the caller; absent or invalid data must not produce invented observations.

## Layout principles

Two-column grid, `22px` gap, `40px` page padding, `24px` card radius. A card may
span both columns when its chart needs width — a long barcode does, a donut
does not.

Wide cards may split into a `250px` text column beside the chart. Use that when
the chart genuinely needs prose to be read correctly, and put real reasoning
there rather than filler. The retained specimens keep their authored aspect
ratios; a consumer can constrain width or height through the component API.

## Motion philosophy

Marks arrive quietly, then hold still. Nothing animates on a loop or decoratively
on hover. The gallery defers previews until they approach the viewport. The
retained React charts do not replay on click.

Entry and data transitions use the language's motion tokens. The shared motion
helper reads scoped timing for Recharts; there is no separate JavaScript theme.
Reduced motion disables transitions, including when the preference changes
after mounting. Initial server and client markup remains stable, with animation
disabled until the preference and timing are known. Consumers may also disable
animation explicitly. CSS animations must retain a reduced-motion guard.

## React delivery and validation

Each chart is a typed React component. Its data and prop types and private
layout calculations normally live together; deterministic sample records live
in a separate example. Delivered components require application data and never
default to the example's fixtures.

Metadata declares the entry, exports, copied files and pinned dependencies. The
CLI copies the component and its reachable local helpers; consumers own that
source. Recharts is the default chart library, including simple charts. Custom
marks compose with its scales and series rather than introducing another chart
renderer or an adapter that hides its React API.

The build leaves authored source untouched. It renders the real example in a
browser, captures the static preview and bundles that same example for
interaction. This does not give consumer charts server-rendered SVG. Validation
checks both source token references and resolved browser paint, strokes and
scoped overrides.

## Anti-patterns

- **Never** exceed `1.4px` on a stroke that reads as a *line* — axes, rules,
  connectors, series lines, stems, leaders. Hairlines are the language; a 2px
  line reads as a different product. The exception is where the stroke **is**
  the area rather than an outline: its width encodes magnitude. The test is
  whether thinning the stroke would lose information. If it would only make
  the chart more delicate, thin it. Declare the exception in metadata.
- **Never** introduce a hue. No blue, no accent, no semantic red or green.
- **Never** aggregate in `close-read` mode. One mark per record, always.
- **Never** fill a large area where a hairline will carry the same information.
- **Never** use a drop shadow, a decorative gradient, or a border-radius above
  `24px`. Dual area's retained ink-to-transparent fill belongs to its data marks.
- **Never** add a repeated heading or unrelated controls around a drawing.
- **Never** animate on a loop or decoratively on hover.
- **Never** use `Math.random()` for sample data. Keep examples deterministic so
  previews and screenshots reproduce exactly.
- **Never** duplicate token values in chart code or generate application data
  inside a delivered component.
