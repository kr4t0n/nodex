/**
 * A week of support tickets, hour by hour — mono-editorial
 *
 * Seven parallel hour axes, one per weekday, so the working day shows up as a
 * shape rather than as a number: the weekday rows carry a bulge across core
 * hours and the weekend rows are nearly empty. Dot area is volume.
 *
 * The tone ladder darkens Monday to Friday and drops the weekend to the
 * lightest grey. That is ordering, not category — this language has no accent
 * colour, so weight is the only thing available to rank rows.
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
 * inspect, so a canvas chart cannot be checked by `nodex lint`.
 */
function useECharts<T extends HTMLElement>(option: EChartsOption) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const chart = echarts.init(node, null, { renderer: 'svg' });
    chart.setOption(option);

    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(node);

    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, [option]);

  return ref;
}

/** One row per weekday, holding `[hour, tickets]` for every hour with traffic. */
export type DayRow = readonly (readonly [hour: number, tickets: number])[];

export const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;

const HOURS = Array.from({ length: 24 }, (_, i) => i);

/**
 * The sample week, generated rather than written out.
 *
 * 168 cells is past the point where a literal table is readable, and the shape
 * is the point: a core-hours bulge on weekdays, near-silence at the weekend.
 * Deterministic, so a preview and a screenshot of it agree.
 */
export const WEEK: readonly DayRow[] = DAYS.map((_, di) =>
  HOURS.map((h) => {
    const workday = di < 5;
    const core = h >= 9 && h <= 17;
    const bulge = workday && core ? 6 + 5 * Math.sin(((h - 9) / 8) * Math.PI) : 0;
    const ripple = (h + di) % 5 === 0 ? 2 : 0;
    const awake = h >= 22 || h <= 5 ? 0 : 1;
    return [h, Math.round(bulge + ripple + awake)] as const;
  }).filter(([, tickets]) => tickets > 0),
);

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const MUTED = '#8F8E88';
const LIGHTEST = '#C6C5BF';
// Darkest to lightest. Rank, not category.
const LADDER = ['#1C1C1A', '#4A4944', '#6A6963', '#8F8E88', '#B0AFA9'];

const SANS = "'Inter', sans-serif";

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(week: readonly DayRow[]): EChartsOption {
  const rows = week.length;

  return {
    // The language's ramp *is* the palette. Without this ECharts assigns any
    // series that does not set its own colour from its default theme.
    color: LADDER,
    // Draws once and holds. This language forbids looping animation.
    animationDuration: 500,
    animationEasing: 'backOut',
    textStyle: { fontFamily: SANS },

    tooltip: {
      backgroundColor: INK,
      borderWidth: 0,
      padding: [10, 14],
      textStyle: { color: PAPER, fontFamily: SANS, fontSize: 12 },
      formatter: (p: CallbackDataParams | CallbackDataParams[]) => {
        const hit = Array.isArray(p) ? p[0] : p;
        if (!hit) return '';
        const [hour, tickets] = hit.value as [number, number];
        const day = DAYS[hit.seriesIndex ?? 0] ?? '';
        return `${day} ${String(hour).padStart(2, '0')}:00 — ${tickets} tickets`;
      },
    },

    // The day name is a title rather than an axis label, because each row is
    // its own axis and an axis cannot name itself off to one side.
    title: DAYS.map((day, i) => ({
      text: day,
      textBaseline: 'middle' as const,
      top: `${((i + 0.5) * 100) / rows - 1}%`,
      left: 0,
      textStyle: { fontSize: 9, fontWeight: 700, fontFamily: SANS, color: MUTED },
    })),

    singleAxis: DAYS.map((_, i) => ({
      left: 52,
      right: 14,
      type: 'category' as const,
      boundaryGap: false,
      data: HOURS.map((h) => String(h).padStart(2, '0')),
      top: `${(i * 100) / rows + 6}%`,
      height: `${100 / rows - 8}%`,
      axisLine: { show: false },
      axisTick: { show: false },
      // Only the last row is labelled: seven identical hour scales stacked up
      // would be six repetitions of the same information.
      axisLabel: {
        show: i === rows - 1,
        color: MUTED,
        fontFamily: SANS,
        fontSize: 8.5,
        interval: 3,
      },
      splitLine: { show: false },
    })),

    series: week.map((row, i) => ({
      type: 'scatter' as const,
      coordinateSystem: 'singleAxis' as const,
      singleAxisIndex: i,
      data: row.map((cell) => [...cell]),
      // Area, not radius, so a cell twice as busy looks twice as busy.
      symbolSize: (d: number[]) => (d[1] ?? 0) * 2.6,
      itemStyle: { color: i < 5 ? (LADDER[Math.min(4, i)] ?? INK) : LIGHTEST },
      animationDelay: (di: number) => i * 160 + di * 14,
    })),
  };
}

/**
 * The option the sample data produces, with no arguments.
 *
 * The build and the conformance lint both need a chart's real marks without
 * mounting React — `useEffect` does not run under server rendering.
 */
export const previewOption = (): EChartsOption => buildOption(WEEK);

export function SingleAxis({ week = WEEK }: { week?: readonly DayRow[] }) {
  const option = useMemo(() => buildOption(week), [week]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-single-axis">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
