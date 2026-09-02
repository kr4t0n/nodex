/**
 * Thirty days of sign-ups — mono-editorial
 *
 * A hairline through thirty days, one dot per day, over a barcode floor that
 * ticks every day whether or not anything happened in it. The floor is what
 * keeps the calendar honest: a line alone lets a reader forget that the gaps
 * between points are equal.
 *
 * Weekends are hollow and the two highest days are enlarged and labelled, so
 * the weekly rhythm and the peaks are both legible without a legend.
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

/**
 * Sign-ups per day, thirty days.
 *
 * Generated rather than written out: the shape is the point, and thirty
 * literals would not read.
 */
export const DAYS: readonly number[] = Array.from(
  { length: 30 },
  (_, d) => 46 + 22 * Math.sin(d / 4.6) + 14 * Math.sin(d / 2.1) + rnd(d + 1, 5) * 12,
);

/** Which days carry a date label. */
const DATES: readonly (readonly [day: number, label: string])[] = [
  [0, 'JUN 1'],
  [14, 'JUN 15'],
  [29, 'JUN 30'],
];

/** Day 0 is a Monday, so these two are the weekend. */
const isWeekend = (d: number) => d % 7 === 5 || d % 7 === 6;

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const MUTED = '#8F8E88';
const GRID = '#DEDDD6';
const FLOOR = '#CFCEC7';
const QUIET = '#B0AFA9';

const SANS = "'Inter', sans-serif";

/**
 * The two highest days, kept apart.
 *
 * Two adjacent peaks are one peak, and labelling both would print two figures
 * on top of each other.
 */
export function peaks(days: readonly number[], apart = 5): number[] {
  const found: number[] = [];
  const byValue = [...days.keys()].sort((a, b) => (days[b] ?? 0) - (days[a] ?? 0));
  for (const d of byValue) {
    if (found.every((f) => Math.abs(f - d) >= apart)) found.push(d);
    if (found.length === 2) break;
  }
  return found;
}

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(days: readonly number[] = DAYS): EChartsOption {
  const top = peaks(days);
  const dateOf = new Map(DATES.map(([day, label]) => [day, label]));
  const floor = Math.min(...days) * 0.55;

  return {
    // Draws once and holds. This language forbids looping animation.
    animationDuration: 1200,
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
        const i = hit.dataIndex ?? 0;
        return `Day ${i + 1} — ${Math.round(days[i] ?? 0)} sign-ups`;
      },
    },

    grid: { left: 26, right: 22, top: 30, bottom: 48 },

    xAxis: {
      type: 'category',
      data: days.map((_, i) => i),
      axisLine: { lineStyle: { color: GRID, width: 0.8 } },
      axisTick: { show: false },
      axisLabel: {
        color: MUTED,
        fontFamily: SANS,
        fontSize: 7.5,
        fontWeight: 600,
        interval: 0,
        formatter: (v: string) => dateOf.get(Number(v)) ?? '',
      },
    },
    yAxis: { show: false, min: 0, max: Math.max(...days) * 1.16 },

    series: [
      {
        // The barcode floor: one tick per day, drawn whether or not the day
        // did anything. It is what stops the line implying a continuum.
        type: 'bar',
        data: days.map(() => floor),
        barWidth: 0.6,
        itemStyle: { color: FLOOR },
        silent: true,
      },
      {
        type: 'line',
        // Per-point objects rather than style callbacks: each day states its
        // own mark, which is both simpler to read and what a chart of thirty
        // individually-styled records actually means.
        data: days.map((v, d) => ({
          value: v,
          symbolSize: top.includes(d) ? 8.4 : 4.2,
          itemStyle: {
            // Hollow at the weekend: the same mark, unfilled, so the week's
            // rhythm reads without a second colour.
            color: isWeekend(d) ? PAPER : INK,
            borderColor: INK,
            borderWidth: isWeekend(d) ? 1 : 0,
          },
          // Only the two peaks are labelled. Thirty figures would be a wall.
          label: { show: top.includes(d) },
        })),
        // Hairline, under the language's 1.4px ceiling.
        lineStyle: { color: INK, width: 1 },
        z: 3,
        symbol: 'circle',
        label: {
          show: false,
          position: 'top',
          distance: 7,
          color: INK,
          fontFamily: SANS,
          fontSize: 9.5,
          fontWeight: 800,
          // Knocked out of the page colour, so a figure stays legible over the
          // floor ticks behind it.
          textBorderColor: PAPER,
          textBorderWidth: 3,
          formatter: (p: CallbackDataParams) => String(Math.round(p.value as number)),
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
          text: 'ONE DOT = ONE DAY · HOLLOW = WEEKEND',
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

export function HairlineLine({ days = DAYS }: { days?: readonly number[] }) {
  const option = useMemo(() => buildOption(days), [days]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-hairline-line">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
