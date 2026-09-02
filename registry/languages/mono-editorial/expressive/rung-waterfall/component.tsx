/**
 * Gross to net, counted — mono-editorial
 *
 * A waterfall whose steps are stacks of rungs, each $1k. The two totals stand
 * on the baseline; the deductions float at the level they take the running
 * figure down from.
 *
 * A deduction is drawn as broken rungs rather than as a second colour. This
 * language has no red, and a gap in the mark is the honest equivalent — it
 * reads as something taken away rather than as a different category.
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

/** One row per step: `[label, deltaK]`. A total is marked by `total: true`. */
export type Step = readonly [label: string, deltaK: number, total?: boolean];

export const STEPS: readonly Step[] = [
  ['GROSS', 42, true],
  ['REFUNDS', -6],
  ['COGS', -11],
  ['OPS', -8],
  ['NET', 0, true],
];

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const MUTED = '#8F8E88';
const GRID = '#DEDDD6';
const QUIET = '#B0AFA9';

const SANS = "'Inter', sans-serif";

interface Rung {
  value: [number, number];
  symbolSize: [number, number];
  symbolOffset?: [number, number];
  itemStyle: { color: string; opacity: number };
}

/** Each step's span, resolved against the running total. */
export function levels(steps: readonly Step[]): {
  label: string;
  from: number;
  to: number;
  total: boolean;
}[] {
  let running = 0;
  return steps.map(([label, delta, total]) => {
    if (total) {
      // The opening total sets the level; the closing one reports it.
      const value = label === 'GROSS' ? delta : running;
      if (label === 'GROSS') running = delta;
      return { label, from: 0, to: value, total: true };
    }
    const from = running + delta;
    const to = running;
    running += delta;
    return { label, from, to, total: false };
  });
}

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(steps: readonly Step[] = STEPS): EChartsOption {
  const rows = levels(steps);
  const rungs: Rung[] = [];

  rows.forEach((row, i) => {
    const count = Math.abs(row.to - row.from);
    for (let k = 0; k < count; k++) {
      const y = Math.min(row.from, row.to) + k + 1;
      const width = 19 + rnd(k + 1, i + 2) * 5;
      if (row.total) {
        rungs.push({
          value: [i, y],
          symbolSize: [width, 1],
          itemStyle: { color: INK, opacity: 0.75 + rnd(k + 2, i + 5) * 0.25 },
        });
      } else {
        // Broken: two half rungs with a gap, which is a dashed mark drawn out
        // of the only primitive a scatter has. A deduction reads as something
        // removed rather than as another category.
        for (const side of [-1, 1] as const) {
          rungs.push({
            value: [i, y],
            symbolSize: [width * 0.4, 1],
            symbolOffset: [(side * width) / 3.4, 0],
            itemStyle: { color: MUTED, opacity: 0.7 },
          });
        }
      }
    }
  });

  const ceiling = Math.max(...rows.map((r) => Math.max(r.from, r.to)));

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
        const row = rows[i];
        if (!row) return '';
        const delta = steps[i]?.[1] ?? 0;
        return row.total
          ? `${row.label} — $${row.to}k`
          : `${row.label} — ${delta > 0 ? '+' : ''}$${delta}k`;
      },
    },

    grid: { left: 34, right: 34, top: 34, bottom: 52 },

    xAxis: {
      type: 'category',
      data: rows.map((r) => r.label),
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
    yAxis: { show: false, min: 0, max: ceiling + 5 },

    series: [
      {
        type: 'scatter',
        symbol: 'rect',
        data: rungs,
        z: 2,
      },
      {
        // Each step's figure, above its own run of rungs.
        type: 'scatter',
        symbolSize: 0,
        silent: true,
        data: rows.map((row, i) => ({ value: [i, Math.max(row.from, row.to) + 2] })),
        label: {
          show: true,
          position: 'top',
          fontFamily: SANS,
          fontSize: 10.5,
          fontWeight: 800,
          color: INK,
          formatter: (p: CallbackDataParams) => {
            const [i] = p.value as [number, number];
            const row = rows[i];
            if (!row) return '';
            const delta = steps[i]?.[1] ?? 0;
            return row.total ? String(row.to) : String(delta);
          },
        },
      },
    ],

    // What one mark represents, and what a broken one means.
    graphic: [
      {
        type: 'text',
        left: 'center',
        bottom: 6,
        style: {
          text: 'ONE RUNG = $1K · BROKEN RUNGS ARE DEDUCTIONS',
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

export function RungWaterfall({ steps = STEPS }: { steps?: readonly Step[] }) {
  const option = useMemo(() => buildOption(steps), [steps]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-rung-waterfall">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
