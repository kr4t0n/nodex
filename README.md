# nodex

A design-language-first registry of editable React components. Pick a language,
receive its tokens and written design rules, and copy components into your app.
Expressive charts belong to a language because their geometry carries its
identity. Primitives share one implementation and change appearance through tokens.

The registry contains the complete original **65-chart catalogue**, **nine Neo-brutalism
charts**, and **24 reusable primitives**, delivered as editable React source. Nine initial
charts validated the source-delivery and token contract; the remaining specimens
now use the same workflow. Run `nodex list` against the built registry for the
current catalogue. The previous implementations remain in Git
history at `099f1ef`; there is no legacy HTML/mount-function compatibility path.

Three design languages are available: Mono Editorial, Signal Console and
**Neo-brutalism**. Neo-brutalism starts with all 24 shared primitives, a complete
token set and a [design guide](registry/languages/neo-brutalism/DESIGN.md).
It uses embedded Space Grotesk and JetBrains Mono, warm ivory, lilac panels,
yellow actions, pink badges, mint selections, cream fields and blue value
marks. Compact corners, larger controls and hard offset shadows give it a tactile
feel; pressed buttons fully consume their shadow. Nine expressive charts are
available at `/l/neo-brutalism`:

- **Block Bars** (`block-bars`): outlined category columns with direct labels.
- **Punch Area** (`punch-area`): an angular mint trend with square markers and the
  final supplied reading, including an unavailable state for a missing last value.
- **Split Ring** (`split-ring`): exact part-to-whole angles with a hard shadow and
  a labelled key; incomplete allocations never become misleading percentages.
- **Stacked Blocks** (`stacked-blocks`): absolute horizontal stacks with stable
  series colors, segment values and row totals on a common zero baseline.
- **Bridge Waterfall** (`bridge-waterfall`): signed changes between opening and
  closing balances; missing changes break the balance until a new start.
- **Twin Pins** (`twin-pins`): circles and squares compare two readings on a shared
  scale, preserving available endpoints when their partner is missing.
- **Sticker Scatter** (`sticker-scatter`): equal-size, outlined marks compare two
  measurements, with stable identity colors and explicit unavailable counts.
- **Tile Heatmap** (`tile-heatmap`): blue intensity on a fixed caller-owned scale;
  dots mean measured zero and crosses mean missing or out-of-range readings.
- **Hundred Blocks** (`hundred-blocks`): one countable block per percent, requiring
  complete whole-percent shares that sum to 100.

Each chart accepts caller data and provides keyboard inspection, scoped tokens
and reduced motion. Dense plots scroll locally; ring and block-grid keys move
below their plots in narrow containers. The language index retains four curated
previews; the language gallery contains all nine charts.

