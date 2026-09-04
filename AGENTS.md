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

The web app is the completeness test. It is built from primitives, so anything
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

This is why the app can group primitives under each design language even
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

The authored artifact is a **fragment**, never a document. The standalone
`index.html` is generated from it at build time and exists only for previews.
One source of truth; a consumer never receives a doctype and a `body` rule.

There is one spelling of that fragment: **`component.tsx` + `component.css`**.
A React module, so its markup is in the module and there is no markup file.

It used to be two. The 64 imported charts were `component.html` + `.css` +
`.js` with a `mount(root)`, and this file argued at length that they should
stay that way — they were a corpus of drawing techniques, and reshaping them
toward a form they were never cut for was what had produced the dead blocks and
duplicated preludes described below. All 64 have since been rewritten as React
components on ECharts, and that argument turned out to be wrong in one specific
way worth recording: it defended the *artifacts* when what was worth keeping
was the *readings*. Each rewrite kept what its chart says — the sag in
`arc-matrix`'s rows, the ink that accumulates in `radial-patchwork`, the
wobbling rims in `bubble-almanac` — and none of it depended on the original
drawing code.

What the collapse bought is that the conformance lints now read every chart's
rendered output rather than parsing its source, which is what closed the holes
described under the lints below.

The primitives moved because the artifact a consumer wanted was never valid in
the place they were taking it. Every one is copied into a React project, and
`class` and `for` are type errors in JSX — so every primitive had to be
hand-translated on arrival, and a translation done twenty-four times is
twenty-four chances to get it wrong.

They stayed **presentational** through the move, which is the important half.
A primitive exports a specimen sheet — `ButtonSpecimens` draws all five
variants — and not a `<Button variant="solid" />`. The artifact is still the
stylesheet, and the module is still just a record of which classes produce which
result, so applying those classes to a headless Radix or Ark component is
unchanged. Wrapping them in a props API would have taken that away: a consumer
on Radix would have to unwrap a component to reach the thing they came for.

The port was verified rather than eyeballed. Each file was rendered back to
static markup and compared to the HTML it replaced, and 23 of 24 were identical.
That check earned its keep — it caught the indent pass writing six spaces into
the `pre` and `textarea` blocks, a CSS custom property being camel-cased into
`-NxSliderSteps` and silently applying nothing, and JSX eating the space in
`Read the <a>field ratio</a>` so the words ran together.

The one file that is deliberately not identical is `checkbox`, which used to
carry a `<script>` and a document-level id to set `indeterminate`. That is a
ref now, which reaches the element without naming it. See the gotcha below for
why the stylesheet also matches an attribute.

The fragment rule forces two things the source did not do:

- **CSS is partitioned.** Page chrome (`body`, `.grid2`, `.pagehead`,
  `.card.wide`) is dropped; component rules are scoped by ancestor under
  `.nx-<slug>`; the global `*{margin:0;padding:0}` reset is discarded, because it
  would trash a consumer's layout.
- **JS is root-scoped.** Every mount point is `data-nx-mount="name"`, never an
  `id`, and `mount(root)` queries within its own subtree. This fixes the real ID
  collisions in the source (`#ch` appeared in three components, `#stream` in two)
  rather than relying on an iframe to hide them. A React component gets this for
  free, having no document-level names at all.

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

**Agent-facing only. It is deliberately absent from the app's UI.** Density
answers a question an agent has when generating code, which is whether this
component is built to be studied or scanned. A human browsing the grid can see
that in the thumbnail, so a filter for it was noise. It stays in the manifest, in
each component's `meta.json`, in `nodex search --density`, and in `DESIGN.md`.

Do not reintroduce it as a UI control.

**The build must never infer density from a slug.** `matrix-heat-glance` and
`circular-graph-dense` carry density-sounding suffixes, but those are collision
disambiguation that happens to borrow the vocabulary — not an encoding.

## One runtime for charts, one for primitives

ECharts 6 draws all 65 expressive components; the 24 primitives are `css` and
draw themselves. Chart.js served 2 and was ported out; hand-rolled SVG served
42 and was ported out after it.

The reason was always maintenance ratio rather than library quality. Each
runtime needs its own token binding in `DESIGN.md` and its own lints, because a
`0.8px` hairline is `stroke-width` in SVG and `lineStyle.width` in ECharts —
and the SVG binding is what carried the expensive bugs. It was the branch that
could not see `isHero?2:.65`, and the branch that had to guess at
`.6+rnd(i+3,j+11)*.9`. Both classes of failure are gone with it: a rendered
chart states its widths as literals.

**This is not licence to add a runtime back.** The argument that removed two of
them applies unchanged to a third, and it is now stronger, because a second
binding would also mean a second answer to how the lint reads a mark.

## Conformance lints

The checks live in `packages/cli/src/lint.ts` and are imported by both
`scripts/build-registry.mjs` and `nodex lint`, so the registry and a consumer's
project are held to the same rules **by the same code**. That is not tidiness.
They were two implementations, and only the registry had one:

- `DESIGN.md` ships to consumers via `nodex init` saying "the conformance lint
  checks that literals are members of the ramp" and "this is not optional and CI
  checks for it". Both were true of this repository and of nowhere the reader
  could reach. Describing enforcement a reader cannot run is worse than
  describing none, because it invites them to assume something is checking.
- The registry's own copy had a hole. It read widths with
  `/'stroke-width'\s*:\s*([0-9.]+)/`, which needs a digit straight after the
  colon, so it could not see `isHero?2:.65` — and **five components shipped a
  2px mark under a 1.4px ceiling**: `beeswarm`, `calendar-heat`, `matrix-heat`,
  `parallel-coords`, `ridgeline`. A consumer reported it, having written their
  own checker because ours was not reachable. `bubble-almanac` was separately
  over, computing up to 1.499px.

Two rules the stroke reader follows, both learned from that:

- **Read both branches of a ternary**, since that is how a width is normally
  written when a series is emphasised.
