/**
 * Where sign-ups come from — mono-editorial
 *
 * A donut redesigned as a hundred dots. Each dot is one percent, so the shares
 * are counted rather than estimated from arc length — which is the thing a
 * donut is worst at and a grid is best at.
 *
 * The tone ladder runs darkest to palest by share, so the ordering survives
 * without a colour per category. The figures sit beside the key rather than on
 * the marks, because a hundred dots have nowhere to put a label.
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

/** One row per source: `[source, percent]`. Shares must total a hundred. */
export type Source = readonly [source: string, percent: number];

export const SOURCES: readonly Source[] = [
  ['Search', 34],
  ['Referral', 27],
  ['Social', 18],
  ['Partners', 12],
  ['Paid', 9],
];

/** Dots per row. Ten by ten is the only grid a reader counts without trying. */
const COLUMNS = 10;

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const MUTED = '#8F8E88';
const QUIET = '#B0AFA9';

/** Darkest is the largest share. Rank, not category. */
const TONES = ['#1C1C1A', '#4A4944', '#6A6963', '#8F8E88', '#B0AFA9'];

const SANS = "'Inter', sans-serif";

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(sources: readonly Source[] = SOURCES): EChartsOption {
  const dots: { value: [number, number]; itemStyle: { color: string } }[] = [];

  let placed = 0;
  sources.forEach(([, percent], g) => {
    for (let k = 0; k < percent; k++) {
      const cell = placed + k;
      dots.push({
        // Filled row by row from the top, so a share is a contiguous block and
        // can be read as one shape rather than as scattered cells.
        value: [cell % COLUMNS, Math.floor(cell / COLUMNS)],
        itemStyle: { color: TONES[g] ?? INK },
      });
    }
    placed += percent;
  });

  return {
    color: [INK, INK],
    // Draws once and holds. This language forbids looping animation.
    animationDuration: 900,
    animationEasing: 'quarticOut',
    animationDelay: (i: number) => i * 8,
    textStyle: { fontFamily: SANS },

    tooltip: {
      backgroundColor: INK,
      borderWidth: 0,
      padding: [10, 14],
      textStyle: { color: PAPER, fontFamily: SANS, fontSize: 12 },
      formatter: (p: CallbackDataParams | CallbackDataParams[]) => {
        const hit = Array.isArray(p) ? p[0] : p;
        if (!hit) return '';
        const [col, row] = hit.value as [number, number];
        const cell = row * COLUMNS + col;
        let seen = 0;
        for (const [name, percent] of sources) {
          seen += percent;
          if (cell < seen) return `${name} — ${percent}% of sign-ups`;
        }
        return '';
      },
    },

    // The grid sits left; the key takes the right-hand third.
    grid: { left: '4%', right: '46%', top: 16, bottom: 16 },

    xAxis: { show: false, type: 'value', min: -0.6, max: COLUMNS - 0.4 },
    // Inverted, so the first row is the top one and the block fills downward.
    yAxis: { show: false, type: 'value', min: -0.6, max: COLUMNS - 0.4, inverse: true },

    series: [
      {
        type: 'scatter',
        data: dots,
        symbolSize: 15,
        z: 2,
      },
    ],

    graphic: [
      // The key. Each source gets its swatch, its name and its figure, with
      // the two largest set in ink so the ranking reads before the numbers do.
      ...sources.flatMap(([name, percent], g) => {
        const top = `${16 + g * 19}%`;
        return [
          {
            type: 'circle' as const,
            right: '40%',
            top,
            shape: { cx: 0, cy: 0, r: 6 },
            style: { fill: TONES[g] ?? INK },
          },
          {
            type: 'text' as const,
            right: '22%',
            top,
            style: {
              text: name,
              font: `600 10.5px ${SANS}`,
              fill: INK,
              textVerticalAlign: 'middle' as const,
            },
          },
          {
            type: 'text' as const,
            right: '6%',
            top,
            style: {
              text: `${percent}%`,
              font: `800 15px ${SANS}`,
              fill: g < 2 ? INK : MUTED,
              textVerticalAlign: 'middle' as const,
            },
          },
        ];
      }),
      {
        type: 'text' as const,
        left: 'center',
        bottom: 2,
        style: {
          text: 'ONE DOT = ONE PERCENT OF SIGN-UPS',
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

export function DonutRedesigned({ sources = SOURCES }: { sources?: readonly Source[] }) {
  const option = useMemo(() => buildOption(sources), [sources]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-donut-redesigned">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
