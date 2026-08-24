# AGENTS.md

Architecture and reasoning for nodex. Read this before changing anything
structural. Procedures live elsewhere; this file explains *why*.

## The core idea

Conventional component libraries are `tokens × components`: one implementation,
many themes. That model assumes a design language only changes **paint** —
colour, radius, spacing, type. True for a button. False for a chart: a
one-mark-per-record hairline barcode cannot be re-skinned into a thick-bar
brutalist chart, because the language determined its **geometry**.

So nodex splits by tier:

- **Expressive** components (charts, and later heroes) are owned by a language.
  Their form *is* the language.
- **Primitives** (button, input, select, table, card, badge) are shared once at
  `registry/primitives/` and themed by tokens. A button is a button everywhere.

The split is invisible at the CLI. `nodex add button --design mono-editorial`
will give you a correctly styled button either way; the split exists so you
maintain one button instead of one per language.

## Storage is not organisation

Folders are shelves — a file sits on exactly one. The **manifest** is the card
catalogue: one entry per component recording language, type, tier, runtime,
density, and tags, so the same component is findable along any axis without
moving files.

This is why the gallery can group primitives under each design language even
though they are stored once, and why `nodex search --type bar --design X` is
answerable at all.

## Two names per component

Every component has a **slug** — the language's own word for it, `rung-bars` —
and a **type** from a fixed enum, `bar`. The slug is what you type; the type is
the cross-language join key that makes "your bar chart, please" answerable.

Governing rule for the enum: **a type names the mark and encoding, never the
animation or the data domain.** Without it, `bar-race`, `dynamic-data`, and
`draw-in-counter` become types instead of a bar and two lines carrying motion
tags. The enum lives in `packages/core/src/taxonomy.ts`.

## Components ship as fragments

The authored artifact is `component.html` / `.css` / `.js` — a fragment. The
standalone `index.html` is **generated** from it at build time and exists only
for previews. One source of truth; a consumer never receives a document with a
doctype and a `body` rule.

This forces two things the source did not do:

- **CSS is partitioned.** Page chrome (`body`, `.grid2`, `.pagehead`,
  `.card.wide`) is dropped; component rules are scoped by ancestor under
  `.nx-<slug>`; the global `*{margin:0;padding:0}` reset is discarded, because it
  would trash a consumer's layout.
- **JS is root-scoped.** Every mount point is `data-nx-mount="name"`, never an
  `id`, and `mount(root)` queries within its own subtree. This fixes the real ID
  collisions in the source (`#ch` appeared in three components, `#stream` in two)
  rather than relying on an iframe to hide them.

## Self-contained, deliberately duplicated

Expressive components inline their own helpers. There is no shared lib and no
imports between registry items.

In an application, duplicating twelve lines across 42 files would be a defect.
In a catalogue of reference implementations meant to be lifted one at a time, it
is the point — a consumer takes two or three charts, never all 42, and one file
is the whole component.

The cost is that no module can enforce the language contract. That job moved to
`scripts/build-registry.mjs`, which is a better place for it: the contract is
specified in prose in `DESIGN.md` and enforced mechanically by lints.

## Promote on second use

The guiding rule for anything shared. Leave a thing inside its language until a
second language needs it, then move it up. Primitives are the sole exception,
starting shared because a button is already known to be universal.

Applied twice already: an earlier design had a `lib/mono-svg.js` in the canonical
language folder on the evidence of one sample, and a general `axes: {...}` facet
map for one facet. Both were removed.

## Density is optional

`density` (`close-read` | `glance`) describes **how a component is read, not how
it is drawn.** Stroke weight is the design language's job; encoding it again here
would duplicate what tokens already carry. A four-segment donut is a glance read
however fine its strokes.

It is optional because the split is an artifact of how the first collection was
authored. A future language may have no such distinction and omits the field. A
language declares its legal values in `meta.json`; a component may only use a
declared value.

**The build must never infer density from a slug.** `matrix-heat-glance` and
`circular-graph-dense` carry density-sounding suffixes, but those are collision
disambiguation that happens to borrow the vocabulary — not an encoding.

## Two runtimes, never three

Raw SVG (42 components, zero dependencies) and ECharts 6 (22). Chart.js served
exactly 2 and was ported out.

The reason is maintenance ratio, not library quality: each runtime needs its own
token binding in `DESIGN.md` and its own lints, because a `0.8px` hairline is
`stroke-width` in SVG and `lineStyle.width` in ECharts. A permanent third binding
for 2 of 64 components is a bad trade. The ports live in `PORTED_BLOCKS` in the
extractor so re-running stays idempotent.

## Conformance lints

In `scripts/build-registry.mjs`. These replace what a shared module would have
enforced:

- anything that animates ships a `prefers-reduced-motion` guard
- stroke widths stay within `tokens.stroke.lineMax` unless the component declares
  `strokeAsArea`
- every colour is a member of the recorded ramp
- density values match the language's declaration
- slugs are unique and types are enum members

Two follow the same pattern — **record reality, then freeze it.** The palette
lint enforces membership of the 37 greys actually present rather than a palette
someone wished for, so it passes today and fails on any addition. Same for
`strokeAsArea`.

## Gotchas

- **`rnd` is a deterministic hash, not `Math.random()`.** Sample data must not
  change between page loads or previews and screenshots stop reproducing. Never
  replace it with `Math.random()`.
- **Charts draw on scroll into view and replay on click.** A chart that looks
  blank in a preview may simply not have been scrolled to. Click it.
- **The two choropleths fetch GeoJSON from third-party hosts at runtime** —
  including a `world.json` from `echarts@4.9.0` while the components run ECharts
  6. Declared in `meta.externalData` and surfaced by the build, but they break
  offline and cannot be smoke-tested. Vendoring the geo data is open work.
- **39 of 64 components had no `prefers-reduced-motion` guard in the source.**
  The extractor synthesises one. `basics` and `glance` never shipped one.
- **The palette is 37 greys, not a designed scale.** Several pairs differ by one
  or two values (`#D8D7D1` / `#D8D6CE`). Consolidating is open work; the ramp in
  `tokens.json` records what exists.
- **`packages/core` uses `.ts` import specifiers.** Node strips types natively;
  `.js` specifiers would not resolve against `.ts` files.
- **`tmp/` is deliberately tracked** through Phase 1 so the extractor's history
  is preserved, then deleted in its own commit. It is not gitignored yet.
- **jsdom timers hang the smoke test** if the window is not closed — several
  charts stream via `setInterval`.

## Technical debt

- Vendor the choropleth geo data; remove the runtime fetches.
- Consolidate the 37-step grey ramp.
- `component.js` hardcodes hex literals rather than reading custom properties,
  so a chart's marks do not follow a re-themed token layer. Acceptable while one
  language exists; revisit when a second arrives.
- The extractor leaves a few orphaned trailing comments where a `//` comment
  followed a statement on the same line.
