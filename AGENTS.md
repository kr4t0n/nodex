# AGENTS.md

Architecture and reasoning for nodex. This root document is the project's high
level source of truth. Procedures live in the [authoring skill](.agents/skills/nodex-authoring/SKILL.md);
setup, commands and contribution flow live in [README.md](README.md). Update them
alongside architectural or usage changes.

## Design languages determine form

Conventional libraries are tokens × components: one shape, many themes. That is
sufficient for primitives, where identity mainly changes paint. Expressive charts
also encode identity through geometry, annotation and information density.

- **Expressive components** belong to one language under
  `registry/languages/<language>/expressive/`.
- **Primitives** live once under `registry/primitives/` and accept every language's
  shared token roles. Their React APIs wrap native elements and retain editable CSS.

Preserve established specimen data, titles, copy, encoding, proportions and
language values unless the task explicitly changes them. Maintenance does not
authorize new controls, annotations, demo variants or unrelated dependency upgrades.

Each language's `DESIGN.md` is a downstream foundation for all UI, including
projects with no charts. It covers visual atmosphere, semantic token roles,
typography, spacing, geometry, interaction, motion and anti-patterns. Keep named
chart descriptions, specimen dimensions, reconstruction history and runtime/build
procedures out of it. Public types and `meta.json` own component data contracts;
local comments explain non-obvious implementation choices, and consumer tests
exercise regressions. Read those alongside the relevant component before changing
it. Avoid maintaining a second description of its implementation in separate docs.
The authoring skill holds procedures; `DESIGN.md` and `tokens.json` remain the
language's visual authority.

The manifest is the catalogue, not the folder layout. A slug names the item;
`component` names its cross-language type. Types describe marks and encoding,
not animation or business domain. Taxonomy lives in `packages/core/src/taxonomy.ts`.

The language gallery sorts charts by `component`, then title, then slug for ties.
Search and type filters retain that order. Featured lists keep their authored order.
The language index takes up to four previews from `meta.json`'s `featured` list;
the full catalogue count does not fill empty slots. Empty featured lists fall
back to primitives. Keep curation explicit as the catalogue grows.

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
Recharts is the default even for simple charts; all current charts use its scales,
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
static `@fontsource` or variable `@fontsource-variable` package, WOFF2 file,
family, weight or weight range and style. The build checks
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
fixed CSS defaults. New roles preserve existing primitive values in the original languages;
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
picker behavior and reduced motion in all six languages.

Structural outlines use `color.border`, independently of quiet `color.grid`
fills. Primary action fill, lettering, border and hover paint have `color.action*`
roles so a bright action does not require changing body ink. These roles retain
the prior values in Mono Editorial and Signal Console. `shadow` roles contain
offset/blur geometry only; each primitive composes them with `--nx-ink` where it
is rendered so descendant ink overrides recolor the actual shadow. Flat languages
use zero offsets. Plain cards never cast shadows. Button press travel comes from
`motion.press.x/y`; reduced motion preserves the resting position and shadow,
and disabled actions do not respond to hover or press. Inverted secondary text
uses `onDarkMuted` rather than the supporting text color for paper.
The language scaffold copies canonical color role names into a neutral palette
and carries the canonical shadow roles, without a separate primitive-role list.

Surface, field, selection, badge and value paints have independent semantic
roles. Neo-brutalism uses lilac panels, cream fields, mint selections, pink
solid badges and blue/violet value marks while retaining dark text and outlines.
Plain cards use the page ground; inverted cards retain their inverse roles.
Checkbox ticks, mixed marks and switch thumbs use `selectionText`, not the page
background. Native select fallback/options/picker and both engines' progress and
slider pseudo-elements must consume the same applicable paint roles. The original
languages retain their prior paints through the new roles.

## Build boundaries and validation

The repository uses the pnpm version pinned in `packageManager`, one
`pnpm-lock.yaml` and `pnpm-workspace.yaml`; local core references use
`workspace:*`. Declare tooling dependencies where they are read: root scripts
need `pg` and `tailwindcss` even when the web app also declares them. Keep the
project-local virtual store so font package realpaths remain under
`node_modules`; do not relax font asset containment for symlinked installs.
The workspace preserves pre/post scripts for web asset synchronization and
explicitly allows only required dependency builds. CLI consumer manager
detection and the disposable npm consumer fixture remain independent of the
repository's package manager. Contributor commands live in README.