- **Report what cannot be decided rather than guessing.**
  `.6+rnd(i+3,j+11)*.9` contains `3` and `11` as function arguments, so
  "largest number wins" would call it an 11px stroke. Unverifiable widths are a
  warning, and warnings do not fail: a lint that blocks on a judgement call gets
  switched off.

`lint.ts` imports nothing, which is what keeps the published CLI at zero
dependencies while the build script shares its logic.

**A hairline is `stroke-width` in SVG and `lineStyle.width` in ECharts**, and
the first version read only the former. That left all 22 ECharts components
unexamined, five of them drawing lines up to 2.6px: `circular-graph-dense`,
`diverging-bar`, `draw-in-counter`, `dual-area`, `dynamic-data`. Any new
runtime needs its own spelling added here, which is a standing argument against
a third one.

`itemStyle.borderWidth` is deliberately **not** checked. Almost every use of it
in the registry is a knockout gap — a border painted in the page colour to
separate adjacent segments — which reads as absence rather than as a line, so
checking it would report mostly false positives. The one genuine ink border it
would have caught, in `nested-treemap`, was fixed by hand. That is a known hole:
an ink-coloured border above `lineMax` will not be caught.

That hole is now much smaller everywhere, because every chart is TSX and the
lint reads rendered SVG rather than source — but reading rendered output
introduced a different one, and it had to be closed. **A stroke width in rendered SVG is in
the element's own coordinates, not the reader's.** ECharts draws a scatter
symbol in a unit space and scales it, so a 1.4px ring on an 11px dot is written
`stroke-width="0.254"` beside `matrix(5.5,0,0,5.5,…)`. The reader measured the
unit-space number, which understates every symbol border by the symbol's size —
so the hole widened with the mark, and a 3px border on that dot passed as
0.545px. `paintedMarks` now multiplies by the square root of the transform's
area factor before linting, and a deliberately over-wide border does fail.

Found by rendering `trend-lineage`, whose hollow "reworked" dots sit exactly on
the ceiling and were reported at a fifth of it. Worth restating as a general
rule for anything else read out of rendered output: **an attribute is measured
in whatever space its element was drawn in**, and a transform on that element
means the number is not the one on the card.

`strokeAsArea` is for a stroke whose **width carries data**. Five components
declare it — `circular-graph`, `circular-graph-dense`, `force-graph`,
`force-graph-dense`, `thread-triptych` — because link width encodes edge weight
or route volume, and thinning those would destroy information rather than
restyle it. It is not a way to silence the lint, and a component that merely
draws a thick line does not qualify.

It was fourteen until the port finished. The other nine were declared during the
original extraction and were **stale**: rewriting those charts on ECharts moved
their thick marks from strokes to fills — a sankey link and a violin body are
areas there — so the declaration no longer suppressed anything, and each one was
a lint permanently disarmed on that component. The nine were found by stripping
every declaration and rebuilding to see who actually still failed, which is the
check to re-run after any change to how a chart draws. **A `strokeAsArea` that
is not currently doing work should be deleted**, because nothing else will
notice when it starts hiding something real.

### The registry-only lints

`scripts/check-shell-primitives.mjs` guards one thing outside the registry: the
app links a **curated** set of primitive stylesheets in `app/layout.tsx`, not all
twenty-four, because they are render-blocking and the landing page needs almost
none of them. Loading a stylesheet for a class nothing renders themes nothing,
since re-theming happens through the `--nx-*` variables rather than through the
presence of a file.

The curation is the hazard, not the saving: a view that writes `.nx-slider`
without the stylesheet renders unstyled with nothing in the console to explain
it. So the lint records reality and freezes it, and CI fails the moment a view
reaches past the list.

The rest are in `scripts/build-registry.mjs`. These replace what a shared module
would have enforced:

- a primitive's markup only uses classes its own stylesheet defines, read from
  its **rendered** output rather than its source, so a class assembled in an
  expression is still seen
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

## The web app re-themes rather than having a style

`apps/web` has no palette, type stack, or radius of its own. Every value
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

### The index wears every language at once, one scope per tile

`useLanguageTokens` swaps a single `:root` layer for the whole document, which is
right on a page showing one language. `/languages` shows several, and the last
layer loaded would simply win — so its tiles used to sit in the first language's
paint while previewing a second, which quietly contradicts the claim above.

`useScopedLanguageTokens` fixes that. The generated `tokens.css` is one `:root`
block and nothing else, so re-pointing that selector at
`[data-nx-scope="<slug>"]` yields the same values bound to an element. It is
deliberately a rename of the build's own output, not a second generated artifact
and not a client-side reimplementation of its flattening — there is no third
place for the two to drift apart. If the template ever stops emitting `:root`,
that language is skipped rather than injected unscoped, since an unscoped layer
would override every other language on the page.

Two things to keep in mind when scoping a token layer:

- **Inherited values do not re-resolve.** `body` already resolved `--nx-ink`
  against `:root`, and descendants inherit the resulting colour, not the `var()`.
  A scoped subtree has to restate the properties it wants — the tile sets
  `background`, `color`, `font-family`, and `border-radius` itself. Setting the
  scope attribute alone changes nothing visible.
- **The hook is ready even when every fetch fails.** It gates whether the page
  renders, and a tile with no scoped layer inherits the document's, which is the
  old behaviour and a far better outcome than an index stuck loading.

This is the strongest demonstration the project has: the badges, the button and
the rules inside each tile are shared primitives, and they re-theme with no
per-language code. Signal Console's solid button comes out paper-on-ink while
Mono Editorial's is ink-on-paper, from the same markup.

### The landing page is written in the language it sells

`/` is marketing, `/languages` is the app.

It is **two scenes and nothing after them**: the name, then the work. Feature
grids, token panels, and CLI walkthroughs were built and then cut, because
anything that has to be explained belongs behind the sign-in where the reader
has already decided they are interested. Resist re-adding sections here; the
restraint is the argument.

The landing takes its dials from `DESIGN.md` rather than from landing-page
convention, which overrides several things a generic taste pass would reach for:

