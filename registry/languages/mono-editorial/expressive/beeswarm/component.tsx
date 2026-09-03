/**
 * A hundred and twenty deals, by size — mono-editorial
 *
 * A beeswarm built as clean stacks rather than a jittered cloud. Each deal
 * snaps to a lane one dot wide and piles upward, so the pile height *is* the
 * density and every dot stays countable. A conventional beeswarm nudges dots
 * off each other until they stop overlapping, which reads as a shape but
 * cannot be counted — and this language exists to be counted.
 *
 * Enterprise deals are hollow, so the long right tail is visibly a different
 * kind of deal rather than just a bigger one.
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

/** One row per deal: `[valueK, enterprise]`. */
export type Deal = readonly [valueK: number, enterprise: boolean];

/** The scale's ceiling, in $k. Lanes are measured against this, not the max. */
const CEILING = 180;

/** How many lanes the scale is divided into. One lane is one dot wide. */
const LANES = 44;

/**
 * A hundred and twenty deals, generated.
 *
 * Written as a distribution rather than a table: most deals are small, a few
 * are enterprise and an order of magnitude larger, and that skew is the whole
 * finding. A literal list of 120 numbers would hide it.
 */
export const DEALS: readonly Deal[] = Array.from({ length: 120 }, (_, i) => {
  const u = rnd(i + 1, 3);
  const enterprise = rnd(i + 2, 11) > 0.86;
  const value = Math.round(4 + (enterprise ? 60 : 6) + 150 * Math.pow(u, 2.6) + rnd(i + 3, 7) * 10);
  return [Math.min(CEILING - 2, value), enterprise] as const;
});

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const MUTED = '#8F8E88';
const GRID = '#DEDDD6';
const TICK = '#CFCEC7';
const FAINT = '#C6C5BF';
const QUIET = '#B0AFA9';

const SANS = "'Inter', sans-serif";

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(deals: readonly Deal[] = DEALS): EChartsOption {
  // Smallest first, so a lane fills from the bottom in a stable order.
  const sorted = deals
    .map(([value, enterprise], i) => ({ value, enterprise, i }))
    .sort((a, b) => a.value - b.value);

  const heights = new Map<number, number>();
  const solid: { value: [number, number, number] }[] = [];
  const hollow: { value: [number, number, number] }[] = [];

  for (const deal of sorted) {
    const lane = Math.round((deal.value / CEILING) * LANES);
    const row = heights.get(lane) ?? 0;
    heights.set(lane, row + 1);
    const point = { value: [lane, row, deal.value] as [number, number, number] };
    (deal.enterprise ? hollow : solid).push(point);
  }

  const values = deals.map(([v]) => v).sort((a, b) => a - b);
  const median = values[Math.floor(values.length / 2)] ?? 0;
  const medianLane = Math.round((median / CEILING) * LANES);
  const tallest = Math.max(...heights.values());

  return {
    color: [INK, PAPER, TICK, INK],
    // Draws once and holds. This language forbids looping animation.
    animationDuration: 900,
    animationEasing: 'quarticOut',
    animationDelay: (i: number) => i * 7,
    textStyle: { fontFamily: SANS },

    tooltip: {
      backgroundColor: INK,
      borderWidth: 0,
      padding: [10, 14],
      textStyle: { color: PAPER, fontFamily: SANS, fontSize: 12 },
      formatter: (p: CallbackDataParams | CallbackDataParams[]) => {
        const hit = Array.isArray(p) ? p[0] : p;
        if (!hit) return '';
        const [, , value] = hit.value as [number, number, number];
        return `$${value}k${hit.seriesIndex === 1 ? ' · enterprise' : ''}`;
      },
    },

    grid: { left: 26, right: 26, top: 44, bottom: 54 },

    xAxis: {
      type: 'value',
      min: -1,
      max: LANES + 1,
      splitLine: { show: false },
      axisLine: { lineStyle: { color: GRID, width: 0.8 } },
      // A barcode rail: a tick per lane group, taller every third, so the
      // scale is countable rather than read off numbers.
      axisTick: {
        show: true,
        length: 4,
        lineStyle: { color: TICK, width: 0.6 },
      },
      splitNumber: 9,
      axisLabel: {
        color: FAINT,
        fontFamily: SANS,
        fontSize: 7,
        fontWeight: 600,
        formatter: (v: number) =>
          v % Math.round(LANES / 3) === 0 ? `$${Math.round((v / LANES) * CEILING)}k` : '',
      },
    },
    // The pile is the density; a count up the side would be a second scale for
    // something the reader can already see.
    yAxis: { show: false, min: -0.5, max: tallest + 3 },

    series: [
      {
        // Ordinary deals: filled.
        type: 'scatter',
        data: solid,
        symbolSize: 7,
        itemStyle: { color: INK, opacity: 0.82 },
        z: 2,
      },
      {
        // Enterprise deals: hollow, so the right tail is visibly a different
        // kind of deal and not merely a larger one.
        type: 'scatter',
        data: hollow,
        symbolSize: 7,
        // Hairline, under the language's 1.4px ceiling.
        itemStyle: { color: PAPER, borderColor: INK, borderWidth: 1.1 },
        z: 3,
      },
      {
        // The median, stated. On a chart built to be counted, the middle is
        // the one summary worth drawing.
        type: 'line',
        data: [
          [medianLane, -0.5],
          [medianLane, tallest + 1.6],
        ],
        symbol: 'none',
        lineStyle: { color: MUTED, width: 0.9, type: [2, 4] },
        silent: true,
        z: 4,
      },
      {
        type: 'scatter',
        data: [{ value: [medianLane, tallest + 2.2] }],
        symbolSize: 0,
        silent: true,
        label: {
          show: true,
          position: 'top',
          formatter: `MEDIAN $${median}k`,
          color: INK,
          fontFamily: SANS,
          fontSize: 9.5,
          fontWeight: 800,
          // Knocked out of the page colour, so the figure stays legible over
          // whatever the swarm is doing behind it.
          textBorderColor: PAPER,
          textBorderWidth: 3,
        },
        z: 5,
      },
    ],

    // What one mark represents.
    graphic: [
      {
        type: 'text',
        left: 'center',
        bottom: 6,
        style: {
          text: 'ONE DOT = ONE DEAL · THE PILE IS THE DISTRIBUTION · HOLLOW = ENTERPRISE',
          font: `600 7px ${SANS}`,
          fill: QUIET,
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

export function Beeswarm({ deals = DEALS }: { deals?: readonly Deal[] }) {
  const option = useMemo(() => buildOption(deals), [deals]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-beeswarm">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
