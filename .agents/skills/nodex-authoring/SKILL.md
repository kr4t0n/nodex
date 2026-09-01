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

Create `registry/languages/<slug>/expressive/<component-slug>/`.

There are two authoring styles, and **a new chart should use the React one**.
The framework-free triple below is how the imported corpus is written; it is
documented because sixty-four components use it and you will read them.

### React: `component.tsx` + `component.css` + `meta.json`

The reference is `signal-console/endpoint-latency`. Four rules, all of which the
build enforces:

- **Export a pure `buildOption(data)`** returning the ECharts option, taking no
  DOM. This is what the build renders and the lint reads.
- **Export `previewOption()`**, zero arguments, returning `buildOption` applied
  to the sample. `useEffect` does not run under server rendering, so this is the
  only way the build can reach a chart's marks without knowing its default
  props. The build fails without it.
- **Take data as props with the sample as the default**, and export the sample.
  `EndpointLatency({ endpoints = ENDPOINTS })`. Swapping real data in should be
  a prop, not a rewrite.
- **Inline `useECharts`** rather than importing it, and set
  `renderer: 'svg'`. Copy the hook from `endpoint-latency`. A component is
  lifted out one file at a time, so an import of a shared hook hands a consumer
  a path that does not resolve; and a canvas chart leaves nothing in the DOM,
  so it cannot be linted at all.

Render the component's chart into `<div className="chart" ref={ref} />` — an
empty element with exactly that class, which is where the build splices the
server-rendered SVG. Size it in CSS, because ECharts measures its container.

Check your work with `npm run build:registry`, which renders the chart and will
tell you if it draws nothing, breaks the ramp, or exceeds the stroke ceiling.

### Framework-free: `component.html` + `component.css` + `component.js` + `meta.json`

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

**Do not put a title or a description in the fragment.** A chart is the drawing;
its title and type come from `meta.json` and are printed by whatever lists it.
Naming a component inside itself duplicates the manifest and is how the two
drift apart. Annotation is different and still belongs: a `div.note` explaining
what one mark represents sits in the composition, because it points at the marks
rather than naming the component.

### `component.css`

Every selector scoped under the root class by ancestor, for example
`.nx-my-chart .note`. Reference token variables only.

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
  "description": "What one mark represents, as reading instructions. Agent-facing: nodex show and nodex search read it, and the app does not print it",
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
language. Two files, `component.tsx` and `component.css`, plus `meta.json` with
`"tier": "primitive"` and `"runtime": "css"`.

`component.tsx` exports one component named `<Name>Specimens` — `ButtonSpecimens`,
`EmptyStateSpecimens` — rendering **every variant at once**. The plural name is
deliberate: it is a specimen sheet, and a consumer importing `Button` and
rendering it expecting one button would get five.

Keep them **presentational**. Plain elements and classes, no props API, no
abstraction. Design what a select looks like and document applying the classes
to a headless Radix or Ark component; nodex ships the design layer, not the
behaviour layer. A `<Button variant="solid" />` would take that away, because a
consumer already on Radix would have to unwrap it to reach the classes.

Four things the JSX has to get right, each of which broke something real when
the existing 24 were ported:

- **`className` and `htmlFor`**, not `class` and `for`. This is the whole reason
  primitives are TSX: those two are type errors in JSX, so HTML meant a
  hand-translation every time one was added.
- **A CSS custom property keeps its literal name and needs a cast** —
  `style={{ '--nx-slider-steps': '12' } as CSSProperties}`. Camel-casing it
  produces a property that does not exist and silently applies nothing.
- **Numeric props go in braces**: `rows={3}`, `tabIndex={0}`.
- **JSX deletes a space that spans a line break.** `Read the\n<a>field ratio</a>`
  renders as "Read thefield ratio". Write `{' '}` at the end of the line.

A primitive may not contain a single colour literal. The build rejects it,
because a primitive that hardcodes a colour cannot be themed, which defeats the
only reason it is shared.

The build server-renders the specimen sheet to generate its preview, so a
primitive must render with **no effects**: whatever a `useEffect` or a `ref`
would set is absent from the preview. Where a state exists only as a DOM
property, carry it in an attribute too and match both in CSS — see `checkbox`
and its `data-indeterminate`.

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