- **Scene one has no navigation; it becomes the navigation.** The wordmark and
  the sign-in start as the composition and travel into the corners as the scene
  is pushed away. There is one of each element on the page, laid out in its
  final bar position and pushed back out to the hero, rather than a hero copy
  crossfading into a bar copy. Only `y` and `scale` change, because both are
  aligned to the same gutter at both ends, so there is no horizontal travel to
  get wrong at any viewport. The bar carries no rule; it is separated from the
  page by a backdrop that fades in.
- **The belt loops, and that is a deliberate exception.** `DESIGN.md` forbids
  looping animation, and scene two breaks it on the owner's instruction. The
  rule governs what the registry ships; nothing on this page is shipped to
  anyone. Do not read it as licence to loop anything inside `registry/`.
- Two things about that belt are load-bearing. Each pass is **its own flex row
  with a trailing gap**, so both halves are exactly equal and `xPercent: -50`
  lands seamlessly; laid out as one row the halves differ by a single gap and
  the belt jumps that much every cycle. And scene two is **a full viewport
  tall**, which is what guarantees the page is long enough for the fold above to
  reach its end state at all.
- **Variance is restrained.** A predictable grid, because the language says the
  interest belongs in the marks. The asymmetry is mild by intent.
- **Inter and the warm-paper palette are not defaults**, they are `tokens.json`.
  The landing loads the same `tokens.css` the registry ships, so the marketing
  surface is themed by the product.
- **No dark mode**, for the reason above: the theme is whatever language is
  being shown.

Every visual on the page is a running component from the registry. Not a
screenshot, not a drawing, and specifically not a div dressed up as a product
shot. That is both the honest thing to show and the strongest argument the
product has.

One consequence to preserve: `/` reads no cookie, so it stays static. Relabelling
the button for signed-in visitors would make the highest-traffic page render on
demand. `/login` redirects an already-signed-in visitor onward instead, which
reaches the same place for one redirect and no dynamic render.

### Accounts are real, but they still guard nothing

GitHub OAuth issues the session. The cookie carries an opaque random token and
the database stores only its SHA-256, so a leaked database read hands the reader
nothing usable: the server only ever compares a token, never reproduces one.

What has not changed is what the session is *for*. It still only sequences the
landing page ahead of the app. Every language is public, and the registry is
served as static files that never consult a cookie. When a restricted language
exists, the check belongs on the route that streams its bytes; a page-level
check protects the page and not the content behind it.

Three decisions worth keeping:

- **Keyed on GitHub's numeric id, not the login.** Logins are renameable, and
  keying on one silently creates a second account the first time someone renames.
- **`state` is not optional.** Without it an attacker can hand someone a crafted
  callback URL and sign them into an account they do not own. It is generated on
  the way out, stored httpOnly, compared in constant time on the way back, and
  deleted after one use so a replayed callback cannot mint a second session.
- **Failures redirect with a fixed token, never an upstream message.** Anything
  GitHub says can quote the request, and the request carried the client secret.
  `lib/github.ts` throws the detail; the callback converts it to `?error=state`
  and similar, which the login page maps to prose.

Two tables and nothing else. Entitlements, teams, and billing belong to the tier
that does not exist yet, and guessing their shape now means migrating a guess.

### `currentUser` reads the cookie before it checks configuration

Looks backwards, and is load-bearing. Touching `cookies()` is what marks a route
dynamic. Returning early when `DATABASE_URL` is absent would make that marking
depend on whether the build machine happened to have one, and a route that
prerendered without it serves a cached "signed out" to everyone forever. That is
exactly what happened to `/languages` the first time: it built as static and
would have been a permanent redirect to the login page.

`/languages` also declares `dynamic = 'force-dynamic'`, which is belt and braces
on purpose: the cookie ordering is another module's implementation detail, and
the page should not silently break when someone refactors it.

### One env var is baked into the image; the rest are not

`NEXT_PUBLIC_SITE_URL`, `DATABASE_URL`, and the GitHub credentials are all read
at runtime, so one container image serves any hostname. Verified rather than
assumed: an image built with no site URL, run with one, produces OAuth redirects
pointing at the runtime value.

`NEXT_PUBLIC_REGISTRY_URL` is the exception and has to be a **build argument**.
Next inlines `NEXT_PUBLIC_*` into the browser bundle, and `lib/registry.ts` runs
in the browser, so by runtime there is no lookup left to override. The compiled
bundle contains the resolved path and no reference to the variable name.

The asymmetry is confusing enough to be worth stating plainly: the prefix does
not decide when a value is read. Where the code runs does.

### The monorepo has one `.env`, and Next has to be told

Next reads `.env` relative to the app directory, which in a workspace means
`apps/web/.env`. Secrets in two places is how one goes stale, and
`.env.example`, the migration runner, and `docker-compose.yml` all sit at the
root. `next.config.ts` loads the root file explicitly before the server starts.

A missing `.env` is not an error. The registry, every public page, the CLI, and
the whole build work without one; only the accounts layer needs it, and it
reports itself unconfigured rather than crashing.

### Why Next.js rather than Vite

The app was a Vite SPA and did not need a server: the registry is static and the
client fetches it. It moved to Next before the accounts backend, not after,
because the alternative was standing up a second deployable next to the SPA and
running auth across an origin boundary. Sessions, the GitHub OAuth callback, and
the CLI device-code endpoints all want to be same-origin with the pages that read
them, and route handlers give that for free.

Nothing about the migration made the app dynamic. Every route still prerenders,
the views are still client components fetching the manifest over HTTP, and the
whole thing still deploys as static files. What changed is that there is now
somewhere for a server to appear when Phase 5 needs one.

Two consequences worth knowing:

- **Params arrive as props, not from a hook.** Each `page.tsx` is a server
  component that awaits `params` and passes plain strings down. The views never
  import a routing hook, so they stay portable and testable.
- **Routes come from the manifest.** `generateStaticParams` reads
  `public/r/registry.json` at build time, so the registry stays the only place
  that decides what exists. Adding a component adds its page; the app is never a
  second list to keep in sync.

### The registry is copied into `public/`, not served by a route handler

`scripts/sync-registry-public.mjs` copies `registry/` and `public/r/` into
`apps/web/public/` before dev and before build. A route handler streaming from
the repo root would have worked too, and was rejected: it would tie serving the
registry to a Node runtime, when the entire point of the registry being static is
that it can sit on a CDN with no runtime at all.

