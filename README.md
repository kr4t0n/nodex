# nodex

A component registry organised by **design language** rather than by component
type.

Most component libraries give you one `Button` and let you theme it. That works
because a design language only changes a button's paint. It breaks completely for
charts: you cannot turn a chart that draws one hairline per calendar day into a
thick-bar brutalist chart by swapping a CSS variable, because the language
changed the geometry, not the colour.

So nodex is organised the other way round. You pick a design language, and you
get its tokens, its written rules, and the components that belong to it — then
your coding agent has everything it needs to build in that language rather than
guessing.

The first language is **mono-editorial**: 64 charts drawn in sub-pixel hairlines
on warm paper.

## Status

The registry, the 24 primitives, the CLI, and the web app all work. The accounts
backend does not exist yet, and authentication is stubbed because every language
is currently public — the app runs on Next.js so that backend has somewhere to
land. See `AGENTS.md` for the architecture.

## Using it in a project

```bash
nodex list                                  # what languages exist
nodex init mono-editorial                   # set the project up
nodex search heatmap --design mono-editorial
nodex add mono-editorial/barcode-lollipop
```

Signing in is only needed for restricted languages, of which there are none yet:

```bash
nodex login     # prints a code, waits for approval in a browser
nodex whoami
nodex logout
```

Credentials go to `~/.nodex/auth.json`, mode `0600`, keyed by registry. Set
`NODEX_TOKEN` instead in CI, where nobody can approve anything.

`init` writes `nodex.json`, drops the language's `tokens.css` and `DESIGN.md`
into the project, and appends a section to the project's `AGENTS.md` so a coding
agent knows the rules exist. `add` then needs no flags.

The CLI talks to <https://nodex.kubitnodes.com> unless told otherwise, so it
works with no configuration. Resolution runs `--registry <dir|url>`, then
`nodex.json`, then `NODEX_REGISTRY`, then that default — every step something
someone wrote down, nothing inferred from where the command was run. A project
initialised against a remote registry has the root written into its
`nodex.json` and keeps using it.

**To read this checkout rather than the deployment, say so:** `--registry .`,
or `NODEX_REGISTRY=.`. Running inside the repo is not enough and deliberately
so — see `AGENTS.md`.

Inside this repo, invoke it as `node packages/cli/src/index.ts <command>` — the
source runs directly, so there is nothing to build first.

### Publishing the CLI

`@kubitnodes/nodex` publishes to npm from `.github/workflows/npm-publish.yml`, on a
`v*` tag or a manual run, and needs one repository secret:

| Secret | What it is |
| --- | --- |
| `NPM_TOKEN` | an npm automation token with publish rights on the `@nodex` scope |

The workflow lints, typechecks, smoke-tests the CLI, builds, then installs the
packed tarball into a scratch project and runs the binary before publishing —
compiling is not the same as being runnable, and `files` narrows what ships. A
version already on npm is left alone with a notice rather than failing, so
re-running a tag is safe; bump `version` in `packages/cli/package.json` to
release.

The repo runs TypeScript directly, but the published package is compiled
JavaScript, since someone installing it may be on a Node without type
stripping. `npm run build:cli` produces it via `packages/cli/tsconfig.publish.json`.
The one `@nodex/core` import is `import type` and erases completely, so the
package has **no dependencies** and `@nodex/core` is not published.

## Running the site

```bash
npm install
npm run build:registry   # generates tokens.css, previews, and the manifest
npm run dev              # http://localhost:4180
```

`build:registry` has to run at least once first: the app reads the built manifest
from `public/r/` and iframes the generated previews, neither of which is
committed. `dev` and `build` then copy both into `apps/web/public/` so Next can
serve them, which is why that directory is generated and gitignored.

For a production build:

```bash
npm run build   # build:registry, then next build
npm start       # http://localhost:4180
```

Set `NEXT_PUBLIC_REGISTRY_URL` to serve the registry from a CDN instead of from
the app's own `public/`. It is static, so nothing else has to change.

## Accounts and sign-in

Optional. The registry, the CLI, and every public page work without any of this.
Only `/languages` and `/login` need it.

```bash
cp .env.example .env
npm run db:up        # Postgres in Docker, on host port 5433
npm run db:migrate
```

