# AGENTS.md

Architecture and reasoning for nodex. This root document is the project's high
level source of truth. Procedures live in the authoring skill; setup and commands
live in README.md. Update both alongside architectural or usage changes.

## Design languages determine form

Conventional libraries are tokens × components: one shape, many themes. That is
sufficient for primitives, where identity mainly changes paint. Expressive charts
also encode identity through geometry, annotation and information density.

- **Expressive components** belong to one language under
  `registry/languages/<language>/expressive/`.
- **Primitives** live once under `registry/primitives/` and accept every language's
  shared token roles. Their React APIs wrap native elements and retain editable CSS.

The current reconstruction deliberately contains nine expressive charts and all
24 primitives. The old expressive catalogue remains in Git history. Do not restore
legacy artifacts or automatically port the old catalogue before this contract is
validated against a new chart's requirements.

Reconstruction is not a redesign. Preserve the previous branch's specimen data,
titles, copy, chart encoding, proportions and existing language values while
changing the rendering and delivery architecture. Do not add controls, tables,
annotations or demo variants, or make unrelated dependency upgrades. The data
dropdowns and other unsolicited specimen changes have been removed. New product
behavior requires its own user request.

The manifest is the catalogue, not the folder layout. A slug names the item;
`component` names its cross-language type. Types describe marks and encoding,
not animation or business domain. Taxonomy lives in `packages/core/src/taxonomy.ts`.

`density` is optional reading intent (`close-read` or `glance`). Languages declare
legal values; components may omit it. It remains agent/search metadata and must
not become a gallery filter or be inferred from a slug suffix.

## React authoring and delivery

The supported component platform is React 19, React DOM, TypeScript and Tailwind
CSS 4. This is React for the web, not the React Native mobile framework. Primitives
use React 19 ref-as-prop semantics. The CLI preserves the consumer's platform
packages and rejects an incompatible React version.

Each item normally has:

- `component.tsx`: reusable React component, exported data/prop types and private
  layout helpers. Split a module only when its responsibilities justify it.
- `example.tsx`: deterministic fixtures and the gallery composition, importing the
  real component. Examples never become production defaults or delivered files.
- `meta.json`: explicit entry, runtime exports, prop documentation, runtime files,
  package dependencies, shared files and example export/dimensions.
- Optional `component.css`: preserved primitive treatment for native selectors,
  pseudo-elements, anchor positioning and progressive controls. Import it from
  the component and keep rules in `@layer components`, below Tailwind utilities.
  Unlayered native CSS overrode `hidden` and broke mobile navigation after the
  actual font loaded. Use Tailwind for new layout and ordinary styling.

The only delivery runtime is `react`. Library choice is a separate field.
Recharts is the default even for simple charts; all current POCs use its scales,
series and interactions. Arc-matrix uses ScatterChart, library-generated curves
and custom cell marks within that composition. It is not an independent SVG
renderer wrapped in a chart container.

Nivo is a candidate only for a demonstrated specialist gap; visx is a lower-level
exception when composition needs it. A standalone handwritten SVG chart requires
a concrete reason. The current build allows only Recharts expressive items;
adding a second library entails updating that policy and proving its contract.
Do not introduce a generic multi-library adapter in anticipation of future charts.

**The consumer owns source.** The build produces the declared runtime import
closure and rewrites local imports to explicit consumer targets. A copied chart
must compile independently of this checkout. `_shared/` holds support modules
used across items, copied only when declared and reachable. It is ordinary local
source, not a package that forces consumers onto a Nodex runtime version.

Promote on demonstrated second use. Keep geometry and types together with their
component until an actual shared responsibility emerges. Never add a shared
`ChartOptions` abstraction that hides the chosen library's React composition.

No HTML fragment, imperative `mount(root)`, ECharts option builder, regex export
inference or production fixture fallback remains in this contract.

## Tokens have one authority

Each language's `tokens.json` is canonical. The build generates CSS variables;
color keys become `--nx-<role>`, other nested values become
`--nx-<group>-<role>`. Arrays and documentation keys are not emitted as variables.
`--nx-stroke-hairline` is canonical; the old `--nx-hairline` alias is removed.
`--nx-*` names are reserved for language tokens. A local control setting uses a
different name, such as `--slider-steps`.

