---
name: nodex-authoring
description: Add a design language or a component to the nodex registry itself. Use when working inside the nodex repository on registry content, adding a language, adding or editing a component, or resolving a build-registry validation or conformance failure.
---

# Authoring in the nodex registry

This is the repository procedure. Read root `AGENTS.md` for architecture. The
separate consumer skill at `skills/nodex/SKILL.md` must contain only downstream
usage instructions.

## Language setup

```bash
node packages/cli/src/index.ts new-language <slug>
```

Fill the generated `meta.json`, `tokens.json` and `DESIGN.md`. Languages are
found by directory; there is no additional registration list.
The scaffold seeds shared roles from the checkout's canonical Mono Editorial
tokens, with neutral paint and system fonts. Customize their values in the new
language; keep the role names consumed by primitives.

- Define semantic colors, strokes, type, radii, spacing and motion in tokens.
  Keep an intentional palette; never add a color solely to silence a lint.
- The common primitive contract requires shared roles in every language. Run
  the whole build to catch missing references across primitive CSS and TSX.
- Keep `DESIGN.md` useful for a downstream interface with no charts: visual
  atmosphere, semantic token roles, typography, spacing, geometry, interaction,
  motion and anti-patterns. It is a language foundation, not a component catalogue.
- Keep named chart descriptions, specimen dimensions, reconstruction notes and
  runtime/build procedures out of `DESIGN.md`. Put component-specific guidance
  in its metadata/source comments or root `AGENTS.md` gotchas, and procedures in
  this skill. Adding a chart does not require appending its description to the
  language document.
- Declare optional density values only if the reading distinction matters.
  `featured` lists actual expressive slugs and may be empty during scaffolding.

The build generates tokens under `public/registry/languages/<slug>/`; never
create generated styles or preview documents beside source.

Declare downloadable fonts in a `font.faces` array. Each face names an exact
`@fontsource-variable/<family>@<version>` or static `@fontsource/<family>@<version>`
package, package-relative WOFF2 file, CSS family, weight or weight range and
normal/italic style. Pin the same package in the
repository's development dependencies. Declare each static weight separately.
Use `font.heading` for headings, `font.ui` for short interface text, and `font.sans`
for reading text and editable values. Give each an independent stack; root custom
property aliases do not re-resolve descendant overrides. The build embeds the bytes and OFL
license in generated tokens.css; CLI consumers need no additional font files or
network host. Use existing languages as examples. Do not add `font.webfont` or
emit asset metadata as custom properties.

## Component shape

Create `registry/languages/<language>/expressive/<slug>/` with three files:

1. `component.tsx`: the reusable component, exported prop/data types and private
   layout helpers. Data is a required prop. Do not export or default to a fixture.
2. `example.tsx`: deterministic data and an exported `Example` that uses the
   public component. Optional `animate?: boolean` lets the preview build disable
   animation without changing production behavior.
3. `meta.json`: explicit runtime contract and example entry, shown below.

Use Recharts as the default, including simple charts. Prefer its composition,
scales, series, tooltips and accessibility layer. Custom SVG marks inside that
composition are acceptable; a separate handwritten SVG renderer defeats the
library default. Specialist libraries require a demonstrated gap and an explicit
build-policy change. Do not add a universal chart adapter.

Use `use client` on interactive entrypoints. React 19 is the component platform.
Types and geometry stay in `component.tsx` unless separation has a concrete
benefit. Use Tailwind for ordinary layout and styling.

```json
{
  "slug": "daily-line",
  "title": "Daily observations",
  "description": "One point for each supplied observation.",
  "component": "line",
  "tier": "expressive",
  "runtime": "react",
  "library": "recharts",
  "density": "close-read",
  "entry": "component.tsx",
  "exports": ["DailyLine"],
  "props": [
    { "name": "data", "type": "readonly DailyDatum[]", "required": true },
    { "name": "animate", "type": "boolean", "required": false }
  ],
  "files": ["component.tsx"],
  "shared": ["use-chart-motion.ts", "use-reduced-motion.ts"],
  "dependencies": ["recharts@3.10.1"],
  "example": {
    "entry": "example.tsx",
    "export": "Example",
    "width": 660,
    "height": 360
  }
}
```

`exports` lists renderable runtime exports; TypeScript interfaces are documented
through `props` and exported normally from the module. The build validates that
named runtime exports exist and are React element types. It never infers the API
from source spelling or parses fixture arrays to invent a data contract.

