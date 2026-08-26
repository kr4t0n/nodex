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

**Agent-facing only. It is deliberately absent from the app's UI.** Density
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

### An embedded preview is bare; a standalone one is whole

Every expressive fragment carries its own `h2` and `.sub`, because the card
anatomy `DESIGN.md` fixes includes them and that is what a consumer receives.
The app prints the same two strings from the manifest above each frame, so
rendering both labelled all 64 charts twice.

The generated preview therefore takes a `bare=1` parameter that hides the
fragment's title and subtitle only. The app asks for it wherever it supplies its
own heading, which is the grid cells and the detail page. The index's featured
composites are not bare: nothing labels them, so there is nothing to duplicate.

**The app no longer links to the whole version anywhere.** A "Open preview in a
tab" link on the detail page used to be that escape hatch and was removed as
clutter. The document is unchanged and still served at the same URL without the
parameter, so opening a preview directly still shows the component exactly as a
consumer receives it. Nothing generates the bare version separately; `bare=1`
only hides two elements at view time.

The fix belongs in the preview rather than in the fragments. A chart that lost
its title would be a worse component for the consumer, and the app's grid needs
a legible label because a chart scaled to a quarter cannot supply one.

Two things this must not become: it hides the title and subtitle only, never the
note, legend, or source caption, which are annotation rather than heading; and
the attribute is set from a blocking script in `head`, because applying it after
the module runs makes the header appear and then vanish.

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

## Technical debt

- Vendor the choropleth geo data; remove the runtime fetches.
- Consolidate the 37-step grey ramp.
- `component.js` hardcodes hex literals rather than reading custom properties,
  so a chart's marks do not follow a re-themed token layer. Acceptable while one
  language exists; revisit when a second arrives.
- The extractor leaves a few orphaned trailing comments where a `//` comment
  followed a statement on the same line.
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
