/**
 * MRR by plan, one rung per thousand — mono-editorial
 *
 * A unit chart standing up. Each plan is a stack of rungs and each rung is
 * $1k, so the height is countable rather than merely comparable, and a dot
 * every fifth rung gives the eye somewhere to count from.
 *
 * Drawn as a scatter with one mark per rung rather than as a repeated symbol,
 * because every rung varies slightly in width and weight. That variation is
 * the language: a printed pattern reads as a texture and a bar reads as a
 * length, and this has to read as a count.
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

/** One row per plan: `[plan, mrrK]`. Each $1k becomes one rung. */
export type Plan = readonly [plan: string, mrrK: number];

export const PLANS: readonly Plan[] = [
  ['FREE', 38],
  ['STARTER', 27],
  ['PRO', 22],
  ['TEAM', 16],
  ['SCALE', 11],
  ['ENT', 7],
];

/** A dot every fifth rung, so a tall stack can be counted in fives. */
const EVERY = 5;

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const MUTED = '#8F8E88';
const GRID = '#DEDDD6';
const FAINT = '#C6C5BF';
const QUIET = '#B0AFA9';

const SANS = "'Inter', sans-serif";

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(plans: readonly Plan[] = PLANS): EChartsOption {
  const rungs: { value: [number, number]; symbolSize: [number, number]; itemStyle: { color: string; opacity: number } }[] = [];
  const fifths: [number, number][] = [];

  plans.forEach(([, mrr], i) => {
    for (let k = 0; k < mrr; k++) {
      rungs.push({
        value: [i, k + 1],
        // Each rung a little different, so the stack reads as hand-counted
        // rather than as a printed rule.
        symbolSize: [25 + rnd(k + 1, i + 2) * 6, 1],
        itemStyle: { color: INK, opacity: 0.5 + rnd(k + 2, i + 4) * 0.5 },
      });
      if (k % EVERY === EVERY - 1) fifths.push([i, k + 1]);
    }
  });

  const tallest = Math.max(...plans.map(([, mrr]) => mrr));

  return {
    // The language's ramp *is* the palette. Without this ECharts assigns any
    // series that does not set its own colour from its default theme — which
    // here would put a lime green on the invisible series carrying the totals.
    color: [INK, FAINT, INK],
    // Draws once and holds. This language forbids looping animation.
    animationDuration: 900,
    animationEasing: 'quarticOut',
    textStyle: { fontFamily: SANS },

    tooltip: {
      backgroundColor: INK,
      borderWidth: 0,
      padding: [10, 14],
      textStyle: { color: PAPER, fontFamily: SANS, fontSize: 12 },
      formatter: (p: CallbackDataParams | CallbackDataParams[]) => {
        const hit = Array.isArray(p) ? p[0] : p;
        if (!hit) return '';
        const [i] = hit.value as [number, number];
        const plan = plans[i];
        return plan ? `${plan[0]} — $${plan[1]}k MRR` : '';
      },
    },

    grid: { left: 34, right: 34, top: 34, bottom: 54 },

    xAxis: {
      type: 'category',
      data: plans.map(([plan]) => plan),
      axisLine: { lineStyle: { color: GRID, width: 0.8 } },
      axisTick: { show: false },
      axisLabel: {
        color: MUTED,
        fontFamily: SANS,
        fontSize: 7.5,
        fontWeight: 700,
        margin: 12,
      },
    },
    // The rungs are the scale, so a numeric axis beside them would be a second
    // way of saying the same thing.
    yAxis: { show: false, min: 0, max: tallest + 4 },

    series: [
      {
        // The rungs. One mark per thousand.
        type: 'scatter',
        symbol: 'rect',
        data: rungs,
        z: 2,
      },
      {
        // The counting dots, pushed clear of the stack's right edge.
        type: 'scatter',
        symbol: 'circle',
        symbolSize: 1.6,
        symbolOffset: [19, 0],
        itemStyle: { color: FAINT },
        data: fifths,
        silent: true,
        z: 3,
      },
      {
        // The total, above each stack. One figure per plan, where a reader who
        // does not want to count can just read it.
        type: 'scatter',
        symbolSize: 0,
        silent: true,
        data: plans.map(([, mrr], i) => ({ value: [i, mrr + 2] })),
        label: {
          show: true,
          position: 'top',
          distance: 0,
          color: INK,
          fontFamily: SANS,
          fontSize: 11,
          fontWeight: 800,
          formatter: (p: CallbackDataParams) => {
            const [i] = p.value as [number, number];
            return String(plans[i]?.[1] ?? '');
          },
        },
      },
    ],

    // What one mark represents.
    graphic: [
      {
        type: 'text',
        left: 'center',
        bottom: 6,
        style: {
          text: 'ONE RUNG = $1K · DOT MARKS EVERY FIFTH',
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

export function RungBars({ plans = PLANS }: { plans?: readonly Plan[] }) {
  const option = useMemo(() => buildOption(plans), [plans]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-rung-bars">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