`NEXT_PUBLIC_REGISTRY_URL` switches to that CDN. Every registry URL in the app
resolves through one `BASE` constant in `lib/registry.ts` (and once more in
`app/layout.tsx`, which renders on the server before any client module runs), so
pointing elsewhere is configuration rather than a code change.

`apps/web/public/` is generated and gitignored. Never edit it, and never treat it
as a source of truth.

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

### A chart is the drawing; everything that names it comes from the manifest

Every expressive fragment used to carry its own `h2` and `.sub`, because the
card anatomy `DESIGN.md` fixed included them. The app printed the same two
strings from the manifest above each frame, so both together labelled all 64
charts twice, and the registry grew a `bare=1` parameter whose only job was to
hide the fragment's copy again wherever an embedder supplied its own.

**All of that is gone.** The `h2` and the `.sub` were stripped from all 64
charts, the parameter with them, and every surface now prints **title, then
component type, then the chart** — read from the manifest in all three places:
the index tiles, the grid cells, and the detail page.

Two arguments, and the second is the one that settles it:

- Naming a component inside itself duplicates what the manifest already holds,
  so it can only drift. The same reasoning removed `div.src` earlier, where 53
  of 64 ended up crediting a language that never existed.
- **The suppression mechanism did not survive a second language.** `bare=1` was
  defined as "hide the fragment's title and subtitle", which reads as a sensible
  contract until a language arrives whose cards open with a live value instead
  of a heading. Then the same parameter means "hide two elements" in one
  language and "do nothing" in another, and an embedder cannot tell which
  without knowing the anatomy. The index found this the hard way: it was the one
  surface not asking for `bare=1`, relying on each fragment to label itself, so
  Signal Console's tile arrived with no title beside Mono Editorial's four that
  had one.

What the manifest holds and what the app shows are deliberately not the same
set. `description` is still recorded for every component — it is what `nodex
show` and `nodex search` read, and for the imported charts it is the reading key
that used to be the `.sub`, so the text was preserved rather than deleted. The
app just does not print it, because a grid of 64 cells each carrying a
three-line sentence buries the previews it exists to show.

One consequence worth keeping: **a labelled cell needs its grid rows shared.**
A title that wraps to two lines would otherwise drop its own preview below its
neighbours', so the cells are a three-row subgrid. Both the cell and the link
inside it have to restate `rowGap`, because a subgrid otherwise inherits the gap
that separates whole cells and opens that same distance between a title and its
own chart.

**Annotation is a different thing and stays in the component.** A `div.note` and
a `div.legend` explain the marks and sit in the composition; `barcode-lollipop`
is the one chart that has them. A title names the component and belongs to
whatever is listing it. The rule is where the text points, not how long it is.

The fix belongs in the preview rather than in the fragments. A chart that lost
its title would be a worse component for the consumer, and the app's grid needs
a legible label because a chart scaled to a quarter cannot supply one.

Two things this must not become: it hides the title and subtitle only, never the
note or legend, which are annotation rather than heading; and the attribute is
set from a blocking script in `head`, because applying it after the module runs
makes the header appear and then vanish.

This rule used to name the source caption alongside note and legend. That
caption no longer exists — see below — so nothing is being hidden that a reader
would miss, and the rule still holds for the annotation that remains.

### The `div.src` credit line was removed from every chart

Each chart used to end with `CHART TYPE · LANGUAGE · DATA SOURCE`, uppercase, as
the fourth part of the card anatomy. All 64 were stripped. This was the first of
two removals for the same reason — the heading above it went later, and
`DESIGN.md` now fixes a card that is the drawing and nothing else.

It restated what the manifest already holds, so it could only ever drift out of
date, and it had: 53 of 64 named a section of the source document the extractor
read rather than a design language, including `MONO-FANCY4`, `MONO-EDITORIAL2`,
and `NEW`. A consumer running `nodex add mono-editorial/bar-race` received a
chart crediting a language that has never existed.

It also read as a layout bug. An SVG carrying `max-height` with
`preserveAspectRatio="xMidYMid meet"` centres itself in a box wider than its
aspect ratio, while the caption is left-aligned HTML — so on every card wide
enough to letterbox, the chart visibly drifted away from its own credit line.

Two consequences to keep in mind. The `type.caption` token now has no consumer
among the shipped charts and is deliberately kept, because it is the language's
vocabulary for an annotation smaller than a legend. And a caption naming the
*data* is a different thing that still belongs when a chart needs sourcing; it
is written as a `div.note`, which explains the marks rather than naming the
component and therefore stays in the card.

### Previews must not depend on an observer firing

`IntersectionObserver` and `ResizeObserver` do not deliver in a tab that is never
painted, which covers background tabs and various headless and embedded
contexts. Gating the mount solely on them produces an empty page with no error
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

### Grid items holding a preview need `min-width: 0`

Not defensive, load-bearing. A grid item's default minimum is its content size,
and a preview renders an iframe at a fixed wide logical width. Without
`min-width: 0` the item refuses to shrink, forces the column open, and then
reports that inflated width back as the measurement the scale is computed from,
which cancels the scaling entirely and pushes charts outside their cells.

This did not bite until the grids moved to subgrid, because a block child fills
its parent while a grid item sizes to its content. Every element between a grid
container and a `Preview` needs it.

### Previews are scaled, not cropped

Components were authored for a full page, so dropping one into a 320px card shows
the top-left corner of a 1400px layout. `Preview` renders at a fixed logical
width and scales the frame, keeping composition and type proportion intact.

Height is not guessed from the chart's `viewBox`: a card's real height depends on
its title and notes, so the generated preview posts its measured `scrollHeight`
to the parent. In grids a fixed `boxHeight` is applied anyway, so titles share a
baseline. Content-driven heights leave every card a different size and the grid
reads as broken.

