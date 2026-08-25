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
- **Primitives** are shared once at `registry/primitives/` and themed by tokens.
  A button is a button everywhere. Twenty-four currently: alert, avatar, badge,
  button, card, checkbox, code, details, dialog, empty-state, input, link,
  progress, prose, radio, rule, select, slider, stat, status, switch, table,
  textarea, tooltip.

The gallery is the completeness test. It is built from primitives, so anything
it has to style itself is a gap in the registry. It is now down to one class of
its own, `.nx-frame`, which is genuinely specific to embedding previews.

The boundary is whether the language changes the **form** or only the **paint**.
A slider is a track and a thumb in every language, so it is a primitive. A
slider drawn over a distribution is a chart with a control on it, so it is
expressive.

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

**Agent-facing only. It is deliberately absent from the gallery UI.** Density
answers a question an agent has when generating code, which is whether this
component is built to be studied or scanned. A human browsing the grid can see
that in the thumbnail, so a filter for it was noise. It stays in the manifest, in
each component's `meta.json`, in `nodex search --density`, and in `DESIGN.md`.

Do not reintroduce it as a UI control.

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

- a primitive's markup only uses classes its own stylesheet defines
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

## The gallery re-themes rather than having a style

`apps/gallery` has no palette, type stack, or radius of its own. Every value
resolves through `--nx-*`, and swapping the active language's `tokens.css`
restyles the whole interface. That dogfoods the token system: a broken primitive
is immediately visible in the app's own chrome.

Consequence worth stating: the shell deliberately has **no independent dark
mode**. The theme is whatever the viewed language is. An app whose job is to
present a design language faithfully cannot impose a second one on top.

The line between what the app owns and what the language owns:

- **Craft** belongs to the app: layout composition, spacing rhythm, motion
  quality, interaction states, restraint.
- **Identity** belongs to the language: type, colour, stroke weight, radius.

GSAP is app-only and never enters registry content. A component that depended on
GSAP would force that dependency on everyone who copied it.

### Everything previews in an iframe, primitives at true size

Charts and primitives both render in frames pointed at generated preview
documents, so the two sections of a language page read the same way.

A primitive's preview takes its token layer from a `?lang=` query parameter
rather than baking one in. One generated file therefore serves every design
language, and a new language gets primitive previews for free.

Primitives render **fluid**, at the container's own width with no scaling.
Charts are authored for a full page and must be scaled down; a button is already
button-sized, and shrinking it to a quarter both makes it illegible and
misrepresents it.

### Previews must not depend on an observer firing

`IntersectionObserver` and `ResizeObserver` do not deliver in a tab that is never
painted, which covers background tabs and various headless and embedded
contexts. Gating the mount solely on them produces an empty gallery with no error
to explain it.

So `useNearViewport` carries a timeout fallback, and `Preview` reads its width
once synchronously before handing off to the observer. The iframes' native
`loading="lazy"` still defers the actual network work, so the deferral is not
lost.

### Preview height is measured from the wrapper, not the document

`documentElement.scrollHeight` can never report less than the frame's own height.
A component shorter than the embedder's initial guess would therefore lock at
that guess forever, which is exactly what happened to the short primitives. Both
preview templates measure the content wrapper plus body padding instead.

### Previews are scaled, not cropped

Components were authored for a full page, so dropping one into a 320px card shows
the top-left corner of a 1400px layout. `Preview` renders at a fixed logical
width and scales the frame, keeping composition and type proportion intact.

Height is not guessed from the chart's `viewBox`: a card's real height depends on
its title, notes, and caption, so the generated preview posts its measured
`scrollHeight` to the parent. In grids a fixed `boxHeight` is applied anyway, so
titles share a baseline. Content-driven heights leave every card a different size
and the grid reads as broken.

## One registry root, two kinds of address

The CLI addresses a registry by its **root**, never by its manifest, and
everything hangs off that root at a fixed shape: `r/registry.json` for the
manifest, `<item.files[].path>` for sources. The root may be a local directory or
an https base and no command knows the difference, which is what lets the
registry move to a CDN later without touching a single command.

