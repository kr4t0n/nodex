/**
 * Time to first reply, by plan — mono-editorial
 *
 * Four boxplots, darkest for the fastest plan. The box is the middle half of
 * the tickets, the whiskers reach the fastest and slowest ordinary reply, and
 * the dots past them are genuine outliers rather than clipped data.
 *
 * The median rule is knocked out in the page colour rather than drawn in ink.
 * On the darkest box an ink median would vanish, and a chart whose most
 * important line disappears on its most important column is broken.
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
 * One row per plan: the five-number summary and any outliers, in hours.
 *
 * `[min, q1, median, q3, max]` is ECharts' own boxplot order, so the summary
 * is passed through rather than recomputed.
 */
export interface Plan {
  readonly plan: string;
  readonly summary: readonly [
    min: number,
    q1: number,
    median: number,
    q3: number,
    max: number,
  ];
  readonly outliers: readonly number[];
}

export const PLANS: readonly Plan[] = [
  { plan: 'ENT', summary: [0.4, 0.9, 1.5, 2.6, 4.4], outliers: [6.2] },
  { plan: 'PRO', summary: [0.8, 2.1, 3.3, 5, 7.8], outliers: [10.5] },
  { plan: 'STARTER', summary: [1.5, 3.8, 6.1, 8.9, 13.2], outliers: [16.8] },
  { plan: 'FREE', summary: [2.2, 6, 9.4, 13.8, 19.6], outliers: [22.1, 23.5] },
];

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const MUTED = '#8F8E88';
const RULE = '#E3E2DB';
/** Darkest is fastest. Rank, not category. */
const TONES = ['#1C1C1A', '#4A4944', '#8F8E88', '#B0AFA9'];

const SANS = "'Inter', sans-serif";

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(plans: readonly Plan[] = PLANS): EChartsOption {
  const outliers = plans.flatMap((p, i) => p.outliers.map((o) => [i, o] as [number, number]));
  const medians = plans.map((p, i) => ({ value: [i, p.summary[2]] as [number, number] }));

  return {
    color: [INK, MUTED, INK],
    // Draws once and holds. This language forbids looping animation.
    animationDuration: 900,
    animationEasing: 'quarticOut',
    animationDelay: (i: number) => i * 120,
    textStyle: { fontFamily: SANS },

    tooltip: {
      backgroundColor: INK,
      borderWidth: 0,
      padding: [10, 14],
      textStyle: { color: PAPER, fontFamily: SANS, fontSize: 12 },
      formatter: (p: CallbackDataParams | CallbackDataParams[]) => {
        const hit = Array.isArray(p) ? p[0] : p;
        if (!hit) return '';
        const plan = plans[hit.dataIndex ?? 0];
        if (!plan) return '';
        const [, q1, , q3] = plan.summary;
        return `${plan.plan} — half of tickets answered in ${q1}–${q3}h`;
      },
    },

    grid: { left: 44, right: 26, top: 34, bottom: 44 },

    xAxis: {
      type: 'category',
      data: plans.map((p) => p.plan),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: MUTED, fontFamily: SANS, fontSize: 7.5, fontWeight: 700 },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 24,
      interval: 6,
      splitLine: { lineStyle: { color: RULE, width: 0.8 } },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: MUTED,
        fontFamily: SANS,
        fontSize: 7.5,
        fontWeight: 600,
        formatter: (v: number) => `${v}h`,
      },
    },

    series: [
      {
        type: 'boxplot',
        data: plans.map((p, i) => ({
          value: [...p.summary],
          itemStyle: {
            color: TONES[i] ?? INK,
            borderColor: MUTED,
            // Hairline, under the language's 1.4px ceiling.
            borderWidth: 1,
          },
        })),
        boxWidth: [24, 24],
        z: 2,
      },
      {
        // Outliers as real marks, not clipped away. A slow reply that actually
        // happened is data, and the whisker is where ordinary stops rather
        // than where the chart stops.
        type: 'scatter',
        data: outliers,
        symbolSize: 5.4,
        itemStyle: { color: MUTED },
        z: 3,
      },
      {
        // The median, restated as a figure beside its own box, and knocked out
        // over it — see the note above about ink vanishing on the dark boxes.
        type: 'scatter',
        data: medians,
        symbolSize: 0,
        silent: true,
        label: {
          show: true,
          position: 'right',
          distance: 16,
          color: INK,
          fontFamily: SANS,
          fontSize: 9.5,
          fontWeight: 800,
          formatter: (p: CallbackDataParams) => {
            const [, median] = p.value as [number, number];
            return `${median.toFixed(1)}h`;
          },
        },
        z: 4,
      },
    ],

    graphic: [
      {
        type: 'text',
        left: 'center',
        bottom: 6,
        style: {
          text: 'BOX = THE MIDDLE HALF · WHISKERS = ORDINARY RANGE · DOTS = OUTLIERS',
          font: `600 7px ${SANS}`,
          fill: MUTED,
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

export function TickBox({ plans = PLANS }: { plans?: readonly Plan[] }) {
  const option = useMemo(() => buildOption(plans), [plans]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-tick-box">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