**`LOGICAL_WIDTH` is the width the charts were drawn for, not a desktop
viewport.** They came from a two-column grid capped at 1400px, so a card was
about 690px. It was set to 1180 and letterboxed nearly everything: an expressive
SVG carries `max-height: 330px` with `preserveAspectRatio="xMidYMid meet"`, so
past a certain width the height caps first and the chart's aspect ratio decides
how little of the box it can fill, with the browser padding the rest to centre
it. At 1180 a 400x320 chart drew 488 of 1044 available pixels. At 660 the
measured fill roughly doubles — `dotty-matrix` 34 to 68%, `arc-matrix` 41 to
82%, `hairline-line` 47 to 93% — and the wide charts reach 100%. It also fixes
the vertical gap, because the scale stops being width-bound and the card fills
its `boxHeight` exactly.

Do not chase letterboxing by removing `max-height` from the components. That cap
is what stops a chart rendering ~900px tall in a consumer's wide container;
removing it would degrade what the registry ships to flatter the app's own
preview. Below roughly 550 the width binds before the height cap and charts
start shrinking again, so the useful range is narrow.

**The scale is capped at 1, so a preview shrinks but never enlarges.** Past that
the frame shows the component larger than its container could draw it, which is
a size the reader cannot reproduce by copying it. It also inflates apparent type
size, and type is identity rather than craft — a language whose signature is
tiny uppercase captions must not have them magnified into ordinary ones. The
frame therefore also carries `max-width: LOGICAL_WIDTH`, or a wide column would
leave a band of empty frame beside a component already at full size. That
converges rather than looping: the frame settles at the logical width and the
measurement taken inside it then agrees.

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

Resolution precedence is flag, then `nodex.json`, then `NODEX_REGISTRY`, then
`DEFAULT_REGISTRY`, the deployed app. Every step is something someone wrote
down. **Nothing is inferred from where the command was run**, so the resolved
root is predictable from the arguments and the project alone.

`nodex.json` outranks the environment so a project pinned to one registry cannot
be silently served by another, and `init` records the root whenever it is
remote, which is what makes that pin exist.

### Why the checkout is no longer auto-detected

There used to be a `findLocalRoot` step between the environment and the default:
walk up from the cwd looking for `public/r/registry.json` and prefer it, so
working in this repo read local work. It was removed, and it should not come
back, because implicit resolution failed in both directions on the same evening:

- Inside the checkout, a globally installed `nodex login` reported *"this is a
  local checkout, so there is nothing to sign in to"* — correct, and unreadable
  as anything but a bug, because nothing said which root it had chosen or why.
- Then an `init` run one directory **above** the checkout wrote a `nodex.json`
  there, which outranks the checkout, so every command inside the repo silently
  flipped back to production. Two implicit rules, in opposite directions, with
  no output naming either.

A local root is still reachable, and registry development still works: pass
`--registry .` or set `NODEX_REGISTRY`. `scripts/smoke-cli.mjs` always passed
the root explicitly, so it never relied on the detection. The cost is one flag
while working on the registry; the saving is that nobody has to reason about the
cwd to know what a command will read.

Two other things about the default worth keeping:

- **It makes `init` self-pinning.** A project set up against the default gets
  that URL written into its `nodex.json`, so it stays put.
- **The "no registry found" error is gone**, because there is now always one. A
  network failure surfaces from the manifest read instead, which is why that
  message mentions connectivity.

It is a plain registry root reached by the same fixed shape as any other, so no
command knows it is the default and moving to a CDN is a change to one string.

### Public content must never route through the server

Decided before Phase 5 was built, so it is not accidentally designed away.

The CLI does not know the app exists. It reads static paths under a root, which
is why pointing `NODEX_REGISTRY` at the running app already works: the app serves
those paths out of `public/` and no application code runs.

Keep it that way for everything public. Putting an API in front of content that
needs no authorization costs a server round trip per download and adds a failure
point in front of the CDN, and buys only download counts, which CDN logs already
give. Authentication exists for restricted languages and for nothing else.

**Restricted content is streamed by the API, not handed off as a signed CDN
URL.** Signed URLs keep bytes off the server and are the better endgame, but they
need a signing-capable CDN and are wasted work at zero paying users. Streaming is
reversible: the manifest carries each file's address, so moving to signed URLs
later changes what the server returns, not the CLI.

That reversibility is the load-bearing part. `add` already resolves sources from
`item.files[].path`, so a restricted item whose path points at `api/r/...`
flows through the existing code with no policy branch — the manifest decides
what is guarded. The token is attached only to `api/` paths, so it is never sent
to a CDN.

**The blocker to fix first:** `init`, `tokens`, and `design` build their paths by
convention rather than reading them from the manifest, and those three are what
deliver the design language itself — the thing a restricted tier sells. Until
`languages.json` carries explicit file addresses the way items do, language-level
assets cannot be guarded without special-casing them in the CLI.

### The CLI signs in by device code, and holds a nodex session

A terminal cannot receive a redirect, so `nodex login` takes two codes: a long
one it keeps and polls with, and a short one a person types into `/activate`.
The shape is RFC 8628's, including the odd-looking convention that
`authorization_pending` is returned as an error.

What the CLI ends up holding is **a nodex session with `origin = 'cli'`, not a
GitHub token.** That is why the `sessions` table had an `origin` column from the
first migration. Revoking a terminal is one delete, and it does not touch the
browser or anything at GitHub.

Details that are load-bearing rather than incidental:

- **The token attaches only to paths under `api/`.** Public files are served
  straight off a CDN, and a bearer token sent there is handed to a third party
  for nothing. Verified on the wire, not by reading the code: a logging proxy
  saw ten requests during a signed-in `init` and `add`, and none carried the
  header.
- **The user code avoids `0/O`, `1/I/L`, `U`, and `V`**, and is generated with
  `randomInt` rather than `randomBytes` modulo the alphabet. The modulo is
  biased whenever the alphabet does not divide 256, and 29 does not.
- **One exchange per request.** The row is deleted when the token is issued, so a
  replayed poll cannot mint a second session. An unknown device code reports as
  `expired_token` rather than as unknown, or polling becomes an oracle for
  whether a code was ever real.
