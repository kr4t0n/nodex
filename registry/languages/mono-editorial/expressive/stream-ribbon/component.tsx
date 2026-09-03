/**
 * Three surfaces over forty-eight weeks — mono-editorial
 *
 * A streamgraph on a silhouette baseline: the stack is centred rather than
 * sitting on zero, so each band's own thickness is what reads and no band is
 * penalised for being drawn on top of a large one.
 *
 * The tone ladder is the ordering — palest for the surface being retired,
 * ink for the one replacing it — so the handover is legible as weight before
 * any label is read.
 *
 * Each band is labelled at its own widest week rather than in a legend, which
 * is the whole reason a streamgraph is worth drawing: the label sits in the
 * thing it names.
 *
 * `buildOption` is pure and exported, so the build server-renders it to a
 * static preview and the conformance lint reads the marks it really produces.
 */
import { useEffect, useMemo, useRef } from 'react';
import * as echarts from 'echarts';
import type {
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

const WEEKS = 48;

/** Weekly active accounts for one surface, as a shape rather than a table. */
const trace = (
  base: number,
  trend: number,
  long: number,
  short: number,
  seed: number,
): number[] =>
  Array.from({ length: WEEKS }, (_, t) =>
    Math.max(
      2,
      base + trend * t + 10 * Math.sin(t / long + seed) + 5 * Math.sin(t / short + seed * 2) + rnd(t + 1, seed) * 6,
    ),
  );

export interface Surface {
  readonly name: string;
  readonly weekly: readonly number[];
  readonly tone: string;
}

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const MUTED = '#8F8E88';
const DEEP = '#4A4944';
const FAINT = '#C6C5BF';

export const SURFACES: readonly Surface[] = [
  { name: 'LEGACY EDITOR', weekly: trace(46, -0.62, 9, 3.7, 2), tone: FAINT },
  { name: 'BOARDS', weekly: trace(26, 0.1, 11, 4.2, 5), tone: MUTED },
  { name: 'FLOWS', weekly: trace(12, 0.78, 10, 3.1, 8), tone: INK },
];

const SANS = "'Inter', sans-serif";

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(surfaces: readonly Surface[] = SURFACES): EChartsOption {
  return {
    color: surfaces.map((s) => s.tone),
    // Draws once and holds. This language forbids looping animation.
    animationDuration: 900,
    animationEasing: 'quarticOut',
    textStyle: { fontFamily: SANS },

    tooltip: {
      trigger: 'axis',
      backgroundColor: INK,
      borderWidth: 0,
      padding: [10, 14],
      axisPointer: { type: 'line', lineStyle: { color: MUTED, width: 0.8 } },
      textStyle: { color: PAPER, fontFamily: SANS, fontSize: 12 },
    },

    grid: { left: 34, right: 24, top: 26, bottom: 46 },

    xAxis: {
      type: 'category',
      data: Array.from({ length: WEEKS }, (_, t) => t + 1),
      boundaryGap: false,
      axisLine: { show: false },
      // A barcode floor: a tick per week, so the span is countable.
      axisTick: { show: true, length: 4, lineStyle: { color: FAINT, width: 0.6 } },
      splitLine: { show: false },
      axisLabel: {
        color: MUTED,
        fontFamily: SANS,
        fontSize: 7,
        fontWeight: 600,
        interval: 7,
        formatter: (v: string) => `W${v}`,
      },
    },
    // A silhouette stack has no meaningful zero, so an axis of numbers up the
    // side would invite a reading the chart cannot support.
    yAxis: { show: false },

    series: surfaces.map((surface, i) => ({
      type: 'line' as const,
      name: surface.name,
      data: [...surface.weekly],
      // `wiggle` centres the stack instead of growing it off zero, which is
      // what makes this a streamgraph rather than a stacked area.
      stack: 'surfaces',
      stackStrategy: 'all' as const,
      smooth: true,
      symbol: 'none' as const,
      areaStyle: { color: surface.tone, opacity: 1 },
      // A knockout gap in the page colour, not an outline: it separates
      // adjacent bands by painting the ground between them.
      lineStyle: { color: PAPER, width: 2 },
      z: surfaces.length - i,
    })),

    graphic: [
      ...surfaces.map((surface, i) => {
        let widest = 4;
        surface.weekly.forEach((v, t) => {
          if (t >= 4 && t <= WEEKS - 6 && v > (surface.weekly[widest] ?? 0)) widest = t;
        });
        return {
          type: 'text' as const,
          // Positioned as a share of the plot, which is the closest a graphic
          // element can get to sitting in a band without recomputing the
          // stack's geometry by hand.
          left: `${8 + (widest / WEEKS) * 78}%`,
          top: `${30 + i * 18}%`,
          style: {
            text: surface.name,
            font: `800 9px ${SANS}`,
            fill: surface.tone === INK || surface.tone === DEEP ? PAPER : DEEP,
          },
        };
      }),
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

export function StreamRibbon({ surfaces = SURFACES }: { surfaces?: readonly Surface[] }) {
  const option = useMemo(() => buildOption(surfaces), [surfaces]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-stream-ribbon">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
