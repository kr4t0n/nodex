/**
 * One dataset, three views — mono-editorial
 *
 * The same twelve products asked three questions at once: what they cost
 * against how they are rated, how much revenue they earn, and how that revenue
 * divides. Each product keeps its tone across all three panels, so a product
 * can be followed from one to the next by eye.
 *
 * **Three panels, not a morph.** The imported version cycled between the
 * encodings every three seconds, which this language forbids outright — "never
 * animate on a loop". Advancing on click was the first fix and was worse: the
 * gallery renders these as static documents, so the other two views became
 * unreachable and a chart called "three views" showed one.
 *
 * Small multiples are the better answer for this language anyway. A morph asks
 * you to remember the previous view; three panels let you compare them, which
 * is what a close-read language is for. Holding the tone constant across the
 * panels does the work `universalTransition` was doing, without motion.
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

/** One row per product: `[product, priceUsd, csat, revenueK]`. */
export type Product = readonly [
  product: string,
  priceUsd: number,
  csat: number,
  revenueK: number,
];

export const PRODUCTS: readonly Product[] = [
  ['Editor', 12, 9.1, 486],
  ['Boards', 18, 8.4, 391],
  ['Forms', 9, 8.8, 274],
  ['Docs', 15, 8.0, 318],
  ['Chat', 7, 7.2, 182],
  ['Vault', 24, 7.8, 226],
  ['Flows', 21, 8.6, 352],
  ['Views', 11, 7.5, 198],
  ['Sync', 16, 6.9, 141],
  ['Pages', 8, 8.2, 243],
  ['Grid', 19, 7.1, 167],
  ['Hub', 13, 6.6, 118],
];

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const MUTED = '#8F8E88';
const GRID = '#DEDDD6';
const FAINT = '#C6C5BF';
const LABEL = '#6A6963';
const LADDER = ['#1C1C1A', '#4A4944', '#6A6963', '#8F8E88', '#B0AFA9', '#C6C5BF'];

const SANS = "'Inter', sans-serif";

const AXIS = {
  splitLine: { lineStyle: { color: GRID } },
  axisLine: { show: false },
  axisTick: { show: false },
  axisLabel: { color: MUTED, fontFamily: SANS, fontSize: 8.5 },
} as const;

const PANEL = {
  textStyle: { fontSize: 9, fontWeight: 700, fontFamily: SANS, color: LABEL },
  top: 8,
} as const;

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(products: readonly Product[]): EChartsOption {
  // Revenue order. Tone is assigned here, once, and every panel reads from it,
  // which is what lets a product be tracked across the three.
  const ranked = [...products].sort((a, b) => b[3] - a[3]);
  const toneOf = new Map(
    ranked.map(([name], i) => [
      name,
      LADDER[Math.min(LADDER.length - 1, Math.floor(i / 2))] ?? INK,
    ]),
  );

  return {
    color: LADDER,
    animationDuration: 900,
    animationEasing: 'quarticOut',
    textStyle: { fontFamily: SANS },

    tooltip: {
      backgroundColor: INK,
      borderWidth: 0,
      padding: [10, 14],
      textStyle: { color: PAPER, fontFamily: SANS, fontSize: 12 },
    },

    title: [
      { ...PANEL, text: 'PRICE VS RATING', left: '4%' },
      { ...PANEL, text: 'REVENUE, RANKED', left: '38%' },
      { ...PANEL, text: 'REVENUE SHARE', left: '72%' },
    ],

    grid: [
      { left: '4%', right: '70%', top: 34, bottom: 30 },
      { left: '38%', right: '36%', top: 34, bottom: 52 },
    ],

    xAxis: [
      {
        ...AXIS,
        gridIndex: 0,
        type: 'value',
        min: 5,
        max: 26,
        name: 'PRICE $',
        nameTextStyle: { color: FAINT, fontSize: 8 },
      },
      {
        ...AXIS,
        gridIndex: 1,
        type: 'category',
        data: ranked.map(([name]) => name),
        axisLabel: { ...AXIS.axisLabel, rotate: 52, fontSize: 7.5 },
      },
    ],
    yAxis: [
      {
        ...AXIS,
        gridIndex: 0,
        type: 'value',
        min: 6,
        max: 9.6,
        name: 'CSAT',
        nameTextStyle: { color: FAINT, fontSize: 8 },
      },
      { ...AXIS, gridIndex: 1, type: 'value', max: 520 },
    ],

    series: [
      {
        name: 'price vs rating',
        type: 'scatter',
        xAxisIndex: 0,
        yAxisIndex: 0,
        // Area, not radius, so revenue reads honestly here too.
        symbolSize: (d: number[]) => Math.sqrt(d[3] ?? 0) * 0.9,
        data: products.map(([name, price, csat, revenue]) => ({
          name,
          value: [price, csat, name, revenue],
          itemStyle: { color: toneOf.get(name) ?? INK },
        })),
        tooltip: {
          formatter: (p: CallbackDataParams) => {
            const [price, csat] = p.value as [number, number];
            return `${p.name} — $${price} · CSAT ${csat}`;
          },
        },
      },
      {
        name: 'revenue',
        type: 'bar',
        xAxisIndex: 1,
        yAxisIndex: 1,
        barCategoryGap: '34%',
        data: ranked.map(([name, , , revenue]) => ({
          name,
          value: revenue,
          itemStyle: { color: toneOf.get(name) ?? INK, borderRadius: [4, 4, 0, 0] },
        })),
        tooltip: {
          formatter: (p: CallbackDataParams) => `${p.name} — $${p.value as number}K`,
        },
      },
      {
        name: 'share',
        type: 'pie',
        radius: ['13%', '30%'],
        center: ['84%', '54%'],
        // A gap painted in the page colour, not an ink border: this language
        // has no outline on a filled mark.
        itemStyle: { borderColor: PAPER, borderWidth: 2, borderRadius: 4 },
        label: { color: LABEL, fontFamily: SANS, fontSize: 7.5, formatter: '{b}' },
        labelLine: { lineStyle: { color: FAINT }, length: 5, length2: 5 },
        data: ranked.map(([name, , , revenue]) => ({
          name,
          value: revenue,
          itemStyle: { color: toneOf.get(name) ?? INK },
        })),
        tooltip: {
          formatter: (p: CallbackDataParams) =>
            `${p.name} — $${p.value as number}K · ${p.percent}%`,
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
export const previewOption = (): EChartsOption => buildOption(PRODUCTS);

export function ScatterMorph({
  products = PRODUCTS,
}: {
  products?: readonly Product[];
}) {
  const option = useMemo(() => buildOption(products), [products]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-scatter-morph">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
