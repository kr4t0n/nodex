# Contributing to nodex

Setup, verification and deployment for the registry and gallery. For the
consumer quick start, see [README.md](README.md); for architecture and
implementation boundaries, read [AGENTS.md](AGENTS.md).

- [Develop locally](#develop-the-registry-and-gallery)
- [Contribution flow](#contribution-flow)
- [Source and build layout](#source-and-build-layout)
- [Verification](#verification)
- [Accounts and configuration](#accounts-and-configuration)
- [Deploy and publish](#deploy-and-publish)
- [Extend the catalogue](#extend-the-catalogue)
- [Catalogue reference](#catalogue-reference)

## Develop the registry and gallery

Prerequisites: Node **22.22+** (CI and Docker use Node 24), pnpm **12.10.1**, Chromium
installed through Playwright, and [gitleaks **8.30.1**](https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1)
on `PATH` for commits. Install the standalone gitleaks binary for your platform;
`gitleaks version` confirms it is available. No database or credentials are needed to build.
Use the pnpm version pinned in `packageManager`; Corepack users can invoke
`corepack pnpm` in place of `pnpm`. The workspace and install-script allowlist
live in `pnpm-workspace.yaml`. Keep `pnpm-lock.yaml` as the sole project lockfile.
When switching an existing npm checkout, remove its root and workspace
`node_modules` directories before installing.

Security overrides in `pnpm-workspace.yaml` pin patched transitive dependencies;
their comments link the relevant advisories. Before removing an override, verify
the resolved version, run `pnpm audit` and repeat the verification suite below,
including the Docker build check for changes to Next or its native dependencies.

```bash
pnpm install --frozen-lockfile
pnpm exec playwright install --with-deps chromium
pnpm run build:registry
pnpm run dev
```

`pnpm install` runs `prepare` to install the Husky Git hooks. The pre-commit hook
scans staged changes with gitleaks, redacts findings, and blocks the commit if it
finds a secret or the gitleaks binary is missing. To run the same check manually:
`gitleaks git --pre-commit --staged --redact --no-banner`. Remove any detected
secret before committing; rotate exposed credentials if they were already shared.
CI and Docker builds set `HUSKY=0` because they do not make commits; CI runs its
own pinned gitleaks scan before installing dependencies.

The gallery runs at `http://localhost:4180`. Production: `pnpm run build`, then
`pnpm start`. The web build script sets `NODE_ENV=production`, including when the
calling shell exports `NODE_ENV=development`.
Rebuild the registry after editing its source; the gallery reads
built metadata. `dev` and the web build copy the artifacts into the app's public
directory and generate lazy imports from each component's declared example entry
and export. React components and example edits participate in Next's development
reload; rebuild the registry and restart dev after changing catalogue metadata.
The website and registry share the same pinned React types.

## Contribution flow

`dev` is the integration branch; `main` holds releases and is GitHub's default.
Start each task branch from current `dev` and publish it as `<type>/<short-slug>`
(for example, `docs/developer-guides`). Open its pull request with an explicit
`--base dev`. Keep one logical change per commit and use Conventional Commits.
Do not commit or push directly to `dev` or `main`.

Run the [verification checks](#verification), describe the change and validation
in the PR, and include before/after screenshots for visual changes. Merge with a
merge commit after independent review and green CI. Release only when requested:
prepare version changes through a PR to `dev`, then open a release PR from `dev`
to `main`. See [Deploy and publish](#deploy-and-publish) for the publishing effects
and tag/version requirements.

Read [AGENTS.md](AGENTS.md) for architecture and gallery runtime boundaries.
Component types, metadata and local comments document their contracts;
consumer tests cover regressions. Registry changes follow the
[authoring skill](.agents/skills/nodex-authoring/SKILL.md); the
[consumer skill](skills/nodex/SKILL.md) is for downstream apps. The 13 imported
design skills in `.agents/skills/` are opt-in references, subordinate to the task
and selected language's design rules and tokens.

## Source and build layout

```text
registry/
  languages.json                   display order, one entry per language
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
scripts/sync-registry-public.ts    public assets and lazy website example imports
scripts/lib/                       delivery, tokens and browser build utilities
styles/                            shared website and preview scrollbar styling
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
Store temporary logs, screenshots and scratch work in a fresh directory outside
the checkout (`mktemp -d`), and remove it when the work is complete.

## Verification

The `ci` workflow runs three independent verification jobs on pull requests and
pushes to `dev` and `main`, with read-only repository contents permission and
pnpm caching:

- `static`: full-history secret scan, registry tests, shell check, lint, formatting
  and typecheck.
- `consumer`: packed CLI, component and CLI smokes.
- `browser`: mode and Hearth smokes, site build, landing and gallery smokes.

Each job installs Chromium and builds the registry before its checks; tests and
typechecking also need those generated assets. The required `verify` job waits
for all three and runs even after a failure, accepting only successful results.
Failed, cancelled or skipped jobs fail the gate. `auth-postgres` remains separate;
pull requests also run `docker-build` to check the production image without
publishing it. Neither is a dependency of `verify`.

CI scans the full Git history with gitleaks 8.30.1, downloaded from its official
release and verified against a pinned SHA-256 checksum. Run the same history scan
locally with `gitleaks git --redact --no-banner`. Keep findings redacted when
sharing results; add an exception only after reviewing a confirmed false positive.

```bash
pnpm run build:registry
pnpm test
pnpm run smoke
pnpm run smoke:cli
pnpm run smoke:pack
pnpm run smoke:modes
pnpm run smoke:hearth
pnpm run check:shell
pnpm run lint
pnpm run format:check
pnpm run typecheck
pnpm --filter @nodex/web run build
pnpm run smoke:landing
pnpm run smoke:gallery
```

| Command                   | Coverage                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `build:registry`          | Explicit metadata, delivery imports, token usage, actual React exports, browser rendering and resolved SVG conformance                                                                                                                                                                                                                                     |
| `check:registry`          | The same checks in an OS temporary directory; leaves source and existing public artifacts untouched                                                                                                                                                                                                                                                        |
| `test`                    | Invalid contracts/imports, computed paint and transformed strokes, published addresses, read-only validation, lint coverage and warning failures                                                                                                                                                                                                           |
| `smoke`                   | Static and interactive previews; CLI delivery of all primitives and charts into a fresh React/TypeScript/Tailwind consumer; scoped tokens in all seven languages (including both Hearth modes), stable sketch geometry, Soft Studio and Nocturne geometry/data semantics, native keyboard/form behavior, offset shadows, button presses and reduced motion |
| `smoke:cli`               | Delivery conflicts, dependency-manager commands, explicit addresses, path boundaries, authentication routing, source lint and complete language scaffolds                                                                                                                                                                                                  |
| `smoke:pack`              | Builds and packs the CLI with pnpm, installs the tarball in a fresh npm project outside the workspace, and runs its installed `nodex list` against the built registry                                                                                                                                                                                      |
| `check:shell`             | Gallery primitive classes have their curated stylesheets                                                                                                                                                                                                                                                                                                   |
| `smoke:landing`           | Starts the built site on a temporary local port; checks single-run typing/deletion, interactive commands and history, actual page themes, the chart belt, scroll persistence, navigation cleanup, mobile layout, hero wordmark fit, reduced motion and unavailable token assets                                                                            |
| `smoke:gallery`           | Native rendering of every example, lightweight discovery, deferred imports, bounded startup, scroll prioritization, navigation cleanup, timeout/fallback progress, retained controls, scaled chart inspection, simultaneous token scopes, contained errors, unique IDs and mobile layout                                                                   |
| `lint` / `typecheck`      | Application, registry, CLI and build source                                                                                                                                                                                                                                                                                                                |
| `format` / `format:check` | Write or check Prettier formatting and Tailwind class order in authored source and documentation                                                                                                                                                                                                                                                           |

`smoke:modes` checks downloaded mode CSS and copied components offline, native
controls and modal focus, dark first paint, live reduced motion and the two prose
roles. It compares the seven existing default palettes at desktop/mobile sizes
against `NODEX_BASE_REF` (default: the merge base with `origin/dev`). It reads the
comparison revision's compiler, tokens and prose CSS through Git without checking
out another tree. Each mode/gallery check retains screenshots and results in a
fresh evidence directory under the system temporary directory (normally `/tmp`)
and prints that location when it finishes. Set `NODEX_EVIDENCE_DIR` to collect
mode, Hearth, landing and gallery evidence in one explicit location. CI uses
`nodex-visual-evidence` under its runner temporary directory and uploads
`visual-evidence` from the `browser` job, including gallery light/dark fixture
screenshots; link that artifact in the PR.
No generated review evidence is left in the checkout. No alternate language is
published by these tests. `smoke:gallery` also checks the mode switch's browser
accessibility tree, keyboard activation and focus, active token-panel values and
retained specimen state. Switch screenshots and accessibility records cover
language and component views at desktop/mobile sizes in both modes.
Hearth chart headers are compared with the prior select at common phone widths
and immediately around each title's wrap point. Checks reject new wrapping or
movement outside the control, a stuck thumb or symbol, visible mode text, and
invisible forced-colors icons; evidence includes layout measurements and frames.
It mounts the actual index view in a browser fixture, keeping authentication
outside that check, and verifies Mono Editorial chrome beside language-scoped
tiles at desktop/mobile sizes.
Tile order, scripted terminal rows, selectable terminal buttons and packed CLI
text/JSON are checked against the published language index; registry tests also
check the README list against the authored order.
All 24 standalone primitive previews retain Mono Editorial with and without
JavaScript; an explicit language query still selects another palette.
`smoke:pack` exercises mode init,
JSON delivery and lint through the installed tarball.

`smoke:hearth` checks the copied contracts of all nine charts, numeric geometry,
unavailable and zero readings, offline fonts, mode changes, keyboard inspection
of every chart, the one-time entrance and live reduced motion. It captures
desktop/mobile cookbook compositions, each newer chart and all 24 primitives in
both modes, plus the same prose with Mono Editorial as a reference. Evidence
uses a fresh system temporary directory or `NODEX_EVIDENCE_DIR`; CI includes it
in `visual-evidence`. The cookbook composition is a consumer test fixture,
not a delivered recipe component.

`smoke:landing` measures the hero wordmark's painted ink from screenshots at
narrow, short and wide sizes (up to 1920px, past the bar's 1400px container),
with overlay and classic scrollbars, after a resize, in three language fonts,
and with a late token sheet, a font file that arrives after the first measure,
or no font at all. The ink must sit inside the visible width with left
and right margins within 3px of each other, the tagline and sign-in must align
with its painted edges within 3px, and both must stay on screen. It reports
every failing size before it fails. Frames go to a fresh temporary directory or
`NODEX_EVIDENCE_DIR`; CI includes them in `visual-evidence`.

Run `pnpm run format` before committing. Prettier uses the web app's Tailwind v4
stylesheet to sort utilities, including in delivered registry source. Generated
registry/web output, the pnpm lockfile, Helm templates and imported third-party
skills are excluded in `.prettierignore`. Our authoring and consumer skills remain
included. Formatting changes source layout and class order; the build still
delivers editable source and rewrites imports through the same contract.

Oxlint checks JavaScript, TypeScript, React's automatic JSX runtime, hook
order/dependencies and JSX accessibility across application and registry source.
The explicit rule set lives in `.oxlintrc.json`; Next's recommended and Core Web
Vitals rules apply only to `apps/web`. The nursery rules `no-undef`,
`no-useless-assignment` and `react/require-render-return` preserve existing checks;
TypeScript owns undefined names in TS files. React Compiler validation is not enabled.

`lint` runs Oxlint first, then an ESLint fallback containing only
`react/no-deprecated` and `@next/next/no-location-assign-relative-destination`.
The fallback in `eslint.config.mjs` retains the TypeScript parser and React's
ESLint 10 compatibility adapter; do not add overlapping presets. Warnings from
either linter fail the command. `lint:fix` applies their available fixes.
Prettier still owns formatting; this rule set needs no Prettier compatibility
config. Use `oxlint-disable-next-line` for native Oxlint rules and
`eslint-disable-next-line` for fallback rules. Keep exceptions local, with the
reason beside the code and browser coverage for the behavior.

`smoke:pack` requires the registry build above and runs in CI's `consumer` job,
which gates `verify`. It removes its temporary package and consumer after checking
them. To retain the tested tarball, pass an empty output directory and keep its
path for review:

```bash
nodex_pack_dir="$(mktemp -d)"
pnpm run smoke:pack "$nodex_pack_dir"
printf 'Tested tarball directory: %s\n' "$nodex_pack_dir"
```

Remove it with `rm -r "$nodex_pack_dir"` after review. The npm release workflow
uses this same check and publishes that exact archive without repacking; the
check itself never publishes or needs credentials.

The consumer smoke installs packages in a disposable directory and therefore
needs npm network access. Build previews bundle dependencies locally; rendered
examples need no CDN chart scripts or external data fetches. Chromium belongs to
the build and test environment, not the production server image.

`smoke:landing` and `smoke:gallery` require the web build above. Both also accept
an existing server URL, such as `pnpm run smoke:gallery http://localhost:4180`.

## Accounts and configuration

GitHub OAuth, hashed sessions and CLI device authorization are implemented.
Every current language is public. Accounts sequence access to the gallery;
public registry files remain independent of sessions. Paid-language enforcement
and entitlements are not implemented.

For optional local accounts:

```bash
cp .env.example .env
pnpm run db:up
pnpm run db:migrate
```

Register a GitHub OAuth app with homepage `http://localhost:4180` and callback
`http://localhost:4180/api/auth/github/callback`. Fill the credentials in the
root `.env` and restart the site. `pnpm run db:down` stops local Postgres.

| Variable                                   | Purpose                                                               |
| ------------------------------------------ | --------------------------------------------------------------------- |
| `DATABASE_URL`                             | Runtime account database connection                                   |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | Runtime GitHub OAuth configuration                                    |
| `NEXT_PUBLIC_SITE_URL`                     | Runtime public origin for OAuth and device authorization              |
| `NEXT_PUBLIC_REGISTRY_URL`                 | Registry CDN root, baked into the browser bundle at build time        |
| `NODEX_REGISTRY`                           | CLI registry override; flag and project config take precedence        |
| `NODEX_API`                                | Optional CLI account API base; defaults to the selected registry root |
| `NODEX_TOKEN`                              | CLI session token for unattended use                                  |
| `NODEX_CONFIG_DIR`                         | Optional CLI credential-directory override                            |

`.env` is gitignored and Next explicitly loads the root file. CLI variables
come from the process environment; see [registry and credentials](packages/cli/README.md#registry-and-credentials)
for precedence, private storage and transport constraints, and [commands](packages/cli/README.md#commands)
for `login`, `logout` and `whoami`.

`pnpm run test:auth` tests auth boundaries without a database and is included in
`pnpm test`. `pnpm run test:auth:postgres` requires `DATABASE_URL` pointing to a
migrated, disposable PostgreSQL database. CI runs that suite against its isolated
PostgreSQL 17 service, including six synchronized polls of one approval and a
check that exactly one usable CLI session is created. Never target production.

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

The [Helm chart](helm/nodex/README.md) deploys the app with an optional external database
and a migration Job. Its release workflow requires a chart-version bump.

Enable GitHub Pages for the `gh-pages` branch in repository settings. The workflow
creates that branch if needed and serves chart packages from its `helm/` folder.
An existing chart version is never repackaged; bump `helm/nodex/Chart.yaml`'s
`version` to publish changed chart content.

```bash
helm repo add nodex https://kr4t0n.github.io/nodex/helm
helm repo update
helm upgrade --install nodex nodex/nodex --version 0.3.0 --set siteUrl=https://nodex.example.com
```

Chart `0.3.0` pins the app and migration Job to `kr4t0n/nodex:0.3.0` through
`appVersion`; `image.tag` is an explicit override.

`pnpm run build:cli` compiles the CLI to JavaScript for Node 20+. Its npm package,
`@kubitnodes/nodex`, has no runtime dependencies on the monorepo. The npm workflow
publishes on version tags or manual runs through
[npm trusted publishing](https://docs.npmjs.com/trusted-publishers/), and verifies
the packed artifact before publishing. Build and pack with pnpm so workspace
references become ordinary versions, then publish that exact tarball with npm:

```bash
(
  set -e
  nodex_pack_dir="$(mktemp -d)"
  trap 'rm -rf "$nodex_pack_dir"' EXIT
  pnpm run build:cli
  pnpm --filter @kubitnodes/nodex pack --pack-destination "$nodex_pack_dir"
  npm publish --dry-run --force "$nodex_pack_dir"/*.tgz
)
```

The dry run does not publish; `--force` skips the local already-published-version
check for this rehearsal. The release workflow uses neither flag.
In the npm package settings, authorize
GitHub owner `kr4t0n`, repository `nodex`, and workflow filename
`npm-publish.yml` for direct publishing. No npm token secret is required.
The workflow uses a GitHub-hosted runner, Node 24 with npm 11.5.1 or newer,
`id-token: write`, and no package-manager cache. npm generates provenance
automatically; an OIDC configuration error fails the publish job.

For a requested coordinated release, bump `packages/cli/package.json`, plus the
Helm chart's `version` and `appVersion`, on a task branch and merge its reviewed
PR into `dev`. Open a release PR with head `dev` and base `main`; merge it with a
merge commit after review and green CI. Then create and push a matching annotated
`v<version>` tag at the released `main` commit. Never commit release changes
directly on `main`. The release merge triggers Docker publication and, when the
chart or its workflow changed, publishes the versioned Helm chart. The tag starts
the npm and image workflows. Manual publishing also requires a release request.
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
those roles in the new language's `tokens.json`, then add its slug to
`registry/languages.json` at the intended display position. The build requires
every language directory exactly once and rejects unknown or duplicate entries.
Components are discovered from source metadata; routes and delivery
addresses come from the generated manifests.

## Catalogue reference

These tables summarize shipped charts for browsing the repository. Use
`nodex show <language>/<slug>` for current exports, props and dependencies;
component metadata and public types own the data contracts. All languages also
support the 24 shared primitives.

### Mono Editorial

Mono Editorial has 64 charts at `/l/mono-editorial`. The selections below
summarize their readings; all 24 shared primitives also use this language.

| Component       | Reading                                                                                              |
| --------------- | ---------------------------------------------------------------------------------------------------- |
| `hairline-line` | Daily observations connected by a fine line                                                          |
| `arc-matrix`    | Bubbles count paying accounts along bowed product rows across cities                                 |
| `dual-area`     | Spend bars descend from the top; sign-up area rises below, with aligned days and combined inspection |
| `petal-rose`    | Equal-angle petals compare each count to the dataset maximum through radius and tone                 |

#### Bars and ranges

| Component       | Required observation fields               | Encoding                                                     |
| --------------- | ----------------------------------------- | ------------------------------------------------------------ |
| `chunky-bars`   | `plan`, `mrrK`                            | Rounded bars; tone ranks revenue without changing plan order |
| `rung-bars`     | `plan`, `mrrK`                            | One rung per $1K, with a counting dot every fifth rung       |
| `paired-rungs`  | `plan`, `beforeK`, `afterK`               | Grey and ink rung stacks compare both measures for a plan    |
| `stacked-rungs` | `region`, `coreK`, `addOnsK`, `servicesK` | Three revenue segments separated by empty rung positions     |

| Component        | Required observation fields                      | Encoding                                                             |
| ---------------- | ------------------------------------------------ | -------------------------------------------------------------------- |
| `rung-histogram` | `fromHours`, `toHours`, `tickets`                | One rung per integer ticket; interval ticks and a median flag        |
| `diverging-bar`  | `segment`, `netAccounts`                         | Signed bars extend from zero; tone and caps reinforce direction      |
| `range-capsules` | `day`, `lowK`, `highK`                           | Each capsule spans an observed minimum and maximum                   |
| `rung-waterfall` | `label`, `kind`, and `valueK` for starts/changes | Integer changes update a running total; broken rungs mark deductions |

#### Other readings

| Component                  | Data contract                                                                                                                                                                 |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plumb-scatter`            | Product, price percentile and satisfaction; both measures range from 0 to 100                                                                                                 |
| `single-axis` / `dot-heat` | Day, hour and ticket count; the former uses linear diameter, the latter the original square-root size curve                                                                   |
| `brand-spectrum`           | Opposing traits, our position and competitor positions, all on a 0–1 scale                                                                                                    |
| `matrix-heat`              | Feature labels and a square matrix of co-usage percentages; self-pairs are inapplicable                                                                                       |
| `matrix-heat-glance`       | Feature labels and ordered releases with adoption percentages                                                                                                                 |
| `calendar-heat`            | Ordered week labels and Monday–Sunday deploy counts; optional period and peak labels come from the caller                                                                     |
| `dotty-matrix`             | Ordered squads with task matrices indexed by lane and week                                                                                                                    |
| `beeswarm`                 | Deal values in thousands and enterprise flags; one dot per deal, piled into calibrated lanes                                                                                  |
| `violin`                   | Plan labels, observed reply times and positive density bandwidths in hours                                                                                                    |
| `tick-box`                 | Plan labels, ordered five-number summaries and individual outliers in hours                                                                                                   |
| `hairline-area`            | Ordered days and values in thousands, with caller-supplied sparse axis labels                                                                                                 |
| `jitter-strip`             | Nonnegative hours with caller-supplied fractional band positions; ordered band labels                                                                                         |
| `trend-lineage`            | Feature events, survival state and an explicit year window; incomplete timelines are unavailable                                                                              |
| `type-colonnade`           | Ordered repository ownership indices and team labels, with derived team counts                                                                                                |
| `dumbbell-queue`           | Before/after whole-minute times; one bead per saved minute, with independently available endpoints                                                                            |
| `rank-strip`               | Positive integer product ranks and ordered periods; rows sort by the final period, with unavailable finishes last                                                             |
| `force-graph`              | Caller hub and service IDs, monthly syncs and side roads; preserved force layout, dragging and adjacency                                                                      |
| `force-graph-dense`        | Service domains, daily calls and explicit weighted links; preserved mesh physics, dragging, pan and zoom                                                                      |
| `scatter-morph`            | Stable product IDs, price, satisfaction and revenue; reader-controlled scatter/bar/donut outline transitions                                                                  |
| `choropleth-states`        | State sign-ups, preserved geographic insets and five-band controls; optional caller annotations                                                                               |
| `choropleth-world`         | Country monthly actives, the original latitude window and five-band controls; offline geography                                                                               |
| `tree`                     | Caller root, product areas and feature membership; tidy hierarchy layout with all branches expanded                                                                           |
| `nested-treemap`           | Complete team effort hours grouped by area; native nested layouts, header bands and derived shares                                                                            |
| `circular-graph`           | Ordered teams and indexed ties; headcount diameters, weighted threads and adjacency inspection                                                                                |
| `circular-graph-dense`     | Repositories, organizations and shared-contributor ties; diameter-aware ring spacing and selective rotated labels                                                             |
| `aggregate-sankey`         | Complete channel-to-plan counts; ranked source tones, native weighted layout and node/link inspection                                                                         |
| `parallel-coords`          | Caller dimensions and scored ranges; complete product paths, axis brushing and derived best-all-round highlight                                                               |
| `thread-triptych`          | Ordered route endpoints and volume; one continuous weighted path through three caller-owned columns                                                                           |
| `cluster-field`            | Whole core and island contributor counts, caller layout positions and explicit cross-contribution flags                                                                       |
| `hourglass-stream`         | Whole stage populations, nearest-40-person ticks and exact adjacent conversion rates                                                                                          |
| `stream-ribbon`            | Ordered surfaces and weeks in a regular stacked area, preserving the original renderer’s actual encoding                                                                      |
| `bubble-almanac`           | Indexed product/year ticket counts and beta flags, with caller event shelf and marginal notes                                                                                 |
| `candlestick`              | Ordered open/close/low/high quotes; hollow up bodies, ink down bodies and unchanged-price marks                                                                               |
| `radial-patchwork`         | Deployment hour, angular window, files touched and incident status; overlapping independent sectors                                                                           |
| `radial-convergence`       | Explicit request-to-theme assignments; hub area counts actual assignments                                                                                                     |
| `bar-race`                 | Period revenue frames with stable product IDs; one playback, replay, and final-frame reduced motion                                                                           |
| `stagger-delay`            | Caller-ordered market values, magnitude tones and a token-timed bar stagger                                                                                                   |
| `dynamic-data`             | Caller samples and static source status; last sample owns the current value                                                                                                   |
| `draw-in-counter`          | Daily bookings and period label; cumulative area and exact headline share the library animation                                                                               |
| `dot-cascade`              | Whole incident counts above a sloping baseline; odd totals round the final two-incident dot up                                                                                |
| `launch-fan`               | Feature launch weeks and caller week guides, projected through the original fan                                                                                               |
| `donut-redesigned`         | Complete whole-percent source shares in a ten-by-ten dot grid                                                                                                                 |
| `custom-pie`               | User shares determine angle; minutes determine radius, with caller reference scale and rings                                                                                  |
| `tick-donut`               | Ordered whole-percent channel shares totaling 100; one tick per percent                                                                                                       |
| `tick-gauge`               | Whole-percent progress and caller goal label; 100 reached or remaining ticks                                                                                                  |
| `pictorial-bar`            | Yearly trees in thousands and a caller target; continuous bars clip a repeated tree texture                                                                                   |
| `tick-rows`                | Whole release counts by team; one tick per release and one counting dot per five                                                                                              |
| `barcode-lollipop`         | Day labels, peak users and weekend flags; unavailable readings retain their calendar hairlines                                                                                |
| `hundred-field`            | Up to four whole-percent disposition shares; each dot is one person in a hundred, with no invented unallocated people                                                         |
| `ballot-tally`             | Each option has a whole picked count out of 100; repeated choices permit row totals above 100. Automatic height reserves readable spacing for each option's heading and ticks |
| `ridgeline`                | Ordered pipeline density profiles with unique nonnegative hours and nullable density weights                                                                                  |

### Sketchbook

Sketchbook is available at `/l/sketchbook`, with all 24 shared primitives and
nine charts covering the [roughViz catalogue](https://www.jwilber.me/roughviz/).
All use native Recharts geometry and inspection with seeded Rough.js decoration.

| roughViz chart | Nodex component          | Encoding                                                 |
| -------------- | ------------------------ | -------------------------------------------------------- |
| Bar            | `sketch-bars`            | Vertical category bars from zero                         |
| BarH           | `sketch-bars-horizontal` | Horizontal category bars from zero                       |
| StackedBar     | `sketch-stacked-bars`    | Absolute vertical stacks with complete totals            |
| Line           | `sketch-line`            | Multiple series on a numeric X axis                      |
| Scatter        | `sketch-scatter`         | Equal-size marks on numeric X/Y axes                     |
| Pie            | `sketch-pie`             | Exact sector shares of a complete total                  |
| Donut          | `sketch-donut`           | Exact sector shares with a central total                 |
| Force          | `sketch-force`           | Collision-positioned bubbles, area proportional to value |
| Network        | `sketch-network`         | Area-scaled nodes with explicit undirected links         |

The roughViz reference and the distinction between its drawing defaults and
Nodex’s interface decisions are recorded in the repository’s
[provenance record](registry/languages/sketchbook/PROVENANCE.md).

### Soft Studio

Nine charts are available at `/l/soft-studio`, alongside all 24 shared primitives.

| Chart               | Type        | Reading                                                                                         |
| ------------------- | ----------- | ----------------------------------------------------------------------------------------------- |
| `soft-bars`         | Bar         | Rounded category bars with direct values and an exact zero baseline                             |
| `soft-area`         | Area        | A monotone trend on numeric X coordinates, retaining unequal intervals and missing-value gaps   |
| `soft-donut`        | Donut       | Exact shares of a complete total, a generous opening and a responsive key                       |
| `soft-heatmap`      | Heatmap     | Rounded cells on a fixed caller-owned scale, with different marks for zero and missing readings |
| `soft-line`         | Line        | Independent monotone series on a numeric timeline, preserving each series' gaps                 |
| `soft-stacked-bars` | Stacked bar | Absolute horizontal contributions with stable series colors and direct totals                   |
| `soft-scatter`      | Scatter     | Equal-size circles on two numeric axes, with incomplete pairs omitted and counted               |
| `soft-dumbbell`     | Dumbbell    | Open and filled endpoints compare readings, including decreases, ties and missing partners      |
| `soft-gauge`        | Gauge       | Exact progress across a half-circle against an explicit positive target                         |

### Neo-brutalism

Nine charts are available at `/l/neo-brutalism`, alongside all 24 shared primitives.

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

The visual refinement draws on [ng-brutalism](https://github.com/khangtrannn/ng-brutalism/tree/76f9640d3dad8c43bb300149d78a77ce7e43954d):
compact radii, generous control sizing, punchy accents and a small badge shadow.
Nodex implements these through its own semantic tokens and React primitives.

### Hearth

Nine charts are available at `/l/hearth`, alongside all 24 shared primitives,
in light and dark modes.

- `hearth-bars`: caller-ordered horizontal amounts with labels above their marks.
- `hearth-line`: ordered readings with numeric spacing and explicit missing-data gaps.
- `hearth-shares`: rows dividing one whole into the same one to four parts, with
  totals above and shares below.
- `hearth-histogram`: equal-width bins counted from zero, with the median written
  beside its rule.
- `hearth-scatter`: two measurements per observation; color and point form both
  name the group, and italic notes explain selected readings.
- `hearth-dumbbell`: an earlier and a later reading per row on one scale.
- `hearth-seasons`: a seasonal table of ordered levels, keeping absence, levels
  and unrecorded cells distinct.
- `hearth-carton`: whole units in fixed places, such as a dozen eggs by use.
- `hearth-rosette`: equal-angle petals through a cycle, with petal area outside
  the central hub proportional to the amount and a hidden table for screen readers.

### Signal Console

Nine charts are available at `/l/signal-console`.

| Chart                | Type        | Reading                                                          |
| -------------------- | ----------- | ---------------------------------------------------------------- |
| `endpoint-latency`   | Bar         | Routes ranked by P99 latency against an objective                |
| `request-throughput` | Area        | Request rate across equal-duration windows                       |
| `latency-trend`      | Line        | P50/P95/P99 patterns and P99 objective breaches                  |
| `response-codes`     | Stacked bar | Complete HTTP response counts by status class                    |
| `latency-histogram`  | Histogram   | Counts in equal-width latency buckets                            |
| `service-health`     | Heatmap     | Healthy, degraded, down and unavailable service windows          |
| `capacity-ring`      | Donut       | Exact used/available capacity with an optional warning threshold |
| `saturation-scatter` | Scatter     | Host CPU and latency against two explicit limits                 |
| `trace-spans`        | Range bar   | Actual start/end offsets, preserving concurrent spans            |

### Nocturne

Twelve charts are available at `/l/nocturne`, alongside all 24 shared primitives.

| Chart                     | Type         | Reading                                                                                                    |
| ------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------- |
| `nocturne-bars`           | Bar          | Slim horizontal bars rank categories, retaining stable ties, zero readings and unavailable rows            |
| `nocturne-line`           | Line         | Straight segments preserve numeric intervals and independent gaps; endpoint labels separate crowded series |
| `nocturne-ring`           | Donut        | Thin, exact sectors allocate a complete total, with a responsive key                                       |
| `nocturne-scatter-matrix` | Scatter      | Linked pairwise observations and diagonal histograms compare metrics and cohorts on shared numeric scales  |
| `nocturne-promise-lanes`  | Paired range | Planned and actual intervals distinguish shifts in start, finish and duration                              |
| `nocturne-margin-lanes`   | Interval dot | Current values and expected ranges share a signed deviation scale around each row's target                 |
| `nocturne-drift-trails`   | Trajectory   | Chronological paths across two numeric axes preserve reversals, gaps and final observations                |
| `nocturne-waterfall`      | Waterfall    | Signed changes bridge running balances; missing changes break the chain until an explicit start            |
| `nocturne-boxplot`        | Boxplot      | Horizontal quartile boxes, median ticks, supplied whiskers and independent outliers compare distributions  |
| `nocturne-forecast-fan`   | Area         | Observed history and point forecasts share explicitly labeled prediction intervals                         |
| `nocturne-control`        | Line         | Supplied statistical control limits identify strict point breaches, with optional event references         |
| `nocturne-ecdf`           | Line         | Exact cumulative steps reveal inclusive threshold shares and empirical percentiles without bins            |

The `paired-range`, `interval-dot` and `trajectory` types are searchable with
`nodex search --design nocturne --type <type>`. Forecast fan, control and ECDF
use the existing area and line types; metadata and tags describe their analytical intent.