Then register a GitHub OAuth app at
[github.com/settings/developers](https://github.com/settings/developers):

- Homepage URL: `http://localhost:4180`
- Authorization callback URL: `http://localhost:4180/api/auth/github/callback`

Put the client ID and secret in `.env` and restart the dev server. `.env` is
gitignored; if the secret is ever exposed, rotate it in GitHub rather than
deleting the message.

Without a GitHub app the login page says so and the rest of the site is
unaffected. `npm run db:down` stops the database.

## Running it as a container

The `Dockerfile` at the root builds the web app. The context is the repository
root, not `apps/web`, because the image builds the registry before the app.

```bash
docker build -t nodex .
docker run -p 4180:4180 \
  -e DATABASE_URL=postgres://user:pass@host:5432/nodex \
  -e NEXT_PUBLIC_SITE_URL=https://your.host \
  -e GITHUB_CLIENT_ID=... -e GITHUB_CLIENT_SECRET=... \
  nodex
```

Everything above is runtime configuration, so one image serves any hostname.
The app starts and serves public pages even with none of it set; only accounts
need it. Migrations travel in the image, so a deployment can apply its own
schema with `node scripts/migrate.mjs`.

One value is different. `NEXT_PUBLIC_REGISTRY_URL` is a **build argument**, not
runtime config, because Next inlines `NEXT_PUBLIC_*` into the browser bundle and
the code reading it runs in the browser:

```bash
docker build --build-arg NEXT_PUBLIC_REGISTRY_URL=https://cdn.example.com -t nodex .
```

`.github/workflows/docker.yml` publishes to Docker Hub on every push to `main`
and on `v*` tags. It needs `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` as
repository secrets, and optionally `DOCKERHUB_REPOSITORY` and
`NEXT_PUBLIC_REGISTRY_URL` as repository variables. The image is `linux/amd64`
only; see the workflow comments for what an arm64 build would need.

## Deploying with Helm

```bash
helm repo add nodex https://kr4t0n.github.io/nodex/helm
helm install nodex nodex/nodex --set siteUrl=https://nodex.example.com
```

The chart lives in `helm/nodex` and deploys the app alone: no database is
bundled and none is required. Accounts turn on by setting `database.url` and
the GitHub credentials, and schema migrations then run as a pre-upgrade Job
from the same image.

`.github/workflows/helm-publish.yml` packages the chart to the `gh-pages`
branch whenever `helm/**` changes on `main`. Releasing is bumping `version:` in
`helm/nodex/Chart.yaml`: a version already published is never repackaged, so a
run without a bump is a no-op. Serving it needs GitHub Pages pointed at
`gh-pages`, which is a one-time setting.

## Prerequisites

- Node.js 20 or newer (developed on 25)
- npm 10 or newer
- Docker, only for the accounts database

## Setup

```bash
npm install
```

## Commands

| Command | What it does |
| --- | --- |
| `npm run build:registry` | Validate, generate previews and `tokens.css`, emit the manifest |
| `npm run check:registry` | Validate only, no writes. Handy before committing |
| `npm run check:shell` | Fail if the app uses a primitive its layout does not load |
| `npm run db:up` / `db:down` | Start or stop the accounts database |
| `npm run db:migrate` | Apply pending SQL migrations, once each |
| `npm run smoke` | Mount all 64 components in a real DOM and assert they draw |
| `npm run smoke:cli` | Run init and add against a temporary project |
| `npm run dev` | Next dev server on port 4180 |
| `npm run build` | Build the registry, then the site |
| `npm start` | Serve the production build on port 4180 |
| `npm run lint` | ESLint across the workspace |
| `npm run typecheck` | Types across the workspace and the site |

`npm run build:registry` writes three kinds of output:

- `registry/languages/<slug>/tokens.css` — generated from `tokens.json`
- `registry/languages/<slug>/expressive/<slug>/index.html` — a standalone
  preview document, generated by wrapping the component fragment in page chrome
- `public/r/` — the public manifest and one JSON file per component

All three are build artifacts and are gitignored.

## Looking at the components

`npm run dev` and browse:

- `/` the landing page, built from live registry components. Static
- `/login` the sign-in gate
- `/languages` the language index, each language a live composite of its own components
- `/l/[slug]` the language: tokens, primitives, filterable chart grid, and the rendered `DESIGN.md`
- `/l/[slug]/[name]` one component, full size, with its `nodex add` command

The `/l/*` routes are prerendered from the manifest. `/languages` and `/login`
read the session, so they render on demand.

Sign-in is a sequencing gate, not authentication: there is no identity provider
yet, and every language is public. See `AGENTS.md` before building on it.

Charts draw when scrolled into view and replay on click. Individual previews are
directly openable too, for example
`/registry/languages/mono-editorial/expressive/barcode-lollipop/index.html`.

## Project structure

```
registry/
  languages/<slug>/
    meta.json        name, visibility, declared density values, featured list
    tokens.json      the values — the source of truth
    tokens.css       GENERATED from tokens.json
    DESIGN.md        the written language: what tokens cannot encode
    expressive/<slug>/
      component.html   fragment — this is what gets distributed
      component.css    scoped to .nx-<slug>
      component.js     exports mount(root)
      meta.json        type, density, runtime, aspect ratio, tags
      index.html       GENERATED standalone preview
  primitives/<name>/   24 shared primitives. ONE implementation,
                       shared by every language, token variables only
packages/core/       the registry contract: schemas, taxonomy, loader
packages/cli/        the nodex CLI
apps/web/            Next.js + React + TS + Tailwind browse app
  src/app/             routes; layout links the primitives the shell is built from
  src/app/api/         OAuth start and callback
  src/components/      the views, plus Preview and the chrome
  src/lib/             registry client, hooks, session, database, GitHub
  migrations/          numbered SQL, applied once each by scripts/migrate.mjs
  public/              GENERATED copy of the registry, for Next to serve
skills/nodex/        the skill shipped to consumers
.agents/skills/nodex-authoring/   how to add languages and components here
scripts/
  build-registry.mjs        validate + generate + emit
  sync-registry-public.mjs  copy the registry into apps/web/public
  check-shell-primitives.mjs  the app loads every primitive it uses
  migrate.mjs               apply SQL migrations
  smoke-components.mjs      mount every component and assert it draws
  smoke-cli.mjs             init and add against a temporary project
tmp/                 gitignored scratch space
```

The 64 charts were extracted once from a single-file sample by a throwaway script
that has since been removed. The registry is the source of truth now; see
`AGENTS.md` if you need to recover the extractor from history.

## Configuration

None yet. No environment variables, no database, no server — the registry is
static files and the build is a pure function over them. That changes in Phase 5,
when accounts arrive.

## Adding a design language

```bash
node packages/cli/src/index.ts new-language <slug>
```

Scaffolds the standard folder shape, so a language never starts as a copy of an
existing one. Languages are discovered by directory; nothing needs registering.

The full procedure lives in `.agents/skills/nodex-authoring/SKILL.md`.
