/**
 * Plans before and after the pricing change — mono-editorial
 *
 * Two stacks per plan, side by side: the old count in grey, the new one in
 * ink, each rung a thousand of MRR. Paired rather than overlaid, because the
 * question is how much each plan moved and two adjacent stacks can be compared
 * by counting the difference rather than by judging a length.
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

/** One row per plan: `[plan, wasK, nowK]`. Each $1k becomes one rung. */
export type Plan = readonly [plan: string, wasK: number, nowK: number];

export const PLANS: readonly Plan[] = [
  ['FREE', 31, 38],
  ['STARTER', 22, 27],
  ['PRO', 16, 22],
  ['TEAM', 13, 16],
  ['ENT', 6, 9],
];

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const MUTED = '#8F8E88';
const GRID = '#DEDDD6';
const QUIET = '#B0AFA9';

const SANS = "'Inter', sans-serif";

/** How far each stack sits from its plan's centre, in pixels. */
const OFFSET = 13;

interface Rung {
  value: [number, number];
  symbolSize: [number, number];
  itemStyle: { color: string; opacity: number };
}

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(plans: readonly Plan[] = PLANS): EChartsOption {
  const was: Rung[] = [];
  const now: Rung[] = [];

  plans.forEach(([, wasK, nowK], i) => {
    for (let k = 0; k < wasK; k++) {
      was.push({
        value: [i, k + 1],
        symbolSize: [17 + rnd(k + 1, i + 2) * 5, 1],
        itemStyle: { color: QUIET, opacity: 0.5 + rnd(k + 2, i + 3) * 0.4 },
      });
    }
    for (let k = 0; k < nowK; k++) {
      now.push({
        value: [i, k + 1],
        symbolSize: [17 + rnd(k + 1, i + 7) * 5, 1],
        itemStyle: { color: INK, opacity: 0.6 + rnd(k + 2, i + 8) * 0.4 },
      });
    }
  });

  const tallest = Math.max(...plans.map(([, w, n]) => Math.max(w, n)));

  return {
    // The language's ramp *is* the palette. Without this ECharts assigns any
    // series that does not set its own colour from its default theme.
    color: [QUIET, INK, INK],
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
        return plan ? `${plan[0]} — $${plan[1]}k → $${plan[2]}k MRR` : '';
      },
    },

    grid: { left: 34, right: 34, top: 34, bottom: 52 },

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
    // The rungs are the scale.
    yAxis: { show: false, min: 0, max: tallest + 4 },

    series: [
      {
        // Before, offset left and in grey.
        type: 'scatter',
        symbol: 'rect',
        symbolOffset: [-OFFSET, 0],
        data: was,
        z: 2,
      },
      {
        // After, offset right and in ink.
        type: 'scatter',
        symbol: 'rect',
        symbolOffset: [OFFSET, 0],
        data: now,
        z: 3,
      },
      {
        // The new figure, above its own stack.
        type: 'scatter',
        symbolSize: 0,
        silent: true,
        symbolOffset: [OFFSET, 0],
        data: plans.map(([, , nowK], i) => ({ value: [i, nowK + 2] })),
        label: {
          show: true,
          position: 'top',
          color: INK,
          fontFamily: SANS,
          fontSize: 10.5,
          fontWeight: 800,
          formatter: (p: CallbackDataParams) => {
            const [i] = p.value as [number, number];
            return String(plans[i]?.[2] ?? '');
          },
        },
      },
    ],

    // What one mark represents, and which stack is which.
    graphic: [
      {
        type: 'text',
        left: 'center',
        bottom: 6,
        style: {
          text: 'ONE RUNG = $1K · GREY = BEFORE, INK = AFTER',
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

export function PairedRungs({ plans = PLANS }: { plans?: readonly Plan[] }) {
  const option = useMemo(() => buildOption(plans), [plans]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-paired-rungs">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
