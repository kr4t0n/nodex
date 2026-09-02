/**
 * Forty-five days, floor to peak — mono-editorial
 *
 * One hairline per day rising from the baseline to that day's value, with a
 * line drawn across their tops. The hairlines are the chart and the line is
 * only the reading aid: an area fill would say the same thing while hiding
 * that every day is a separate measurement.
 *
 * Each hairline carries its own slight opacity, so the field has texture at a
 * glance and stays countable up close. That is the language's whole argument —
 * read the field, not the numbers.
 *
 * Drawn with a bar series at sub-pixel width rather than a line series,
 * because forty-five bars *are* forty-five marks and ECharts will lay them out
 * against the axis for free.
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
 * Sign-ups in thousands, one value per day.
 *
 * Generated rather than written out: forty-five literals would not read, and
 * the shape is the point — a long swell with a shorter ripple over it.
 */
export const DAYS: readonly number[] = Array.from(
  { length: 45 },
  (_, d) => 34 + 26 * Math.sin(d / 7.2) + 12 * Math.sin(d / 2.8) + rnd(d + 1, 3) * 16,
);

/** Which days carry a month label. Forty-five would be a smear. */
const MONTHS: readonly (readonly [day: number, label: string])[] = [
  [0, 'MAY'],
  [22, 'JUN'],
  [44, 'JUL'],
];

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const MUTED = '#8F8E88';
const GRID = '#DEDDD6';
const QUIET = '#B0AFA9';

const SANS = "'Inter', sans-serif";

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(days: readonly number[] = DAYS): EChartsOption {
  const peak = days.indexOf(Math.max(...days));
  const monthOf = new Map(MONTHS.map(([day, label]) => [day, label]));

  return {
    // Draws once and holds. This language forbids looping animation.
    animationDuration: 1200,
    animationEasing: 'quarticOut',
    animationDelay: (i: number) => i * 14,
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
        return `Day ${i + 1} — ${Math.round(days[i] ?? 0)}k`;
      },
    },

    grid: { left: 26, right: 22, top: 26, bottom: 46 },

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
        formatter: (v: string) => monthOf.get(Number(v)) ?? '',
      },
    },
    yAxis: {
      show: false,
      // Headroom for the peak's label, which sits above its own mark.
      max: Math.max(...days) * 1.12,
    },

    series: [
      {
        // The hairlines. One per day, floor to value.
        type: 'bar',
        data: days.map((v, d) => ({
          value: v,
          itemStyle: {
            color: d === peak ? INK : MUTED,
            // A little variation per day, so the field reads as texture rather
            // than as a printed pattern.
            opacity: d === peak ? 1 : 0.5 + rnd(d + 1, 7) * 0.45,
          },
        })),
        // Sub-pixel, which is the language: a hairline, not a bar.
        barWidth: 0.55,
        silent: true,
      },
      {
        // The reading aid across the tops. A hairline, under the 1.4px ceiling.
        type: 'line',
        data: [...days],
        symbol: 'none',
        smooth: false,
        lineStyle: { color: INK, width: 1.2 },
        z: 3,
      },
      {
        // The peak, marked and labelled in place. Everything else is read off
        // the field, so the one number worth stating is stated.
        //
        // A scatter series of one rather than a markPoint: a markPoint is an
        // annotation layer, and this is a real mark standing for a real day.
        type: 'scatter',
        data: [[peak, days[peak] ?? 0]],
        symbolSize: 8.4,
        itemStyle: { color: INK },
        z: 4,
        label: {
          show: true,
          position: 'top',
          distance: 8,
          formatter: `${Math.round(days[peak] ?? 0)}k`,
          color: INK,
          fontFamily: SANS,
          fontSize: 9.5,
          fontWeight: 800,
          // Knocked out of the page colour, so the figure stays legible
          // wherever the hairlines behind it happen to be dense.
          textBorderColor: PAPER,
          textBorderWidth: 3,
        },
      },
    ],

    // What one mark represents. In this language that is not decoration: a
    // one-mark-per-record chart is unreadable without it.
    graphic: [
      {
        type: 'text',
        left: 'center',
        bottom: 6,
        style: {
          text: 'ONE HAIRLINE = ONE DAY, FLOOR TO PEAK',
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

export function HairlineArea({ days = DAYS }: { days?: readonly number[] }) {
  const option = useMemo(() => buildOption(days), [days]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-hairline-area">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