`font.faces` is asset metadata, not CSS variables. Each face declares an exact
Fontsource package, WOFF2 file, family, weight range and style. The build checks
the pin and license and embeds font bytes with the OFL text in `tokens.css`.
This keeps `init` self-contained and previews offline. Font loading completes
before the build captures layout. The old semicolon-containing `font.webfont`
descriptor is rejected; emitting it as a variable produced invalid Tailwind CSS.

Charts reference semantic variables directly for fills, strokes, labels, fonts,
radii and spacing. Do not copy literal palette values into chart code or create
a second JavaScript theme object. Preserve existing language values. Previously
literal chart paints now have semantic roles in the language tokens; the ramp
contains the preserved roles used by the retained catalogue.

**Scoped overrides must work.** A root custom-property alias referencing another
variable resolves where it is declared. Overriding the base variable on a
child does not re-resolve that alias. Refer directly to `--nx-ink` for ink marks
instead of defining a root `--nx-chart-line: var(--nx-ink)` alias. The smoke test
changes tokens on a descendant scope and checks actual rendered paint.

The chart motion helper reads only animation values that Recharts requires as
JavaScript numbers/strings. It observes scope attributes, stylesheet loading and
system preference changes, and cleans up its observers. CSSOM-only mutations can
announce `nodex:tokens-changed`. Reduced motion is conservative during server
rendering; the initial motion duration is zero. Do not branch structural markup
on an after-mount motion preference.

All 24 primitives consume type, spacing, radius and interaction-motion roles in
addition to paint, fonts and strokes. Reuse the role's meaning, not just an equal
literal: Card and Dialog titles use `type.cardTitle`, Card padding uses
`space.cardPadding`, control text uses `type.control`, and button text uses
`type.action`. Canonical Card/title/caption values take precedence over their old
fixed CSS defaults. New roles preserve existing primitive values in both languages;
this wiring does not authorize a redesign of the remaining type scale or geometry.
Keep circular marks, native-control geometry and zero resets local. Interaction
motion has its own roles (`control`, `toggle`, `surface`, etc.); changing chart
`draw` must not turn a button hover into a chart-length transition. Every native
pseudo-element and progressive fallback must consume the same applicable roles.

`new-language` seeds shared roles from the checkout's canonical Mono Editorial
tokens and keeps neutral starter paint/system fonts; it must not maintain a second
hardcoded primitive-token list. The CLI smoke verifies the scaffold against all
primitive CSS. Consumer smoke delivers all 24 primitives and tests descendant
overrides, unaffected sibling scopes, retained form state, native keyboard/modal/
picker behavior and reduced motion in both languages.

## Build boundaries and validation

`packages/core` owns schema, taxonomy and source loading. It has browser-safe
schema/taxonomy entrypoints and a Node-only filesystem loader. The CLI imports
its types only so the published command stays independent of the monorepo.

`scripts/build-registry.ts` builds into an OS temporary directory, completes
validation and rendering, then publishes only:

- `public/r/registry.json`, `languages.json` and per-item JSON;
- `public/registry/` delivered sources, language assets and bundled previews.

Authoring source is never mutated. `--check` performs the same work in temporary
storage and leaves existing source and public files untouched. The contract test
compares both content and modification times. Build failures leave prior published
artifacts available. Run a normal build before commands that consume the manifest.

Metadata is authored explicitly. The build checks entry/file agreement, slug and
tier/storage consistency, taxonomy, legal density, featured items, exact package
versions, declared imports and unused delivery files. Every served file has an
explicit destination, and language assets have explicit manifest addresses too.
Unknown runtime imports and attempts to import examples fail the build.
The import closure includes TypeScript inline import types and external
import-equals declarations, even when their references disappear from emitted
JavaScript. Their paths must be declared and rewritten just like ordinary imports.
Primitive prop metadata documents the export that owns each custom or required
prop; inherited native attributes remain defined by the exported React types.

