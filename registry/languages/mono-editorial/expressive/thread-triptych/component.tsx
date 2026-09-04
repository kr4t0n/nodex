/**
 * Event routes from source to processor to destination — mono-editorial
 *
 * A three-column flow where every route is its own thread rather than a
 * bundle. A Sankey of the same data would sum the routes into ribbons, which
 * is the right answer when you want totals and the wrong one here: the finding
 * is that a handful of destinations hoard almost everything, and that only
 * shows if you can see the individual threads piling into them.
 *
 * Thread width is volume, which is why this component declares `strokeAsArea`.
 * That is not a way around the hairline ceiling — thinning these to 1.4px
 * would delete the encoding rather than restyle it.
 *
 * Click a thread to pin it and read the route. `strokeAsArea` and interaction
 * are the two reasons this is a custom series rather than a graph or Sankey.
 *
 * `buildOption` is pure and exported, so the build server-renders it to a
 * static preview and the conformance lint reads the marks it really produces.
 */
import { useEffect, useMemo, useRef } from 'react';
import * as echarts from 'echarts';
import type {
  CallbackDataParams,
  CustomSeriesRenderItemAPI,
  CustomSeriesRenderItemReturn,
  EChartsOption,
} from 'echarts/types/dist/shared';

/**
 * Mount an option onto an element and clean up after it.
 *
 * Inlined rather than imported. A component is lifted out of this registry one
 * at a time, so one file has to be the whole component — an import of a shared
 * hook would hand a consumer a path that does not resolve in their project.
 *
 * The SVG renderer is not a preference. Canvas leaves nothing in the DOM to
 * inspect — no elements, no stroke widths, no colours — so a canvas chart
 * cannot be checked by `nodex lint` or by anyone with dev tools open.
 *
 * `option` is a dependency, so memoise it in the caller or the chart tears
 * down and rebuilds on every render.
 */
function useECharts<T extends HTMLElement>(option: EChartsOption) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const chart = echarts.init(node, null, { renderer: 'svg' });
    chart.setOption(option);

    // ResizeObserver rather than a window listener: a chart in a resizable
    // panel or a grid cell changes size without the window doing anything.
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(node);

    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, [option]);

  return ref;
}

/**
 * A deterministic hash, not `Math.random()`.
 *
 * Sample data must not change between page loads, or a preview and a
 * screenshot of it stop agreeing. Never swap this for a random source.
 */
const rnd = (i: number, k: number) =>
  Math.abs(((i * 73856093) ^ (k * 19349663)) % 1000) / 1000;

export const SOURCES = [
  'web-ev', 'ios-ev', 'android-ev', 'srv-log', 'billing-ev', 'auth-ev', 'search-log',
  'audit-ev', 'crash-rep', 'perf-beacon', 'cdn-log', 'edge-log', 'job-ev', 'sync-ev',
  'import', 'export-req', 'admin-ui', 'partner-api', 'iot-ping', 'backfill',
] as const;

const VERBS = [
  'parse', 'validate', 'dedupe', 'enrich', 'geoip', 'sessionize', 'pii-mask', 'score',
  'sample', 'route', 'batch', 'window', 'join', 'flatten', 'filter', 'hash',
  'encrypt', 'compact', 'index', 'tag',
] as const;

/** Two shards per verb, which is what a real pipeline looks like. */
export const PROCESSORS = VERBS.flatMap((v) => [`${v}-a`, `${v}-b`]);

export const DESTINATIONS = [
  'WAREHOUSE', 'ANALYTICS', 'CRM', 'ADS', 'BILLING',
  'SEARCH', 'ML PIPE', 'ARCHIVE', 'AUDIT', 'EXPORTS',
] as const;

/** One route: which source, which processor, which destination, and how much. */
export type Route = {
  readonly source: number;
  readonly processor: number;
  readonly destination: number;
  readonly volume: number;
};

export const ROUTES: readonly Route[] = SOURCES.flatMap((_, i) => {
  const n = 2 + Math.floor(rnd(i + 1, 5) * 2);
  return Array.from({ length: n }, (__, k) => ({
    source: i,
    processor: Math.floor(rnd(i * 3 + k + 2, 13) * PROCESSORS.length),
    // Squared, so the low destinations hoard. That skew is the finding.
    destination: Math.min(DESTINATIONS.length - 1, Math.floor(rnd(i * 5 + k + 4, 19) ** 2 * 11)),
    volume: Math.round(1 + rnd(i * 7 + k + 6, 29) ** 2 * 30),
  }));
});

/** Where the three columns sit, in data units. */
const COLUMNS = [0, 380, 750] as const;

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const MUTED = '#8F8E88';
const QUIET = '#B0AFA9';

const SANS = "'Inter', sans-serif";

