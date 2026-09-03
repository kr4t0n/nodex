/**
 * Thirty days of price — mono-editorial
 *
 * A candlestick where direction is carried by fill rather than by colour. A
 * rising day is hollow, a falling day is ink. Every other candlestick chart in
 * the world uses red and green; this language has neither, and hollow-versus-
 * filled is the older convention anyway — it survives being printed, and it
 * survives colour blindness.
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

/** One row per day: `[open, close, low, high]`, in ECharts' own order. */
export type Day = readonly [open: number, close: number, low: number, high: number];

/**
 * Thirty days, generated as a walk with a dip and a recovery.
 *
 * Written as a shape rather than a table: the arc is the point, and thirty
 * rows of four numbers would hide it.
 */
export const DAYS: readonly Day[] = (() => {
  const out: Day[] = [];
  let price = 52;
  for (let d = 0; d < 30; d++) {
    const drift = d < 10 ? 0.4 : d < 18 ? -1.5 : 1.3;
    const open = price;
    const close = Math.max(30, open + drift + (rnd(d + 1, 3) - 0.5) * 4.6);
    const high = Math.max(open, close) + rnd(d + 2, 7) * 2.6;
    const low = Math.min(open, close) - rnd(d + 3, 11) * 2.6;
    out.push([open, close, low, high]);
    price = close;
  }
  return out;
})();

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const MUTED = '#8F8E88';
const RULE = '#E3E2DB';
const WICK = '#6A6963';

const SANS = "'Inter', sans-serif";

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(days: readonly Day[] = DAYS): EChartsOption {
  let highest = 0;
  let lowest = 0;
  days.forEach(([, , low, high], d) => {
    if (high > (days[highest]?.[3] ?? 0)) highest = d;
    if (low < (days[lowest]?.[2] ?? 0)) lowest = d;
  });

  return {
    color: [INK, INK],
    // Draws once and holds. This language forbids looping animation.
    animationDuration: 900,
    animationEasing: 'quarticOut',
    animationDelay: (i: number) => i * 30,
    textStyle: { fontFamily: SANS },

    tooltip: {
      trigger: 'axis',
      backgroundColor: INK,
      borderWidth: 0,
      padding: [10, 14],
      axisPointer: { type: 'none' },
      textStyle: { color: PAPER, fontFamily: SANS, fontSize: 12 },
      formatter: (p: CallbackDataParams | CallbackDataParams[]) => {
        const hit = Array.isArray(p) ? p[0] : p;
        if (!hit) return '';
        const d = hit.dataIndex ?? 0;
        const row = days[d];
        if (!row) return '';
        const [open, close, low, high] = row;
        return `Day ${d + 1} — open $${open.toFixed(1)} · close $${close.toFixed(1)} · high $${high.toFixed(1)} · low $${low.toFixed(1)}`;
      },
    },

    grid: { left: 42, right: 20, top: 40, bottom: 30 },

    xAxis: {
      type: 'category',
      data: days.map((_, d) => d + 1),
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
    },
    yAxis: {
      type: 'value',
      scale: true,
      splitNumber: 4,
      splitLine: { lineStyle: { color: RULE, width: 0.8 } },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: MUTED,
        fontFamily: SANS,
        fontSize: 7.5,
        fontWeight: 600,
        formatter: (v: number) => `$${Math.round(v)}`,
      },
    },

    series: [
      {
        type: 'candlestick',
        data: days.map((d) => [...d]),
        barWidth: 7,
        itemStyle: {
          // Hollow rises, ink falls. Direction without colour.
          color: PAPER,
          color0: INK,
          borderColor: INK,
          borderColor0: INK,
          // Hairline, under the language's 1.4px ceiling. It applies to the
          // body outline and to the wick alike.
          borderWidth: 1.1,
        },
      },
      {
        // The extremes, labelled in place. Two figures on a chart of thirty
        // days, where a reader would otherwise have to hover to find them.
        type: 'scatter',
        symbolSize: 0,
        silent: true,
        data: [
          { value: [highest, days[highest]?.[3] ?? 0], name: 'high' },
          { value: [lowest, days[lowest]?.[2] ?? 0], name: 'low' },
        ],
        label: {
          show: true,
          position: 'top',
          distance: 6,
          color: INK,
          fontFamily: SANS,
          fontSize: 8,
          fontWeight: 800,
          // Knocked out of the page colour, so a figure stays legible over the
          // gridlines behind it.
          textBorderColor: PAPER,
          textBorderWidth: 3,
          formatter: (p: CallbackDataParams) => {
            const [, v] = p.value as [number, number];
            return `$${Math.round(v)}`;
          },
        },
        z: 5,
      },
    ],

    graphic: [
      {
        type: 'text',
        left: 'center',
        bottom: 4,
        style: {
          text: 'HOLLOW = CLOSED UP · INK = CLOSED DOWN · WICK = THE DAY’S RANGE',
          font: `600 7px ${SANS}`,
          fill: WICK,
        },
      },
    ],
  };
}

/**
 * The option the sample data produces, with no arguments.
 *
 * The build and the conformance lint both need a chart's real marks without
 * mounting React — `useEffect` does not run under server rendering.
 */
export const previewOption = (): EChartsOption => buildOption();

export function Candlestick({ days = DAYS }: { days?: readonly Day[] }) {
  const option = useMemo(() => buildOption(days), [days]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-candlestick">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