The visual refinement draws on [ng-brutalism](https://github.com/khangtrannn/ng-brutalism/tree/76f9640d3dad8c43bb300149d78a77ce7e43954d):
compact radii, generous control sizing, punchy accents and a small badge shadow.
Nodex implements these through its own semantic tokens and React primitives.

## Develop the registry and gallery

Prerequisites: Node **22.22+** (CI and Docker use Node 24), npm 10+, and Chromium
installed through Playwright. No database or credentials are needed to build.

```bash
npm ci
npx playwright install --with-deps chromium
npm run build:registry
npm run dev
```

The gallery runs at `http://localhost:4180`. Production: `npm run build`, then
`npm start`. Rebuild the registry after editing its source; the gallery reads
built artifacts. `dev` and the web build copy those artifacts into the app's
public directory automatically.

The language overview shows up to four previews from each language's `featured`
list in `registry/languages/<slug>/meta.json`, in the authored order. Its component
badge counts the full catalogue; adding charts does not automatically feature
them. Rebuild the registry and restart dev after changing this list.

## Use components in a React app

The current component platform is **React 19, React DOM, TypeScript and
Tailwind CSS 4**. Primitives use React 19's ref-as-prop API. Nodex keeps the host
application's platform packages under the application's control.

To try this branch before publishing, build the registry, then run the source
CLI from an existing consumer app using absolute checkout paths:

```bash
node /path/to/nodex/packages/cli/src/index.ts init mono-editorial --registry /path/to/nodex/public
node /path/to/nodex/packages/cli/src/index.ts add hairline-line arc-matrix dual-area petal-rose button
```

The installed CLI provides the same commands as `nodex init` and `nodex add`.
Its default registry is the hosted deployment, which may have a different
version. Use `--registry` explicitly to exercise this reconstruction.

Release `0.2.0` pairs the CLI with a registry built from the new contract. Older
hosted manifests do not provide the required entry, file-target and language-asset
fields; the CLI intentionally reports that mismatch instead of guessing paths.

`init` writes `nodex.json`, `src/styles/nodex-tokens.css`, `docs/DESIGN.md`, and
a managed section of `AGENTS.md`. The design document defines the language's
visual foundations and token rules for all UI, including projects without charts.
Component descriptions and APIs belong to the component metadata and source.
To use Neo-brutalism with the built local registry:

```bash
node /path/to/nodex/packages/cli/src/index.ts init neo-brutalism --registry /path/to/nodex/public
node /path/to/nodex/packages/cli/src/index.ts add block-bars punch-area split-ring stacked-blocks button card
```

Preview it at `/l/neo-brutalism` after building the registry and starting the
gallery. The fonts and their licenses are embedded in the token stylesheet.
Structural outlines use `--nx-border`, independently of quiet `--nx-grid`
fills. Primary action colors use the `--nx-action*` roles. Panel and field fills
use `--nx-surfaceFill` and `--nx-fieldFill`; selection, badge and value colors
have independent roles so recoloring them does not change body text or borders.
Shadow tokens contain
only geometry and combine with scoped `--nx-ink` at each primitive; the original
languages keep zero-offset shadows and their existing colors. Button press
travel follows `--nx-motion-press-x` and `--nx-motion-press-y`, and reduced motion
retains the resting position and shadow.

Import the token stylesheet once after Tailwind in your application stylesheet:

```css
@import "tailwindcss";
@import "./nodex-tokens.css";
```

Ensure Tailwind scans the configured component destination. Its default
`src/components/nodex` location is inside the application's source tree. If
using a custom location outside automatic detection, add a Tailwind `@source`
entry for that location.

```tsx
import { HairlineLine } from './components/nodex/hairline-line/component';
import { Button } from './components/nodex/button/component';

const observations = [
  { label: 'Monday', value: 24 },
  { label: 'Tuesday', value: 38 },
  { label: 'Wednesday', value: 29 },
];

export function Report() {
  return (
    <section>
      <h2>Daily observations</h2>
      <HairlineLine data={observations} aria-label="Daily observations" />
      <Button onClick={() => window.print()}>Print report</Button>
    </section>
  );
}
```

Force networks preserve their deterministic layout, draggable nodes and, for the
dense mesh, background pan and scroll zoom. Their shared local force calculation
retains its upstream license notices; Recharts owns the scales, observations and
rendering. The simple force graph automatically fits its full layout into the
available frame, including node circles and labels, while keeping their sizes
and the force geometry intact. It adapts to resizing and refits after a drag is
released. The scatter morph advances on click through native scatter, ranked bar
and donut series, carrying each product's outline between encodings. Data updates
match products by stable ID so reordering records or changing revenue ranks keeps
each product's own starting geometry. Reduced motion settles networks immediately
and changes morph views without animation.

Each chart requires real data. Fixtures remain in registry examples. Gallery
titles belong to the caller; the original drawing annotations and console status
header/footer remain part of their charts. Charts have no data dropdown or table.
Barcode-lollipop omits the left description and legend, keeping its plot and footer key.
Primitive modules import their own required CSS.
Calendar peak notes and bubble-almanac marginal notes wrap above their plotted
marks. Almanac notes retain leader lines to caller-supplied targets, and its
numeric labels use the scoped background color to remain readable over bubbles.
`nodex show` documents the explicit props for charts and primitives; descriptions
identify which export owns a prop when an item contains several components.

The reconstruction preserves the previous specimens' data, copy, proportions
and language values. Changes are limited to React/Recharts composition, token
bindings and source-delivery architecture; new UI belongs in a separate change.

A typical installation contains:

```text
src/components/nodex/
  hairline-line/component.tsx
  arc-matrix/component.tsx
  dual-area/component.tsx
  petal-rose/component.tsx
  chunky-bars/component.tsx
  rung-bars/component.tsx
  paired-rungs/component.tsx
  stacked-rungs/component.tsx
  button/component.tsx
  button/component.css
  _shared/use-chart-motion.ts
  _shared/use-reduced-motion.ts
  _shared/rung-marks.tsx
```

Only declared, reachable runtime files are copied. There is no Nodex runtime
package, example dataset, preview bundle or ECharts adapter in the consumer.
`add` installs pinned chart dependencies using npm, pnpm, Yarn or Bun and
matches `react-is` to the consumer's React version. In a monorepo, initialize
Nodex in the React app package. The CLI inherits the closest package-manager
declaration or lockfile up to the Git root; `pnpm-workspace.yaml` also identifies
pnpm. Dependencies are still installed into the app package. `--no-install`
reports the packages for manual installation. Identical files are reused;
differing files or package versions require `--force`. Review that flag before
replacing code that the consumer has edited.

```bash
nodex list
nodex search --design mono-editorial --type line
nodex show mono-editorial/hairline-line --json
nodex add signal-console/endpoint-latency
nodex lint src/components/nodex/endpoint-latency --design signal-console
```

`search --json` and `show --json` return component metadata and file addresses
without embedded source. Read delivered code after `add` for full types and
implementation. `nodex lint` defaults to the configured component directory;
after `add --to src/charts`, check that destination with `nodex lint src/charts`.
Each lint target must exist and contain `.ts`, `.tsx` or `.css` source. Missing
or empty targets fail instead of reporting a successful check of zero files.

The latency chart requires `data` (each observation supplies `route` and `p99Ms`)
and `objectiveMs`. It uses signal-console's
tokens. When mixing languages, apply each language's token values to its own
ancestor scope; installing a chart does not switch the application's theme.
`init` selects one default language.

`dual-area` takes ordered `{ day, spendK, signUps }` observations. Spend is in
thousands of dollars; sign-ups are counts. Spend bars descend from the top and
the sign-up area rises below them, with aligned days and one combined tooltip.
Both plots support arrow-key inspection. Null, negative or non-finite measures
remain unavailable without removing the day; zero remains a measured value.
The spend scale retains its original $0–18K range and expands for larger values;
the sign-up scale starts at zero and adapts to the supplied data.

`petal-rose` takes ordered `{ name, count }` categories. Each category has the
same angle; its petal radius and tone compare its count to the dataset maximum.
Tracks and labels belong to the same observation, so hover and keyboard
inspection stop once per category. Zero leaves a track and a zero label;
unavailable counts retain their slot with an em dash. The numeric labels consume
`type.plotValue`; `plotTrack` and `markStrong` preserve the original track and
intermediate petal paints as language tokens.

The bar family preserves each specimen's original marks and labels:

| Component | Required observation fields | Encoding |
| --- | --- | --- |
| `chunky-bars` | `plan`, `mrrK` | Rounded bars; tone ranks revenue without changing plan order |
| `rung-bars` | `plan`, `mrrK` | One rung per $1K, with a counting dot every fifth rung |
| `paired-rungs` | `plan`, `beforeK`, `afterK` | Grey and ink rung stacks compare both measures for a plan |
| `stacked-rungs` | `region`, `coreK`, `addOnsK`, `servicesK` | Three revenue segments separated by empty rung positions |

Each component takes a required `data` array and the same optional dimensions,
`animate`, `className` and `aria-label` props as the other charts. Zero is measured;
null, negative and non-finite values are unavailable. The three rung charts require
whole thousands: fractional values are unavailable rather than rounded to marks.
An incomplete stacked region retains its category with an unavailable total and
no stack, because missing revenue cannot establish the next segment's baseline.
Keyboard inspection visits plans or regions, not each decorative rung. The shared
`rung-marks.tsx` is copied only with the rung charts and reused across them.

```bash
nodex add chunky-bars rung-bars paired-rungs stacked-rungs
```

The next bar variants extend that composition:

| Component | Required observation fields | Encoding |
| --- | --- | --- |
| `rung-histogram` | `fromHours`, `toHours`, `tickets` | One rung per integer ticket; interval ticks and a median flag |
| `diverging-bar` | `segment`, `netAccounts` | Signed bars extend from zero; tone and caps reinforce direction |
| `range-capsules` | `day`, `lowK`, `highK` | Each capsule spans an observed minimum and maximum |
| `rung-waterfall` | `label`, `kind`, and `valueK` for starts/changes | Integer changes update a running total; broken rungs mark deductions |

Waterfall `kind` is `start`, `change` or `total`. A start sets the running value,
a change adjusts it, and a total displays it. An unavailable change leaves later
totals unavailable until a new start; labels have no arithmetic meaning. Missing
histogram counts suppress the median. Reversed ranges are unavailable, while
equal endpoints preserve their observation with no visible capsule.

```bash
nodex add rung-histogram diverging-bar range-capsules rung-waterfall
```

The scatter and heatmap components also require caller observations:

| Component | Data contract |
| --- | --- |
| `plumb-scatter` | Product, price percentile and satisfaction; both measures range from 0 to 100 |
| `single-axis` / `dot-heat` | Day, hour and ticket count; the former uses linear diameter, the latter the original square-root size curve |
| `brand-spectrum` | Opposing traits, our position and competitor positions, all on a 0–1 scale |
| `matrix-heat` | Feature labels and a square matrix of co-usage percentages; self-pairs are inapplicable |
| `matrix-heat-glance` | Feature labels and ordered releases with adoption percentages |
| `calendar-heat` | Ordered week labels and Monday–Sunday deploy counts; optional period and peak labels come from the caller |
| `dotty-matrix` | Ordered squads with task matrices indexed by lane and week |
| `beeswarm` | Deal values in thousands and enterprise flags; one dot per deal, piled into calibrated lanes |
| `violin` | Plan labels, observed reply times and positive density bandwidths in hours |
| `tick-box` | Plan labels, ordered five-number summaries and individual outliers in hours |
| `hairline-area` | Ordered days and values in thousands, with caller-supplied sparse axis labels |
| `jitter-strip` | Nonnegative hours with caller-supplied fractional band positions; ordered band labels |
| `trend-lineage` | Feature events, survival state and an explicit year window; incomplete timelines are unavailable |
| `type-colonnade` | Ordered repository ownership indices and team labels, with derived team counts |
| `dumbbell-queue` | Before/after whole-minute times; one bead per saved minute, with independently available endpoints |
| `rank-strip` | Positive integer product ranks and ordered periods; rows sort by the final period, with unavailable finishes last |
| `force-graph` | Caller hub and service IDs, monthly syncs and side roads; preserved force layout, dragging and adjacency |
| `force-graph-dense` | Service domains, daily calls and explicit weighted links; preserved mesh physics, dragging, pan and zoom |
| `scatter-morph` | Stable product IDs, price, satisfaction and revenue; reader-controlled scatter/bar/donut outline transitions |
| `choropleth-states` | State sign-ups, preserved geographic insets and five-band controls; optional caller annotations |
| `choropleth-world` | Country monthly actives, the original latitude window and five-band controls; offline geography |
| `tree` | Caller root, product areas and feature membership; tidy hierarchy layout with all branches expanded |
| `nested-treemap` | Complete team effort hours grouped by area; native nested layouts, header bands and derived shares |
| `circular-graph` | Ordered teams and indexed ties; headcount diameters, weighted threads and adjacency inspection |
| `circular-graph-dense` | Repositories, organizations and shared-contributor ties; diameter-aware ring spacing and selective rotated labels |
| `aggregate-sankey` | Complete channel-to-plan counts; ranked source tones, native weighted layout and node/link inspection |
| `parallel-coords` | Caller dimensions and scored ranges; complete product paths, axis brushing and derived best-all-round highlight |
| `thread-triptych` | Ordered route endpoints and volume; one continuous weighted path through three caller-owned columns |
| `cluster-field` | Whole core and island contributor counts, caller layout positions and explicit cross-contribution flags |
| `hourglass-stream` | Whole stage populations, nearest-40-person ticks and exact adjacent conversion rates |
| `stream-ribbon` | Ordered surfaces and weeks in a regular stacked area, preserving the original renderer’s actual encoding |
| `bubble-almanac` | Indexed product/year ticket counts and beta flags, with caller event shelf and marginal notes |
| `candlestick` | Ordered open/close/low/high quotes; hollow up bodies, ink down bodies and unchanged-price marks |
| `radial-patchwork` | Deployment hour, angular window, files touched and incident status; overlapping independent sectors |
| `radial-convergence` | Explicit request-to-theme assignments; hub area counts actual assignments |
| `bar-race` | Period revenue frames with stable product IDs; one playback, replay, and final-frame reduced motion |
| `stagger-delay` | Caller-ordered market values, magnitude tones and a token-timed bar stagger |
| `dynamic-data` | Caller samples and static source status; last sample owns the current value |
| `draw-in-counter` | Daily bookings and period label; cumulative area and exact headline share the library animation |
| `dot-cascade` | Whole incident counts above a sloping baseline; odd totals round the final two-incident dot up |
| `launch-fan` | Feature launch weeks and caller week guides, projected through the original fan |
| `donut-redesigned` | Complete whole-percent source shares in a ten-by-ten dot grid |
| `custom-pie` | User shares determine angle; minutes determine radius, with caller reference scale and rings |
| `tick-donut` | Ordered whole-percent channel shares totaling 100; one tick per percent |
| `tick-gauge` | Whole-percent progress and caller goal label; 100 reached or remaining ticks |
| `pictorial-bar` | Yearly trees in thousands and a caller target; continuous bars clip a repeated tree texture |
| `tick-rows` | Whole release counts by team; one tick per release and one counting dot per five |
| `barcode-lollipop` | Day labels, peak users and weekend flags; unavailable readings retain their calendar hairlines |
| `hundred-field` | Up to four whole-percent disposition shares; each dot is one person in a hundred, with no invented unallocated people |
| `ballot-tally` | Each option has a whole picked count out of 100; repeated choices permit row totals above 100. Automatic height reserves readable spacing for each option's heading and ticks |
| `ridgeline` | Ordered pipeline density profiles with unique nonnegative hours and nullable density weights |

Tick-donut and tick-gauge keep circular geometry at responsive and explicit
dimensions. Their ticks and counting guides share equal axis scales, and the
gauge fits its complete arc inside the plot.

Heatmaps preserve measured zeros and omit unavailable observations. Their fixed
percentage bands do not rescale to the input maximum. The co-usage legend retains
its band toggles, with independent state per instance. Decorative guides and peak
annotations do not introduce extra keyboard stops. Use `nodex show <slug>` for
each exported type and prop contract.

The violin accepts observed values, with its sample generation confined to the
example. Each plan's density is normalized to its own peak and uses the supplied
bandwidth. Violin and beeswarm preserve the specimens' upper-middle median
convention. Beeswarm retains its $180K/44-lane calibration when the visible scale
expands for larger deals.
Boxplot outliers remain available even when their plan's summary is unavailable.
Hairline-area retains missing days as gaps in its line, with one native Bar mark
per available day and a Line dot for the maximum.
Ridgeline normalizes each supplied profile to its own maximum and retains the
specimen's presentation without visible row labels or a tooltip. Keyboard
inspection announces the actual selected hour to assistive technology; an
unsampled hour in another profile remains unavailable.

## Tokens and rendering

Language `tokens.json` is canonical. The build emits CSS custom properties;
chart paint, text, strokes and motion refer to those properties. A scoped
`--nx-ink` override affects descendant chart marks directly. Motion helpers
resolve the numeric values that the chart library needs and honor reduced motion.
No parallel JavaScript palette or theme provider is required.

All 24 primitives consume language tokens for typography, spacing, radii and
interaction timing as well as paint, fonts and strokes. Card and Dialog titles
use `type.cardTitle`; Card padding uses `space.cardPadding`. These existing roles
now determine their defaults, including Signal Console's smaller titles and
tighter Card padding. Controls use shared roles such as `type.control`,
`type.action`, `space.controlPadding` and `space.fieldGap`. Newly introduced roles
preserve the previous primitive values. `motion.control` governs control feedback
independently of chart `motion.draw`; both honor reduced motion. Override the
generated variables on any ancestor to theme that subtree without remounting it.
Structural values such as circular marks and native-control geometry stay local.

The token stylesheet also embeds the declared fonts and their Open Font License
text. Inter and JetBrains Mono come from pinned Fontsource packages; copying the
stylesheet includes the font bytes without Google Fonts requests. Current faces
use Latin subsets, with the declared platform stacks providing other glyphs.

These are React components for the **web**, using DOM/SVG. “React native” in the
architecture discussion means declarative React composition, not the React
Native mobile framework.

The pinned Recharts version does not emit chart marks through React server
rendering. The registry build renders the actual examples in Chromium, checks
their resolved paint and stroke widths, and stores complete static previews.
Local JavaScript bundles then mount the same examples for interaction. This is
not React hydration. Downstream applications receive ordinary client charts;
the gallery's pre-rendered snapshot is not a server-rendering guarantee for
consumer apps.

Gallery previews give chart compositions and primitive examples the same 28px
top and left inset. Charts scale within that frame using build-measured outer
spacing; their internal layout and standalone preview proportions are preserved.
Primitives continue to render at native size.

Within each language, charts are sorted alphabetically by chart type, then title.
Search results and type filters retain this order.

## Source and build layout

```text
registry/
  _shared/                         copied support modules, declared per item
  primitives/<slug>/
    component.tsx                  reusable API, types and private helpers
    component.css                  preserved native-control visual treatment
    example.tsx                    gallery composition and fixtures
    meta.json                      explicit public contract
  languages/<slug>/
    meta.json                      identity, visibility, featured charts, density
    tokens.json                    canonical values
    DESIGN.md                      language-wide visual foundations and token rules
    expressive/<slug>/
      component.tsx
      example.tsx
      meta.json
packages/core/src/                 schema, taxonomy and source loader
packages/cli/src/                  static registry access, delivery, install, auth
apps/web/src/                      Next gallery and account routes
apps/web/migrations/               SQL account migrations
scripts/build-registry.ts          validation, bundling, browser preview rendering
scripts/lib/                       delivery, tokens and browser build utilities
skills/nodex/                      consumer skill
.agents/skills/nodex-authoring/     repository authoring skill
public/r/                          GENERATED manifests and per-item JSON
public/registry/                   GENERATED delivered sources, tokens, previews
apps/web/public/                   GENERATED copy for Next static serving
```

Generated files never live beside authored components. Serve both `public/r/`
and `public/registry/` at the same registry root. Public registry downloads use
static paths and can be hosted on a CDN without the Next server.
Docker builds exclude local agent artifacts, compiled packages and TypeScript
caches from their build context.
Store temporary logs, screenshots and scratch work in a unique task directory
under system `/tmp`, and remove it when the work is complete.

## Verification

```bash
npm run build:registry
npm test
npm run smoke
npm run smoke:cli
npm run check:shell
npm run lint
npm run typecheck
npm run build --workspace @nodex/web
```

| Command | Coverage |
| --- | --- |
| `build:registry` | Explicit metadata, delivery imports, token usage, actual React exports, browser rendering and resolved SVG conformance |
| `check:registry` | The same checks in an OS temporary directory; leaves source and existing public artifacts untouched |
| `test` | Invalid contracts/imports, computed paint and transformed strokes, published addresses, read-only validation |
| `smoke` | Static and interactive previews; CLI delivery of all primitives and charts into a fresh React/TypeScript/Tailwind consumer; scoped tokens in all three languages, native keyboard/form behavior, offset shadows, button presses and reduced motion |
| `smoke:cli` | Delivery conflicts, dependency-manager commands, explicit addresses, path boundaries, authentication routing, source lint and complete language scaffolds |
| `check:shell` | Gallery primitive classes have their curated stylesheets |
| `lint` / `typecheck` | Application, registry, CLI and build source |

The consumer smoke installs packages in a disposable directory and therefore
needs npm network access. Build previews bundle dependencies locally; rendered
examples need no CDN chart scripts or external data fetches. Chromium belongs to
the build and test environment, not the production server image.

## Accounts and configuration

GitHub OAuth, hashed sessions and CLI device authorization are implemented.
Every current language is public. Accounts sequence access to the gallery;
public registry files remain independent of sessions. Paid-language enforcement
and entitlements are not implemented.

For optional local accounts:

```bash
cp .env.example .env
npm run db:up
npm run db:migrate
```

Register a GitHub OAuth app with homepage `http://localhost:4180` and callback
`http://localhost:4180/api/auth/github/callback`. Fill the credentials in the
root `.env` and restart the site. `npm run db:down` stops local Postgres.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Runtime account database connection |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | Runtime GitHub OAuth configuration |
| `NEXT_PUBLIC_SITE_URL` | Runtime public origin used by server-side OAuth |
| `NEXT_PUBLIC_REGISTRY_URL` | Registry CDN root, baked into the browser bundle at build time |
| `NODEX_REGISTRY` | CLI registry override; flag and project config take precedence |
| `NODEX_TOKEN` | CLI session token for unattended use |
| `NODEX_CONFIG_DIR` | Optional CLI credential-directory override |

`.env` is gitignored. Next explicitly loads the root file. CLI credentials live
separately in `~/.nodex/auth.json` with mode `0600`; project config never holds
a token. `nodex login`, `whoami` and `logout` manage CLI sessions. Public file
requests carry no bearer token; authenticated registry requests are confined to
same-origin `api/` paths.

## Deploy and publish

```bash
docker build -t nodex .
docker run -p 4180:4180 --env-file .env nodex
```

Use the repository root as the Docker context. The dependency stage caches Chromium
and its OS libraries; the build generates registry previews and Next. Runtime carries Next's standalone
output and migrations. Run `node scripts/migrate.mjs` in the container to apply
its schema. For CDN hosting:

```bash
docker build --build-arg NEXT_PUBLIC_REGISTRY_URL=https://cdn.example.com -t nodex .
```

The existing Docker workflow publishes on `main` and version tags, using
`DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN`. Optional variables are
`DOCKERHUB_REPOSITORY` and `NEXT_PUBLIC_REGISTRY_URL`. The image targets amd64.

The Helm chart in `helm/nodex` deploys the app with an optional external database
and a migration Job. Its release workflow requires a chart-version bump:

```bash
helm repo add nodex https://kr4t0n.github.io/nodex/helm
helm repo update
helm upgrade --install nodex nodex/nodex --version 0.2.2 --set siteUrl=https://nodex.example.com
```

Chart `0.2.2` pins the app and migration Job to `kr4t0n/nodex:0.2.2` through
`appVersion`; `image.tag` is an explicit override.

`npm run build:cli` compiles the CLI to JavaScript for Node 20+. Its npm package,
`@kubitnodes/nodex`, has no runtime dependencies on the monorepo. The npm workflow
publishes on version tags or manual runs through
[npm trusted publishing](https://docs.npmjs.com/trusted-publishers/), and verifies
the packed artifact before publishing. In the npm package settings, authorize
GitHub owner `kr4t0n`, repository `nodex`, and workflow filename
`npm-publish.yml` for direct publishing. No npm token secret is required.
The workflow uses a GitHub-hosted runner, Node 24 with npm 11.5.1 or newer,
`id-token: write`, and no package-manager cache. npm generates provenance
automatically; an OIDC configuration error fails the publish job.

For a coordinated release, bump `packages/cli/package.json` and its lockfile
entry, plus the Helm chart's `version` and `appVersion`. Commit those changes
on `main` and push a matching annotated tag such as `v0.2.2`. The main push
publishes the versioned Helm chart; the tag starts the npm and image workflows.
Image version tags omit the `v` prefix. Confirm the registry artifacts after
the workflows finish: missing Docker credentials still make the image job skip,
so a successful workflow alone does not prove a release exists. The npm workflow
rejects a tag that differs from the CLI package version.

## Extend the catalogue

Read [AGENTS.md](AGENTS.md) for architecture and
[the authoring skill](.agents/skills/nodex-authoring/SKILL.md) for the exact
procedure. `node packages/cli/src/index.ts new-language <slug>` scaffolds a new
language with all shared primitive roles, seeded from the checkout's canonical
Mono Editorial values while retaining neutral paint and system fonts. Customize
those roles in the new language's `tokens.json`. Components are discovered from source metadata; routes and delivery
addresses come from the generated manifests.
