# nodex

A design-language-first registry of editable React components. Pick a language,
receive its tokens and written design rules, and copy components into your app.
Expressive charts belong to a language because their geometry carries its
identity. Primitives share one implementation and change appearance through tokens.

This reconstruction contains **24 reusable primitives and five Recharts proofs
of concept**: `mono-editorial/hairline-line`, `mono-editorial/arc-matrix`,
`mono-editorial/dual-area`, `mono-editorial/petal-rose`, and
`signal-console/endpoint-latency`. The previous expressive catalogue has been
removed from this branch; it remains in Git history. This is a new source
contract, with no legacy HTML/mount-function compatibility path.

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

Release this CLI together with a registry built from the new contract. Older
hosted manifests do not provide the required entry, file-target and language-asset
fields; the CLI intentionally reports that mismatch instead of guessing paths.

`init` writes `nodex.json`, `src/styles/nodex-tokens.css`, `docs/DESIGN.md`, and
a managed section of `AGENTS.md`. Read the design document. Import the token
stylesheet once after Tailwind in your application stylesheet:

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

Each chart requires real data. Fixtures remain in registry examples. Gallery
titles belong to the caller; the original drawing annotations and console status
header/footer remain part of their charts. Charts have no data dropdown or table.
Primitive modules import their own required CSS.
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
  button/component.tsx
  button/component.css
  _shared/use-chart-motion.ts
  _shared/use-reduced-motion.ts
```

Only declared, reachable runtime files are copied. There is no Nodex runtime
package, example dataset, preview bundle or ECharts adapter in the consumer.
`add` installs pinned chart dependencies using npm, pnpm, Yarn or Bun and
matches `react-is` to the consumer's React version. `--no-install` reports the
packages for manual installation. Identical files are reused; differing files
or package versions require `--force`. Review that flag before replacing code
that the consumer has edited.

```bash
nodex list
nodex search --design mono-editorial --type line
nodex show mono-editorial/hairline-line --json
nodex add signal-console/endpoint-latency
nodex lint src/components/nodex/endpoint-latency --design signal-console
```

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
    DESIGN.md                      geometry, semantics and interaction rules
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
| `smoke` | Static and interactive previews; CLI delivery of all primitives and charts into a fresh React/TypeScript/Tailwind consumer; scoped tokens in both languages, native keyboard/form behavior and reduced motion |
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
helm install nodex nodex/nodex --set siteUrl=https://nodex.example.com
```

`npm run build:cli` compiles the CLI to JavaScript for Node 20+. Its npm package,
`@kubitnodes/nodex`, has no runtime dependencies on the monorepo. The npm workflow
publishes on version tags or manual runs, requires `NPM_TOKEN` with rights to
that package, and verifies the packed artifact before publishing.

## Extend the catalogue

Read [AGENTS.md](AGENTS.md) for architecture and
[the authoring skill](.agents/skills/nodex-authoring/SKILL.md) for the exact
procedure. `node packages/cli/src/index.ts new-language <slug>` scaffolds a new
language with all shared primitive roles, seeded from the checkout's canonical
Mono Editorial values while retaining neutral paint and system fonts. Customize
those roles in the new language's `tokens.json`. Components are discovered from source metadata; routes and delivery
addresses come from the generated manifests.
