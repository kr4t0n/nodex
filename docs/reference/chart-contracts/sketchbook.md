# Sketchbook chart contracts

Read this reference when changing Sketchbook charts or their consumer tests.
[Architecture](../../../AGENTS.md) defines the shared contract;
[DESIGN.md](../../../registry/languages/sketchbook/DESIGN.md) owns the visual language.
[Authoring procedure](../../../.agents/skills/nodex-authoring/SKILL.md) owns the steps.

Sketchbook is the fourth language, with all 24 primitives and nine charts:
`sketch-bars`, `sketch-bars-horizontal`, `sketch-stacked-bars`, `sketch-line`,
`sketch-scatter`, `sketch-pie`, `sketch-donut`, `sketch-force` and `sketch-network`.
The index features bars, line, donut and network; the gallery discovers all nine.
Its roughViz reference is pinned in the language's `PROVENANCE.md`; extracted
palette/drawing values and Nodex UI extensions are distinguished there.
Gaegu regular/bold supplies headings, annotations, short UI text, paragraphs,
editable values and dense tables. `font.sans` uses Gaegu, with reading text enlarged
by 2px for its smaller letterforms: body/form values are 16px and prose is 14.5px.
Supporting text follows the same increase; heading/action/code sizes and spacing
retain their prior values. Sketchbook embeds only Gaegu; commands use system
monospace. `font.ui`, `type.uiLabel` and
`type.choice` separate action/field/choice typography from dense labels and input
metrics. `type.meterLabel` styles slider/progress labels independently of values.
The shared `font.heading` role is consumed by Card, Dialog, Empty State
and Prose headings. Font roles hold independent literal stacks, never root aliases.
Existing languages retain their prior families and metrics. `texture.*` supplies
static, noninteractive secondary outlines and corner hatching on framed cards and
solid actions; outlined actions receive only the second outline. Plain cards and
quiet actions stay clear. Pseudo-elements remain behind content and inside native
targets; reduced motion retains decoration. Original languages have zero texture
opacity. Compound corner values are supported; `radius.avatar` replaces arithmetic
on `radius.card` so square avatars accept scoped, independent radii.

## Seeded marks and scoped settings

Sketchbook keeps Recharts' native geometry, scales, tooltip and keyboard
inspection. Rough.js is a pinned geometry dependency, not a second chart runtime.
Its generated paths are rendered declaratively by React. Native measurement
bounds clip filled texture. Bar outlines render outside that fill clip: clipping
the wobbled boundary stroke cuts away parts of it, which can disappear entirely
when a thumbnail scales below one pixel. Keep the original stroke token,
seeded geometry and native hit targets; do not thicken the language's marks or
change gallery scale to compensate. Check actual rasterized thumbnail edges at
fractional pixel positions as well as native-size geometry.
Stable category IDs seed origin-relative paths so reordering
does not rerandomize a mark. Paint and stroke widths stay in CSS. Only the numeric
sketch options are resolved from the chart scope; a local hook observes scope,
stylesheet and color-scheme changes and cleans up its listeners. CSSOM changes
use the existing `nodex:tokens-changed` event. Invalid sketch settings fall back
to plain marks. Missing/invalid values and zero retain distinct readings; missing
or duplicate IDs reject the dataset. Dense labels scroll inside the plot.

## Shared geometry and delivery

Repeated responsibilities live in `_shared/sketch/`: scoped drawing settings,
seeded marks, frame/tooltip presentation, pie/donut sectors and force/network
layout. Palette and sketch-specific CSS token references stay in the language
components and are passed to shared marks, so the shared delivery closure also
lints with the original languages. Native sectors own exact angles and donut
holes; convert Recharts' angles to Rough.js' clockwise coordinates before drawing.
Checking the clip geometry alone will not detect hatching outside a sector.

## Data and network contracts

Line accepts strictly increasing numeric X coordinates and preserves gaps per
series; scatter omits and counts incomplete coordinate pairs. One missing stack
segment makes that category unavailable. Pie/donut require complete totals and
retain zero in their key without manufacturing a sector. Force has no links;
Network accepts explicit, unique undirected pairs between existing node IDs.
Their pinned `d3-force` dependency computes only a finite stopped layout from
cloned, ID-sorted input. It never owns DOM or a running simulation. Native Scatter
owns numeric scales, area sizing, tooltip and keyboard traversal in caller order.
Reordering preserves layout and texture; node area scales with value within the
dataset. Zero/missing nodes use text without area, retaining network topology.
Recharts fades at final coordinates so links remain attached during transitions.