The runtime source contract currently supports TypeScript, CSS and JSON text.
CSS is self-contained; asset imports and binary delivery need a deliberate
extension before they can be authored. Do not silently read binary files as text.

**Source checks and rendering prove different things.** CLI source lint detects
literal paint, unknown token references and obvious unguarded motion. It cannot
execute arbitrary expressions or prove layout. Registry builds additionally run
real browser rendering and inspect resolved SVG paint, gradient stops and
screen-space stroke widths. Background knockouts and declared area strokes have
different semantics from ordinary outlines. Tests include invalid paint and
scaled strokes so conformance cannot pass merely because a parser skipped them.
Preview readiness accepts all supported SVG mark shapes; a chart composed of
rectangles and lines need not emit a path or circle before it can be inspected.

ESLint and TypeScript include registry code, examples and build scripts. Do not
reinstate the old registry-wide ESLint ignore. Run the required checks from
README after changes; consumer smoke is essential after modifying delivery.

## Previewing actual React

Recharts 3.10.1 emits an empty chart wrapper through `renderToStaticMarkup`, even
with explicit dimensions and animation disabled. The build therefore bundles and
mounts the actual example in Chromium. It captures the complete rendered example
as a static document, then includes a local bundle that mounts the same React
example for interaction. This is a browser snapshot followed by a client mount,
not React hydration or a second chart renderer.

Only build/test machines need Chromium. Dependencies are bundled locally;
previews have no chart-library CDN imports or runtime data fetches. Consumer
components remain client charts; their server-rendered HTML does not inherit
the gallery's build-time snapshot. Do not claim general Recharts SSR support.

The gallery embeds static preview URLs declared by the manifest. It never imports
registry source into its route bundle. Charts scale from each example's logical
width in thumbnails and detail pages; primitives render fluidly at native size.
Preserve each specimen's original proportions and preview padding. Gallery titles
are supplied by the gallery/caller; existing drawing annotations and console
status chrome belong to their components. There is no chart data disclosure.

Load-bearing preview behavior:

- Read an initial container width synchronously and keep the viewport-observer
  timeout fallback. Background tabs may not deliver observers promptly.
- Measure the example wrapper plus body padding, not document scrollHeight;
  document height cannot shrink below the existing frame height.
- Accept height messages only from the matching iframe window and only finite,
  positive numbers. Grid previews keep fixed boxes for aligned labels.
- Every grid ancestor holding a scaled frame needs `min-width: 0` or its wide
  logical content can force the grid open and cancel apparent scaling.

## The gallery dogfoods language tokens

The shell owns layout, interaction quality and motion; the language owns paint,
type, strokes and radii. RootLayout reads the built manifest and loads default
mono-editorial tokens before first paint. Client language switching uses explicit
asset addresses. The language index scopes each tile's tokens independently.
There is no independent gallery dark mode.

The shell still consumes curated primitive CSS classes for its existing markup.
`check:shell` checks those classes against `SHELL_PRIMITIVES` in RootLayout. Keep
the curation synchronized or a valid primitive class can render unstyled. New UI
can consume reusable primitive APIs; avoid an unrelated wholesale shell rewrite.

The landing is two scenes: name, then work. Actual registry previews fill its
belt. Each repeated pass owns its trailing gap; both passes must be identical
width for seamless `xPercent: -50`. Repeat a small catalogue to fill the belt.
Scene two stays a full viewport tall so the first scene can complete. Landing
looping is an explicit product exception; it does not relax registry motion rules.
GSAP is app-only and never enters delivered source.

`/` reads no cookie and remains static. `/languages` and `/login` read sessions;
`/l/*` routes derive static parameters from the built manifest. Next route files
await params and pass plain values to views. `apps/web/AGENTS.md` is generated
Next guidance; this root file remains the project architecture authority.

## Static distribution and CLI ownership

Public downloads bypass application handlers. The gallery copies built
`public/r/` and `public/registry/` into `apps/web/public/` before dev/build;
that directory is generated and must never be edited. CDN hosting exposes the
same paths with no server runtime.