- **Approving is a form post**, not a link. A link would let a prefetch, a
  crawler, or an image tag on another site authorise someone's terminal.

### The CLI is published compiled, and has no dependencies

The repo runs TypeScript directly: `tsconfig.base.json` is `emitDeclarationOnly`
and every specifier ends in `.ts`, because Node strips types natively. That is
right for development and wrong for a package a stranger installs, who may be on
a Node without type stripping. So `packages/cli/tsconfig.publish.json` emits real
JavaScript, using `rewriteRelativeImportExtensions` to turn the `.ts` specifiers
into `.js` on the way out — which is what lets the source keep the extension the
rest of the repo uses instead of maintaining a second copy of it.

**The package has no dependencies at all**, and that is not luck worth losing.
The only `@nodex/core` import in the CLI is `import type`, so `verbatimModuleSyntax`
erases it entirely and `@nodex/core` never needs publishing alongside. Everything
else is a `node:` builtin. Adding one runtime import of core would drag a second
package onto npm and `zod` with it, so keep core imports type-only.

Two details in the workflow that are corrections rather than decoration:

- **The build clears `dist` first.** `tsc --build` writes `.d.ts` there for
  typechecking and the publish config writes `.js` there, so without the clean
  the tarball's contents would depend on which ran last.
- **It installs the packed tarball and runs the binary before publishing.**
  Compiling is not the same as being runnable, and `files` narrows what ships,
  so the only honest check is the one a consumer performs.

A version already on npm is skipped with a notice rather than failing, the same
record-reality-then-freeze shape the Helm chart uses: publishing is only ever
reached by bumping the version.

### The CLI is read by agents, so it has a parseable shape

`list`, `search`, `add` and `tokens` take `--json`, printed alone on stdout with
no heading and no dim text. Only `tokens` had it, and a consumer reported
scraping the aligned columns — which means inventing a parser for a format
nobody promised to keep stable. `--help` after a command describes that command;
it used to print the global page, so `add`'s only flag, `--to`, was documented
nowhere anyone would look.

**`meta.exports` is the important one.** A component ships two files and
nothing in them says how to get in: the export name is chosen in the module
rather than derived from the slug. `add` prints it and `add --json` reports it
alongside `files` and `aspectRatio`.

`meta.mounts` was the same field for the vanilla era, recording which
`data-nx-mount="<name>"` a `mount(root)` filled — a name that matched its slug
in only 3 of 64 charts, so a consumer reported grepping the JS for
`obsReveal('...')` to find it. Nothing ships a mount now, and the manifest
records none. The schema keeps the field so an older manifest still parses.

### The extractor split by chart family, not by chart

Thirteen components shipped their neighbours' code. `beeswarm/component.js` held
five chart blocks — matrix heat, calendar heat, beeswarm, ridgeline, parallel
coordinates — while its markup declared one mount, so four called
`obsReveal('matheat')` against an element that does not exist and silently did
nothing. 44 dead blocks across the 13, and consumers received all of it.

Removing them cut those files by 67%. More importantly it was the reason the
sample data was hard to identify: a reader opening `beeswarm` found five
datasets and no indication which one the chart drew. A consumer reported
reverse-engineering the data contract, and this is most of why that was hard.

The live block in each was verified byte-identical before and after, by brace
matching rather than by pattern, so the prune provably removed only dead code.

**If a component's JS reveals a mount its markup does not declare, that block is
dead.** That is the check worth re-running after any future import.

Pruning the blocks was not the end of it. The same 13 carried the family
wrapper's **duplicate prelude**, shadowing the one at the top of `mount`, so 62
declarations were unreachable. Removing them needed care rather than a blanket
dedup: four — `aggregate-sankey`, `matrix-heat-glance`, `rank-strip`, `violin` —
have a *different* `rnd` inside, and `rnd` seeds the sample data, so deleting the
wrong copy would have silently changed what the chart draws. Only shadowed outer
declarations went.

The block banners were also removed. `// ════ L18 · beeswarm ════` numbers a
position in a document no consumer has seen, and with one chart per file the
filename already says it. Both passes were verified by stripping comments and
requiring the remaining code to be byte-identical.

`beeswarm` went from roughly 340 lines to 83.

### The data contract is derived, not authored

`meta.data` records the shape of each sample dataset — `dumbbell-queue` reports
`[string, number, number]` with 5 rows — so "would this fit my numbers?" is one
`nodex show` away rather than add, read, infer, discard.

Derived from the source at build time on purpose. Authoring 64 of these by hand
is how they end up half-written and drifting from the file. The 21 components
that generate data procedurally report no shape and say so, which is better than
a guess.

What derivation cannot supply is what a field *means*. `fields` is optional
prose for a human to add per component where it is worth saying, and is
deliberately not invented by the build.

### `~/.nodex` holds credentials; `nodex.json` holds the project

Two config files, deliberately. `nodex.json` records which language a project
uses and belongs in the repository. `~/.nodex/auth.json` holds tokens, is written
`0600` inside a `0700` directory, and must never be committed.

It is keyed by registry origin, because one machine can talk to several
registries and a token for one is not a token for another. `NODEX_TOKEN`
overrides the file entirely, so CI and agents can be provisioned without an
interactive step and without writing anything to disk.

`NODEX_CONFIG_DIR` relocates it, which is what makes the flow testable without
touching a real home directory.

## Two skills, two audiences

- `skills/nodex/SKILL.md` ships to consumers. Pick a language, init, search,
  add. It must never mention authoring, because a downstream agent working in
  someone else's app has no business scaffolding languages.
- `.agents/skills/nodex-authoring/SKILL.md` is repo-local and loaded on demand.
  It holds the whole authoring procedure, which is long and rarely needed, and
  so does not belong in the always-loaded `AGENTS.md`.

`AGENTS.md` explains why and what. The authoring skill explains how. Keep the
split, or they drift into each other.

### `apps/web/AGENTS.md` is generated, and is not this file

`next dev` writes `apps/web/AGENTS.md` and `apps/web/CLAUDE.md` on every boot and
re-adds them if deleted. They are committed deliberately: deleting them from a
diff only recreates the change, and the content is a genuinely useful warning
that this Next version differs from what most models were trained on.

