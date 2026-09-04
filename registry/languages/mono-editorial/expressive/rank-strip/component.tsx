/**
 * Six quarters of rank, five products — mono-editorial
 *
 * A bump chart drawn as a grid rather than as crossing lines. Every cell holds
 * a rank and is toned by it, so a product's run reads as a band of weight
 * moving across the row — and unlike a bump chart's spaghetti, five products
 * over six quarters stays legible at any size.
 *
 * Rows are ordered by where each product finished, so the climber lands on
 * top. That is the finding, and sorting by name would bury it.
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

/** One row per product: its rank in each quarter, best first. */
export interface Product {
  readonly name: string;
  readonly ranks: readonly number[];
}

export const PRODUCTS: readonly Product[] = [
  { name: 'Flows', ranks: [5, 3, 2, 1, 1, 1] },
  { name: 'Editor', ranks: [1, 1, 1, 2, 2, 2] },
  { name: 'Boards', ranks: [2, 2, 3, 3, 3, 4] },
  { name: 'Vault', ranks: [4, 5, 5, 4, 4, 3] },
  { name: 'Docs', ranks: [3, 4, 4, 5, 5, 5] },
];

export const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6'] as const;

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const MUTED = '#8F8E88';
const EDGE = '#CFCEC7';
const LABEL = '#6A6963';
const DEEP = '#55544E';

/** Rank one is ink, rank five is nearly paper. */
const TONES = ['#1C1C1A', '#4A4944', '#8F8E88', '#B0AFA9', '#D8D7D1'];

/** At or above this rank the cell is dark enough that its figure knocks out. */
const KNOCKOUT_AT = 2;

const SANS = "'Inter', sans-serif";

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(products: readonly Product[] = PRODUCTS): EChartsOption {
  // Ordered by where each product finished, so the climber ends up on top.
  const rows = [...products].sort(
    (a, b) => (a.ranks[a.ranks.length - 1] ?? 0) - (b.ranks[b.ranks.length - 1] ?? 0),
  );

  const cells = rows.flatMap((product, i) =>
    product.ranks.map((rank, q) => ({
      value: [q, i, rank] as [number, number, number],
      // Per-cell, because the label's colour depends on the tone beneath it
      // and a series-wide colour cannot know which rank it landed on.
      label: { color: rank <= KNOCKOUT_AT ? PAPER : DEEP },
    })),
  );

  return {
    color: [INK],
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
        if (!hit) return '';
        const [q, i, rank] = hit.value as [number, number, number];
        return `${rows[i]?.name} — #${rank} in ${QUARTERS[q]}`;
      },
    },

    grid: { left: 76, right: 24, top: 40, bottom: 24 },

    // Rank *is* the tone, so it is expressed as a mapping rather than as a
    // colour set on each cell. A cartesian heatmap also requires one: ECharts
    // refuses to render without it.
    visualMap: {
      type: 'piecewise',
      show: false,
      dimension: 2,
      pieces: TONES.map((_, i) => ({ value: i + 1 })),
      inRange: { color: TONES },
      seriesIndex: 0,
    },

    xAxis: {
      type: 'category',
      data: [...QUARTERS],
      position: 'top',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { color: MUTED, fontFamily: SANS, fontSize: 7.5, fontWeight: 600 },
    },
    yAxis: {
      type: 'category',
      data: rows.map((p) => p.name),
      inverse: true,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: {
        fontFamily: SANS,
        fontSize: 8.5,
        margin: 12,
        fontWeight: 600,
        // The product that finished first is set in ink. The callback takes an
        // optional value, because ECharts also calls it without one.
        color: (value?: string | number) => (value === rows[0]?.name ? INK : LABEL),
      },
    },

    series: [
      {
        type: 'heatmap',
        data: cells,
        // A rounded cell with a hairline edge, so the grid reads as thirty
        // separate readings rather than as one ruled table.
        itemStyle: { borderRadius: 8, borderColor: EDGE, borderWidth: 0.5 },
        label: {
          show: true,
          fontFamily: SANS,
          fontSize: 9.5,
          fontWeight: 800,
          formatter: (p: CallbackDataParams) => {
            const [, , rank] = p.value as [number, number, number];
            return String(rank);
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
 * mounting React — `useEffect` does not run under server rendering.
 */
export const previewOption = (): EChartsOption => buildOption();

export function RankStrip({ products = PRODUCTS }: { products?: readonly Product[] }) {
  const option = useMemo(() => buildOption(products), [products]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-rank-strip">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
