/**
 * Net account movement by plan — mono-editorial
 *
 * Growth reads right of the zero rule, churn reads left of it. Ink for gain and
 * a quiet grey for loss, because this language has no accent colour: the
 * direction is carried by which side of the rule a bar sits on, and the weight
 * only says which of the two you should read first.
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

/** One row per plan: `[plan, netAccounts]`. Negative is churn. */
export type Plan = readonly [plan: string, netAccounts: number];

export const PLANS: readonly Plan[] = [
  ['Enterprise', 86],
  ['Team', 54],
  ['Pro', 31],
  ['Starter', 12],
  ['Legacy Basic', -18],
  ['Trial expired', -42],
  ['Free dormant', -67],
];

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const MUTED = '#8F8E88';
const GRID = '#DEDDD6';
const QUIET = '#B0AFA9';
const LABEL = '#6A6963';

const SANS = "'Inter', sans-serif";

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(plans: readonly Plan[]): EChartsOption {
  return {
    // Draws once and holds. This language forbids looping animation.
    animationDuration: 900,
    animationEasing: 'quarticOut',
    animationDelay: (i: number) => i * 80,
    textStyle: { fontFamily: SANS },

    tooltip: {
      backgroundColor: INK,
      borderWidth: 0,
      padding: [10, 14],
      textStyle: { color: PAPER, fontFamily: SANS, fontSize: 12 },
      formatter: (p: CallbackDataParams | CallbackDataParams[]) => {
        const hit = Array.isArray(p) ? p[0] : p;
        if (!hit) return '';
        const v = hit.value as number;
        return `${hit.name} — ${v > 0 ? '+' : ''}${v} accounts`;
      },
    },

    grid: { left: 96, right: 52, top: 8, bottom: 8 },

    xAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: GRID } },
      axisLine: { show: false },
      axisTick: { show: false },
      // The zero rule and the labels carry the scale; a second set of numbers
      // along the bottom would only repeat them.
      axisLabel: { show: false },
    },
    yAxis: {
      type: 'category',
      data: plans.map(([plan]) => plan),
      inverse: true,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: LABEL, fontFamily: SANS, fontSize: 9.5, fontWeight: 600 },
    },

    series: [
      {
        type: 'bar',
        barWidth: 16,
        data: plans.map(([plan, net]) => ({
          name: plan,
          value: net,
          itemStyle: {
            color: net > 0 ? INK : QUIET,
            // Rounded on the growing end only, so a bar reads as travelling
            // away from the rule rather than as a floating capsule.
            borderRadius: net > 0 ? [0, 9, 9, 0] : [9, 0, 0, 9],
          },
        })),
        label: {
          show: true,
          position: 'outside',
          fontFamily: SANS,
          fontSize: 11,
          fontWeight: 700,
          color: INK,
          formatter: (p: CallbackDataParams) => {
            const v = p.value as number;
            return `${v > 0 ? '+' : ''}${v}`;
          },
        },
        markLine: {
          symbol: 'none',
          silent: true,
          label: { show: false },
          // Hairline, under the language's 1.4px ceiling.
          lineStyle: { color: MUTED, width: 1.1 },
          data: [{ xAxis: 0 }],
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
export const previewOption = (): EChartsOption => buildOption(PLANS);

export function DivergingBar({ plans = PLANS }: { plans?: readonly Plan[] }) {
  const option = useMemo(() => buildOption(plans), [plans]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-diverging-bar">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
