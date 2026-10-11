# Nocturne chart contracts

Read this reference when changing Nocturne charts or their consumer tests.
[Architecture](../../../AGENTS.md) defines the shared contract;
[DESIGN.md](../../../registry/languages/nocturne/DESIGN.md) owns the visual language.
[Authoring procedure](../../../.agents/skills/nodex-authoring/SKILL.md) owns the steps.

Nocturne is the sixth language, with all 24 shared primitives and twelve charts:
`nocturne-bars`, `nocturne-line`, `nocturne-ring`, `nocturne-scatter-matrix`,
`nocturne-promise-lanes`, `nocturne-margin-lanes`, `nocturne-drift-trails`,
`nocturne-waterfall`, `nocturne-boxplot`, `nocturne-forecast-fan`,
`nocturne-control` and `nocturne-ecdf`.
Bars, line, ring and the scatterplot matrix are featured; the matrix replaces the
former heatmap. The gallery and selected landing belt discover all twelve.
Graphite grounds, flat charcoal surfaces, embedded Inter,
compact corners and iris/teal/amber/blue data colors define its dark product UI.
No new font package or primitive implementation is needed. Inverse surfaces use
light ink as their background, so Nocturne's historical `onDark*` roles contain
dark secondary text. Category colors remain independent of intensity and status.

## Bars, line and ring

The charts share presentation in `nocturne-chart-frame.tsx`; line, ring, trails, matrix and ECDF
share stable ID-to-tone assignment in `nocturne-categorical.ts`. Paint references
stay inside each chart. Bars rank descending with stable ties and unavailable rows
last; native length encodes finite nonnegative values from a common zero. Lines
use straight native segments on strictly increasing numeric X, signed readings
and independent gaps. Direct endpoint names have a reserved gutter and separated
vertical positions; leader endpoints retain their real data coordinates. The
compact annotations use bounded HTML inside the native SVG so overflow shows an
ellipsis instead of silently clipping leading digits or running labels past the
plot. Full readings remain available through inspection and native title text. The
full key and endpoint readings refer to the final supplied observation, with an
unavailable final reading never replaced by an earlier one. Dense series expand
the plot vertically before scrolling locally.

The thin ring keeps native exact angles without minimum sectors or padding;
incomplete or overflowing totals are unavailable, and zero stays in its key. All twelve use native
animation matching with stable observation or aggregate-step IDs. Source delivery, all 24 primitives,
keyboard/pointer inspection, scoped paint and geometry, data edge cases, dense
consumer layouts, mobile gallery fit and live reduced motion have dedicated
coverage. The landing discovers Nocturne through the manifest; its automatic
sequence still finishes with Sketchbook.

## Scatterplot matrix

The scatterplot matrix composes native Scatter charts and diagonal Bar histograms.
Observations retain globally unique IDs, declared cohort IDs and dimension-keyed
values. Each metric shares its finite extent across all panels and cohorts.
Missing coordinates are omitted per pair; marginal counts still include each
available coordinate. Histograms overlay exact cohort counts in shared equal-width
bins, including lower boundaries and the last upper boundary. Native bar heights
and public X scales preserve count and interval geometry. Zero counts have no bar.
Constant dimensions receive finite padding; unrepresentable extents or bin edges
reject the input. There is no fitted model or density normalization.
Native tooltip activity links point IDs across panels and their histogram bins.
Pair data stays memoized. Inspection state belongs to a nested provider whose
unchanged children contain the native chart tree; only mark components consume
the selected ID. Storing selection at the matrix root recreates series props and
restarts Recharts animations even with memoized data. Pointer and keyboard checks
with motion enabled assert retained marks, unchanged geometry and no new fade.
Pass linked tooltips as stable React elements: Recharts mounts a content
function as a component, so inline functions remount their effects and can cause
selection update loops. Each native chart remains independently keyboard-inspectable, with
explicit paired/marginal sample counts and omitted counts. Instance-local selection,
stable cohort tones, scoped fade, local scrolling and source delivery have consumer
coverage. The matrix uses the existing scatter taxonomy; no heatmap alias remains.
Its domains contain every finite coordinate, so forced overflow clipping is
unnecessary. Native clipping follows the padded axis range and cuts extrema dots
at their centers, including their pointer targets; retain complete endpoint marks.

## Interval and trajectory composition

These three compositions use encoding types in the common taxonomy:
`paired-range` compares corresponding endpoints of two intervals, `interval-dot`
combines an independent point with a bounded range, and `trajectory` connects
two-dimensional positions in observation order. All use native Recharts Scatter
observations, axes, tooltip and keyboard traversal. Custom compound marks consume
public native scales; trajectory segments use Recharts Curve. They add no library
or second rendering runtime. `numeric-domain.ts` guards finite extents and single
coordinates; `scatter-fade.ts` follows the native animation clock at final
coordinates so connectors and endpoints stay attached, including after reordering.

