/**
 * A week of support tickets, hour by hour — mono-editorial
 *
 * A punch card: seven days by twelve hours, dot area carrying the count. Two
 * daily peaks and a quiet weekend show up as shape before any figure is read,
 * which is what the form is for.
 *
 * A quiet hour keeps a tiny dot rather than an empty cell. An absent mark and
 * a mark meaning zero look identical, and only one of them is honest.
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

export const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;

/** The first hour on the axis. Twelve columns run from here. */
const FROM_HOUR = 8;
const HOURS = 12;

/**
 * Tickets per day and hour, generated.
 *
 * Eighty-four cells is past the point where a literal table reads, and the
 * shape is the point: two peaks in the working day, and a weekend at a third
 * of the volume.
 */
export const WEEK: readonly (readonly number[])[] = DAYS.map((_, i) =>
  Array.from({ length: HOURS }, (_, j) => {
    const weekday = i < 5 ? 1 : 0.32;
    const shape =
      Math.exp(-((j - 4.6) ** 2) / 7) + 0.7 * Math.exp(-((j - 8.4) ** 2) / 5);
    return Math.round(weekday * shape * 22 * (0.6 + rnd(i * HOURS + j + 1, j + 3) * 0.8));
  }),
);

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const EMPTY = '#D8D6CE';
const QUIET = '#B0AFA9';
const FAINT = '#C6C5BF';
const MID = '#6A6963';
const LABEL = '#6A6963';

const SANS = "'Inter', sans-serif";

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(week: readonly (readonly number[])[] = WEEK): EChartsOption {
  let max = 0;
  let peak: [number, number] = [0, 0];
  week.forEach((row, i) =>
    row.forEach((v, j) => {
      if (v > max) {
        max = v;
        peak = [j, i];
      }
    }),
  );

  const cells: {
    value: [number, number, number];
    symbolSize: number;
    itemStyle: { color: string };
  }[] = [];

  week.forEach((row, i) =>
    row.forEach((v, j) => {
      cells.push({
        value: [j, i, v],
        // Area, not radius, so an hour with four times the tickets looks four
        // times as busy. A zero keeps a mark, at the smallest size that reads.
        symbolSize: v === 0 ? 1.6 : 2.4 + Math.sqrt(v) * 4.2,
        itemStyle: {
          color: v === 0 ? EMPTY : v > max * 0.66 ? INK : v > max * 0.33 ? MID : QUIET,
        },
      });
    }),
  );

  return {
    // The language's ramp *is* the palette. Without this ECharts assigns any
    // series that does not set its own colour from its default theme.
    color: [INK, INK],
    // Draws once and holds. This language forbids looping animation.
    animationDuration: 900,
    animationEasing: 'quarticOut',
    animationDelay: (i: number) => i * 6,
    textStyle: { fontFamily: SANS },

    tooltip: {
      backgroundColor: INK,
      borderWidth: 0,
      padding: [10, 14],
      textStyle: { color: PAPER, fontFamily: SANS, fontSize: 12 },
      formatter: (p: CallbackDataParams | CallbackDataParams[]) => {
        const hit = Array.isArray(p) ? p[0] : p;
        if (!hit) return '';
        const [j, i, v] = hit.value as [number, number, number];
        return `${DAYS[i]} ${FROM_HOUR + j}:00 — ${v} tickets`;
      },
    },

    grid: { left: 56, right: 24, top: 22, bottom: 54 },

    xAxis: {
      type: 'category',
      data: Array.from({ length: HOURS }, (_, j) => `${FROM_HOUR + j}:00`),
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: {
        color: FAINT,
        fontFamily: SANS,
        fontSize: 7,
        fontWeight: 600,
        interval: 1,
      },
    },
    yAxis: {
      type: 'category',
      data: [...DAYS],
      inverse: true,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { color: LABEL, fontFamily: SANS, fontSize: 7.5, fontWeight: 700 },
    },

    series: [
      {
        type: 'scatter',
        data: cells,
        z: 2,
      },
      {
        // A dashed ring around the busiest hour. One anchor on a field of
        // eighty-four marks, so a reader has somewhere to start.
        type: 'scatter',
        data: [{ value: peak }],
        symbolSize: 2.4 + Math.sqrt(max) * 4.2 + 7,
        // Hairline, under the language's 1.4px ceiling.
        itemStyle: { color: 'transparent', borderColor: INK, borderWidth: 1, borderType: 'dashed' },
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
          text: `DOT AREA = TICKETS · DASHED RING = THE PEAK, ${max} · TINY DOT = A QUIET HOUR`,
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

export function DotHeat({ week = WEEK }: { week?: readonly (readonly number[])[] }) {
  const option = useMemo(() => buildOption(week), [week]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-dot-heat">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
