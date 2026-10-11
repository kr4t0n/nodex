# Mono Editorial chart contracts

Read this reference when changing Mono Editorial charts or their consumer tests.
[Architecture](../../../AGENTS.md) defines the shared contract;
[DESIGN.md](../../../registry/languages/mono-editorial/DESIGN.md) owns the visual language.
[Authoring procedure](../../../.agents/skills/nodex-authoring/SKILL.md) owns the steps.

Implementation contracts and specimen constraints for Mono Editorial charts.

## Arc matrix

- Arc-matrix retains absolute area and tone encoding: a value has the same mark
  size and shade across datasets. Do not normalize its marks to each input maximum.
- Arc-matrix has one observation series so guide curves cannot become tooltip or
  keyboard stops. Its custom active cells use stable observation identifiers.

## Coordinated plots

- Dual-area coordinates a reversed spend bar plot with a sign-up area plot.
  Both retain identical ordered rows and band scales, including unavailable
  measures. Recharts' public tooltip hooks publish the inspected day to local
  React state, and two ReferenceLines place aligned cursors through the scales.
  `syncId` alone leaves a receiving plot's prior mouse/keyboard state active,
  which can strand its cursor on another day. Input ownership follows pointer
  movement, focus and keydown; only that plot displays the combined tooltip.
  Selection and gradient IDs belong to each component instance. Spend retains
  its original $18K scale ceiling unless larger caller values require expansion;
  sign-ups use a zero-based scale.

## Petal rose

- Petal-rose uses one equal-angle Pie with a per-observation outer radius.
  Library Sector shapes compose the track and petal; labels share that
  observation, so decorative layers cannot become extra keyboard stops.
  Radius grows linearly from the inner ring to the current dataset maximum,
  preserving the old rose renderer's actual encoding despite its `area` name.
  Zero leaves no petal; do not copy the old all-zero midpoint-radius bug.
  Label contrast retains the specimen's 8-of-12 reach threshold as a ratio so
  changing count units cannot put light labels onto short, pale petals.
  The 5px background strokes are knockout gaps, not data outlines. Numeric
  labels use `type.plotValue`, separate from card headings.

## Animated observations

- Bar-race receives period frames and stable unique product IDs. It plays
  once, holds the final frame, and retains whole-plot pointer replay plus a
  separate keyboard replay button so the chart is not nested inside a button.
  Reduced motion and zero-duration tokens select the final frame and cancel
  playback timers. Product identity must survive rank changes; repeated display
  names are not IDs. Missing final readings retain the known period and replay.
  Browser regression recording must start before playback is enabled; starting
  it after a frame-zero assertion can miss that entire frame on a busy page.
- Stagger-delay uses one native Bar with the public animationInterpolateFn
  hook. Its per-category delays retain unavailable positions and use the chart
  motion tokens; there is no extra timer. Dynamic-data and draw-in-counter share
  only the constrained cubic curve factory supplied to native Area series.
  Dynamic-data gets its static source badge from the caller and never fabricates
  a feed. Draw-in-counter uses AreaRevealShape progress for its headline, so
  the number and area share one library animation. Each changed dataset repeats
  the original reveal from zero using current library points. Its exact cumulative total
  stops at missing input; plotted values retain whole-thousand rounding.
  Recharts parses the Area strokeWidth prop numerically during clipping, so
  these areas set actual tokenized width through style to avoid NaN clips.
- Dot-cascade preserves ascending caller order, the sloping baseline and
  rounded-up two-incident dot stacks, including odd totals. Exact labels are
  authoritative; zero and unavailable counts add no dots. Launch-fan takes only
  feature/week observations plus caller guide weeks; legacy MAU copy did not
  correspond to an encoded field and does not justify adding one. A single
  launch has a valid leading-edge spoke. Guides never become inspection stops.

## Share and radial tally charts

