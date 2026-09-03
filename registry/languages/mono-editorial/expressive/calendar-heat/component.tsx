/**
 * A year of deploys, day by day — mono-editorial
 *
 * Fifty-two weeks across, seven days down: 364 marks, one per day, area
 * carrying the count. A working week and a summer lull are visible as texture
 * long before any figure is read, which is the whole reason to draw a year one
 * day at a time rather than as twelve bars.
 *
 * A quiet day keeps a tiny dot. An absent mark and a day with no deploys look
 * identical, and only one of them is true.
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

export const MONTHS = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
] as const;

export const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;

const WEEKS = 52;

/**
 * Deploys per day for a year, generated.
 *
 * 364 cells will not read as a literal table, and the shape is the point: a
 * five-day working week, a seasonal swell, and the occasional day nobody
 * shipped anything.
 */
export const YEAR: readonly (readonly number[])[] = Array.from({ length: WEEKS }, (_, w) =>
  Array.from({ length: 7 }, (_, d) => {
    if (d >= 5) return rnd(w * 7 + d + 1, 3) > 0.82 ? 1 : 0;
    const season = 1 + 0.55 * Math.sin((w - 8) / 9);
    const shipped = rnd(w + 1, d + 5) > 0.12 ? 1 : 0;
    return Math.round(season * (2.5 + rnd(w * 7 + d + 1, d + 2) * 9) * shipped);
  }),
);

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const MUTED = '#8F8E88';
const MID = '#6A6963';
const QUIET = '#B0AFA9';
const EMPTY = '#D8D6CE';

const SANS = "'Inter', sans-serif";

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(year: readonly (readonly number[])[] = YEAR): EChartsOption {
  let max = 0;
  let peak: [number, number] = [0, 0];
  year.forEach((week, w) =>
    week.forEach((v, d) => {
      if (v > max) {
        max = v;
        peak = [w, d];
      }
    }),
  );

  const days: {
    value: [number, number, number];
    symbolSize: number;
    itemStyle: { color: string };
  }[] = [];

  year.forEach((week, w) =>
    week.forEach((v, d) => {
      days.push({
        value: [w, d, v],
        // Area, not radius, so a day with four times the deploys reads four
        // times as busy. A quiet day keeps the smallest mark that still reads.
        symbolSize: v === 0 ? 1.5 : 2.2 + Math.sqrt(v) * 3.1,
        itemStyle: {
          color: v === 0 ? EMPTY : v > max * 0.66 ? INK : v > max * 0.33 ? MID : QUIET,
        },
      });
    }),
  );

  // A month label every time the week index crosses into a new month.
  const monthAt = new Map(
    MONTHS.map((m, k) => [Math.round((k * WEEKS) / 12), m] as const),
  );

  return {
    color: [INK, INK],
    // Draws once and holds. This language forbids looping animation.
    animationDuration: 900,
    animationEasing: 'quarticOut',
    animationDelay: (i: number) => i * 2,
    textStyle: { fontFamily: SANS },

    tooltip: {
      backgroundColor: INK,
      borderWidth: 0,
      padding: [10, 14],
      textStyle: { color: PAPER, fontFamily: SANS, fontSize: 12 },
      formatter: (p: CallbackDataParams | CallbackDataParams[]) => {
        const hit = Array.isArray(p) ? p[0] : p;
        if (!hit) return '';
        const [w, d, v] = hit.value as [number, number, number];
        return `W${w + 1} ${WEEKDAYS[d]} — ${v} deploys`;
      },
    },

    grid: { left: 46, right: 18, top: 34, bottom: 46 },

    xAxis: {
      type: 'category',
      data: Array.from({ length: WEEKS }, (_, w) => w),
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: {
        color: MUTED,
        fontFamily: SANS,
        fontSize: 7,
        fontWeight: 700,
        interval: 0,
        formatter: (v: string) => monthAt.get(Number(v)) ?? '',
      },
    },
    yAxis: {
      type: 'category',
      data: [...WEEKDAYS],
      inverse: true,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: {
        color: MUTED,
        fontFamily: SANS,
        fontSize: 6.5,
        fontWeight: 700,
        // Every other day, so seven labels do not crowd a 15px row.
        interval: 1,
      },
    },

    series: [
      {
        type: 'scatter',
        data: days,
        z: 2,
      },
      {
        // The busiest day, ringed and annotated. 364 marks need one anchor,
        // and the note is what turns a texture into a finding.
        type: 'scatter',
        data: [{ value: peak }],
        symbolSize: 2.2 + Math.sqrt(max) * 3.1 + 7,
        itemStyle: {
          color: 'transparent',
          borderColor: INK,
          // Hairline, under the language's 1.4px ceiling.
          borderWidth: 1,
          borderType: 'dashed',
        },
        label: {
          show: true,
          position: 'right',
          distance: 10,
          formatter: `the release-week spike — ${max} deploys in a day`,
          color: MID,
          fontFamily: SANS,
          fontSize: 7,
          fontStyle: 'italic',
        },
        silent: true,
        z: 3,
      },
    ],

    // What one mark represents.
    graphic: [
      {
        type: 'text',
        left: 'center',
        bottom: 6,
        style: {
          text: 'ONE DOT = ONE DAY · DOT AREA = DEPLOYS · TINY DOT = A QUIET DAY',
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

export function CalendarHeat({
  year = YEAR,
}: {
  year?: readonly (readonly number[])[];
}) {
  const option = useMemo(() => buildOption(year), [year]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-calendar-heat">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
