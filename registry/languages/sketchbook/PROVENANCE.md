# Sketchbook provenance

The visual reference is [roughViz](https://github.com/jwilber/roughViz), pinned to
commit [`17c7ea86bfa2e9f1d76fbc8ebcff3f414d374d76`](https://github.com/jwilber/roughViz/tree/17c7ea86bfa2e9f1d76fbc8ebcff3f414d374d76).
Source defaults take precedence over its README. This is a Nodex interpretation
of that visual vocabulary; it does not deliver roughViz or its imperative D3 runtime.

| Tokens | Reference | Treatment |
| --- | --- | --- |
| `color.seriesA`–`seriesI` | [`src/utils/colors.js`](https://github.com/jwilber/roughViz/blob/17c7ea86bfa2e9f1d76fbc8ebcff3f414d374d76/src/utils/colors.js) | Preserve all nine distinct colors; convert named CSS colors to equivalent hex. Repeated entries reuse the same roles. |
| `font.heading` | [`src/Chart.js`](https://github.com/jwilber/roughViz/blob/17c7ea86bfa2e9f1d76fbc8ebcff3f414d374d76/src/Chart.js) | Preserve Gaegu; embed Latin regular and bold from `@fontsource/gaegu@5.3.0`. |
| `color.ink`, `stroke.mark`, `stroke.axis`, `sketch.axisRoughness`, `sketch.fillWeight` | [`src/Bar.js`](https://github.com/jwilber/roughViz/blob/17c7ea86bfa2e9f1d76fbc8ebcff3f414d374d76/src/Bar.js) | Black ink, 1px mark strokes, 0.5px axes, 0.5 axis roughness and 0.5 fill weight. |
| `sketch.roughness` | [`src/utils/roughCeiling.js`](https://github.com/jwilber/roughViz/blob/17c7ea86bfa2e9f1d76fbc8ebcff3f414d374d76/src/utils/roughCeiling.js) | Preserve the default of 1. |
| `sketch.bowing` | `src/Chart.js` above | Preserve the default of 0. |
| `sketch.fillStyle`, `sketch.hachureAngle`, `sketch.hachureGap` | `roughjs@4.6.6` generator and hatch filler | Explicit hachure, −41 degrees, and a 4px gap (the default four times a 1px mark stroke). |

The default single-series bar color in the pinned source is red; the README
says sky blue. Sketchbook deliberately uses roughViz's categorical palette
for its multi-category specimen, rather than extracting the bar default.

Warm paper, white panels, cream fields, action/selection/badge mappings, darker
value colors, focus treatment, structural border width, radii, shadows, spacing,
type sizes and interaction/drawing timing are **Nodex extensions**. Gaegu's use for
short UI text, natural-case UI labels, uneven CSS corners, secondary surface/action
outlines and corner hatching are also Nodex extensions, not extracted roughViz UI.
The `texture` roles use static CSS decoration; chart geometry continues to use
the separate numeric `sketch` roles. Inter reading text, editable values and dense
tables keep complete interfaces readable. Thin axes and
Gaegu labels preserve the source relationship without copying chart margins or
tooltip sizes into application controls.

The pinned [`src/index.js`](https://github.com/jwilber/roughViz/blob/17c7ea86bfa2e9f1d76fbc8ebcff3f414d374d76/src/index.js)
exports nine chart types, also shown in the [official catalogue](https://www.jwilber.me/roughviz/).
Its README lists only seven; Force and Network are additional exports.

| roughViz export | Nodex component |
| --- | --- |
| `Bar` | `sketch-bars` |
| `BarH` | `sketch-bars-horizontal` |
| `StackedBar` | `sketch-stacked-bars` |
| `Line` | `sketch-line` |
| `Scatter` | `sketch-scatter` |
| `Pie` | `sketch-pie` |
| `Donut` | `sketch-donut` |
| `Force` | `sketch-force` |
| `Network` | `sketch-network` |

Force positions bubbles without relationships; Network adds supplied links.
Nodex uses pinned `d3-force@3.0.0` only as a stopped numeric layout solver, on
cloned data sorted by stable IDs. React and Recharts own all rendered marks and
interaction. Area-proportional bubble sizing, finite settled layouts, numeric X
coordinates for lines, typed data contracts, keyboard inspection, explicit missing
readings and complete-total validation are Nodex adaptations. These components
cover the chart encodings; they do not implement roughViz's imperative API or its
data-fetching options.

Rough.js supplies seeded geometry inside Recharts' native compositions.
Category IDs supply positive stable seeds. Native rectangles own measurement and
hit testing for bars; native sectors and scatter circles define the other area
bounds. Clip paths keep filled texture within those bounds. Bar boundary strokes
render separately to preserve their complete outlines in scaled previews, with
the same native stroke width and seeded geometry. Paint stays in CSS
variables. Geometry is read from the chart scope and refreshed on scope,
stylesheet and color-scheme changes; CSSOM-only updates can dispatch
`nodex:tokens-changed`. Invalid settings fall back to plain token-painted marks.
Supported ranges are roughness, axis roughness and bowing from 0 through 10,
positive fill weight, a hatch gap of at least 1px, and finite hatch angle.
The supported fills are hachure, cross-hatch and solid.

roughViz and Rough.js use the MIT license. The implementation is new React source;
roughViz chart code is not copied. Dependency notices remain with the packaged
dependency. Embedded Gaegu and Inter stylesheets include their package OFL notices.
Gaegu's first release here includes Latin glyphs.
