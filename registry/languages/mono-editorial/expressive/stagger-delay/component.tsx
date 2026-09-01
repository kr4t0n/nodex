/**
 * Fifty markets, ranked by tone — mono-editorial
 *
 * A long row of bars where the tone is bound to the value, not to position, so
 * the wave through the series is visible as a band of ink travelling across
 * light greys. Fifty categories is past the point where individual labels help,
 * which is why only every tenth is drawn.
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

/**
 * One value per market, in market order.
 *
 * Fifty values is past the point where a literal table reads, and the shape is
 * the point: two overlaid periods so the run has a long swell and a short
 * ripple. Deterministic, so a preview and a screenshot of it agree.
 */
export const MARKETS: readonly number[] = Array.from({ length: 50 }, (_, i) =>
  Math.round(30 + 55 * Math.sin(i / 7.5) + 18 * Math.sin(i / 2.6) + (i % 5) * 3 + 28),
);

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const MUTED = '#8F8E88';
const GRID = '#DEDDD6';
// Darkest first. Bound to value, so the wave shows as travelling ink.
const LADDER = ['#1C1C1A', '#4A4944', '#6A6963', '#8F8E88', '#B0AFA9', '#C6C5BF'];

const SANS = "'Inter', sans-serif";

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(markets: readonly number[]): EChartsOption {
  const top = Math.max(...markets);
  // Bucket by value across the ladder, so tone reads as magnitude rather than
  // as an arbitrary series colour.
  const tone = (v: number) =>
    LADDER[Math.min(LADDER.length - 1, Math.floor(((top - v) / top) * LADDER.length))] ?? INK;

  return {
    // The language's ramp *is* the palette. Without this ECharts assigns any
    // series that does not set its own colour from its default theme.
    color: LADDER,
    textStyle: { fontFamily: SANS },

    tooltip: {
      backgroundColor: INK,
      borderWidth: 0,
      padding: [10, 14],
      textStyle: { color: PAPER, fontFamily: SANS, fontSize: 12 },
      formatter: (p: CallbackDataParams | CallbackDataParams[]) => {
        const hit = Array.isArray(p) ? p[0] : p;
        return hit ? `Market ${(hit.dataIndex ?? 0) + 1} — ${hit.value as number}` : '';
      },
    },

    grid: { left: 36, right: 10, top: 14, bottom: 24 },

    xAxis: {
      type: 'category',
      data: markets.map((_, i) => i + 1),
      axisLine: { show: false },
      axisTick: { show: false },
      // Fifty labels would be a grey smear; every tenth keeps the scale.
      axisLabel: { color: MUTED, fontFamily: SANS, fontSize: 9, interval: 9 },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: GRID } },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: MUTED, fontFamily: SANS, fontSize: 9.5 },
    },

    series: [
      {
        type: 'bar',
        barCategoryGap: '26%',
        data: markets.map((v) => ({
          value: v,
          itemStyle: { color: tone(v), borderRadius: [4, 4, 0, 0] },
        })),
        // Draws once and holds. The stagger is what gives the run its wave;
        // this language forbids that motion from looping.
        animationDuration: 640,
        animationEasing: 'elasticOut',
        animationDelay: (i: number) => i * 36,
      },
    ],
    animationDurationUpdate: 640,
    animationDelayUpdate: (i: number) => i * 36,
  };
}

/**
 * The option the sample data produces, with no arguments.
 *
 * The build and the conformance lint both need a chart's real marks without
 * mounting React — `useEffect` does not run under server rendering.
 */
export const previewOption = (): EChartsOption => buildOption(MARKETS);

export function StaggerDelay({ markets = MARKETS }: { markets?: readonly number[] }) {
  const option = useMemo(() => buildOption(markets), [markets]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-stagger-delay">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
