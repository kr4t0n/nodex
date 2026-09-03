/**
 * Where the brand sits, on four axes — mono-editorial
 *
 * Four paired opposites, each a track between two words. Our position is the
 * large ink dot; three competitors are the small grey ones. A pale ribbon
 * threads our four positions down the page, which turns four separate readings
 * into one shape a reader can take in at once.
 *
 * The ribbon is drawn first and underneath. It is a thick pale stroke rather
 * than a filled band because it must read as a connection between the dots,
 * not as an area with a measurable width.
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

/** One axis: the trait at each end, our position, and three competitors. */
export interface Axis {
  readonly left: string;
  readonly right: string;
  /** 0 is fully the left trait, 1 fully the right. */
  readonly us: number;
  readonly competitors: readonly number[];
}

export const AXES: readonly Axis[] = [
  { left: 'FRIEND', right: 'AUTHORITY', us: 0.74, competitors: [0.42, 0.52, 0.57] },
  { left: 'SERIOUS', right: 'PLAYFUL', us: 0.8, competitors: [0.6, 0.65, 0.86] },
  { left: 'RELIABLE', right: 'RISK-TAKING', us: 0.4, competitors: [0.3, 0.34, 0.5] },
  { left: 'CONTEMPORARY', right: 'CLASSIC', us: 0.22, competitors: [0.36, 0.41, 0.73] },
];

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const MUTED = '#8F8E88';
const QUIET = '#B0AFA9';
const LABEL = '#6A6963';

const SANS = "'Inter', sans-serif";

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(axes: readonly Axis[] = AXES): EChartsOption {
  // Each track is one segment, drawn as a single line series broken by nulls.
  const tracks: ([number, number] | null)[] = [];
  axes.forEach((_, i) => {
    tracks.push([0, i], [1, i], null);
  });

  const competitors = axes.flatMap((axis, i) =>
    axis.competitors.map((t) => [t, i] as [number, number]),
  );

  return {
    color: [QUIET, MUTED, INK, INK],
    // Draws once and holds. This language forbids looping animation.
    animationDuration: 1400,
    animationEasing: 'quarticOut',
    textStyle: { fontFamily: SANS },

    tooltip: {
      backgroundColor: INK,
      borderWidth: 0,
      padding: [10, 14],
      textStyle: { color: PAPER, fontFamily: SANS, fontSize: 12 },
      formatter: (p: CallbackDataParams | CallbackDataParams[]) => {
        const hit = Array.isArray(p) ? p[0] : p;
        if (!hit) return '';
        const [t, i] = hit.value as [number, number];
        const axis = axes[i];
        if (!axis) return '';
        const who = hit.seriesIndex === 3 ? 'us' : 'a competitor';
        return `${who} — ${Math.round(t * 100)}% toward ${axis.right}`;
      },
    },

    grid: { left: 104, right: 104, top: 34, bottom: 48 },

    xAxis: {
      type: 'value',
      min: -0.02,
      max: 1.02,
      splitLine: { show: false },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { show: false },
    },
    yAxis: {
      type: 'category',
      data: axes.map((a) => a.left),
      inverse: true,
      splitLine: { show: false },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: LABEL,
        fontFamily: SANS,
        fontSize: 8,
        fontWeight: 600,
        margin: 14,
      },
    },

    series: [
      {
        // The ribbon, first and underneath. A thick pale stroke rather than a
        // filled band: it connects the four readings, it does not measure
        // anything, and a band would invite the width to be read.
        type: 'line',
        data: axes.map((axis, i) => [axis.us, i] as [number, number]),
        symbol: 'none',
        smooth: 0.5,
        lineStyle: { color: PAPER, width: 30, opacity: 0.9, cap: 'round', join: 'round' },
        silent: true,
        z: 1,
      },
      {
        // The tracks, with an end stop at each extreme.
        type: 'line',
        data: tracks,
        symbol: 'rect',
        symbolSize: [1, 9],
        // Hairline, under the language's 1.4px ceiling.
        lineStyle: { color: QUIET, width: 1 },
        itemStyle: { color: QUIET },
        silent: true,
        z: 2,
      },
      {
        // Three competitors per axis, small and grey.
        type: 'scatter',
        data: competitors,
        symbolSize: 6.4,
        itemStyle: { color: MUTED },
        z: 3,
      },
      {
        // Us, large and ink. The size difference is the hierarchy; there is no
        // second colour to spend on it.
        type: 'scatter',
        data: axes.map((axis, i) => [axis.us, i] as [number, number]),
        symbolSize: 16,
        itemStyle: { color: INK },
        z: 4,
      },
    ],

    graphic: [
      // The right-hand trait of each axis, which a category axis cannot label.
      ...axes.map((axis, i) => ({
        type: 'text' as const,
        right: 18,
        top: `${((i + 0.5) / axes.length) * 100}%`,
        style: {
          text: axis.right,
          font: `600 8px ${SANS}`,
          fill: LABEL,
          textVerticalAlign: 'middle' as const,
        },
      })),
      {
        type: 'text' as const,
        left: 'center',
        bottom: 6,
        style: {
          text: 'LARGE DOT = US · SMALL DOTS = COMPETITORS A · B · C',
          font: `600 7.5px ${SANS}`,
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

export function BrandSpectrum({ axes = AXES }: { axes?: readonly Axis[] }) {
  const option = useMemo(() => buildOption(axes), [axes]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-brand-spectrum">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