- Donut-redesigned retains its ten-by-ten dot grid and source key; its type is
  unit-chart, since its slug does not describe donut geometry. Shares must total
  100 and be whole percents. Tones follow source order. Custom-pie uses a real
  Pie for share angles and per-observation radius for minutes, with caller scale
  and reference rings. It sorts by share and ranks tone by minutes. Missing
  minutes reserve the known angle without a wedge; missing shares invalidate
  the allocation. Zero minutes leave a label without a synthetic hub sector.
- Tick-donut requires complete whole-percent shares totaling 100, since an
  unknown share makes following angular positions unknown. Tones follow caller
  order, despite old rank comments. Tick-gauge requires one whole percent and
  caller goal label; zero keeps all remaining ticks. Both retain the original
  angular sweeps with equal horizontal and vertical pixel units. Fit native axis
  domains to the actual plot bounds so resizing cannot turn the donut or gauge
  into an ellipse. The gauge's upper bound includes the complete sweep. Shared
  radial-tally-marks owns fitted axes, unit texture and library curves; ticks,
  guides and inspection coordinates use those same public scales.
  Channels/progress are observations; counting guides are not.

## Bars, rungs and intervals

- Pictorial-bar uses a native continuous Bar clipped through a repeated tree
  texture. Glyph count changes with width; the old one-tree-per-10K comment was
  inaccurate. Caller targetK owns the shared track. Preserve labels after the
  full final glyph, partial clipping, zero tracks and unavailable rows.
  Consumer checks wait for the native planting/target geometry after data
  changes; an updated total label alone does not prove the Bar has recalculated.
- The bar family uses Recharts Bar series, category indices and public scale
  hooks. Repeated labels do not merge categories. Chunky-bars keeps caller order
  while rank selects tone, and zero retains a label without a visible bar.
  Rung charts require nonnegative safe integers: each mark is exactly $1K, so
  silently rounding fractional counts would change the data. Shared `rung-marks`
  owns only unit marks and their preserved deterministic width/opacity variation;
  each component retains its series, scales, geometry, types and annotations.
  Paired-rungs has two real series and a combined plan tooltip. Stacked-rungs
  stacks three actual counts, then shifts custom marks by one scale unit per
  preceding segment to retain gaps without adding synthetic revenue to the stack.
  An incomplete region suppresses its whole stack and total; treating a missing
  segment as zero would misplace every later segment. Categories remain available
  to keyboard inspection. Totals use the library's LabelList so zero/unavailable
  labels survive zero-height bar filtering. Rung thickness uses `stroke.mark`;
  numeric label sizes derive from `type.plotValue` with preserved proportions.
- Rung-histogram consumes explicit time intervals and integer ticket counts.
  Preserve its bin-edge ticks, sparse interval labels and median flag. An unknown
  bin suppresses the median and total-based wording; it is not zero tickets.
  Diverging-bar retains signed values, directional caps and the dashed zero rule.
  Range-capsules uses real `[low, high]` Bar values and retains its 50–320K specimen
  scale, expanding for caller values. Invalid/reversed intervals are unavailable;
  equal endpoints remain inspectable without a visible capsule.
- Rung-waterfall declares `start`, `change` and `total` steps explicitly. Labels
  never determine arithmetic. Missing changes invalidate the running total until
  a new start establishes it; solid rungs add and broken rungs deduct. Recharts
  removes null bars before generating LabelList entries, so unavailable totals
  need an annotation positioned with its public scales, without a synthetic bar.
- Candlestick uses a real range Bar for each complete OHLC quote. Open/close
  bodies and low/high wicks share the public Y scale. Invalid ranges suppress
  the whole quote; unchanged and zero prices retain a horizontal body. Extrema
  are annotations, not extra series. The original preview uses seven $5 ticks.

## Radial and almanac compositions

- Radial-patchwork composes independent Sector marks in one Scatter observation
  series. Hour and angular window remain separate from radial files/6 reach;
  the original 16-unit hole masks reaches of 96 files or fewer. Dial ticks use
  Cartesian proportions while sectors stay circular through the smaller scale.
  Fixture state setters enqueue React work; returning from `page.evaluate`
  does not guarantee new SVG geometry. Poll the updated radius before checking
  its ratio so fast runners cannot read the previous mode.