It is scoped to the app and says nothing about nodex. **This root file remains
the single source of truth for the project.** Do not move architecture notes into
the generated one; the next `next dev` will not remove them, but the next person
reading it will not expect them either.

## Gotchas

- **Markup must not branch on `usePrefersReducedMotion`.** The hook starts
  `false` and corrects after mount, because reading `matchMedia` during the
  first render makes the server and client disagree and React reports a
  hydration mismatch. Gating an animation on it is fine, since GSAP reverts when
  the value flips. Choosing a class name from it is not: use the CSS
  `motion-reduce:` variant so both renders emit the same markup.
- **Generated documents are built inside JS template literals.** A backtick or a
  `*/` in a comment you write into `renderPreview` closes the literal or the
  comment early. Both have already happened: a glob in a CSS comment silently
  truncated a rule, and a backtick in another broke the build outright. Spell
  such paths out in prose instead.
- **`rnd` is a deterministic hash, not `Math.random()`.** Sample data must not
  change between page loads or previews and screenshots stop reproducing. Never
  replace it with `Math.random()`.
- **Charts draw on scroll into view and replay on click.** A chart that looks
  blank in a preview may simply not have been scrolled to. Click it.
- **The choropleths' geo data is vendored, and must stay that way.** Both used
  to fetch GeoJSON from third-party hosts at runtime — including a `world.json`
  from `echarts@4.9.0` while the components run ECharts 6 — so they broke
  offline and could not be smoke-tested. Each now imports a sibling `geo.ts`
  with the coordinates rounded down to a sane precision, and the build ships any
  sibling `.ts` alongside the component so `nodex add` delivers it. `meta.externalData`
  still exists in the schema and nothing declares it.
- **The palette is 37 greys, not a designed scale.** Several pairs differ by one
  or two values (`#D8D7D1` / `#D8D6CE`). Consolidating is open work; the ramp in
  `tokens.json` records what exists.
- **Some primitives cannot exist in every language, and that is unresolved.**
  mono-editorial's anti-patterns forbid looping animation, so a spinner or a
  shimmer skeleton cannot exist in it. The progress primitive sidesteps this by
  showing an indeterminate state as a static dashed track rather than a moving
  stripe. If a language ever genuinely needs to decline a primitive, the
  mechanism would be a list in its `meta.json` and the app skipping it. Not
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
- **A DOM-only property does not survive server rendering.** `indeterminate` on
  a checkbox has no markup attribute behind it, so a ref sets it and a ref never
  runs in a statically rendered preview — the primitive's own preview quietly
  lost the state it exists to demonstrate. The component now carries both the
  ref and a `data-indeterminate` attribute, and the stylesheet matches
  `:indeterminate` alongside it. The ref stays the real mechanism, because it is
  what a browser reports to assistive technology; the attribute is only what
  lets rendered markup carry the state. Anything else in this shape — a
  property with no attribute — needs the same pair.
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
- **A silently-collapsed container renders nothing and reports nothing.** When
  charts were vanilla, three of them sized themselves through a CSS rule that
  had stopped matching, so their containers collapsed to `0`. Two were on a dark
  ground, which is why it read as a stray black bar rather than as a missing
  chart, and it survived the smoke test because jsdom reports a canvas as
  present regardless of layout. Mounts are gone, but the shape of the failure is
  not: assert on **what a chart drew**, never on whether its container exists.
  The smoke test now counts painted marks in the rendered SVG for this reason.
- **`packages/core` uses `.ts` import specifiers.** Node strips types natively;
  `.js` specifiers would not resolve against `.ts` files.
- **The extractor is gone, but recoverable.** `tmp/extract-charts.mjs` turned
  `source-charts.html` into the 64 expressive components and was deleted once the
  output was verified. It is one-time per source, and the registry is now the
  source of truth. If a chart looks wrong and you need to know what transform
  produced it, the last commit holding it is `eaf2136`:

  ```
  git show eaf2136:tmp/extract-charts.mjs
  git show eaf2136:tmp/source-charts.html
  ```

  Ingesting a different collection is a new importer, not a revival of this one.
- **`tmp/` is now a gitignored scratch space.** Nothing in it is tracked, so put
  throwaway work there freely and expect it never to be committed.
- **jsdom timers hang the smoke test** if the window is not closed — several
  charts stream via `setInterval`.

## The second language is a test, not decoration

`signal-console` exists to prove the tier split is real. One language cannot: if
expressive components only ever wore one set of paint, "the language decides the
geometry" was an assertion nobody had checked.

It was chosen to invert as many axes as possible at once. Dark against paper,
monospace against Inter, hue-with-meaning against no hue at all, filled marks
from a `1px` floor against hairlines under a `1.4px` ceiling, aggregated against
one-mark-per-record, and looping motion against draw-once-then-hold.

Two of those inversions are deliberate contradictions and should stay that way.
mono-editorial forbids looping animation; signal-console requires it for live
state. mono-editorial demands negative tracking on headings; signal-console
forbids it, because monospace is already evenly spaced. Neither is a mistake:
they are the clearest evidence that motion and tracking belong to a language
rather than to taste in general.

### Authoring a chart is not the same as importing one

`signal-console/endpoint-latency` is the first chart written *from* a language
rather than sliced out of a found page, and it is the reference for anything
authored next. Four differences from the imported 64, all of which fell out of
authoring rather than being argued for:

- **It is a React component**, `component.tsx` plus `component.css` and no
  markup file, because its markup is in the module. See below for why the two
  authoring styles coexist rather than one replacing the other.
- **Data is a parameter.** `EndpointLatency({ endpoints = ENDPOINTS })` with the
  sample exported. Swapping real traffic in is a prop, not a rewrite. The
  imported charts bury their data mid-function because the page they came from
  had no reason to expose it.
- **The option is pure and separate from the component.** `buildOption(data)`
  takes no DOM and returns the ECharts option, which is what lets the build
  render it and the lint read its real marks.