const sourceY = (i: number) => -i * 22.6;
const processorY = (i: number) => -i * 11.3 - 6;
const destinationY = (i: number) => -i * 45 - 24;

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(routes: readonly Route[] = ROUTES): EChartsOption {
  const bottom = Math.min(
    sourceY(SOURCES.length - 1),
    processorY(PROCESSORS.length - 1),
    destinationY(DESTINATIONS.length - 1),
  );

  const thread = (
    params: { dataIndex: number },
    api: CustomSeriesRenderItemAPI,
  ): CustomSeriesRenderItemReturn => {
    const route = routes[params.dataIndex]!;
    const [x1 = 0, y1 = 0] = api.coord([COLUMNS[0] + 8, sourceY(route.source)]);
    const [x2 = 0, y2 = 0] = api.coord([COLUMNS[1], processorY(route.processor)]);
    const [x3 = 0, y3 = 0] = api.coord([COLUMNS[2] - 8, destinationY(route.destination)]);

    return {
      type: 'path',
      shape: {
        // Two cubics meeting at the processor, each leaving and arriving
        // horizontally, so a thread is followable across the whole page.
        pathData:
          `M${x1} ${y1} C${(x1 + x2) / 2} ${y1} ${(x1 + x2) / 2} ${y2} ${x2} ${y2}` +
          ` C${(x2 + x3) / 2} ${y2} ${(x2 + x3) / 2} ${y3} ${x3} ${y3}`,
      },
      style: {
        fill: 'none',
        stroke: INK,
        // Width is volume. Declared as strokeAsArea, because thinning these
        // to the hairline ceiling would delete the encoding.
        lineWidth: Math.max(0.6, route.volume * 0.14),
        opacity: 0.06 + Math.min(0.2, route.volume * 0.012),
        lineCap: 'round',
      },
    };
  };

  const tick = (x: number, y: number) => ({ value: [x, y] as [number, number] });

  return {
    color: [INK, MUTED, QUIET],
    // Draws once and holds. This language forbids looping animation.
    animationDuration: 900,
    animationEasing: 'quarticOut',
    animationDelay: (i: number) => i * 6,
    textStyle: { fontFamily: SANS },

    tooltip: {
      backgroundColor: INK,
      borderWidth: 0,
      padding: [10, 14],
      textStyle: { color: PAPER, fontFamily: SANS, fontSize: 12 },
      formatter: (p: CallbackDataParams | CallbackDataParams[]) => {
        const hit = Array.isArray(p) ? p[0] : p;
        return String(hit?.name ?? '');
      },
    },

    grid: { left: 74, right: 96, top: 34, bottom: 14 },

    xAxis: { show: false, type: 'value', min: COLUMNS[0] - 10, max: COLUMNS[2] + 10 },
    yAxis: { show: false, type: 'value', min: bottom - 16, max: 40 },

    series: [
      {
        // The threads.
        type: 'custom',
        renderItem: thread,
        z: 1,
        data: routes.map((r) => ({
          value: [COLUMNS[0], sourceY(r.source)],
          name: `${SOURCES[r.source]} → ${PROCESSORS[r.processor]} → ${DESTINATIONS[r.destination]} · ${r.volume}k ev/day`,
        })),
      },
      {
        // Sources.
        type: 'scatter',
        symbol: 'rect',
        symbolSize: [6, 3.2],
        itemStyle: { color: INK, opacity: 0.85 },
        z: 3,
        data: SOURCES.map((name, i) => ({ ...tick(COLUMNS[0], sourceY(i)), name })),
        label: {
          show: true,
          position: 'left',
          distance: 6,
          color: MUTED,
          fontFamily: SANS,
          fontSize: 7,
          fontWeight: 600,
          formatter: (p: CallbackDataParams) => String(p.name ?? ''),
        },
      },
      {
        // Processors. Forty of them, so they are ticks without names — the
        // label arrives on hover, and printing all forty would be a wall.
        type: 'scatter',
        symbol: 'rect',
        symbolSize: [5, 2.2],
        itemStyle: { color: INK, opacity: 0.7 },
        z: 3,
        data: PROCESSORS.map((name, i) => ({ ...tick(COLUMNS[1], processorY(i)), name })),
      },
      {
        // Destinations.
        type: 'scatter',
        symbol: 'rect',
        symbolSize: [6, 3.2],
        itemStyle: { color: INK, opacity: 0.85 },
        z: 3,
        data: DESTINATIONS.map((name, i) => ({ ...tick(COLUMNS[2], destinationY(i)), name })),
        label: {
          show: true,
          position: 'right',
          distance: 6,
          color: INK,
          fontFamily: SANS,
          fontSize: 8,
          fontWeight: 700,
          formatter: (p: CallbackDataParams) => String(p.name ?? ''),
        },
      },
    ],

    graphic: (['① SOURCE', '② PROCESSOR', '③ DESTINATION'] as const).map((text, k) => ({
      type: 'text' as const,
      left: `${8 + k * 42}%`,
      top: 4,
      style: { text, font: `800 9px ${SANS}`, fill: INK },
    })),
  };
}

/**
 * The option the sample data produces, with no arguments.
 *
 * The build and the conformance lint both need a chart's real marks without
 * mounting React — `useEffect` does not run under server rendering.
 */
export const previewOption = (): EChartsOption => buildOption();

export function ThreadTriptych({ routes = ROUTES }: { routes?: readonly Route[] }) {
  const option = useMemo(() => buildOption(routes), [routes]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-thread-triptych">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