- Radial-convergence takes explicit request assignments and stable theme IDs.
  Hub area counts actual assignments; an unresolved assignment keeps its rim
  node without inventing a strand. Requests and hubs share one native series,
  while leaders, labels and bundle curves never become extra keyboard stops.
- Bubble-almanac uses a native Z axis for absolute ticket-to-area scaling and
  a private Curve factory for its irregular midpoint rims. Its dark cores are
  the preserved fixed texture, not a second inferred measure. Missing counts
  and zero counts draw no bubble. Years, areas, marginal notes and shelf events
  belong to the caller. The example explicitly retains the old 540 × 245 plot;
  the live default retains its original 320px minimum. plotLedger and plotRule
  preserve the almanac's distinct original paper-line paints.
  Marginal notes wrap in separate columns within the existing top margin;
  caller `from` positions remain leader targets and `to` positions guide their
  bends. Event captions wrap within their shelf columns. Numeric labels use
  a per-instance SVG filter that fills their actual text bounds with scoped
  background paint, including digit interiors. Keep that background opaque;
  group opacity would let bubble cores and ledger rules show through again.
  Draw leader curves before the labels and protect product headings with the
  same background so a leader cannot cross their lettering.

## Parallel and flow compositions

- Parallel-coordinates scoring includes only caller-marked dimensions. The
  specimen excludes price; repeated product names remain separate rows. Its
  parallel polylines use unconstrained chord-weighted tangents, while the area
  charts retain constrained tangents in the shared curve helper. Reference
  ranges stay fixed and finite readings can extrapolate beyond them. Preserve
  the old axis brushing; Escape clears the current instance's selections.
- Thread-triptych retains continuous bumpX curves through all three columns
  and volume-encoded stroke widths. Routes and real nodes share native
  inspection; decorative headings add no stops. The old description mentions
  pinning and bundle hover, but its actual React renderer implemented neither;
  do not invent those interactions during reconstruction.
- Cluster-field has exactly one dot per person, deterministic golden-angle
  placement and caller-declared cross-contribution bridges. Missing counts
  retain island labels without people or relationships. Glyph size is texture,
  not another inferred contributor measure.
- Hourglass-stream retains nearest-40-person tick rounding and exact stage
  counts. Its 34 threads per adjacent positive pair are illustrative; conversion
  labels derive from the actual counts. Unknown stages break the guides, and
  a zero denominator makes conversion unavailable rather than Infinity.
- Stream-ribbon is a regular zero-based stacked area in the old renderer;
  its comments incorrectly described a wiggle stack. Preserve that encoding,
  the graphic labels behind the bands and the actual every-eighth-week ticks.
  One missing measure suppresses that whole weekly stack so later bands are
  never shifted by an invented zero. Background 2px strokes are knockout gaps.
  Examples of wide charts explicitly retain the old build's pinned aspect
  heights even when the live component's CSS minimum is taller.
- Aggregate-sankey uses the native weighted Sankey layout with zero iterations,
  top-aligned columns and source totals determining rank and tone. Its ribbons
  are filled Curve areas through native link offsets, preserving vertical
  thickness rather than substituting a thick perpendicular stroke. Real
  zero-valued links retain topology without ink; incomplete allocations are
  unavailable as a whole. The pinned library's generic keyboard handler only
  handles numeric indices, whereas Sankey uses node/link strings. Keep its
  focusable surface and pointer events, and traverse the real observations
  locally for keyboard inspection. Public tooltip hooks drive pointer adjacency.
  Sankey exposes no native animation clock; its finite opacity entry is local
  layered CSS with direct motion tokens and a reduced-motion media guard.

## Networks, trees and maps