## Promise lanes

Promise lanes renders planned and actual intervals independently on one numeric
scale. Reversed, incomplete or overflowing intervals are unavailable; zero duration
uses a tick. Corresponding start and finish connectors appear only for a complete
pair. Signed start, finish and duration changes are actual minus planned, and
duration change is independent of starting late. Absolute and difference formatters
are separate so timestamps need not format like durations. Compact direct readings
retain full native title text and tooltip values.

## Margin lanes

Margin lanes subtracts each row's explicit target from its point and expected
range. All rows must use one measurement unit; a symmetric domain aligns targets
at zero without percentage normalization. Current points may lie outside their
expected range. Either mark remains available without the other; a missing target
prevents both projections. The chart neither estimates uncertainty nor infers an
outcome from direction. Missing lanes remain inspectable without quantity marks.

## Drift trails

Drift trails requires strictly increasing finite times within each series; X and
Y may reverse or be signed. Each adjacent complete pair contributes one straight
native curve with a direction chevron when space permits. Incomplete coordinates
are omitted and counted, and break connections. Only the final supplied complete
observation receives a filled latest dot and key reading. Composite series and
observation IDs retain identity through updates. Arrow spacing does not encode
elapsed time; exact numeric positions and chronological direction are separate.
The trajectory plot and full key share a vertical scroll region when height is
constrained; only the plot has a separate horizontal scroller. Keeping the key
outside that region lets a long legend overflow a short consumer card.
Consumer coverage checks these data rules, native geometry, mid-animation
connector attachment, keyboard/pointer inspection, scoped overrides, independent
instances, constrained layouts and live reduced motion. Gallery checks include
all twelve on desktop and mobile.

## Waterfall and boxplot

Waterfall uses native Bar interval bounds on a signed numeric scale. Totals are
derived from caller-ordered starts and changes; a missing or overflowing change
breaks the balance until an explicit start. Zero uses a tick without minimum bar
height. The custom native animation interpolator fades final bounds so connectors
stay attached during updates. Bounded readings and category names remain inside
their native category bands, retaining full titles and tooltip readings.

Boxplot uses native Scatter observations and public scales for horizontal
quartile boxes, median ticks, capped whiskers and independent outlier dots.
The caller supplies ordered five-number summaries and classifies outliers; no
quartile algorithm or whisker convention is inferred. Signed values are supported.
Invalid summaries keep their row and any valid outliers; unavailable outliers are
omitted and counted. Equal quartiles have no manufactured box width. Composite
row/outlier IDs preserve identity. Both charts guard finite domains and keep plot
and footer inside a shared vertical scroll region for short consumer cards.
Consumer checks cover native geometry, balance recovery, degenerate distributions,
keyboard/pointer inspection, scoped paint, independent instances and live motion.

## Forecast fan

Forecast fan composes native range Areas and Lines. Coverage probabilities are
caller-supplied, unique and strictly between zero and one; bands sort widest
coverage first. Valid ranges nest by coverage, independently of point estimates.
Crossing ranges invalidate that observation's bands, not its point forecast.
Missing bounds break each band. Native area shape coordinates supply isolated
vertical intervals, so a single forecast does not lose its uncertainty mark.
A collapsed isolated interval keeps a horizontal cap even without a point estimate.
Recharts skips the Area shape when the entire dataset has one row, so that case
uses its native dot callback and public scale. Range marks fade at final native
coordinates; lower bounds and upper bounds stay attached throughout updates.
The forecast line anchors only to the final supplied observation when available;
historical intervals and future values are never synthesized. The observed phase
must precede the forecast phase on strictly increasing finite numeric X.

## Control

Control uses a native Line and caller-owned statistical limits. Invalid limits
leave measured values visible without breach classifications. Equality to a limit
is within bounds; only strict point breaches receive amber outlines. Optional
events have unique IDs and finite X inside the supplied observation window.
No model fitting, specification limit interpretation or sequence rule is inferred.

## ECDF

ECDF uses native Scatter observations for distinct empirical jumps and native
step-after Curves for their connections. Each series sorts a copy of finite
samples and aggregates equal values into a single jump of multiplicity / n.
The inclusive value owns the filled dot. Exact zero and one tails extend only
across the native domain; adding a threshold outside the sample range extends
those tails without inventing observations. Quantiles use the inverse empirical
CDF, with no interpolation. Missing samples are omitted and counted per series;
zero usable samples retain unavailable key readings. Composite series/value IDs
preserve aggregate-step identity through sample and series reordering. Connecting
curves ignore pointer events so the following step cannot intercept the preceding
observation's dot. Native dot hit targets own pointer inspection. Scoped
native fade keeps steps attached during animation. Forecast, control and ECDF
reuse the existing area/line taxonomy, frame, tokens and rendering runtime.
Their full keys share the vertical scroller, with a separate horizontal plot
scroller, and their consumer tests cover statistical semantics and native geometry.
