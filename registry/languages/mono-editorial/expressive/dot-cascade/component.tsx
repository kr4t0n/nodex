/**
 * Root causes of a year of incidents — mono-editorial
 *
 * Sixteen causes, each a stack of dots. One dot is two incidents, so a column
 * is counted rather than measured, and the top dot of each stack is filled and
 * carries the total.
 *
 * The columns sit on a sloping baseline rather than a flat one, which is the
 * whole composition: the tops trace the long tail, and the slope keeps the
 * short columns from vanishing against the bottom of the card.
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

/** One row per cause: `[cause, incidents]`. */
export type Cause = readonly [cause: string, incidents: number];

export const CAUSES: readonly Cause[] = [
  ['DNS', 1], ['CDN', 1], ['QUOTA', 2], ['DISK', 3],
  ['CERT', 3], ['CACHE', 4], ['QUEUE', 5], ['LOCK', 6],
  ['OOM', 7], ['NET', 9], ['3P API', 11], ['CONFIG', 13],
  ['DB', 15], ['DEPLOY', 18], ['CODE', 22], ['HUMAN', 27],
];

/** One dot stands for this many incidents. */
const PER_DOT = 2;

/** How far each column's floor drops below the last, in dot heights. */
const SLOPE = 0.85;

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const GRID = '#DEDDD6';
const QUIET = '#B0AFA9';
const LABEL = '#6A6963';

const SANS = "'Inter', sans-serif";

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(causes: readonly Cause[] = CAUSES): EChartsOption {
  const stacked: [number, number][] = [];
  const tops: { value: [number, number] }[] = [];
  const floors: [number, number][] = [];

  causes.forEach(([, incidents], i) => {
    const dots = Math.ceil(incidents / PER_DOT);
    // Each column starts lower than the last, so the tops trace the tail.
    const floor = -i * SLOPE;
    floors.push([i, floor]);
    for (let k = 0; k < dots - 1; k++) stacked.push([i, floor + 1.5 + k]);
    tops.push({ value: [i, floor + 1.5 + Math.max(0, dots - 1)] });
  });

  const highest = Math.max(...tops.map((t) => t.value[1]));
  const lowest = Math.min(...floors.map((f) => f[1]));

  return {
    color: [QUIET, INK, INK],
    // Draws once and holds. This language forbids looping animation.
    animationDuration: 900,
    animationEasing: 'quarticOut',
    animationDelay: (i: number) => i * 12,
    textStyle: { fontFamily: SANS },

    tooltip: {
      backgroundColor: INK,
      borderWidth: 0,
      padding: [10, 14],
      textStyle: { color: PAPER, fontFamily: SANS, fontSize: 12 },
      formatter: (p: CallbackDataParams | CallbackDataParams[]) => {
        const hit = Array.isArray(p) ? p[0] : p;
        if (!hit) return '';
        const [i] = hit.value as [number, number];
        const cause = causes[i];
        return cause ? `${cause[0]} — ${cause[1]} incidents` : '';
      },
    },

    grid: { left: 20, right: 20, top: 24, bottom: 62 },

    xAxis: {
      type: 'category',
      data: causes.map(([cause]) => cause),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: LABEL,
        fontFamily: SANS,
        fontSize: 6.5,
        fontWeight: 600,
        // Turned, because sixteen names will not sit side by side.
        rotate: 90,
        margin: 10,
      },
    },
    // The dots are the scale: a column is counted, not measured against an axis.
    yAxis: { show: false, min: lowest - 1, max: highest + 2.5 },

    series: [
      {
        // The body of each stack. Two incidents per dot.
        type: 'scatter',
        symbolSize: 4.4,
        itemStyle: { color: QUIET, opacity: 0.9 },
        data: stacked,
        silent: true,
        z: 2,
      },
      {
        // The top of each stack, filled and carrying the total, so a reader
        // who does not want to count does not have to.
        type: 'scatter',
        symbolSize: 9.2,
        itemStyle: { color: INK },
        data: tops,
        z: 3,
        label: {
          show: true,
          position: 'top',
          distance: 5,
          color: INK,
          fontFamily: SANS,
          fontSize: 9,
          fontWeight: 700,
          formatter: (p: CallbackDataParams) => {
            const [i] = p.value as [number, number];
            return String(causes[i]?.[1] ?? '');
          },
        },
      },
      {
        // The sloping floor, dotted. It is a reading line rather than an axis:
        // it says where each column starts, not what it measures.
        type: 'line',
        data: floors,
        symbol: 'none',
        // Hairline, under the language's 1.4px ceiling.
        lineStyle: { color: GRID, width: 1, type: [2, 4] },
        silent: true,
        z: 1,
      },
    ],

    // What one mark represents.
    graphic: [
      {
        type: 'text',
        left: 'center',
        bottom: 6,
        style: {
          text: `ONE DOT = ${PER_DOT} INCIDENTS · FILLED DOT TOPS EACH STACK`,
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

export function DotCascade({ causes = CAUSES }: { causes?: readonly Cause[] }) {
  const option = useMemo(() => buildOption(causes), [causes]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-dot-cascade">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
