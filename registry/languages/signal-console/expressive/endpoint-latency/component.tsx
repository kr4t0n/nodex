/**
 * Ten endpoints, ranked by tail latency — signal-console
 *
 * ECharts is carrying real weight here: the value axis picks its own ticks, the
 * bars lay themselves out against a category axis, and a piecewise `visualMap`
 * recolours every bar that breaches the objective without the component
 * deciding which ones those are.
 *
 * That last one is deliberate. Piecewise `visualMap` on a *line* series throws
 * under server-side rendering — ECharts builds a gradient along the path and
 * finds no colour stops without a live coordinate system — but on a bar series
 * it renders cleanly. Bars are where thresholding earns its place anyway.
 *
 * `buildOption` is pure and exported, so the build server-renders it to a
 * static preview and the conformance lint reads the marks it really produces.
 */
import { useEffect, useMemo, useRef } from 'react';
import * as echarts from 'echarts';
import type {
  CallbackDataParams,
  EChartsOption,
} from 'echarts/types/dist/shared';

/**
 * Mount an option onto an element and clean up after it.
 *
 * Inlined rather than imported. A component is lifted out of this registry one
 * at a time, so one file has to be the whole component — an import of a shared
 * hook would hand a consumer a broken path for the saving of twenty lines.
 *
 * The SVG renderer is not a preference. Canvas leaves nothing in the DOM to
 * inspect — no elements, no stroke widths, no colours — so a canvas chart
 * cannot be checked by `nodex lint` or by anyone with dev tools open.
 *
 * `option` is a dependency, so memoise it in the caller or the chart tears down
 * and rebuilds on every render.
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
 * One row per endpoint: `[route, p99Ms, requestsPerSecond]`.
 *
 * Ten rows, ranked. This language aggregates — the gateway serves thousands of
 * requests a second, and the chart's job is which routes are slow, not a mark
 * per call.
 */
export type Endpoint = readonly [route: string, p99Ms: number, rps: number];

/** The latency objective these routes are held to, in ms. */
export const OBJECTIVE_MS = 300;

export const ENDPOINTS: readonly Endpoint[] = [
  ['POST /checkout', 812, 340],
  ['GET  /search', 604, 1290],
  ['POST /orders', 486, 720],
  ['GET  /cart', 318, 2140],
  ['POST /auth/token', 274, 980],
  ['GET  /catalog', 196, 3400],
  ['GET  /profile', 142, 610],
  ['POST /events', 118, 5200],
  ['GET  /health', 46, 8800],
  ['GET  /assets', 28, 12400],
];

// Neutral for anything within objective, crit for anything over. Hue means
// breaching and only that: a console where the status colour is always on has
// no way left to say "look here".
const WITHIN = '#2FA37C';
const BREACH = '#F0616D';
const OBJECTIVE = '#E3B341';
const AXIS = { label: '#5A6472', line: '#1E242E', route: '#8A94A3' } as const;

const MONO =
  "'JetBrains Mono', ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace";

