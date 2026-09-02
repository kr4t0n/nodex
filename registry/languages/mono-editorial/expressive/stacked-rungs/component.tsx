/**
 * Revenue by region and line of business — mono-editorial
 *
 * Four stacks, each built from three tones: core darkest, add-ons mid, services
 * palest. Each rung is $1k, so a segment is counted rather than measured, and
 * a one-rung gap between segments keeps the boundary readable without a rule
 * or an outline.
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

/** One row per region: `[region, [core, addOns, services]]`, in $k. */
export type Region = readonly [region: string, segments: readonly number[]];

export const SEGMENTS = ['CORE', 'ADD-ONS', 'SERVICES'] as const;

export const REGIONS: readonly Region[] = [
  ['NA', [18, 11, 7]],
  ['EU', [14, 9, 5]],
  ['APAC', [9, 7, 6]],
  ['LATAM', [5, 4, 2]],
];

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const MUTED = '#8F8E88';
const GRID = '#DEDDD6';
const PALE = '#C0BFB8';
const QUIET = '#B0AFA9';

/** Darkest is the largest line of business. Rank, not category. */
const TONES = [INK, MUTED, PALE];

const SANS = "'Inter', sans-serif";

interface Rung {
  value: [number, number];
  symbolSize: [number, number];
  itemStyle: { color: string; opacity: number };
}

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(regions: readonly Region[] = REGIONS): EChartsOption {
  const rungs: Rung[] = [];
  const segmentLabels: { value: [number, number]; label: { formatter: string; color: string } }[] = [];
  const totals: { value: [number, number] }[] = [];

  regions.forEach(([, segments], i) => {
    let below = 0;
    segments.forEach((count, si) => {
      for (let k = 0; k < count; k++) {
        rungs.push({
          // The `+ si` is the gap: one empty rung between segments, which
          // separates them without drawing a line.
          value: [i, below + k + si + 1],
          symbolSize: [23 + rnd(k + 1, i * 3 + si + 2) * 5, 1],
          itemStyle: {
            color: TONES[si] ?? INK,
            opacity: 0.6 + rnd(k + 2, i + si + 4) * 0.4,
          },
        });
      }
      segmentLabels.push({
        value: [i, below + count / 2 + si + 1],
        label: {
          formatter: String(count),
          // The palest tone would be illegible as text, so its label steps up
          // one rung of the ladder.
          color: TONES[si] === PALE ? MUTED : TONES[si] ?? INK,
        },
      });
      below += count;
    });
    totals.push({ value: [i, below + segments.length + 2] });
  });

  const tallest = Math.max(
    ...regions.map(([, s]) => s.reduce((a, b) => a + b, 0) + s.length),
  );

  return {
    // The language's ramp *is* the palette. Without this ECharts assigns any
    // series that does not set its own colour from its default theme.
    color: [INK, INK, INK],
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
        const region = regions[i];
        if (!region) return '';
        const total = region[1].reduce((a, b) => a + b, 0);
        return `${region[0]} — $${total}k across ${SEGMENTS.length} lines`;
      },
    },

    grid: { left: 40, right: 40, top: 34, bottom: 52 },

    xAxis: {
      type: 'category',
      data: regions.map(([region]) => region),
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
    yAxis: { show: false, min: 0, max: tallest + 5 },

    series: [
      {
        type: 'scatter',
        symbol: 'rect',
        data: rungs,
        z: 2,
      },
      {
        // Each segment's own count, beside the middle of its own run.
        type: 'scatter',
        symbolSize: 0,
        silent: true,
        data: segmentLabels,
        label: {
          show: true,
          position: 'right',
          distance: 14,
          fontFamily: SANS,
          fontSize: 8,
          fontWeight: 800,
        },
        z: 3,
      },
      {
        // The region's total, above the stack.
        type: 'scatter',
        symbolSize: 0,
        silent: true,
        data: totals,
        label: {
          show: true,
          position: 'top',
          color: INK,
          fontFamily: SANS,
          fontSize: 10.5,
          fontWeight: 800,
          formatter: (p: CallbackDataParams) => {
            const [i] = p.value as [number, number];
            return String(regions[i]?.[1].reduce((a, b) => a + b, 0) ?? '');
          },
        },
      },
    ],

    // Which tone is which, and what one mark represents.
    graphic: [
      {
        type: 'text',
        left: 'center',
        bottom: 6,
        style: {
          text: 'DARKEST = CORE · MID = ADD-ONS · PALE = SERVICES · ONE RUNG = $1K',
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

export function StackedRungs({ regions = REGIONS }: { regions?: readonly Region[] }) {
  const option = useMemo(() => buildOption(regions), [regions]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-stacked-rungs">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