- Circular networks pack each node's diameter into its occupied angle and share
  the remaining circumference equally. Native scatter scales keep the ring
  circular, ZAxis retains absolute diameters and Curve supplies the inward
  quadratic links. One observation series includes real links and nodes, with
  public tooltip hooks driving adjacency. Duplicate names remain indexed.
  Simple team diameter is linear in headcount; dense repository diameter retains
  its 3.5px baseline plus 1.7 times the square root of contributors. Dense link
  width retains its 0.4px baseline, including measured zero. The old dense
  specimen's signed hash generates 338 negative shared counts among 556 ties;
  retain its rows, but invalid counts are unavailable and must not acquire SVG's
  fallback positive stroke. Shared circular-layout owns only packing and the
  public quadratic curve factory. Dense metadata's replay copy had no handler
  in the original component; reconstruction does not invent that behavior.
- Tree uses pinned d3-hierarchy only for the same tidy node positions as the
  original. Recharts Scatter owns its scales, nodes and inspection; Curve owns
  the connectors. Keep the default sibling/cousin separation and preorder
  inspection. Labels and membership come from the caller; no branches collapse.
- Nested-treemap composes two actual flat Recharts Treemaps. Separate layouts
  are required because the library's uniform nodeInset cannot reserve the old
  asymmetric 32px area headings. A nested chart inside SVG foreignObject owns
  each area's team layout; native rectangles retain the nested gap treatment.
  The original also has an empty 32px root band. The library rounds layout
  coordinates to pixels. ResponsiveContainer inherits an enclosing container
  even when given explicit dimensions; this composition measures its outer
  plot and supplies each native Treemap its own numeric size. Filter nested
  parent hover events so they cannot replace the selected team. Memoize each
  area's data so hover does not restart its
  animation. The public pointer callbacks inspect real nodes; a focusable local
  wrapper supplies keyboard traversal because Treemap exposes no accessibility
  layer. Zero hours add no rectangle but remain available to inspection; missing
  hours make the complete share hierarchy unavailable. Clip IDs are per instance.
- Choropleths retain their vendored TypeScript geography as declared runtime
  files, with no fetch or binary asset requirement. Native Cartesian scales
  preserve the old 0.75 longitude/latitude aspect. Top/bottom anchors determine
  map height, even when that clips horizontal overflow; do not fit the map into
  a different box. State insets preserve their original bounding transforms;
  world latitude bounds omit Antarctica. Closed native Curve subpaths preserve
  polygon holes through even-odd fill. Each region is one Scatter observation.
  Empty observations are explicit; unknown regions use the no-data paint and
  measured zero uses the lowest band. The original visualMap legend supports
  multiple toggles and hover emphasis; keep those interactions. Its literal
  interval gaps (such as 9.5K) have no selected band but retain the actual value
  for inspection. Map annotations and offsets come from callers, never from
  production sample labels. Repeated geographic keys make the input unavailable.

## Force graphs

- Force graphs retain the original seeded spring/gravity/repulsion/friction
  calculation, shared as local geometry with its Apache and BSD notices. Recharts
  owns native Scatter observations, axes and the entrance animation clock. Seed
  bounds still determine the simulation's gravity center. The simple force graph
  fits the complete entrance trajectory with equal X/Y scale and reserves actual
  label bounds plus the absolute node radii. Seed-only view bounds clipped settled
  nodes. Label size observation follows font/token changes and replaced Scatter
  marks. Refitting after a drag uses released positions; changing the view while
  the pointer is held would invalidate its captured inverse scales. The dense
  graph retains its seed-based viewport and explicit pan/zoom.
  The old SSR snapshot ran only two force steps, while live previews
  settled, so compare against a fully settled reference. Link width does not
  influence physical spring length in these specimens. Unknown endpoints and
  repeated directed edges follow the original graph's omission rules.
- Force dragging captures the stable chart SVG, because Recharts keys individual
  scatter marks by coordinates. Disable activeShape's automatic raised layer so
  selected links cannot cover their endpoint nodes; public tooltip hooks still
  drive adjacency emphasis. Stop using the entrance trajectory after interaction,
  or it overwrites dragged coordinates even with animation disabled. Pointer
  movement updates the simulation; release settles it without a background timer.
  The dense viewport keeps node size at 1 + (zoom - 1) × 0.6 and scopes pan/zoom
  to the instance. The old dense metadata's replay claim had no handler.
  Consumer drag checks query and measure the current mark from the stable chart
  root in one browser evaluation, retrying while a connected mark is unavailable.
  Evaluating a previously resolved mark can race its removal from the SVG.
  Recharts leaves native arrow-key page scrolling enabled. On an overflowing
  consumer page, that scroll can continue into a following pointer check and
  invalidate its screen coordinates. The force fixture cancels the page-scroll
  default on the document after React handles each arrow event, then resets the
  viewport before measuring drag targets. It exercises horizontal overflow and
  real keyboard navigation while retaining its precise drag assertions. Scope
  and remove the listener so later consumer checks retain normal browser input.

