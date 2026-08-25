---
name: nodex-authoring
description: Add a design language or a component to the nodex registry itself. Use when working inside the nodex repository on registry content, adding a language, adding or editing a component, or resolving a build-registry validation or conformance failure.
---

# Authoring in the nodex registry

For work **inside** the nodex repository. The skill shipped to consumers
(`skills/nodex/SKILL.md`) is a different document for a different audience and
must never mention authoring.

Read `AGENTS.md` first for the architecture. This is the procedure.

## Adding a design language

### 1. Scaffold

```bash
node packages/cli/src/index.ts new-language <slug>
```

Slugs are kebab-case. This creates `registry/languages/<slug>/` with `meta.json`,
`tokens.json`, a `DESIGN.md` skeleton, and an empty `expressive/`.

Do not create a language by copying an existing one and deleting things. That is
how conventions drift, and it is the reason this command exists.

Languages are discovered by directory. There is nothing to register anywhere.

### 2. Fill in `tokens.json`

Values only. Record what the language actually uses rather than an idealised
scale you wish it used, because the build lints against this file and a fictional
palette will fail on real components.

- `color` semantic roles: `bg`, `ink`, `muted`, `faint`, `grid`
- `ramp.steps` every colour that components may draw with. The palette lint
  enforces membership, which freezes the palette and catches additions.
- `stroke.scale` and `stroke.lineMax`
- `radius`, `font`, `space`, `type`, `motion`

`tokens.css` is **generated** from this file. Never edit it by hand.

### 3. Write `DESIGN.md`

Section structure matches what the `stitch-design-taste` skill emits, so a
document written for Stitch can be dropped in and a nodex language can be
exported back out.

The **anti-patterns** section does more work than the rest of the file combined.
Tokens already carry the values; what an agent cannot infer is what would be
wrong. Be specific and absolute: "never exceed 1.4px on a stroke that reads as a
line" is usable, "keep strokes thin" is not.

If a rule has a genuine exception, state it and give the test for it. The
hairline rule in mono-editorial exempts strokes that *are* the area, with the
test being whether thinning it would lose information.

### 4. Declare optional axes

If the language has a real reading-speed distinction, declare it:

```json
{ "density": ["close-read", "glance"] }
```

Omit it if it does not. It is optional precisely so that a language without the
distinction is not forced to invent one. A component may only use a declared
value, and CI enforces that.

Also set `featured` to three or four component slugs. The site's index renders
them as a live composite, because a name and a paragraph cannot convey taste.

## Adding a component

Create `registry/languages/<slug>/expressive/<component-slug>/` with four files.

### `component.html`

A **fragment**, not a document. No doctype, no `<head>`, no `<body>`.

Wrap everything in a single root element carrying the scope class:

```html
<div class="nx-<component-slug>">
  ...
</div>
```

Mount points use `data-nx-mount="name"`, never `id`. Two copies of a component on
one page must not collide, and nothing may depend on a document-level ID.

### `component.css`

Every selector scoped under the root class by ancestor, for example
`.nx-my-chart h2`. Reference token variables only.

Three things that must not appear: a global reset such as
`*{margin:0;padding:0}`, page chrome such as `body { padding }`, and any colour
literal outside the language's declared ramp.

Anything that animates needs a `prefers-reduced-motion: reduce` block. CI fails
without one.

### `component.js`

Export one function:

```js
export function mount(root) {
  const q = (name) => root.querySelector(`[data-nx-mount="${name}"]`);
  // helpers inlined here
  // chart code
}
```

**Inline the helpers.** There is no shared lib and no imports between registry
items. A consumer takes two or three components, never all of them, so one file
per component is the point. In an application this duplication would be a
defect; in a catalogue of reference implementations it is the design.

Use a deterministic hash for sample data, never `Math.random()`. Previews and
screenshots must reproduce exactly.

### `meta.json`

```json
{
  "slug": "my-chart",
  "title": "A sentence about what the chart says",
  "description": "What one mark represents, as reading instructions",
  "component": "bar",
  "tier": "expressive",
  "runtime": "svg",
  "density": "close-read",
  "aspectRatio": "800/300",
  "tags": ["billing"],
  "dependencies": []
}
```

- `component` must be in the enum in `packages/core/src/taxonomy.ts`. Add a new
  type only if the mark genuinely is not covered; a type names the mark and
  encoding, never the animation or the data domain.
- `runtime` is `svg`, `echarts`, or `css`. Do not introduce a fourth. Each one
  costs a token binding in every `DESIGN.md` and a lint implementation, forever.
- `strokeAsArea: true` when the stroke *is* the area rather than an outline, as
  in a sankey flow or violin body. It exempts the component from the hairline
  ceiling.
- `externalData` for any runtime fetch. Declaring it is what lets the CLI warn a
  consumer, so leaving it out hides a supply-chain surface.

## Adding a primitive

Primitives live at `registry/primitives/<name>/` and are shared by **every**
language. Two files, `component.html` and `component.css`, plus `meta.json` with
`"tier": "primitive"` and `"runtime": "css"`.

Keep them **presentational**: visual states in CSS, no JavaScript API. Design
what a select looks like and document applying it to a headless Radix or Ark
component. Nodex ships the design layer, not the behaviour layer.

A primitive may not contain a single colour literal. The build rejects it,
because a primitive that hardcodes a colour cannot be themed, which defeats the
only reason it is shared.

## Verifying

```bash
npm run build:registry   # validate, generate, emit
npm run smoke            # mount every component and assert it draws
npm run lint
npm run typecheck
```

`build:registry` is the gate. It checks schemas, slug uniqueness, enum
membership, density against the language declaration, and the conformance lints.

`smoke` matters more than it looks: parsing only proves syntax. A component whose
helpers were over-shaken, or whose mount attribute was renamed wrong, parses
fine and draws nothing.

To look at the result, `npm run dev` and open http://localhost:4180.

## Common failures

- **`colour(s) outside the recorded ramp`** either add the value to
  `tokens.json` `ramp.steps` if intended, or use an existing step. The lint
  freezes the palette on purpose.
- **`stroke-width N exceeds lineMax`** thin it, or set `strokeAsArea: true` if
  the stroke really is the area.
- **`animates but ships no prefers-reduced-motion guard`** add the guard.
- **`duplicate slug`** disambiguate with a qualifier naming what actually
  differs, like `-dense` or `-states`. Never a counter: a silent `foo-2` corrupts
  search without anyone noticing.
- **`declares density X but language declares [...]`** either add the value to
  the language's `meta.json` or use a declared one.
- **Smoke test says `drew nothing`** usually a helper was tree-shaken out, or the
  `data-nx-mount` name in the markup does not match what the script queries.

## Guiding rule

**Promote on second use.** Leave a thing inside its language until a second
language needs it, then move it up. This has already been applied twice, removing
a shared SVG lib and a generalised facet map that each existed on the evidence of
one sample. Primitives are the sole exception, starting shared because a button
is already known to be universal.
