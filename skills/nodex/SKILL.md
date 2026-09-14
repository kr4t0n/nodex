---
name: nodex
description: Build UI in a chosen design language using the nodex CLI. Use when a project has a nodex.json, when the user asks for a chart or component in a named design language, or when you need the project's design tokens and rules before writing any interface code.
---

# nodex

Nodex copies editable React components into an application, accompanied by a
language's design tokens and written rules. The current component platform is
React 19, React DOM, TypeScript and Tailwind CSS 4, for the web.

## Read the project contract

Find `nodex.json` at the project root. It records the selected language, registry
root and destination paths. Do not hand-create it. If absent, run `nodex list`
and `nodex init <language>` when the user wants to use Nodex.

Read the configured design document before writing UI. Tokens carry values;
`DESIGN.md` explains the language's typography, spacing, geometry, hierarchy,
interaction, motion and anti-patterns. These foundations apply to every page,
form and control, including applications with no charts. Follow both. Import
the configured token stylesheet once after Tailwind, and ensure
Tailwind scans the configured component destination.

Typical configuration:

```json
{
  "language": "mono-editorial",
  "registry": "https://nodex.kubitnodes.com",
  "paths": {
    "components": "src/components/nodex",
    "tokens": "src/styles/nodex-tokens.css",
    "design": "docs/DESIGN.md"
  }
}
```

## Find and inspect

```bash
nodex list --json
nodex search --design mono-editorial --json
nodex search --type line --design mono-editorial
nodex search --tier primitive
nodex show mono-editorial/hairline-line --json
```

Search the actual registry; do not assume an older catalogue's component still
exists. Types describe marks/encoding across languages. Optional `--density`
selects reading intent, not stroke weight or a preferred visual style.

`show` reports the declared exports, entry, props, dependencies and runtime
files. Read the delivered TypeScript for detailed data types; fixtures are not
part of the public component API.

## Add and use

```bash
nodex init mono-editorial
nodex add hairline-line button
nodex add mono-editorial/arc-matrix --to src/charts
```

`add` copies the complete declared file set and installs pinned dependencies
with the application's package manager. It reuses identical shared files and
protects edited files. `--no-install` reports packages for manual installation;
`--force` replaces differing source and conflicting dependency versions, so use
it only when that replacement is intended. Nodex preserves platform packages.

A chart normally delivers `component.tsx`; required local support appears beside
it under `_shared/`. Primitive modules also import their delivered CSS. Examples,
preview scripts and synthetic default data do not ship. Import the reusable
exports directly:

```tsx
import { HairlineLine } from './components/nodex/hairline-line/component';
import { Button } from './components/nodex/button/component';

const observations = [
  { label: 'Monday', value: 24 },
  { label: 'Tuesday', value: 38 },
];

export function Report() {
  return (
    <section>
      <h2>Observations</h2>
      <HairlineLine data={observations} aria-label="Daily observations" />
      <Button onClick={() => window.print()}>Print</Button>
    </section>
  );
}
```

Data is required. Replace or update that prop with the application's real data;
never expect a hidden sample fallback. Component modules include their own types
and private layout helpers. The application supplies gallery headings; charts
retain their drawing annotations and console status header/footer. There is no
chart data dropdown, imperative mount API or Nodex runtime package.

Recharts charts are client-rendered. Do not assume their server HTML contains
chart marks, even with fixed dimensions. Use the host framework's client-component
conventions; delivered interactive entries already carry `use client`.

## Preserve the language and behavior

- Reference semantic tokens directly for paint, text, strokes and motion. Avoid
  literal chart palettes or a second theme object. Runtime scoped token overrides
  are supported.
- Primitives consume typography, spacing, radii and interaction timing too.
  Use `--nx-type-cardTitle-size` and `--nx-space-cardPadding` for Card/title roles,
  `--nx-type-control-size` and `--nx-space-controlPadding` for form controls, and
  `--nx-type-action-size` for buttons. Override variables on an ancestor for a
  local theme. `--nx-motion-control-duration` controls interaction feedback;
  chart drawing uses `--nx-motion-draw-duration` separately.
- Each expressive chart belongs to its language. Mixing languages requires a
  correct token layer in each ancestor scope; adding a chart does not switch the
  default theme selected by `init`.
- Keep reduced-motion handling and effect cleanup when editing components.
- Preserve native labels, refs, keyboard behavior and unique IDs across instances.
  A CSS tooltip is a visual hint; use an appropriate headless behavior layer
  when richer accessible tooltip interaction is needed.
- Verify empty data, updates, narrow containers, tooltips and keyboard access in
  the application. `nodex lint` checks source spellings and token references;
  it cannot prove rendering or accessibility.

```bash
nodex lint
nodex lint src/components/nodex/endpoint-latency --design signal-console
```

The copied code belongs to the project. Nodex does not silently update it.

## Registry and authentication

Resolution order is `--registry`, the project's recorded registry,
`NODEX_REGISTRY`, then the hosted default. Use an explicit checkout or built
public root to try an unpublished reconstruction; working inside a checkout does
not change the CLI's default registry automatically.

Public languages require no login. For a registry requiring credentials,
`nodex login` displays a URL and device code for a person to approve. `whoami`
checks the current session; `logout` forgets it. `NODEX_TOKEN` supplies a session
for CI without interactive approval. Tokens are stored separately from project
config in `~/.nodex/auth.json` and are never committed. Public asset requests
carry no bearer token.

Prefer JSON output when consuming CLI results programmatically. `add --json`
reports delivered files, exports, entry, props, package requirements and install
results. It contains no inferred mount names or default fixture contract.