## Scatter morph

- Scatter-morph uses actual Scatter, Bar and Pie series. On a requested view
  change, sample the currently visible native outlines by stable product ID;
  custom marks follow the next native series' animation clock to its geometry.
  Keep native final shapes, preserve all observations through the transition,
  and capture the current intermediate outline if clicked again. Completed view
  transitions must not replay their saved outlines on later data updates; those
  updates belong to the current native series. All three series must match
  animation records by product ID; the library's positional default transfers
  geometry between products after reordering, insertion, removal or revenue-rank
  changes. Consumer checks inspect intermediate geometry for these cases.
  Read completion inside native shape callbacks too: a container resize can
  update them without rendering the parent component. A crossfade loses the
  component's identity tracking. The whole plot still advances on click;
  its keyboard button is a sibling of the focusable chart SVG. Zero revenue is
  not an equal-slice donut, and a missing revenue prevents a truthful share total.

## Scatter and heatmaps

- Scatter marks retain the old renderer's 0.8 opacity where it was implicit.
  Single-axis retains linear diameter, while dot-heat/calendar-heat retain their
  original square-root size curves. Tiny dots mean measured zero; missing values
  have no mark. Peaks annotate one real observation and add no keyboard stops.
- Matrix heatmaps retain absolute percentage bands, indexed categories and
  tokenized cell radii. Co-usage self-pairs are inapplicable; an instance with no
  comparable pairs renders an empty state. Its original band legend toggles
  visibility per instance. Adoption labels change contrast at 46%. Background
  strokes are cell gaps. Hover tests target the whole observation group so a
  value label remains a valid pointer target.
- Calendar week/period labels and the peak's business description come from
  caller props. The example alone supplies its original months and release-week
  wording. Draw the peak annotation above all daily marks through public scales.
  The note's wrapping box spans the plot width, independently of the peak's
  week, so peaks at either edge cannot push the text outside the chart.
  Calendar and almanac annotations use Recharts' public label ZIndexLayer.
  JSX order alone does not put custom children above Scatter: its portal paints
  later and can cover lettering and background knockouts, including on hover.

## Matrices and distributions

- Dotty-matrix uses one observation series on projected library scales; slab
  curves and corner labels are guides. Preserve clipping at the original plot
  boundary. Beeswarm retains fixed lane calibration while expanding its visible
  domain; sorting piles must retain stable deal IDs. Its baseline crosses row
  zero, independently of the below-zero median rule endpoint.
- Violin takes actual reply-time observations and a positive caller bandwidth.
  Its 48-sample Gaussian density is normalized within each plan. The example
  alone generates the old samples. Median rank controls tone; violin and
  beeswarm retain the original upper-middle median convention. Violin shapes
  use library-generated closed curves within one Scatter observation series.
  Median labels sit beyond the scaled silhouette half-width; a fixed offset
  from the center puts dark text inside the fill as the chart widens.
- Tick-box validates ordered five-number summaries and retains independent
  outliers even when a summary is unavailable. Its actual original marks use
  muted median rules and filled outliers, despite contrary legacy comments.
  One Scatter observation series retains summary/outlier identities and uses
  library Rectangle marks with public scales for the whiskers and medians.
- Hairline-area uses native Bar and Line series. Custom Bar hairlines consume
  stroke tokens; the line keeps null gaps and contributes the single peak dot.
  Sparse time labels come from the caller, and unavailable days remain available
  for keyboard inspection without turning into zero-valued observations.