CLI resolution is `--registry`, project `nodex.json`, `NODEX_REGISTRY`, then the
hosted default. It does not guess a registry from the working directory. An
explicit checkout root resolves to its built `public/`; an already-served root
works directly. `init` records the canonical selected root.

`add` preflights the complete file batch and packages before mutation. It copies
manifest targets, deduplicates identical helpers and protects differing files.
Pinned packages install using the consumer's detected package manager. Existing
conflicting versions require `--force`; React and the host toolchain are never
installed or replaced. `react-is` matches the consumer's installed React.
`--no-install` preserves package ownership and prints the required command.
An install failure can leave package-manager changes; source writes happen only
after the installer succeeds and paths are rechecked.

Local paths reject traversal and symlink escapes. Remote roots use HTTPS except
loopback development servers. Auth headers attach only to same-origin guarded
`api/` paths; redirects cannot forward credentials elsewhere. Both component
files and language files use explicit manifest addresses, so future guarded
assets need no convention-path special case in CLI commands.

`nodex.json` belongs in the consumer repository. `~/.nodex/auth.json` does not:
it is mode 0600 in a 0700 directory, keyed by registry origin. `NODEX_TOKEN`
overrides stored credentials; `NODEX_CONFIG_DIR` allows isolated tests. The CLI
publishes compiled JavaScript for Node 20+, with erased core type imports and no
runtime workspace dependency. Repo tooling itself needs Node 22.22+.

## Accounts and deployment constraints

GitHub OAuth and browser/CLI sessions are implemented, while all current
languages are public. Accounts sequence the gallery; no paid entitlements or
content restriction backend exists yet. A future restriction must protect the
route serving bytes, not just a page that links them. Static public files must
remain publicly cached. Explicit manifest addresses remove the old language-asset
addressing blocker but do not implement authorization by themselves.

Preserve these authentication decisions:

- Accounts key on GitHub numeric ID, not renameable login.
- Cookies contain opaque random session tokens; the database stores SHA-256.
- OAuth state is httpOnly, compared in constant time and deleted after use.
  Errors redirect with fixed public tokens, never upstream messages that might
  include request credentials.
- `currentUser` touches cookies before checking configuration so prerendering
  cannot cache an unconfigured signed-out result. `/languages` also declares
  force-dynamic.
- Device authorization returns a Nodex CLI session, never a GitHub token.
  Approval is a form POST. Codes use unbiased random selection and avoid
  ambiguous characters; successful exchange consumes the device request.

The monorepo has one root `.env`, explicitly loaded by Next. It is optional for
public builds. Database, OAuth credentials and `NEXT_PUBLIC_SITE_URL` are read by
server code at runtime. `NEXT_PUBLIC_REGISTRY_URL` is read in client code and is
therefore baked into the browser bundle; Docker exposes it as a build argument.
Do not infer timing solely from the environment variable's prefix.

Next supplies same-origin account/device routes and standalone deployment. Docker
builds the registry before the site and keeps Chromium out of runtime. Migrations
retain their monorepo path in the image because the migration runner resolves
relative to its own location. Helm uses an external database and migration Job.

## Primitive and chart gotchas

- Input IDs use `useId`; independent instances and radio groups must not collide.
- Native Dialog uses `showModal`/`close`; inline mode exists for specimens. Preserve
  Escape, focus return and controlled state behavior.
- Select and tooltip CSS use progressive browser features with fallbacks. Keep
  native fallback styling. A CSS tooltip remains a visual hint, not a complete
  accessible headless tooltip widget; use a headless behavior layer where needed.
- Select's `autoWidth` must opt out of the field wrapper's cross-axis stretching;
  `width: auto` alone still fills a column flex container.
- Invalid chart values are unavailable, not synthetic data. Empty datasets
  render an explicit state. Matrix zero means
  measured absence, while an omitted pair means missing.
- Arc-matrix retains absolute area and tone encoding: a value has the same mark
  size and shade across datasets. Do not normalize its marks to each input maximum.
