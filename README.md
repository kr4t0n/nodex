# nodex

A design-language-first registry of editable React components. Pick a language,
receive its tokens and written design rules, and copy components into your app.
Expressive charts belong to a language because their geometry carries its
identity. Primitives share one implementation and change appearance through tokens.

Browse the [gallery](https://nodex.kubitnodes.com), or use the CLI from your React
app. You own the copied source; there is no Nodex runtime package.

## Features

- **Complete design languages.** Typography, color, spacing, geometry and motion
  for whole interfaces, with written guidance and fonts that work offline.
- **Expressive charts.** 121 charts built with Recharts, with caller-owned data,
  keyboard inspection and reduced-motion support.
- **Shared primitives.** 24 editable components for forms, navigation, surfaces
  and prose, styled by the same language tokens.
- **Local control.** Override tokens within a subtree, combine language scopes,
  or switch supported modes without remounting components.
- **CLI discovery and delivery.** Find components, inspect typed props and copy
  their source plus pinned dependencies into an existing app.

## Design languages

Each guide explains the language. This is the catalogue order:

1. [Mono Editorial](registry/languages/mono-editorial/DESIGN.md) — warm paper, thin rules and quiet typography.
2. [Sketchbook](registry/languages/sketchbook/DESIGN.md) — handwritten text, colored hatching and precise marks.
3. [Soft Studio](registry/languages/soft-studio/DESIGN.md) — calm surfaces, rounded geometry and cobalt actions.
4. [Neo-brutalism](registry/languages/neo-brutalism/DESIGN.md) — bold outlines, playful color and hard shadows.
5. [Hearth](registry/languages/hearth/DESIGN.md) — warm editorial type and flat surfaces, in light and dark modes.
6. [Signal Console](registry/languages/signal-console/DESIGN.md) — dense operational layouts, monospace and status color.
7. [Nocturne](registry/languages/nocturne/DESIGN.md) — graphite surfaces, proportional type and restrained accents.

Run `npx @kubitnodes/nodex list` for languages and counts, or `npx @kubitnodes/nodex search`
for components. Browse the [chart gallery](https://nodex.kubitnodes.com/languages).

## Prerequisites

To use components, bring an existing **React 19 / React DOM 19** app with
**TypeScript** and **Tailwind CSS 4**. The published CLI needs **Node 20+**.
Install your app's dependencies first; Nodex preserves its platform packages.

To work on this repository, use **Node 22.22+**, the **pnpm** version pinned in
[`package.json`](package.json), Playwright Chromium and **gitleaks 8.30.1**.
[Local setup](AGENTS.md#local-development) covers these
tools and the commit hook. Public builds need no database or credentials.

## Quick start

Run these commands from your React app package, including inside a monorepo:

```bash
npx @kubitnodes/nodex init mono-editorial
npx @kubitnodes/nodex add hairline-line button
```

`init` creates `nodex.json`, `src/styles/nodex-tokens.css`, `docs/DESIGN.md` and
a managed section in `AGENTS.md`. `add` copies components into
`src/components/nodex` and installs their pinned dependencies using your app's
package manager. Review conflicts before using `--force` to replace edited files.

Import the token stylesheet after Tailwind in your application stylesheet:

```css
@import 'tailwindcss';
@import './nodex-tokens.css';
```

This assumes that stylesheet is in `src/styles`; adjust the import path otherwise.
The token stylesheet includes licensed font bytes. Tailwind must scan the copied
components; use `@source` if you choose a destination outside automatic detection.

```tsx
import { HairlineLine } from './components/nodex/hairline-line/component';
import { Button } from './components/nodex/button/component';

export function Report() {
  return (
    <section>
      <h2>Daily observations</h2>
      <HairlineLine
        aria-label="Daily observations"
        data={[
          { label: 'Monday', value: 24 },
          { label: 'Tuesday', value: 38 },
          { label: 'Wednesday', value: 29 },
        ]}
      />
      <Button variant="solid">View report</Button>
    </section>
  );
}
```

Charts require your data; gallery fixtures are not copied. Inspect a component
before adding it, and check your token usage after editing:

```bash
npx @kubitnodes/nodex search --design mono-editorial --type line
npx @kubitnodes/nodex show mono-editorial/hairline-line --json
npx @kubitnodes/nodex lint
```

For Hearth's dark mode, set `data-nx-language="hearth"` and `data-nx-mode="dark"`
on the same element after initializing Hearth. Other languages may have an
inherently dark default palette without an alternate mode.

The [CLI guide](packages/cli/README.md) covers commands, custom paths, local
registries, mixed-language scopes and credentials. The
[consumer skill](skills/nodex/SKILL.md) guides coding agents using Nodex in an app.

## Configuration

The CLI records the language, registry and output paths in `nodex.json`.
Keep credentials out of that file. The gallery's optional account configuration
lives in the root `.env`; [`.env.example`](.env.example) lists the server settings.

| Variable                                   | Purpose                                                        |
| ------------------------------------------ | -------------------------------------------------------------- |
| `NODEX_REGISTRY`                           | CLI registry override; flag and project config take precedence |
| `NODEX_API`                                | CLI account API when hosted separately from the registry       |
| `NODEX_TOKEN`                              | CLI session token for unattended use                           |
| `NODEX_CONFIG_DIR`                         | CLI credential-directory override                              |
| `DATABASE_URL`                             | Runtime account database connection                            |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | Runtime GitHub OAuth configuration                             |
| `NEXT_PUBLIC_SITE_URL`                     | Runtime public origin for OAuth and device authorization       |
| `NEXT_PUBLIC_REGISTRY_URL`                 | Registry CDN root, baked into the browser bundle at build time |

All current languages are public. GitHub sign-in gates the gallery index;
registry downloads remain public. Paid entitlements are not implemented.
See [account setup](AGENTS.md#local-accounts) or
[CLI registry and credentials](packages/cli/README.md#registry-and-credentials).

## Repository layout

```text
registry/
  languages.json       catalogue order
  languages/<slug>/    design guide, tokens and expressive components
  primitives/          shared React components
  _shared/             support modules copied when needed
packages/core/         schemas, taxonomy and source loading
packages/cli/          @kubitnodes/nodex
apps/web/              Next.js gallery, accounts and SQL migrations
scripts/               registry build, synchronization and verification
helm/nodex/            deployment chart
skills/nodex/          downstream consumer skill
```

The registry build generates `public/r/` manifests and `public/registry/` sources,
tokens and previews. The gallery copies these assets into its own public directory.
See the [source and build details](AGENTS.md#source-layout).

## Develop locally

After installing the [prerequisites and commit hook](AGENTS.md#local-development):

```bash
pnpm install --frozen-lockfile
pnpm exec playwright install --with-deps chromium
pnpm run build:registry
pnpm run dev
```

Open [localhost:4180](http://localhost:4180). Rebuild the registry after changing
its source. For a production build, run `pnpm run build`, then `pnpm start`.
Run `pnpm test` after building the registry; the
[verification guide](AGENTS.md#verification) covers lint, formatting,
typechecking, consumer checks and browser checks required before a PR.

Deploy with [Docker](helm/nodex/README.md#docker) or the
[Helm chart](helm/nodex/README.md). Registry downloads can also be served as static
files from a CDN; publish the matching manifests, assets and website together.

For work on nodex itself, [AGENTS.md](AGENTS.md) covers setup, checks, architecture,
gotchas and release conventions; the
[authoring skill](.agents/skills/nodex-authoring/SKILL.md) covers registry changes.
Ordinary PRs target `dev`. Releases go from `dev` to `main` only when requested.