- **The card anatomy is the language's, not mono-editorial's.** `div.head` with
  the current value, then the chart, then a three-segment `div.foot`. Writing it
  made the point concrete: the same chart type in the other language opens with
  a sentence and reading instructions, which is right for studying and wrong for
  scanning.

Two things an earlier attempt found that argument had not:

- **The smoke test only ever ran one language**, defaulting to mono-editorial,
  so this component would have shipped without ever being drawn. It now walks
  every language, and `NODEX_LANGUAGE` still narrows it.
- **`meta.data` derivation only read internal `const`**, so the chart reported
  its colour ladder as its data contract and missed the real sample entirely. An
  exported array is now preferred where a component has one, with the internal
  scan kept as the fallback the imported corpus needs. It also had to learn to
  step over a type annotation, or annotating a sample would delete its own
  contract from the manifest.

### A chart may be authored in TSX, and then it renders at build time

Every chart is a React component. The registry briefly held both spellings, and
the build still explains why the surviving one needs the machinery it does.

A React component draws inside `useEffect`, which never runs under server
rendering — where a vanilla component drew when `mount` ran, so its preview
could simply be a document that loaded `component.js` and let a browser execute
it. The build has no such option here:

So it calls the component's exported `previewOption()`, renders that to an SVG
string with no DOM, and splices it into the statically rendered markup. The
preview it writes is a finished document that runs nothing.

Three consequences worth knowing:

- **The lint reads rendered output, not source.** It used to parse
  `stroke-width` out of the JS, with the known blind spots that cost five
  components a 2px stroke. It now reads the SVG the chart really produced,
  where a ternary has already collapsed to a number. This is the
  better half of the arrangement and the reason `renderer: 'svg'` is mandatory:
  a canvas chart leaves nothing to inspect and is unlintable by construction.
- **`previewOption()` is the contract.** Zero arguments, returns the option for
  the sample data. Without it the build cannot reach a chart's marks without
  knowing its default props, so it is required rather than detected.
- **A preview draws at display size and is never scaled.** An ECharts SVG
  carries a viewBox, so stretching it scales the type — a 9px axis label shown
  at 1.8x becomes 16px, which is the language's smallest size rendered as one of
  its largest. The build renders at `PREVIEW_CHART_WIDTH` and pins the container
  to the same number, and the preview's card shrink-wraps that rather than the
  chart stretching to the card.

`meta.exports` records which component to import, for exactly the reason
`meta.mounts` records a mount name: neither is derivable from the slug, and a
consumer should not have to open the file to find the way in.

**A TSX component still inlines its helpers.** `useECharts` is twenty lines
repeated per chart rather than an import, because a component is lifted out of
this registry one file at a time and a shared import hands a consumer a path
that does not resolve in their project. Verified rather than assumed: a copy
produced by `nodex add` compiles on its own against `react` and `echarts` and
nothing else. The SSR half of that pair lives in `scripts/echarts-ssr.mjs`,
because nothing a consumer receives calls it.

### ECharts renders under SSR, with one exception found the hard way

A piecewise `visualMap` on a **line** series throws during server rendering:
ECharts builds a gradient along the path and finds no colour stops without a
live coordinate system. On a **bar** series the same option renders cleanly, and
`endpoint-latency` uses it to recolour every route breaching its objective.

The distinction is worth keeping because the workaround for the line case is
ugly — splitting one series into two, each null where the other draws — and
reaching for it on a bar chart would be cargo cult. Thresholding belongs on bars
anyway.

The imported charts **were** retrofitted to match, and all 64 are now React
components on ECharts. This paragraph used to say they would not be. What
changed the answer was not the effort estimate but a second language: once
`signal-console` existed, keeping half the registry in a spelling no new chart
would ever be written in meant maintaining two preview paths, two lint paths and
two answers to "how do I use this" — permanently, for a corpus nobody was adding
to.

The old objection still holds for the thing it was actually about. Reshaping
those files *as files* is what produced the dead blocks and duplicated preludes
described above. Each rewrite started from what its chart says rather than from
its drawing code, which is why none of the readings were lost.

**It omits `density` on purpose.** mono-editorial declares both values, which
proves nothing about whether the axis is optional. A language that is only ever
glance-read and names no distinction is what makes it a real option rather than
a field everyone fills in.

Adding it immediately found two generator bugs that one language had hidden:
`$comment` keys leaking into `tokens.css` as invalid custom properties, and a
hardcoded Inter link in every generated preview and in `nodex init`. Both were
invisible while one language existed and wrong the moment a second arrived. The
font now comes from `font.webfont` in each language's tokens.

## Technical debt

- Consolidate the 37-step grey ramp.
- **A chart's marks still do not follow a re-themed token layer.** Every
  `component.tsx` names its colours as hex constants rather than reading the
  `--nx-*` custom properties, so swapping a language's `tokens.css` restyles the
  whole app and none of the charts inside it. The port did not fix this and was
  not the moment to: a chart reading custom properties has to resolve them at
  runtime, which the build's server render cannot do, so the fix needs a way to
  hand the palette to `buildOption` — and that is a change to the contract every
  chart implements. The lint enforcing ramp membership is what keeps the
  hardcoding honest in the meantime.
- `languages.json` has no file addresses, so `init`, `tokens`, and `design`
  hardcode `registry/languages/<slug>/...` while `add` reads addresses from the
  manifest. Harmless today because every language is public and every path
  resolves statically; a prerequisite for restricted languages, since those three
  commands are what deliver the paid artifact.
- Licensing is still unanswered, and it gates a paid tier rather than merely
  postponing one. The 64 charts came from a found sample; their provenance has to
  be settled before anything is sold.
- **The language's secondary text does not meet WCAG AA.** Measured on paper,
  `--nx-muted` is 2.86:1 and `--nx-faint` is 1.5:1, against a 4.5:1 floor for
  body text. Every subtitle and caption in the app inherits this, because it is
  the design language rather than an app choice. The app now keeps full
  sentences at `muted` or darker and leaves `faint` to captions, which is what
  `DESIGN.md` already says it is for, but that only limits the damage. Fixing it
  properly means darkening two token values, which is a change to the product
  and needs a decision rather than a patch.
