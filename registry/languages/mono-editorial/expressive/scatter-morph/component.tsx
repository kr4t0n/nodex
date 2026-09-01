/**
 * One dataset, three views — mono-editorial
 *
 * The same twelve products asked three questions at once: what they cost
 * against how they are rated, how much revenue they earn, and how that revenue
 * divides. Each product keeps its tone across all three panels, so a product
 * can be followed from one to the next by eye.
 *
 * **The morph is the component, and it advances on click.** The imported
 * version cycled every three seconds, which this language forbids outright —
 * "never animate on a loop". A click is the same demonstration under the
 * reader's control, and matches the click-to-replay the rest of the corpus
 * already uses.
 *
 * `universalTransition` is what makes it worth doing: a product does not
 * disappear and reappear between encodings, it travels, so the same twelve
 * things are visibly the same twelve things. Tone is held constant across the
 * views for the same reason.
 *
 * `buildOption` is pure and exported, so the build server-renders it to a
 * static preview and the conformance lint reads the marks it really produces.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
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
  const chart = useRef<echarts.ECharts>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const instance = echarts.init(node, null, { renderer: 'svg' });
    chart.current = instance;
    const observer = new ResizeObserver(() => instance.resize());
    observer.observe(node);

    return () => {
      observer.disconnect();
      instance.dispose();
      chart.current = null;
    };
  }, []);

  // Setting the option is separate from creating the chart, so changing the
  // view morphs the marks that are already there. Rebuilding the instance would
  // destroy them and universalTransition would have nothing to carry across.
  useEffect(() => {
    chart.current?.setOption(option, {
      replaceMerge: ['xAxis', 'yAxis', 'grid', 'title', 'series'],
    });
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

/** The three questions, in the order clicking walks them. */
export const VIEWS = ['scatter', 'bar', 'donut'] as const;
export type View = (typeof VIEWS)[number];

const CAPTION = {
  scatter: 'PRICE VS RATING',
  bar: 'REVENUE, RANKED',
  donut: 'REVENUE SHARE',
} as const;

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(
  products: readonly Product[],
  view: View = 'scatter',
): EChartsOption {
  // Revenue order. Tone is assigned here, once, and every view reads from it,
  // so a product keeps its weight as it travels between encodings.
  const ranked = [...products].sort((a, b) => b[3] - a[3]);
  const toneOf = new Map(
    ranked.map(([name], i) => [
      name,
      LADDER[Math.min(LADDER.length - 1, Math.floor(i / 2))] ?? INK,
    ]),
  );

  const base: EChartsOption = {
    color: LADDER,
    animationDuration: 900,
    animationEasing: 'quarticOut',
    animationDurationUpdate: 1100,
    animationEasingUpdate: 'cubicInOut',
    textStyle: { fontFamily: SANS },
    tooltip: {
      backgroundColor: INK,
      borderWidth: 0,
      padding: [10, 14],
      textStyle: { color: PAPER, fontFamily: SANS, fontSize: 12 },
    },
    title: [
      {
        text: CAPTION[view],
        left: 0,
        top: 0,
        textStyle: { fontSize: 9, fontWeight: 700, fontFamily: SANS, color: LABEL },
      },
    ],
  };

  if (view === 'bar') {
    return {
      ...base,
      grid: { left: 44, right: 16, top: 34, bottom: 52 },
      xAxis: {
        ...AXIS,
        type: 'category',
        data: ranked.map(([name]) => name),
        axisLabel: { ...AXIS.axisLabel, rotate: 38, fontSize: 8.5 },
      },
      yAxis: { ...AXIS, type: 'value', max: 520 },
      series: [
        {
          id: 'p',
          type: 'bar',
          // The mark itself travels between encodings, so twelve products stay
          // visibly twelve products rather than vanishing and returning.
          universalTransition: true,
          barCategoryGap: '32%',
          data: ranked.map(([name, , , revenue]) => ({
            name,
            value: revenue,
            groupId: name,
            itemStyle: { color: toneOf.get(name) ?? INK, borderRadius: [6, 6, 0, 0] },
          })),
          tooltip: {
            formatter: (p: CallbackDataParams) => `${p.name} — $${p.value as number}K`,
          },
        },
      ],
    };
  }

  if (view === 'donut') {
    return {
      ...base,
      grid: { left: 0, right: 0, top: 30, bottom: 0 },
      xAxis: { show: false, type: 'value' },
      yAxis: { show: false, type: 'value' },
      series: [
        {
          id: 'p',
          type: 'pie',
          universalTransition: true,
          radius: ['26%', '68%'],
          center: ['50%', '54%'],
          // A gap painted in the page colour, not an ink border: this language
          // has no outline on a filled mark.
          itemStyle: { borderColor: PAPER, borderWidth: 2, borderRadius: 6 },
          label: { color: LABEL, fontFamily: SANS, fontSize: 9, formatter: '{b}' },
          labelLine: { lineStyle: { color: FAINT } },
          data: ranked.map(([name, , , revenue]) => ({
            name,
            value: revenue,
            groupId: name,
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

  return {
    ...base,
    grid: { left: 44, right: 20, top: 34, bottom: 34 },
    xAxis: {
      ...AXIS,
      type: 'value',
      min: 5,
      max: 26,
      name: 'PRICE $',
      nameTextStyle: { color: FAINT, fontSize: 8.5 },
    },
    yAxis: {
      ...AXIS,
      type: 'value',
      min: 6,
      max: 9.6,
      name: 'CSAT',
      nameTextStyle: { color: FAINT, fontSize: 8.5 },
    },
    series: [
      {
        id: 'p',
        type: 'scatter',
        universalTransition: true,
        // Area, not radius, so revenue reads honestly.
        symbolSize: (d: number[]) => Math.sqrt(d[3] ?? 0) * 1.2,
        data: products.map(([name, price, csat, revenue]) => ({
          name,
          value: [price, csat, name, revenue],
          groupId: name,
          itemStyle: { color: toneOf.get(name) ?? INK },
        })),
        label: {
          show: true,
          position: 'top',
          color: MUTED,
          fontFamily: SANS,
          fontSize: 8.5,
          formatter: (p: CallbackDataParams) => p.name,
        },
        tooltip: {
          formatter: (p: CallbackDataParams) => {
            const [price, csat] = p.value as [number, number];
            return `${p.name} — $${price} · CSAT ${csat}`;
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
export const previewOption = (): EChartsOption => buildOption(PRODUCTS);

export function ScatterMorph({
  products = PRODUCTS,
}: {
  products?: readonly Product[];
}) {
  const [step, setStep] = useState(0);
  const view = VIEWS[step % VIEWS.length] ?? 'scatter';
  const option = useMemo(() => buildOption(products, view), [products, view]);
  const ref = useECharts<HTMLDivElement>(option);

  const next = VIEWS[(step + 1) % VIEWS.length] ?? 'scatter';

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-scatter-morph">
      <div className="card">
        {/* A button rather than a click handler on the chart. Advancing the
            view is a real action, so it belongs on something focusable that
            announces what it does — a div with onClick is reachable by neither
            keyboard nor screen reader. */}
        <button
          type="button"
          className="morph"
          onClick={() => setStep((s) => s + 1)}
          aria-label={`Showing ${CAPTION[view].toLowerCase()}. Show ${next} instead.`}
        >
          <div className="chart" ref={ref} />
        </button>
      </div>
    </div>
  );
}
