/**
 * How long a hundred tickets took — mono-editorial
 *
 * A histogram whose bars are stacks of countable rungs: each rung is one
 * ticket in a hundred, so a bin's height is a number rather than a length.
 * Bins are two hours wide and the axis is drawn as edges rather than as
 * centred labels, because a continuous scale is what makes a histogram a
 * histogram and not a bar chart of categories.
 *
 * The dashed flag marks where the cumulative count crosses fifty — the median
 * — which is the one summary worth stating on a chart otherwise built to be
 * counted.
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

/** Tickets per two-hour bin, summing to a hundred. */
export const BINS: readonly number[] = [6, 14, 22, 19, 13, 9, 6, 4, 3, 2, 1, 1];

/** Each bin spans this many hours. */
const BIN_HOURS = 2;

/** A dot every fifth rung, so a tall bin can be counted in fives. */
const EVERY = 5;

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const MUTED = '#8F8E88';
const GRID = '#DEDDD6';
const FAINT = '#C6C5BF';
const QUIET = '#B0AFA9';
const LABEL = '#6A6963';

const SANS = "'Inter', sans-serif";

/** The bin in which the running total first reaches half. */
export function medianBin(bins: readonly number[]): number {
  const half = bins.reduce((a, b) => a + b, 0) / 2;
  let acc = 0;
  for (let i = 0; i < bins.length; i++) {
    acc += bins[i] ?? 0;
    if (acc >= half) return i;
  }
  return 0;
}

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(bins: readonly number[] = BINS): EChartsOption {
  const rungs: {
    value: [number, number];
    symbolSize: [number, number];
    itemStyle: { color: string; opacity: number };
  }[] = [];
  const fifths: [number, number][] = [];

  bins.forEach((count, i) => {
    for (let k = 0; k < count; k++) {
      rungs.push({
        value: [i, k + 1],
        symbolSize: [18 + rnd(k + 1, i + 2) * 5, 1],
        itemStyle: { color: INK, opacity: 0.55 + rnd(k + 2, i + 4) * 0.45 },
      });
      if (k % EVERY === EVERY - 1) fifths.push([i, k + 1]);
    }
  });

  const peak = bins.indexOf(Math.max(...bins));
  const median = medianBin(bins);
  const tallest = Math.max(...bins);

  return {
    // The language's ramp *is* the palette. Without this ECharts assigns any
    // series that does not set its own colour from its default theme.
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
        const from = i * BIN_HOURS;
        return `${bins[i]} of 100 tickets took ${from}–${from + BIN_HOURS}h`;
      },
    },

    grid: { left: 34, right: 26, top: 34, bottom: 56 },

    xAxis: {
      type: 'category',
      data: bins.map((_, i) => i),
      // Ticks on the bin edges rather than under the centres: a histogram's
      // bars are intervals, and centring the label implies a category.
      boundaryGap: true,
      axisLine: { lineStyle: { color: GRID, width: 0.8 } },
      axisTick: {
        show: true,
        alignWithLabel: false,
        length: 7,
        lineStyle: { color: '#CFCEC7', width: 0.6 },
      },
      axisLabel: {
        color: MUTED,
        fontFamily: SANS,
        fontSize: 7,
        fontWeight: 600,
        interval: 1,
        formatter: (v: string) => `${Number(v) * BIN_HOURS}h`,
      },
    },
    // The rungs are the scale.
    yAxis: { show: false, min: 0, max: tallest + 6 },

    series: [
      {
        // The rungs. One mark per ticket.
        type: 'scatter',
        symbol: 'rect',
        data: rungs,
        z: 2,
      },
      {
        // The counting dots, clear of the stack's right edge.
        type: 'scatter',
        symbol: 'circle',
        symbolSize: 1.4,
        symbolOffset: [14, 0],
        itemStyle: { color: FAINT },
        data: fifths,
        silent: true,
        z: 3,
      },
      {
        // The peak's count, and the median flag. Both are annotation on a
        // chart that is otherwise counted rather than read.
        type: 'scatter',
        symbolSize: 0,
        silent: true,
        data: [{ value: [peak, (bins[peak] ?? 0) + 2] }],
        label: {
          show: true,
          position: 'top',
          color: INK,
          fontFamily: SANS,
          fontSize: 11,
          fontWeight: 800,
          formatter: String(bins[peak] ?? ''),
        },
        markLine: {
          silent: true,
          symbol: 'none',
          data: [{ xAxis: median }],
          lineStyle: { color: MUTED, width: 0.9, type: 'dashed' },
          label: {
            show: true,
            position: 'end',
            rotate: 0,
            formatter: 'HALF RESOLVED BY HERE',
            color: LABEL,
            fontFamily: SANS,
            fontSize: 7.5,
            fontWeight: 800,
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
          text: 'ONE RUNG = ONE TICKET IN A HUNDRED · BINS OF TWO HOURS · DOT MARKS EVERY FIFTH',
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

export function RungHistogram({ bins = BINS }: { bins?: readonly number[] }) {
  const option = useMemo(() => buildOption(bins), [bins]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-rung-histogram">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
