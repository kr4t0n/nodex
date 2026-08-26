---
name: nodex
description: Build UI in a chosen design language using the nodex CLI. Use when a project has a nodex.json, when the user asks for a chart or component in a named design language, or when you need the project's design tokens and rules before writing any interface code.
---

# nodex

A component registry organised by **design language** rather than by component
type. A language bundles its tokens, its written rules, and the components built
for it.

Use this skill whenever you are about to write UI in a project that uses nodex.

## First: is this project set up?

Look for `nodex.json` at the project root.

**If it exists**, read it. It tells you the active language and where things go:

```json
{
  "language": "mono-editorial",
  "paths": {
    "components": "src/components/nodex",
    "tokens": "src/styles/nodex-tokens.css",
    "design": "docs/DESIGN.md"
  }
}
```

**If it does not exist**, and the user wants to use nodex, run `nodex list` to
see the available languages and `nodex init <language>` to set the project up.
Do not hand-create `nodex.json`.

## Then: read the design document before writing anything

`nodex init` writes the language's `DESIGN.md` into the project. **Read it.**
This is the single most important step and the reason nodex exists.

Tokens hold values. `DESIGN.md` holds the reasoning values cannot carry: the
card anatomy, the motion contract, and an explicit anti-pattern list. It is
entirely possible to produce something that uses every correct colour and still
violates the language, and the anti-pattern section is what prevents that.

If it is not in the project yet: `nodex design <language>`.

## Finding components

```bash
nodex search                                  # everything
nodex search heatmap                          # free text over titles, types, tags
nodex search --design mono-editorial --type bar
nodex search --density glance                 # how it is read, not how it is drawn
nodex search --tier primitive                 # button, card, badge, input, select, table
```

`--type` matches a fixed vocabulary (`bar`, `line`, `heatmap`, `sankey`,
`choropleth`, and so on), which is what makes the same request answerable across
languages. A bare query is free text.

**On `--density`:** `close-read` components draw one mark per record and reward
study, for reports and analyses. `glance` components show aggregate shapes and
read instantly, for dashboards. Pick on how the user will read it, not on which
looks nicer.

## Adding a component

```bash
nodex add mono-editorial/barcode-lollipop
nodex add button --design mono-editorial       # primitives are shared, so name the language
nodex add mono-editorial/ridgeline --to src/charts   # one-off override
```

This copies three files into the configured directory:

- `component.html` a fragment, already scoped. Not a full document.
- `component.css` scoped under a per-component root class
- `component.js` exports `mount(root)`

If the component needs an external library or fetches data at runtime, `add`
prints it. Install what it asks for.

## Using what you added

The fragment is plain HTML and the script is a mount function, so it works in any
framework.

```html
<link rel="stylesheet" href="./component.css" />
<div id="host"><!-- contents of component.html --></div>
<script type="module">
  import { mount } from './component.js';
  mount(document.getElementById('host'));
</script>
```

In React, the port is mechanical:

```tsx
import { useEffect, useRef } from 'react';
import { mount } from './component.js';
import './component.css';

export function Chart() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) mount(ref.current);
  }, []);
  // Paste the contents of component.html here as JSX, or set it via
  // dangerouslySetInnerHTML before mount runs.
  return <div ref={ref} />;
}
```

`mount(root)` queries only within the element you pass it, so two copies of the
same component on one page do not collide.

## Rules that hold for every language

- **Reference tokens, never literals.** Use `var(--nx-ink)`, not a hex code. The
  token layer is what lets the language be swapped.
- **Do not fight the language.** If a chart looks too quiet or too thin, that is
  the language, not a bug. Changing stroke weights and colours to taste produces
  something that no longer belongs to it.
- **Keep the card anatomy.** Where `DESIGN.md` fixes an order for title,
  subtitle, chart, and caption, keep it. The subtitle is not decoration; it tells
  the reader what one mark represents.
- **Preserve deterministic sample data.** Components use a seeded hash rather
  than `Math.random()` so previews and screenshots reproduce. Do not swap it.
- **Honour `prefers-reduced-motion`.** Every animated component ships a guard.
  Keep it when you edit.

## You own the code

Added components are copies. Edit them freely; nodex will not update them and
there is no version to upgrade. Adapting a reference implementation to real data
is the expected workflow, not a workaround.

## Restricted languages

Some languages may require authentication. Public languages need none at all, so
do not sign in unless a command tells you to.

`nodex login` prints a URL and a short code, waits while a human approves it in a
browser, and stores a token in `~/.nodex/auth.json`. Because it needs a person,
it is not something to run unattended.

**In CI or a container, set `NODEX_TOKEN` instead.** It overrides the stored file
entirely and needs no interactive step. `nodex whoami` says who the current token
belongs to, and `nodex logout` forgets it.

The token is sent only to guarded paths, never to the public registry files, so
a public `add` works signed in or out.

## Command reference

```
nodex list                         design languages available
nodex design <language>            print DESIGN.md
nodex tokens <language> [--json]   print tokens as CSS, or JSON
nodex search [query] [filters]     find components
nodex init <language>              set the project up
nodex add <ref...> [--to <dir>]    copy components in
nodex login                        sign in, by device code
nodex logout                       forget the stored token
nodex whoami                       who the token belongs to
```

Global: `--registry <dir|url>` to point at a specific registry, or
`NODEX_REGISTRY`.