One wrinkle, handled in `packages/cli/src/registry.ts`: a checkout does not match
the served layout exactly, because the manifest is written into `public/` so a
static host exposes it at `/r` while sources stay at the repo root. A single
prefix rule reconciles them.

Resolution precedence is flag, then `nodex.json`, then `NODEX_REGISTRY`, then the
nearest checkout. The `nodex.json` step matters: without it a project set up
against a remote registry would silently fall back to whatever local checkout
happened to be above the cwd and fetch a different version of a component.

## Two skills, two audiences

- `skills/nodex/SKILL.md` ships to consumers. Pick a language, init, search,
  add. It must never mention authoring, because a downstream agent working in
  someone else's app has no business scaffolding languages.
- `.agents/skills/nodex-authoring/SKILL.md` is repo-local and loaded on demand.
  It holds the whole authoring procedure, which is long and rarely needed, and
  so does not belong in the always-loaded `AGENTS.md`.

`AGENTS.md` explains why and what. The authoring skill explains how. Keep the
split, or they drift into each other.

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
- **Some primitives cannot exist in every language, and that is unresolved.**
  mono-editorial's anti-patterns forbid looping animation, so a spinner or a
  shimmer skeleton cannot exist in it. The progress primitive sidesteps this by
  showing an indeterminate state as a static dashed track rather than a moving
  stripe. If a language ever genuinely needs to decline a primitive, the
  mechanism would be a list in its `meta.json` and the gallery skipping it. Not
  built, because nothing has needed it yet.
- **Behaviour-heavy controls ship as visual treatment only.** A two-thumb range
  slider, tabs, menus, and combobox all need JavaScript, which breaks the
  presentational rule. The pattern is the one used for select: style what the
  platform provides, and document applying the classes to a headless Radix or
  Ark component.
- **The select's dropdown is styled progressively.** A native picker is drawn by
  the operating system, so only a handful of properties cross browsers. The
  primitive sets those, then layers full picker styling behind
  `@supports (appearance: base-select)` using `::picker(select)`,
  `::picker-icon`, and `::checkmark`. Browsers without the customizable select
  API keep the CSS-drawn chevron and a legible list. Do not collapse the two
  layers into one; removing the fallback silently regresses older browsers.
- **The tooltip escapes clipping with anchor positioning, layered.** An
  absolutely positioned label is cut off by any ancestor that clips, and cannot
  know when it is too near an edge to open upwards. Behind
  `@supports (position-try-fallbacks: flip-block)` it switches to `position:
  fixed` with `position-area` and flip fallbacks, so the browser both lifts it
  out of the clipping ancestor and flips it when it would overflow. `anchor-scope`
  confines the anchor name per trigger, or later tooltips would capture earlier
  labels. Browsers without the API keep the absolute version, which is correct
  whenever there is room. Nothing escapes an iframe, so a preview frame still
  bounds it.
- **A tooltip trigger must be focusable.** `.nx-tooltip` reveals on
  `:focus-within`, which can never match if the trigger is a bare `<span>`. Use a
  button or add `tabindex="0"`, or the tooltip is mouse-only. The CSS tooltip is
  also not announced by assistive technology at all, so where the text carries
  real information, use these visuals on a headless tooltip. The charts avoid the
  whole problem by using SVG `<title>`, which the browser announces natively.
- **A primitive may not borrow a class from a sibling primitive.** They are
  copied individually, so `nodex add select` referencing `.nx-field__label` from
  the input primitive hands the consumer markup with no styles for it. Duplicate
  the rules instead; identical definitions collapse harmlessly when both are
  installed, and the build lints for it.
- **Duplicated wrappers must stay byte-identical.** `.nx-field` lives in input,
  select, and textarea; `.nx-choice` in checkbox, radio, and switch. The
  duplication is deliberate, but the copies drift silently, and they already had:
  three different gap values between them when the lint was first written. The
  build now compares every selector defined by more than one primitive and fails
  on a mismatch. If a difference is genuinely wanted, rename the class rather
  than letting the copies diverge.
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