The [contributor setup](README.md#develop-the-registry-and-gallery) owns hooks and
prerequisites; [verification](README.md#verification) owns commands and CI coverage.
Do not bypass the staged secret scan or the full-history CI scan.

`packages/core` owns schema, taxonomy and source loading. It has browser-safe
schema/taxonomy entrypoints and a Node-only filesystem loader. The CLI imports
its types only so the published command stays independent of the monorepo.

`scripts/build-registry.ts` builds into an OS temporary directory, completes
validation and rendering, then publishes only:

- `public/r/registry.json`, `gallery.json`, `languages.json` and per-item JSON;
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
React/JSX accessibility and hook order/dependency rules cover the same authored
source; Next rules are scoped to the web app. TypeScript owns prop validation,
and Prettier owns style. Hook lint does not opt the source into React Compiler.
Warnings fail CI. Keep exceptions local and explain the native keyboard or
delivery contract that a static rule cannot infer.

Prettier owns formatting and Tailwind utility order, using the web app's v4
stylesheet entry. Preserve whitespace inside class strings: conditional template
fragments include leading separators that must not collapse adjacent classes.
Format authored registry source, including delivered modules;
never format generated build artifacts or imported third-party skills. The
repository's authoring and consumer skills remain in scope. Keep a mechanical
formatting baseline separate from behavioral fixes so review can distinguish them.

## Gallery and preview runtime

[The registry build](scripts/build-registry.ts) mounts actual React examples in
Chromium because Recharts does not emit chart marks through server rendering.
Standalone previews contain browser snapshots and a local bundle that mounts the
example; this is not React hydration. Dependencies are bundled for offline use.
Only build/test machines need Chromium. Consumers still receive client charts.

[The public sync](scripts/sync-registry-public.ts) copies the built artifacts and
generates explicit lazy imports for the website from each example's metadata.
The website renders those examples in its own React/Recharts tree, with loading
boxes instead of iframes or snapshot HTML injection. Keep website and registry
React types pinned together; ref cleanup types differ across versions. Deploy
the catalogue, public assets and rebuilt website together when examples change.

[Preview](apps/web/src/components/Preview.tsx) owns framing and measurement;
[preview-startup](apps/web/src/lib/preview-startup.ts) owns the page-wide startup
queue. Read their local comments and [gallery checks](scripts/smoke-gallery.ts)
before changing loading behavior. Preserve these boundaries:

- Startup is bounded and viewport-aware, with a fallback for delayed observers.
  Cancel queued work and release active slots on navigation. Retain mounted
  examples so scrolling preserves their interaction state.
- Measure height in unscaled CSS pixels. Transformed bounds feed thumbnail scale
  back into layout. Scaled grid ancestors need `min-width: 0`.
- Scale the complete chart after removing only measured standalone page insets.
  Keep internal padding, corners and original proportions; primitives stay native-size.
  Examples must fit their content before scaling; clipping is not a sizing fix.
- Preview controls must not sit inside navigation anchors. Titles own navigation;
  placeholder specimen links must not scroll the host. Inline dialogs stay local.
- The shell owns layout and behavior; scoped language tokens own visual treatment.
  There is no independent gallery dark mode. Keep `SHELL_PRIMITIVES` synchronized.
  The token panel reads canonical tokens; its labels must not define a second palette.
- The landing demo plays once and hands off to its existing prompt without stealing
  focus or reopening on scroll/theme changes. Its parser changes page tokens;
  it never executes a shell. GSAP is app-only. Background/offscreen playback pauses;
  reduced motion enters the interactive state. [Landing checks](scripts/smoke-landing.ts)
  own the detailed handoff, keyboard and responsive regression cases.
- `/` reads no cookie and stays static. `/languages` and `/login` read sessions;
  `/l/*` parameters come from the built manifest. Route files await params.
  `apps/web/AGENTS.md` holds generated Next guidance; this root is the architecture authority.

## Static distribution and CLI ownership

Public downloads bypass application handlers. The gallery copies built
`public/r/` and `public/registry/` into `apps/web/public/` before dev/build;
that directory is generated and must never be edited. CDN hosting exposes the
same paths with no server runtime. The sync also generates the website's lazy
example imports; catalogue, assets and website code must be deployed together.

The build projects `r/gallery.json` from the validated, rendered registry, omitting
only `files[].content`. Browser discovery and server route generation use this
smaller manifest. `GalleryItem` excludes embedded source at the type boundary;
all item metadata and explicit file addresses remain available, including shell
stylesheets. The CLI still uses the full `r/registry.json` and per-item JSON.
Never shrink those source-delivery artifacts to optimize the gallery. Publish
the new gallery manifest with the corresponding app, including on external CDNs.

[CLI configuration](packages/cli/README.md#registry-and-credentials) owns resolution
precedence, local/remote registry selection and credential storage. Do not guess a
registry from the working directory; `init` records the canonical selected root.

CLI discovery JSON projects runtime files to `path` and `target` explicitly.
Do not serialize manifest file objects unchanged: their embedded source would
flood `search` and `show`, especially for charts with large geography modules.
Lint defaults to the configured component directory; `add --to` does not change
that path. Every lint target must exist and yield supported source. Missing or
empty targets are errors, including when another target contains valid files.

`add` preflights the complete file batch and packages before mutation. It copies
manifest targets, deduplicates identical helpers and protects differing files.
Pinned packages install using the consumer's detected package manager. Existing
conflicting versions require `--force`; React and the host toolchain are never
installed or replaced. `react-is` matches the consumer's installed React.
`--no-install` preserves package ownership and prints the required command.
An install failure can leave package-manager changes; source writes happen only
after the installer succeeds and paths are rechecked.

Package-manager detection walks from the app through the nearest Git root,
including `.git` file boundaries for worktrees and submodules. The closest
directory with a declaration, lockfile or `pnpm-workspace.yaml` supplies the
manager; an explicit `packageManager` wins within that directory. Installation
stays in the app, and its dependency declarations and React versions remain
authoritative. Preflight checks lockfile paths in both the app and the selected
parent directory before invoking the installer.

Local paths reject traversal and symlink escapes. Remote roots use HTTPS except
loopback development servers. Auth headers attach only to same-origin guarded
`api/` paths; redirects cannot forward credentials elsewhere. Both component
files and language files use explicit manifest addresses, so future guarded
assets need no convention-path special case in CLI commands.

Project config must never contain a token. Credentials are private, origin-keyed
user state. The CLI publishes compiled JavaScript for Node 20+, with erased core
type imports and no runtime workspace dependency; repo tooling needs Node 22.22+.

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
  include request credentials. Post-auth destinations are fixed relative paths;
  `NEXT_PUBLIC_SITE_URL` configures GitHub's callback and the device verification
  URL, not the origin of an authenticated browser's redirect. OAuth fetches reject
  redirects and validate token/profile JSON before using credentials or writing users.
- `currentUser` touches cookies before checking configuration so prerendering
  cannot cache an unconfigured signed-out result. `/languages` also declares
  force-dynamic.
- Device authorization returns a Nodex CLI session, never a GitHub token.
  Approval is a form POST. Codes use unbiased random selection and avoid
  ambiguous characters; successful exchange consumes the device request through
  `DELETE ... RETURNING`. Only the deleting poll can mint a session, even when
  concurrent polls read the same approval. Consumption precedes session creation;
  a storage failure requires a new sign-in, rather than replaying an approval.
- `NODEX_API` overrides the registry root for account requests. Every device
  operation validates HTTPS (HTTP only on loopback), rejects embedded credentials,
  queries and fragments, and disables redirects before sending a device code or
  bearer token. Validation belongs at the transport boundary as well as selection.

The monorepo has one root `.env`, explicitly loaded by Next. It is optional for
public builds. Database, OAuth credentials and `NEXT_PUBLIC_SITE_URL` are read by
server code at runtime. `NEXT_PUBLIC_REGISTRY_URL` is read in client code and is
therefore baked into the browser bundle; Docker exposes it as a build argument.
Do not infer timing solely from the environment variable's prefix.

Next supplies same-origin account/device routes and standalone deployment. Docker
builds the registry before the site and keeps Chromium out of runtime. Migrations
retain their monorepo path in the image because the migration runner resolves
relative to its own location. Root declares `pg` for that migration script;
Next's standalone trace must retain its root link and pnpm dependency closure.
The Docker CI check resolves it from the migration script in the final image.
Helm uses an external database and migration Job.

Contribution and release steps live in [README.md](README.md#contribution-flow).
Ordinary branches target `dev`; releases go from `dev` to `main` only when requested.
Never commit directly to either long-lived branch. Preserve the publishing invariants:

- CLI version and release tag must match; app and migration images share the Helm
  `appVersion`. Published chart versions are immutable.
- Build and pack with pnpm to rewrite workspace references, then publish the exact
  tested tarball with npm for OIDC. Do not restore token-presence guards or token-based
  npmrc generation: they break trusted publishing. Keep package-manager caching disabled.
- PR verification and npm releases share `smoke:pack`: it builds and packs the CLI,
  checks the installed bin in an isolated npm consumer against the built registry,
  and optionally retains the tested archive for publication without repacking.
- Check artifacts as well as workflow status; absent Docker credentials skip publication.

## Cross-cutting rendering gotchas

- Input IDs use `useId`; independent instances and radio groups must not collide.
- Native Dialog uses `showModal`/`close`; inline mode exists for specimens. Preserve
  Escape, focus return and controlled state behavior.
- Select and tooltip CSS use progressive browser features with fallbacks. Keep
  native fallback styling. A CSS tooltip remains a visual hint, not a complete
  accessible headless tooltip widget; use a headless behavior layer where needed.
- Select's `autoWidth` must opt out of the field wrapper's cross-axis stretching;
  `width: auto` alone still fills a column flex container.
- Native slider tracks need a local 1px minimum. Firefox can snap a sub-pixel
  track and its value fill out of view at some vertical positions, even when
  Chromium paints the same CSS. Apply the floor to both engines' tracks and
  Firefox's progress segment, and use the same effective height to center the
  WebKit thumb. Preserve the language's hairline token for other components.
- Invalid chart values are unavailable, not synthetic data. Empty datasets
  render an explicit state. Matrix zero means
  measured absence, while an omitted pair means missing.
- Recharts prioritizes a plot's active mouse hover over its keyboard selection.
  Move the pointer away for keyboard-only inspection. The coordinated chart
  follows the library's selected observation; it does not replace keyboard
  navigation or reach into the library's private state.
  Focus can retain an earlier index; browser tests establish selection with real
  arrow keys and allow the library's animation-frame input throttling to settle.
- Recharts vertical bars advance to the next route with ArrowLeft in the pinned
  release; the accessible description documents the library's direction.
- Recharts makes the chart SVG focusable. Suppress its browser outline for
  pointer focus and style `:focus-visible` with language ink and mark-stroke
  tokens. Pie sectors can also receive pointer focus despite `tabindex="-1"`;
  include these descendants in the same treatment. Keep the accessibility layer
  and keyboard navigation enabled.
- Recharts Scatter spreads internal observation fields into symbol props. A
  field named `option` replaces the custom shape with a default symbol. Keep
  public business fields on the caller API, but map collisions to distinct
  internal names before passing observations to the library.

## Remaining scope

New chart families, specialist library selection, arbitrary asset delivery and
large-data performance need their own evidence. Consumer server
rendering remains limited by Recharts. Commercial provenance for material revived
from older samples needs review; deleting old files does not establish a license.

## Skills and documentation boundaries

Two skills serve different audiences: `skills/nodex/SKILL.md` teaches downstream
use and must contain no registry-authoring procedure;
`.agents/skills/nodex-authoring/SKILL.md` owns the repository procedure. Keep the
split, and replace obsolete instructions when the architecture changes.

The 13 imported design skills under `.agents/skills/` are opt-in references, not
repository defaults. Use one only when the task calls for it; its aesthetic,
layout, animation or image-generation preferences are subordinate to the task,
the selected language's DESIGN.md/tokens and this architecture. Do not apply a
style overhaul merely because a skill is installed. Preserve upstream skill files;
this repository boundary governs how they are used here.
