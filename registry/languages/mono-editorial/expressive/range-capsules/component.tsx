/**
 * Daily active range, two weeks — mono-editorial
 *
 * One capsule per day spanning that day's low to its high. The gap between the
 * capsules is as much of the reading as the capsules themselves: a day that
 * swung from 73K to 168K is a different kind of day from one that sat between
 * 182K and 192K, and a single line through the middle would call them similar.
 *
 * ECharts has no native `[min, max]` bar, so this is two stacked series with
 * the lower one transparent. That is also what keeps the pill radius on the
 * visible segment only — rounding a stack would round the invisible base too.
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

/** One row per day: `[lowK, highK]`, in thousands of users. */
export type Range = readonly [lowK: number, highK: number];

export const DAYS: readonly Range[] = [
  [195, 235],
  [165, 192],
  [150, 232],
  [73, 168],
  [122, 202],
  [182, 192],
  [138, 178],
  [162, 227],
  [195, 235],
  [228, 305],
  [218, 232],
  [165, 232],
  [118, 210],
  [195, 232],
];

/** Which days get a date label. Fourteen would be a grey smear. */
const LABELLED = [0, 6, 13];

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const MUTED = '#8F8E88';

const SANS = "'Inter', sans-serif";

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(days: readonly Range[]): EChartsOption {
  return {
    // Draws once and holds. This language forbids looping animation.
    animationDuration: 800,
    animationEasing: 'quarticOut',
    animationDelay: (i: number) => i * 40,
    textStyle: { fontFamily: SANS },

    tooltip: {
      trigger: 'axis',
      backgroundColor: INK,
      borderWidth: 0,
      padding: [10, 14],
      // No crosshair: the capsule under the pointer is already the answer.
      axisPointer: { type: 'none' },
      textStyle: { color: PAPER, fontFamily: SANS, fontSize: 12 },
      formatter: (p: CallbackDataParams | CallbackDataParams[]) => {
        const hit = Array.isArray(p) ? p[0] : p;
        if (!hit) return '';
        const row = days[hit.dataIndex ?? 0];
        return row ? `${row[0]}K – ${row[1]}K users` : '';
      },
    },

    grid: { left: 46, right: 14, top: 16, bottom: 30 },

    xAxis: {
      type: 'category',
      data: days.map((_, i) => i + 1),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: MUTED,
        fontFamily: SANS,
        fontSize: 9,
        margin: 10,
        formatter: (v: string, i: number) => (LABELLED.includes(i) ? `${i + 1} FEB` : ''),
      },
    },
    yAxis: {
      type: 'value',
      min: 50,
      max: 320,
      // No gridlines: the capsules are read against each other, and a ruled
      // background would compete with fourteen short marks.
      splitLine: { show: false },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: MUTED,
        fontFamily: SANS,
        fontSize: 9.5,
        margin: 10,
        formatter: (v: number) => `${v}K`,
      },
    },

    series: [
      {
        // The invisible base, lifting each capsule to its day's low.
        type: 'bar',
        stack: 'range',
        silent: true,
        barWidth: '32%',
        itemStyle: { color: 'transparent' },
        data: days.map(([low]) => low),
      },
      {
        // The capsule itself: the span from low to high.
        type: 'bar',
        stack: 'range',
        barWidth: '32%',
        itemStyle: { color: INK, borderRadius: 99 },
        data: days.map(([low, high]) => high - low),
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
export const previewOption = (): EChartsOption => buildOption(DAYS);

export function RangeCapsules({ days = DAYS }: { days?: readonly Range[] }) {
  const option = useMemo(() => buildOption(days), [days]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-range-capsules">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
