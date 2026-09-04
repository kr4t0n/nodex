/**
 * Twelve products on four axes — mono-editorial
 *
 * Parallel coordinates: each product is one line crossing four scales, so a
 * trade-off shows up as a crossing rather than needing four charts side by
 * side. The best all-round product is inked and the rest are held back, which
 * is the only way twelve lines stay readable.
 *
 * Price is scored as a fact rather than a virtue. Cheap is not better, so the
 * hero is chosen on satisfaction, retention and growth — a chart that ranked
 * on price would be answering a question nobody asked.
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

/** One axis: its name and the range it spans. */
export type Dimension = readonly [name: string, min: number, max: number];

export const DIMENSIONS: readonly Dimension[] = [
  ['PRICE $', 8, 30],
  ['CSAT', 6, 9.6],
  ['RETENTION %', 55, 95],
  ['GROWTH %', -5, 40],
];

/** One row per product: its name, then a value per dimension in order. */
export type Product = readonly [
  product: string,
  price: number,
  csat: number,
  retention: number,
  growth: number,
];

export const PRODUCTS: readonly Product[] = [
  ['Editor', 12, 9.1, 91, 22], ['Boards', 18, 8.4, 86, 18],
  ['Forms', 9, 8.8, 78, 31], ['Docs', 15, 8.0, 82, 12],
  ['Chat', 7, 7.2, 64, 8], ['Vault', 24, 7.8, 88, 6],
  ['Flows', 21, 8.6, 90, 38], ['Views', 11, 7.5, 71, 14],
  ['Sync', 16, 6.9, 58, -2], ['Pages', 8, 8.2, 74, 19],
  ['Grid', 19, 7.1, 62, 4], ['Hub', 13, 6.6, 52, 9],
];

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const QUIET = '#B0AFA9';
const FAINT = '#C6C5BF';
const LABEL = '#6A6963';

const SANS = "'Inter', sans-serif";

/**
 * Judged on satisfaction, retention and growth. Price is deliberately absent:
 * it is a fact about a product, not a merit, and scoring it would make cheap
 * synonymous with good.
 */
const score = (p: Product) => (p[2] - 6) / 3.6 + (p[3] - 55) / 40 + (p[4] + 5) / 45;

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(products: readonly Product[] = PRODUCTS): EChartsOption {
  const hero = products.reduce((a, b) => (score(b) > score(a) ? b : a));

  return {
    color: [QUIET, INK],
    // Draws once and holds. This language forbids looping animation.
    animationDuration: 900,
    animationEasing: 'quarticOut',
    textStyle: { fontFamily: SANS },

    tooltip: {
      backgroundColor: INK,
      borderWidth: 0,
      padding: [10, 14],
      textStyle: { color: PAPER, fontFamily: SANS, fontSize: 12 },
      formatter: (p: CallbackDataParams | CallbackDataParams[]) => {
        const hit = Array.isArray(p) ? p[0] : p;
        return hit?.name ? String(hit.name) : '';
      },
    },

    parallelAxis: DIMENSIONS.map(([name, min, max], i) => ({
      dim: i,
      name,
      min,
      max,
      // Hairline, under the language's 1.4px ceiling.
      axisLine: { lineStyle: { color: QUIET, width: 1 } },
      axisTick: { show: false },
      splitLine: { show: false },
      nameTextStyle: { color: LABEL, fontFamily: SANS, fontSize: 7, fontWeight: 800 },
      nameGap: 16,
      axisLabel: {
        color: FAINT,
        fontFamily: SANS,
        fontSize: 6.5,
        fontWeight: 600,
        // Only the ends. Four fully-ruled scales would out-weigh the lines
        // they exist to measure.
        showMinLabel: true,
        showMaxLabel: true,
        formatter: (v: number) => (v === min || v === max ? String(v) : ''),
      },
    })),

    parallel: {
      left: 60,
      right: 42,
      top: 46,
      bottom: 30,
      parallelAxisDefault: { type: 'value' },
    },

    series: [
      {
        // The field, held back so the hero can be read against it.
        type: 'parallel',
        data: products
          .filter((p) => p[0] !== hero[0])
          .map((p) => ({ name: p[0], value: p.slice(1) as number[] })),
        lineStyle: { color: QUIET, width: 0.8, opacity: 0.55 },
        smooth: 0.2,
        z: 1,
      },
      {
        // The best all-rounder, inked. One line at full weight is the whole
        // hierarchy; there is no second colour to spend.
        type: 'parallel',
        data: [{ name: hero[0], value: hero.slice(1) as number[] }],
        lineStyle: { color: INK, width: 1.4, opacity: 1 },
        smooth: 0.2,
        z: 2,
      },
    ],

    graphic: [
      {
        type: 'text',
        left: 'center',
        bottom: 6,
        style: {
          text: `ONE LINE = ONE PRODUCT · INK = BEST ALL-ROUND (${hero[0].toUpperCase()})`,
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

export function ParallelCoords({ products = PRODUCTS }: { products?: readonly Product[] }) {
  const option = useMemo(() => buildOption(products), [products]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-parallel-coords">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
