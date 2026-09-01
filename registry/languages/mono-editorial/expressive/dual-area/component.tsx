/**
 * Campaigns rain down, sign-ups flow — mono-editorial
 *
 * Two stacked plots sharing one time axis: spend falls from the top of the
 * card, sign-ups rise underneath it. The inversion is the argument — money goes
 * out and people come in — and it only reads if the two are locked to the same
 * day, which is what `axisPointer.link` buys.
 *
 * `buildOption` is pure and exported, so the build server-renders it to a
 * static preview and the conformance lint reads the marks it really produces
 * rather than parsing them out of source.
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
 * One row per day: `[day, spendK, signUps]`.
 *
 * A single table rather than three parallel arrays, so a row cannot go missing
 * from one series and not the others.
 */
export type Day = readonly [day: number, spendK: number, signUps: number];

export const DAYS: readonly Day[] = [
  [1, 2, 42], [2, 0, 45], [3, 4, 44], [4, 8, 48], [5, 3, 52],
  [6, 0, 55], [7, 6, 53], [8, 12, 58], [9, 7, 64], [10, 3, 62],
  [11, 9, 66], [12, 15, 71], [13, 6, 69], [14, 2, 75], [15, 11, 82],
  [16, 5, 79], [17, 8, 84], [18, 14, 80], [19, 4, 86], [20, 9, 92],
  [21, 6, 88], [22, 13, 95], [23, 3, 91], [24, 7, 97], [25, 10, 104],
  [26, 5, 101], [27, 12, 108], [28, 8, 105], [29, 15, 112], [30, 6, 118],
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
export function buildOption(days: readonly Day[]): EChartsOption {
  const labels = days.map(([day]) => day);
  const spend = days.map(([, spendK]) => spendK);
  const signUps = days.map(([, , count]) => count);

  return {
    // Draws once and holds. This language forbids looping animation, so the
    // duration is all the motion there is.
    animationDuration: 1200,
    animationEasing: 'quarticOut',
    textStyle: { fontFamily: SANS },

    tooltip: {
      trigger: 'axis',
      backgroundColor: INK,
      borderWidth: 0,
      padding: [10, 14],
      textStyle: { color: PAPER, fontFamily: SANS, fontSize: 12 },
      formatter: (p: CallbackDataParams | CallbackDataParams[]) => {
        const hit = Array.isArray(p) ? p[0] : p;
        if (!hit) return '';
        const row = days[hit.dataIndex ?? 0];
        return row ? `Day ${row[0]} — spend $${row[1]}K · ${row[2]} sign-ups` : '';
      },
    },
    // Both plots highlight the same day, which is the whole point of stacking
    // them rather than drawing two charts.
    axisPointer: { link: [{ xAxisIndex: 'all' }], lineStyle: { color: QUIET } },

    grid: [
      { left: 44, right: 14, top: 8, height: '26%' },
      { left: 44, right: 14, top: '42%', bottom: 26 },
    ],

    xAxis: [
      {
        gridIndex: 0,
        type: 'category',
        data: labels,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { show: false },
        position: 'bottom',
      },
      {
        gridIndex: 1,
        type: 'category',
        data: labels,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: MUTED,
          fontFamily: SANS,
          fontSize: 9.5,
          interval: 6,
          formatter: (v: string) => `D${v}`,
        },
      },
    ],

    yAxis: [
      {
        // Inverted, so spend hangs from the top of the card and reads as
        // falling rather than as a second chart that happens to be above.
        gridIndex: 0,
        inverse: true,
        max: 18,
        splitLine: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: QUIET,
          fontFamily: SANS,
          fontSize: 9,
          formatter: '${value}K',
        },
      },
      {
        gridIndex: 1,
        splitLine: { lineStyle: { color: GRID } },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: MUTED, fontFamily: SANS, fontSize: 9.5 },
      },
    ],

    series: [
      {
        name: 'spend',
        type: 'bar',
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: spend,
        barWidth: '55%',
        itemStyle: { color: QUIET, borderRadius: [0, 0, 4, 4] },
      },
      {
        name: 'sign-ups',
        type: 'line',
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: signUps,
        smooth: 0.4,
        symbol: 'none',
        // Hairline, under the language's 1.4px ceiling.
        lineStyle: { color: INK, width: 1.1 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(28, 28, 26, 0.22)' },
              { offset: 1, color: 'rgba(28, 28, 26, 0)' },
            ],
          },
        },
      },
    ],
  };
}

/**
 * The option the sample data produces, with no arguments.
 *
 * The build and the conformance lint both need a chart's real marks without
 * mounting React — `useEffect` does not run under server rendering, so the
 * component alone renders an empty container.
 */
export const previewOption = (): EChartsOption => buildOption(DAYS);

export function DualArea({ days = DAYS }: { days?: readonly Day[] }) {
  const option = useMemo(() => buildOption(days), [days]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-dual-area">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
