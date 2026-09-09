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
- **Motion** — live. Marks arrive fast; motion that continues represents live
  state, not decoration.

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
| `--nx-muted` | `#8A94A3` | subtitles, route labels |
| `--nx-faint` | `#5A6472` | axis values, captions, the quietest rules |
| `--nx-grid` | `#1E242E` | gridlines, hairline separators |
| `--nx-accent` / `--nx-ok` | `#4DD4A8` | the measured series or healthy status |
| `--nx-withinObjective` | `#2FA37C` | endpoint bars within the objective |
| `--nx-warn` | `#E3B341` | degraded status or the endpoint objective guide |
| `--nx-crit` | `#F0616D` | failing status, endpoint bars over the objective |

The ramp is **three ladders, not one**: neutrals for structure, an accent ladder
for magnitude, and the status pair for state. A chart picks an encoding for its
marks and leaves the rest neutral. Encoding magnitude in green while also using
green for health makes a tall green bar ambiguous between "a lot" and "fine",
which is the specific failure this rule exists to prevent.

Status colour is never decorative. Endpoint latency uses length for latency,
green for within objective and red for a breach. Its amber dashed line identifies
the SLO; the line's form distinguishes the objective from an observed bar.
`--nx-withinObjective` names the specimen's existing green rather than replacing
it with the brighter accent token.

Chart paint references semantic CSS variables directly. `tokens.json` is the
authority and the build generates its stylesheet. Do not copy literal colors
into the chart or maintain a second JavaScript palette. Direct references also
respect token overrides on a containing element. Palette additions must have a
role in the language rather than merely silencing a conformance check.

## Typographic architecture

One face, monospace, 400 to 700 in the chart scale. `--nx-font-sans` deliberately resolves to the
same stack: every primitive references it, so pointing it at a monospace face is
what makes the shared components read as console rather than as mono-editorial
wearing dark paint.

Tracking in the chart and Card-title scale is **zero or positive**. Monospace is already evenly
spaced; tightening it reads as a rendering fault. This is a direct inversion of
mono-editorial's heading rule, and the two languages are a useful proof that
tracking belongs to the language rather than to good taste in general.

Numerals are the point. Anything numeric is tabular by default, so a column of
figures aligns on the digit and a value changing in place does not reflow the
row beside it. The axis token remains `9px`. The generated token stylesheet
bundles the configured JetBrains Mono face for previews and copied components.

Shared Card and Dialog titles now consume the existing `12px/600` Card-title
role at `0.02em`; Card padding consumes `14px 16px 12px`, and captions consume
`9px` at `0.1em`. Other newly tokenized roles retain the preserved primitive
values, including Prose's `800` title weight and the tight Prose/Stat tracking.
Those are retained shared-primitive exceptions to the chart scale, not new chart
defaults. Control spacing and interaction motion are independently customizable;
`motion.control` governs control feedback while `motion.draw` governs chart entry.

## Component behaviors

Every card follows the same anatomy, in this order: a one-line header with its
label on the left and current value on the right, the chart, then an uppercase
status line carrying source, window and update information.

The head carries **the current value**, large and tabular, because the first
question asked of a live chart is "what is it now" and the second is "what has
it been doing". Endpoint latency retains `ENDPOINT LATENCY` on the left and
`N OF N OVER SLO` on the right. Its bars rank routes from slowest to fastest;
each bar carries the latency value, and the SLO guide is labelled in
milliseconds above the plot.

The foot is a status line, not a caption. Keep it uppercase, keep the three
segments, and keep the update information honest: a stale timestamp is
information. Source, window and update text are supplied by the caller. The
example owns its specimen labels; the reusable component does not invent a
source, reporting window or claim that it was updated now.

Recharts provides bars, axes, reference lines and tooltip navigation. The
endpoint tooltip retains the route and p99 latency. Pointer and keyboard
inspection use the library's accessibility layer rather than native SVG title
popups. Data is supplied by the caller, with unavailable numeric values handled
without fabricating observations.

## Layout principles

A twelve-column grid, `10px` gap, `20px` page padding, `3px` radius. Cards are
sized in whole columns and snap to a shared row height so a wall of them reads
as one instrument rather than as a collage.

Charts are drawn to fill their card. There is no generous margin: whitespace in
this language means "nothing is happening here", so it should be scarce and
truthful. Endpoint latency retains its authored aspect ratio; a consumer can
constrain width or height through the component API.

## Motion philosophy

Two rules, and the second is the one that separates this language from
mono-editorial:

1. **Marks arrive fast.** `0.35s`, ease-out, no stagger long enough to notice.
   A console that animates in slowly is lying about how fresh its data is.
2. **Motion that continues represents live state.** Live indicators, streaming
   series and pending states may loop. An unchanging snapshot does not establish
   that a source is live.

Looping is therefore permitted here and forbidden in mono-editorial. That is not
an inconsistency between the two languages; motion is part of the design
language rather than a global preference. Endpoint latency animates entry and
data transitions and does not add a loop.

The shared motion helper reads scoped timing for Recharts. Reduced motion stops
transitions, including when the preference changes after mounting. Initial
server and client markup remains stable, with animation disabled until the
preference and timing are known. Consumers may also disable animation
explicitly. CSS animations must retain a reduced-motion guard that stops loops
and resolves to the final state.

## React delivery and validation

Each chart is a typed React component. Data and prop types and private layout
calculations normally live together; deterministic sample records live in a
separate example. Application data is required and production components never
fall back to the example's fixtures.

Metadata declares the entry, exports, copied files and pinned dependencies. The
CLI copies the component and its reachable local helpers; consumers own that
source. Recharts is the default chart library, including simple charts. A
specialist library needs a demonstrated gap; do not introduce a generic adapter
that hides the chosen library's React composition.

The build leaves authored source untouched. It renders the real example in a
browser, captures a static preview and bundles that same example for
interaction. This does not give consumer charts server-rendered SVG. Validation
checks both source token references and resolved browser paint, strokes and
scoped overrides.

## Anti-patterns

- **Never** use hue for anything but meaning. A category coloured for variety,
  a gradient for depth, or a second accent for balance are all wrong. Categories
  are separated with the neutral ladder or with position, never with hue.
- **Never** put a mark below `1px`. A hairline is mono-editorial's signature and
  is unreadable here; anything thinner than the `1px` floor is a rendering
  accident rather than a choice. Structural rules may be `1px`; data marks read
  at `2px` and above.
- **Never** apply negative tracking. Monospace is evenly spaced by design.
- **Never** draw one mark per record past roughly fifty. This language
  aggregates: bucket, bin, or take the extremes. A chart that needs every record
  belongs in a language designed for close reading.
- **Never** use a chart-container radius above `3px`, a drop shadow, or a gradient. Depth is
  carried by `--nx-surface` against `--nx-bg`, and by nothing else.
- **Never** leave generous whitespace inside a card. Empty space here reads as
  missing data.
- **Never** loop an animation that does not represent live state. A decorative
  shimmer spends the signal the language uses for current state.
- **Never** reorder or drop the card anatomy. A chart with no current value in
  its head cannot be scanned, which is the way charts here are read.
- **Never** use `Math.random()` for sample data. Keep examples deterministic so
  previews and screenshots reproduce exactly.
- **Never** duplicate token values in chart code or invent production data and
  status metadata.