export interface EndpointLatencyData {
  endpoints: readonly Endpoint[];
  objectiveMs: number;
}

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption({
  endpoints,
  objectiveMs,
}: EndpointLatencyData): EChartsOption {
  // Slowest at the top. A category axis runs bottom-up, so the array is
  // reversed rather than the chart being read upside down.
  const ranked = [...endpoints].sort((a, b) => a[1] - b[1]);

  return {
    // Marks arrive fast. A console that animates in slowly is lying about how
    // fresh its data is.
    animationDuration: 350,
    animationEasing: 'cubicOut',
    textStyle: { fontFamily: MONO },
    // Headroom at the top is for the objective's label, which sits above the
    // line rather than rotated along it.
    grid: { top: 22, right: 44, bottom: 24, left: 122 },

    // The whole reason this chart is ECharts: the component says where the
    // objective is, and the library decides which bars breach it.
    visualMap: {
      show: false,
      dimension: 0,
      pieces: [
        { lte: objectiveMs, color: WITHIN },
        { gt: objectiveMs, color: BREACH },
      ],
    },

    xAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: AXIS.line } },
      axisLabel: {
        color: AXIS.label,
        fontFamily: MONO,
        fontSize: 9,
        formatter: (v: number) => `${v}MS`,
      },
    },
    yAxis: {
      type: 'category',
      data: ranked.map(([route]) => route),
      axisLine: { lineStyle: { color: AXIS.line } },
      axisTick: { show: false },
      axisLabel: {
        color: AXIS.route,
        fontFamily: MONO,
        fontSize: 9,
        fontWeight: 500,
        // No tracking here. The language forbids negative tracking on
        // monospace, and ECharts has no letter-spacing on axis labels, so the
        // marks simply take the font's own spacing — which is what the rule
        // wants anyway. Tracking on the card's own text is set in CSS.
      },
    },

    series: [
      {
        type: 'bar',
        data: ranked.map(([, p99]) => p99),
        barWidth: '62%',
        itemStyle: { borderRadius: [0, 2, 2, 0] },
        label: {
          show: true,
          position: 'right',
          distance: 6,
          color: AXIS.label,
          fontFamily: MONO,
          fontSize: 9,
          fontWeight: 600,
          formatter: (p: CallbackDataParams) => `${p.value as number}`,
        },
        markLine: {
          silent: true,
          symbol: 'none',
          data: [{ xAxis: objectiveMs }],
          lineStyle: { color: OBJECTIVE, width: 1, type: 'dashed' },
          label: {
            formatter: `SLO ${objectiveMs}MS`,
            color: OBJECTIVE,
            fontFamily: MONO,
            fontSize: 9,
            fontWeight: 600,
            position: 'end',
            // A vertical markLine label rotates to follow the line by default,
            // which lays the objective sideways across the bars it applies to.
            rotate: 0,
            padding: [0, 0, 4, 0],
          },
        },
      },
    ],

    tooltip: {
      trigger: 'item',
      backgroundColor: '#12161D',
      borderColor: AXIS.line,
      textStyle: { color: '#D7DEE8', fontFamily: MONO, fontSize: 11 },
      formatter: (p: CallbackDataParams | CallbackDataParams[]) => {
        const hit = Array.isArray(p) ? p[0] : p;
        return hit ? `${hit.name} · ${hit.value as number}ms p99` : '';
      },
    },
  };
}

/**
 * The option the sample data produces, with no arguments.
 *
 * The build and the conformance lint both need a chart's real marks without
 * mounting React — `useEffect` does not run under server rendering, so the
 * component alone renders an empty container. One zero-argument export gives
 * them a stable entry point without either having to know a component's default
 * props. Every chart in this language exports one.
 */
export const previewOption = (): EChartsOption =>
  buildOption({ endpoints: ENDPOINTS, objectiveMs: OBJECTIVE_MS });

export interface EndpointLatencyProps extends Partial<EndpointLatencyData> {
  label?: string;
  source?: string;
  window?: string;
}

export function EndpointLatency({
  endpoints = ENDPOINTS,
  objectiveMs = OBJECTIVE_MS,
  label = 'ENDPOINT LATENCY',
  source = 'EDGE GATEWAY',
  window: windowLabel = '5M WINDOW',
}: EndpointLatencyProps) {
  const option = useMemo(
    () => buildOption({ endpoints, objectiveMs }),
    [endpoints, objectiveMs],
  );
  const ref = useECharts<HTMLDivElement>(option);

  // The head carries the current value, because the first question asked of a
  // live chart is "what is it now". Here that is how many routes are breaching,
  // which is the number someone on call acts on.
  const breaching = endpoints.filter(([, p99]) => p99 > objectiveMs).length;

  return (
    <div className="nx-endpoint-latency">
      <div className="card">
        <div className="head">
          <span className="label">{label}</span>
          <span className={breaching > 0 ? 'value breach' : 'value'}>
            {breaching}
            <span className="unit">
              {' '}
              OF {endpoints.length} OVER SLO
            </span>
          </span>
        </div>

        <div className="chart" ref={ref} />

        <div className="foot">
          <span>{source}</span>
          <span>{windowLabel}</span>
          <span>UPDATED 0S AGO</span>
        </div>
      </div>
    </div>
  );
}