`files` contains the entry and all own runtime imports. `shared` contains relative
paths under `registry/_shared/`; omit it when unused. The build rejects missing
or unused delivery files and rewrites local imports to consumer destinations.
It supports TypeScript, CSS and JSON text; CSS asset imports/binary delivery are
not implemented. Do not bypass the file contract with computed imports.
Inline import types and external import-equals declarations are part of that
closure too, including references erased from the emitted JavaScript.

Declare exact package versions. React/React DOM belong to the host app; do not
list them as packages for Nodex to replace. The CLI resolves Recharts' `react-is`
peer from the consumer's actual React version. Every non-platform package import
must be declared. No imports from another registry item, app code or build tools.

`component` uses the fixed taxonomy and names the mark/encoding. `density`, if
present, must be declared by the language. `strokeAsArea` is a reasoned exemption
for a stroke whose width encodes an area, not an escape hatch for thick outlines.
`externalData` records unavoidable external fetches; current charts require none.

## Tokens, animation and content

Use `var(--nx-ink)`, `var(--nx-muted)`, `var(--nx-stroke-mark)` and other semantic
variables directly. Literal paint is rejected even when its value appears in
the palette. A duplicate JavaScript theme object is not part of this architecture.
Reserve `--nx-*` for language variables; use a distinct name for local controls.

Test descendant overrides: root aliases do not automatically re-resolve after a
child overrides their base variable. Read actual computed paint when verifying.

Shared motion helpers are copied local source. `useReducedMotion` reads the system
preference; `useChartMotion` resolves scoped numeric timing for Recharts. Import
only what the component needs and declare the complete helper import closure.
Keep effects cleaned up and initial markup stable between server and client.
CSS animations need a `prefers-reduced-motion` guard.

Let the caller supply the gallery title and description. Preserve the original
component's drawing annotations and console status header/footer. Reconstruction
must not introduce new UI, data tables, disclosure controls, copy, sample data or
demo variants. Keep meaningful empty states for required application data.
Use `useId` for instance-specific IDs. Test invalid values, zeros, empty data,
single observations and repeated instances. Never synthesize real-looking data
when input is missing. Do not use `Math.random()` in examples.

## Primitives

Primitives live in `registry/primitives/<slug>/`. They export reusable typed
React APIs, not specimen sheets. Preserve native props, refs, labels and form
behavior. Examples demonstrate variants by calling those APIs.
Document custom and required props explicitly in metadata. When an item exports
several components, identify the owning export in the prop description; do not
invent a combined API or duplicate every inherited native attribute.

Required native-control visual treatment can remain in `component.css`, imported
by `component.tsx` and listed in `files`. Keep classes self-contained and token
references valid in every language. Wrap rules in `@layer components` so consumer
Tailwind utilities can override them. Progressive CSS features retain their native
fallbacks. Be precise about behavior: a CSS tooltip is a visual hint, while a
native modal dialog requires actual focus and Escape testing.

Consume semantic type, spacing, radii and interaction-motion roles, including
native pseudo-elements and progressive fallbacks. Card/title/caption roles are
shared with the existing language scale; controls use `type.control`, actions use
`type.action`, and spacing uses roles such as `space.fieldGap` and
`space.controlPadding`. New roles preserve existing values unless a visual change
was requested. Circular marks, native-control geometry and zero resets stay local.
Use interaction-motion roles for controls independently of chart `motion.draw`.

## Verification and review

```bash
npm run build:registry
npm test
npm run smoke
npm run smoke:cli
npm run check:shell
npx eslint .
npm run typecheck
npm run build --workspace @nodex/web
```

Install the browser once with `npx playwright install --with-deps chromium`.
The build validates source contracts, bundles actual examples, renders them in
Chromium, checks resolved paint/strokes and emits static previews with local
interactive bundles. Recharts currently does not emit chart SVG during React
server rendering; do not restore option-based SVG injection to compensate.

`npm run check:registry` does the same validation without changing repository
source or existing build outputs. It still uses temporary files and a browser.

The consumer smoke must compile delivered source in a fresh React/TypeScript/
Tailwind application and exercise real CLI dependency installation. A working
repository preview alone does not prove the downstream import paths work.
It delivers all 24 primitives, checks scoped overrides against unaffected sibling
instances in both languages, and exercises native controls and reduced motion.

Review live previews at `http://localhost:4180` for geometry, responsive layout,
readability, keyboard tooltips and runtime token changes. Source lint detects
explicit violations; browser tests and design review cover what it cannot infer.
Update README and root AGENTS for architectural or usage changes.
