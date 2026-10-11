# Soft Studio chart contracts

Read this reference when changing Soft Studio charts or their consumer tests.
[Architecture](../../../AGENTS.md) defines the shared contract;
[DESIGN.md](../../../registry/languages/soft-studio/DESIGN.md) owns the visual language.
[Authoring procedure](../../../.agents/skills/nodex-authoring/SKILL.md) owns the steps.

Soft Studio is the fifth language, with all 24 shared primitives and nine charts:
`soft-bars`, `soft-area`, `soft-donut`, `soft-heatmap`, `soft-line`,
`soft-stacked-bars`, `soft-scatter`, `soft-dumbbell` and `soft-gauge`.
The original bars, area, donut and heatmap remain the four featured previews;
the gallery and selected landing belt discover all nine.
Manrope is embedded through pinned Fontsource metadata; code uses system monospace.
Cool off-white pages, white surfaces, cobalt actions, tinted fields and contextual
rounding define the UI. Its shadow roles use negative spread with scoped ink for
subtle elevation, without changing shared primitive implementations. No texture
is visible. Existing languages retain their values.

## Shared presentation and chart semantics

Studio charts share presentation in `_shared/studio-chart-frame.tsx` and stable
category-tone assignment in `studio-categorical.ts`. Language-specific paint
references remain in the components. Bars use native bounds with CSS rounding,
including scoped radius overrides; zero and unavailable values retain labels
without marks. Area uses strictly increasing numeric X coordinates and native
monotone interpolation; missing values break the curve and the final supplied
reading owns the headline. Donut requires a complete finite total, preserves
exact angles and keeps zero entries in its key. Heatmap declares both domains
and a fixed positive ceiling; missing or invalid readings retain inspectable
cells even when every cell is unavailable. Zero dots and missing crosses differ.
Duplicate IDs/pairs and undeclared heatmap coordinates reject the input. Dense
plots scroll locally and the donut key stacks below its plot in narrow scopes.
Line uses independent native monotone curves on strictly increasing numeric X;
signed values are supported and missing readings break only their own series.
Horizontal stacks use native absolute bounds from a shared zero; any missing part
or overflowing total leaves its row unavailable. Both accept explicit ordered
series and preserve identity colors on reorder. Scatter uses equal-size circles
on numeric axes, omitting and counting incomplete pairs. Dumbbell retains available
signed endpoints, connects only complete pairs and shows ties as concentric open
and filled circles. Gauge uses exact native 180-degree sectors against a finite,
positive target; invalid or above-target values are unavailable, never clamped.
Zero and full progress never acquire a decorative sliver.

## Gauge geometry

Gauge height comes from Recharts' numeric aspect ratio, rather than a percentage
height that depends on a CSS aspect-ratio wrapper. Its percentage, reading and
endpoints share the native SVG coordinate system with the sectors. Check visible
arc bounds and centered, separated text after resizing and without a wrapper
aspect ratio; a correctly sized card alone does not prove that the chart rendered.

## Specimen containment

Gallery specimens must fit their complete content before the common preview
transform scales them. The donut's 280px ring previously overflowed a 278px
content area; its example now reserves 384px plus 56px of preview padding.
Do not hide scrollbars or clip keys to compensate for undersized examples.
Browser checks assert actual scroll extents and surface containment for all nine,
including scaled desktop thumbnails and mobile thumbnails/detail pages.
Consumer coverage includes all primitives in the new language and all nine
charts' geometry, data updates, native inspection, scoped overrides and motion.
The landing discovers Soft Studio in its list and interactive commands; the
authored automatic sequence still finishes with Sketchbook.