- Endpoint source, window and freshness come from caller props. The existing
  example supplies its original sample labels; the runtime does not invent them.
- Endpoint observations require only the encoded `route` and `p99Ms` fields.
  Unused request-rate values belong to sample/application data, not the chart API.
- Arc-matrix has one observation series so guide curves cannot become tooltip or
  keyboard stops. Its custom active cells use stable observation identifiers.
- Dual-area coordinates a reversed spend bar plot with a sign-up area plot.
  Both retain identical ordered rows and band scales, including unavailable
  measures. Recharts' public tooltip hooks publish the inspected day to local
  React state, and two ReferenceLines place aligned cursors through the scales.
  `syncId` alone leaves a receiving plot's prior mouse/keyboard state active,
  which can strand its cursor on another day. Input ownership follows pointer
  movement, focus and keydown; only that plot displays the combined tooltip.
  Selection and gradient IDs belong to each component instance. Spend retains
  its original $18K scale ceiling unless larger caller values require expansion;
  sign-ups use a zero-based scale.
- Recharts prioritizes a plot's active mouse hover over its keyboard selection.
  Move the pointer away for keyboard-only inspection. The coordinated chart
  follows the library's selected observation; it does not replace keyboard
  navigation or reach into the library's private state.
  Focus can retain an earlier index; browser tests establish selection with real
  arrow keys and allow the library's animation-frame input throttling to settle.
- Petal-rose uses one equal-angle Pie with a per-observation outer radius.
  Library Sector shapes compose the track and petal; labels share that
  observation, so decorative layers cannot become extra keyboard stops.
  Radius grows linearly from the inner ring to the current dataset maximum,
  preserving the old rose renderer's actual encoding despite its `area` name.
  Zero leaves no petal; do not copy the old all-zero midpoint-radius bug.
  Label contrast retains the specimen's 8-of-12 reach threshold as a ratio so
  changing count units cannot put light labels onto short, pale petals.
  The 5px background strokes are knockout gaps, not data outlines. Numeric
  labels use `type.plotValue`, separate from card headings.
- Recharts vertical bars advance to the next route with ArrowLeft in the pinned
  release; the accessible description documents the library's direction.
- The bar family uses Recharts Bar series, category indices and public scale
  hooks. Repeated labels do not merge categories. Chunky-bars keeps caller order
  while rank selects tone, and zero retains a label without a visible bar.
  Rung charts require nonnegative safe integers: each mark is exactly $1K, so
  silently rounding fractional counts would change the data. Shared `rung-marks`
  owns only unit marks and their preserved deterministic width/opacity variation;
  each component retains its series, scales, geometry, types and annotations.
  Paired-rungs has two real series and a combined plan tooltip. Stacked-rungs
  stacks three actual counts, then shifts custom marks by one scale unit per
  preceding segment to retain gaps without adding synthetic revenue to the stack.
  An incomplete region suppresses its whole stack and total; treating a missing
  segment as zero would misplace every later segment. Categories remain available
  to keyboard inspection. Totals use the library's LabelList so zero/unavailable
  labels survive zero-height bar filtering. Rung thickness uses `stroke.mark`;
  numeric label sizes derive from `type.plotValue` with preserved proportions.
- Recharts makes the chart SVG focusable. Suppress its browser outline for
  pointer focus and style `:focus-visible` with language ink and mark-stroke
  tokens. Pie sectors can also receive pointer focus despite `tabindex="-1"`;
  include these descendants in the same treatment. Keep the accessibility layer
  and keyboard navigation enabled.

## Remaining scope

The POCs establish source delivery and token behavior, not parity with the old
catalogue. Further chart families, specialist library selection, arbitrary asset
delivery and large-data performance need their own evidence. Consumer server
rendering remains limited by Recharts. Commercial provenance for material revived
from older samples needs review; deleting old files does not establish a license.

Two skills serve different audiences: `skills/nodex/SKILL.md` teaches downstream
use and must contain no registry-authoring procedure;
`.agents/skills/nodex-authoring/SKILL.md` owns the repository procedure. Keep the
split, and replace obsolete instructions when the architecture changes.
