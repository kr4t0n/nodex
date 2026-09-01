/**
 * MRR by plan — mono-editorial
 *
 * Four bars, capped round, tone assigned by rank rather than by plan. The
 * biggest earner is ink and the smallest is the lightest grey, so the ordering
 * is legible before any label is read — which is the only ranking device this
 * language has, having no accent colour.
 *
 * The value sits above each bar rather than on an axis. Four numbers read
 * faster in place than against a scale, and it lets the y axis disappear.
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

/** One row per plan: `[plan, mrrThousands]`. */
export type Plan = readonly [plan: string, mrrK: number];

export const PLANS: readonly Plan[] = [
  ['STARTER', 182],
  ['PRO', 486],
  ['TEAM', 391],
  ['ENT', 274],
];

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const MUTED = '#8F8E88';
// Darkest first. Assigned by rank, so the tallest bar is always ink.
const LADDER = ['#1C1C1A', '#8F8E88', '#B0AFA9', '#C6C5BF'];

const SANS = "'Inter', sans-serif";

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(plans: readonly Plan[]): EChartsOption {
  // Rank, so tone tracks size rather than the order the plans are listed in.
  const ranked = [...plans].sort((a, b) => b[1] - a[1]).map(([plan]) => plan);
  const headroom = Math.max(...plans.map(([, mrr]) => mrr)) * 1.12;

  return {
    // The language's ramp *is* the palette. Without this ECharts assigns any
    // series that does not set its own colour from its default theme.
    color: LADDER,
    // Draws once and holds. This language forbids looping animation.
    animationDuration: 900,
    animationEasing: 'quarticOut',
    animationDelay: (i: number) => i * 110,
    textStyle: { fontFamily: SANS },

    tooltip: {
      backgroundColor: INK,
      borderWidth: 0,
      padding: [10, 14],
      textStyle: { color: PAPER, fontFamily: SANS, fontSize: 12 },
      formatter: (p: CallbackDataParams | CallbackDataParams[]) => {
        const hit = Array.isArray(p) ? p[0] : p;
        return hit ? `$${hit.value as number}K MRR` : '';
      },
    },

    // Top margin is for the value labels, which sit outside the plot.
    grid: { left: 10, right: 10, top: 48, bottom: 28 },

    xAxis: {
      type: 'category',
      data: plans.map(([plan]) => plan),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: MUTED,
        fontFamily: SANS,
        fontSize: 9,
        fontWeight: 600,
        margin: 10,
        // No tracking here. The language wants positive tracking on uppercase,
        // but ECharts has no letter-spacing on axis labels — the original
        // carried `letterSpacing: 1` and ECharts had been ignoring it. Tracking
        // on the card's own text is set in CSS.
      },
    },
    // The labels carry the values, so a scale would only repeat them.
    yAxis: { show: false, max: Math.round(headroom) },

    series: [
      {
        type: 'bar',
        barWidth: '52%',
        label: {
          show: true,
          position: 'top',
          distance: 10,
          color: INK,
          fontFamily: SANS,
          fontSize: 13,
          fontWeight: 700,
          formatter: (p: CallbackDataParams) => `$${p.value as number}K`,
        },
        data: plans.map(([plan, mrr]) => ({
          value: mrr,
          itemStyle: {
            color: LADDER[ranked.indexOf(plan)] ?? INK,
            // Capped at the top only, so a bar reads as growing out of the
            // baseline rather than as a floating pill.
            borderRadius: [99, 99, 0, 0],
          },
        })),
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
export const previewOption = (): EChartsOption => buildOption(PLANS);

export function ChunkyBars({ plans = PLANS }: { plans?: readonly Plan[] }) {
  const option = useMemo(() => buildOption(plans), [plans]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-chunky-bars">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