- Ridgeline uses native Area, Bar and Line layers over caller density profiles.
  Bar consumes chart-level data; Area and Line accept their own arrays. Guard
  hatch dataKey functions because axis calculation can present another series'
  payload. Its assistive reading uses the public active axis label and the actual
  union of profile hours: Recharts' own-series tooltip fallback can otherwise
  return another hour. Preserve the specimen's invisible tooltip/row labels,
  axis-floor fills and overlap order. The zero-crossing rail is shared with
  beeswarm; it does not own either chart's series, domains or paint choices.

## Jitter and lineage

- Jitter-strip takes fractional band positions directly. The signed fixture hash
  and rounded band lookup are original behavior. Keep the fixed band viewport;
  Recharts normally expands a supplied domain to include all data. Overflow is
  enabled and the Scatter's clip is disabled through its public className so
  custom marks can retain whole edge dots when their bounds meet the plot.
- Trend-lineage uses one event series, with scaled guides and survival terminals
  outside keyboard inspection. The caller supplies its inclusive year window.
  An incomplete feature timeline cannot claim a continuous history or a tail.
  Shipped events are filled; reworks are hollow; intervals over two years are
  dashed. Feature names use column indices so duplicates remain separate.

- Type-colonnade is a network encoding, despite its old bar taxonomy. One
  repository is one observation and one strand; team counts derive from those
  available ownership records. Strands retain the original 21-point sampling
  and library-generated paths. Indexed ownership keeps repeated names distinct.

## Queues, ranks and counting marks

- Dumbbell-queue requires whole nonnegative minutes because every bead means
  one minute saved. Missing endpoints stay unavailable, and increases have no
  saved-minute beads. Its old category axis rounded away the fixture's vertical
  jitter; the actual original beads sit on the rail. Preserve that placement.
  Hollow/solid endpoints own inspection; rails and minute beads add no stops.

- Rank-strip is a rank heatmap, not a bump line. Positive integer ranks keep
  absolute tones; zero is not a rank. Sort by the final declared period, with
  missing finishes last and stable ties. Do not substitute an earlier known rank
  for a missing final reading. The original cell edge, pale-cell label paint and
  radius have semantic token roles; they are not background knockouts.

- Tick-rows uses a native horizontal Bar per team, with one thin vertical
  mark per release and a counting dot every fifth mark. Keep counts whole and
  nonnegative, caller order, deterministic height/opacity, and zero/unavailable
  totals. Category boundaries carry the row rules; labels use library scales.

- Barcode-lollipop renders only the chart, with the side note and legend removed
  at the owner's request. Its 676px example width retains the original 540px plot
  and preview padding; the plot fills the component's available width.
  Day labels, sparse axis labels and weekend flags belong to the caller. The
  example only shows APR, since the old automatic ticks never reached MAY/JUN's
  formatter positions. Every supplied day retains a calendar rule; unavailable
  readings have no peak. Up to three greatest readings at least six day positions
  apart are labelled; stems are decorative, and only peaks own inspection.

- Hundred-field takes up to four ordered whole-percent shares. Known shares
  cannot total more than 100; partial allocation does not generate extra people.
  One segment is one observation, and its exact share determines its dot count.
  Preserve golden-angle positions and the old spoke schedule (units 0, 5, 10,
  etc.). Unknown and zero shares keep distinct labels. The four recorded cores
  determine layout; additional categories require a separate composition.

- Ballot-tally preserves a hundred marks per available option, with distinct
  selected/unselected heights, offsets and thickness. Rows can total above 100
  because respondents may choose several options. A missing count must not
  produce a hundred unselected respondents. Shared tally-marks owns only the
  vertical unit marks and deterministic variation used by ballot-tally and
  tick-rows; each retains its series, scales, counting dots, labels and geometry.
  Ballot option headings use the same Y scale as their ticks. Percentages of the
  full chart height drift across the margin-adjusted rows and overlap lower
  tallies. Headings sit above the count labels, including short/zero selections;
  dividers separate those complete rows. Automatic height reserves at least
  60px per row for the headings, marks and divider rules.
