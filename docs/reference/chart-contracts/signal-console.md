# Signal Console chart contracts

Read this reference when changing Signal Console charts or their consumer tests.
[Architecture](../../../AGENTS.md) defines the shared contract;
[DESIGN.md](../../../registry/languages/signal-console/DESIGN.md) owns the visual language.
[Authoring procedure](../../../.agents/skills/nodex-authoring/SKILL.md) owns the steps.

Signal Console also has nine expressive charts: the original `endpoint-latency`,
plus `request-throughput`, `latency-trend`, `response-codes`, `latency-histogram`,
`service-health`, `capacity-ring`, `saturation-scatter` and `trace-spans`.
The index features endpoint latency, throughput, health and capacity; the gallery
and landing belt discover all nine from the manifest. All nine charts share
only console chrome, plot sizing and tooltip presentation in `signal-chart-frame.tsx`.
Language-specific surface references stay in the components; shared files must
also pass source lint against other installed languages.
Each component owns its data validation and native Recharts composition. Existing
tokens are unchanged. Endpoint Latency has been refined under the owner's request
with slim bars, ranked single-line routes, aligned P99 readings and explicit breach
markers; its original example data and caller-owned footer remain intact. Neutral
marks encode quantity; color classifies explicit statuses or caller-supplied limits.

## Ordered windows

- Signal Console's throughput, percentile and response charts preserve caller
  order with equal spacing; callers supply equal-duration windows. Their current
  headline refers to the final window even when it is unavailable. Missing values
  break individual percentile lines; inconsistent quantile ordering invalidates
  the entire window. A missing response class invalidates its whole stack, and
  response counts must be safe nonnegative integers. A zero request total does
  not imply a zero error rate. Native keyboard inspection retains missing windows.

## Histogram and service metrics

- Signal Console's histogram takes pre-aggregated, equal-width buckets. Native
  numeric scales place exact bucket boundaries and the optional SLO; never infer
  a percentile or an over-SLO count from a partially overlapping bin. Counts are
  safe nonnegative integers; an unknown bucket makes the overall total unavailable.
  A zero count keeps its baseline label. Half-open buckets include the final upper
  boundary only in the final bucket.
- Service Health declares both matrix domains. Missing or invalid statuses are
  unavailable cells, even when every reading is missing. Duplicate pairs and
  undeclared IDs reject the input. Symbols accompany the semantic status colors.
  Capacity Ring requires complete usage within a finite, positive capacity; its
  sector angles are exact with no minimum angles. Usage stays neutral when the
  caller omits the warning threshold. Saturation Scatter omits and counts invalid
  observations; shape and hue both report the supplied CPU and latency limits.

## Trace spans

- Trace Spans uses native ranged bars at actual offsets from one origin, so
  concurrent work stays concurrent. Zero-duration spans retain a tick; missing or
  reversed endpoints are unavailable. Outcomes must be supplied to claim success
  or error, and the last-end summary requires every span to have valid endpoints.
  All nine Signal charts have standalone consumer coverage for geometry,
  keyboard inspection, scoped token changes, narrow containers, data updates,
  incomplete/zero/invalid values and live reduced-motion changes.

## Endpoint latency

- Endpoint source, window and freshness come from caller props. The existing
  example supplies its original sample labels; the runtime does not invent them.
- Endpoint observations require only the encoded `route` and `p99Ms` fields.
  Unused request-rate values belong to sample/application data, not the chart API.
  Duplicate route labels retain separate ranked bands. Invalid or negative readings
  are omitted and counted; zero has a baseline tick and reading. Public band scales
  position route/value annotations independently of bar animation. Keep their row
  positions synchronized on sorting, resizing and reduced-motion changes. The plot
  grows with the row count and scrolls locally when constrained; full route names
  remain available in native keyboard and pointer tooltips.
  Its ten-row example uses compact 18px bands and a wide canvas. The overview fits
  both dimensions into a fixed-height tile; a tall specimen shrinks its width and
  typography disproportionately. Adjust the authored composition, not the shared
  preview transform, to keep it comparable to neighboring console charts.
