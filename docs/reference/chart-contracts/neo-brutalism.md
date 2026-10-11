# Neo-brutalism chart contracts

Read this reference when changing Neo-brutalism charts or their consumer tests.
[Architecture](../../../AGENTS.md) defines the shared contract;
[DESIGN.md](../../../registry/languages/neo-brutalism/DESIGN.md) owns the visual language.
[Authoring procedure](../../../.agents/skills/nodex-authoring/SKILL.md) owns the steps.

Neo-brutalism is the third language. Its initial release contains the complete
shared primitive vocabulary, embedded Space Grotesk/JetBrains Mono and design
foundations, plus nine expressive charts: `block-bars`, `punch-area`, `split-ring`,
`stacked-blocks`, `bridge-waterfall`, `twin-pins`, `sticker-scatter`, `tile-heatmap`
and `hundred-blocks`. The original four remain the language index's curated
previews; the language gallery contains all nine. Empty featured lists still
fall back to primitive previews.
Its categorical yellow/lilac/mint/pink/blue palette is not a sequential data ramp. Gallery
palette descriptions must not assume every language is monochrome.
The ng-brutalism reference study informs compact 8px surface/4px control corners,
larger control type, stronger field shadows and full shadow compression on press.
These choices live in Neo-brutalism's tokens. `shadow.badge` is a shared role:
solid and outlined badges use it, while dashed and quiet badges stay flat.
Mono Editorial and Signal Console keep zero badge offsets. Reduced motion retains
resting shadows rather than deleting the visual hierarchy.

## Chart contracts

## Stacks and paired observations

- Stacked Blocks and Bridge Waterfall contain library sizing overflow inside
  their sized plot. Automatic-height wrappers scroll only horizontally when the
  plot's minimum width requires it; incidental SVG overflow must not create
  scrollbar pairs in scaled gallery previews. Explicitly height-constrained
  stacks retain vertical scrolling for additional rows.
- Bridge Waterfall uses native ranged bars with signed running balances. A null
  change invalidates following changes and totals until a new start. Zero changes
  keep labels without visible bars; annotations use public scales so they also
  survive interrupted animation. Twin Pins has one Scatter observation per row;
  its circle and square encode the two endpoints on a shared numeric scale.
  Missing endpoints do not acquire a connecting line. Sticker Scatter retains
  finite signed coordinates, filters incomplete pairs and reports their count;
  all stickers have the same size and color follows identity rather than value.

## Heatmap and unit chart

- Tile Heatmap requires explicit row and column domains and a fixed positive
  intensity ceiling. Omitted pairs, invalid numbers and out-of-range readings are
  unavailable. Duplicate pairs and undeclared axis IDs reject the input rather
  than silently overwriting a reading. Blue fill opacity encodes value/maxValue;
  the categorical accent palette is not a sequential ramp. Zero and missing cells
  have different marks. Cells and tooltips use native Scatter coordinates.
- Hundred Blocks requires whole-percent shares totaling exactly 100. Native
  Scatter has one observation per category; the custom marks place that category's
  exact block count on public scales, so decorative units do not create 100
  keyboard stops. Caller order determines allocation order. Zero-share categories
  retain key entries. The grid remains square as its container changes width.
- The five newer Neo charts share `neo-chart-frame.tsx` for their heading, frame,
  empty state and tooltip surface. It contains only common language-token roles;
  each component owns its data contract and Recharts composition.

## Area and ring

- Neo-brutalism's Punch Area preserves caller order with equal observation spacing;
  callers should supply regular intervals. Its headline is the final observation,
  even when unavailable. Null readings break both line and fill. Square points
  retain isolated and zero readings. Set Area stroke width through style because
  Recharts parses the numeric prop while computing its animation clip.
  Pointer tests on a maximum target the lower interior of its square, within the
  plot. Its center lies on the top plot boundary, where fractional screen rounding
  can classify a centered pointer as outside the native inspection region.
- Split Ring requires a complete, finite allocation before calculating shares.
  Zero values have key entries but no sectors; an all-zero allocation has no ring.
  Native Pie angles are exact, with no minimum angles or padding. Its shadow
  applies to the whole ring, not to each sector. The legend stacks at narrow
  container widths. Stacked Blocks likewise hides an entire incomplete row rather
  than allowing Recharts to stack an unknown segment as zero. Row totals use
  public scales so zero and unavailable rows remain visible. Segment labels are
  omitted when they cannot fit, with exact values available in keyboard tooltips.

## Category identity and bars

- `neo-categorical.ts` owns stable ID-to-tone assignment for Block Bars, Split
  Ring, Stacked Blocks, Sticker Scatter and Hundred Blocks. Language-specific token references remain in the chart
  modules: shared helpers are also linted against other installed languages.
  Caller order and repeated display labels are preserved; IDs
  must be unique. All five can accept explicit category tones.
- Neo-brutalism's Block Bars uses native Recharts bars and a common zero baseline.
  The front face encodes magnitude; CSS hard shadows do not change that geometry.
  Series colors represent categories, with explicit tones or a stable ID-based
  default. Caller order and duplicate display labels are preserved; IDs must be
  unique. Zero and unavailable values keep their labels without visible bars.
  Recharts omits null bars, so missing-value dashes use its public scales to
  retain the original category slot at the baseline. Value labels belong to the
  bar shape; LabelList can stay hidden after reduced motion interrupts a draw.
  Entirely unavailable data renders an explicit empty state.
  More than six categories scroll within the plot rather than widening the page.
