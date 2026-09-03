/**
 * Price against satisfaction, twelve products — mono-editorial
 *
 * A scatter where every point drops a plumb line to the floor. The line is
 * what makes the horizontal position readable: two dots at different heights
 * are hard to compare along one axis, and a stem removes the guess.
 *
 * The floor is a barcode rather than a ruled axis — a tick every five percent,
 * taller every twenty-five — so the scale is countable instead of measured
 * against numbers nobody reads.
 *
 * Only the best and worst are labelled. Twelve names would bury the field they
 * are meant to describe.
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

/** One row per product: `[product, pricePercentile, satisfaction]`. */
export type Product = readonly [
  product: string,
  pricePercentile: number,
  satisfaction: number,
];

export const PRODUCTS: readonly Product[] = [
  ['Editor', 72, 86], ['Boards', 58, 74], ['Docs', 44, 79],
  ['Chat', 38, 62], ['Flows', 66, 58], ['Vault', 82, 71],
  ['Pages', 28, 55], ['Sync', 52, 49], ['Grid', 88, 44],
  ['Views', 20, 68], ['Hub', 76, 32], ['Forms', 34, 38],
];

/** Where the plumb lines and the barcode floor sit. */
const FLOOR = 20;

/** A tick every five percent across the floor. */
const TICKS = 20;

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const DEEP = '#55554F';
const QUIET = '#B0AFA9';
const FAINT = '#C6C5BF';
const TICK = '#CFCEC7';

const SANS = "'Inter', sans-serif";

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(products: readonly Product[] = PRODUCTS): EChartsOption {
  const best = products.reduce((a, b) => (b[2] > a[2] ? b : a));
  const worst = products.reduce((a, b) => (b[2] < a[2] ? b : a));
  const isHero = (name: string) => name === best[0] || name === worst[0];

  // Each plumb line is its own two-point series segment, drawn as one line
  // series with nulls between so twelve stems cost one series rather than
  // twelve.
  const stems: ([number, number] | null)[] = [];
  products.forEach(([, price, satisfaction]) => {
    stems.push([price, FLOOR], [price, satisfaction], null);
  });

  const floorTicks = Array.from({ length: TICKS + 1 }, (_, g) => ({
    value: [(g / TICKS) * 100, FLOOR] as [number, number],
    // Taller every fifth tick, so the floor is countable in twenty-fives.
    symbolSize: [0.6, g % 5 === 0 ? 7 : 4] as [number, number],
  }));

  return {
    color: [QUIET, TICK, DEEP, INK],
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
        const [price, satisfaction] = hit.value as [number, number];
        const found = products.find(([, x, y]) => x === price && y === satisfaction);
        return found ? `${found[0]} — price ${found[1]} · satisfaction ${found[2]}` : '';
      },
    },

    grid: { left: 40, right: 26, top: 26, bottom: 52 },

    xAxis: {
      type: 'value',
      min: 10,
      max: 98,
      // The barcode floor is the scale, so the axis carries only its two ends.
      splitLine: { show: false },
      axisLine: { lineStyle: { color: '#DEDDD6', width: 0.8 } },
      axisTick: { show: false },
      axisLabel: {
        color: FAINT,
        fontFamily: SANS,
        fontSize: 7,
        fontWeight: 600,
        showMinLabel: true,
        showMaxLabel: true,
        formatter: (v: number) => (v <= 10 ? 'CHEAP' : v >= 98 ? 'PREMIUM' : ''),
      },
    },
    yAxis: {
      type: 'value',
      min: FLOOR,
      max: 96,
      name: 'HAPPIER ↑',
      nameLocation: 'middle',
      nameRotate: 90,
      nameGap: 24,
      nameTextStyle: { color: FAINT, fontSize: 7, fontWeight: 600 },
      splitLine: { show: false },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { show: false },
    },

    series: [
      {
        // The plumb lines, one segment per product.
        type: 'line',
        data: stems,
        symbol: 'none',
        // Hairline, well under the language's 1.4px ceiling.
        lineStyle: { color: QUIET, width: 0.55, opacity: 0.6 },
        silent: true,
        z: 1,
      },
      {
        // The barcode floor.
        type: 'scatter',
        symbol: 'rect',
        symbolOffset: [0, -2],
        itemStyle: { color: TICK },
        data: floorTicks,
        silent: true,
        z: 2,
      },
      {
        type: 'scatter',
        data: products.map(([name, price, satisfaction]) => ({
          value: [price, satisfaction],
          symbolSize: isHero(name) ? 9.2 : 5.2,
          itemStyle: { color: isHero(name) ? INK : DEEP },
          // Only the extremes are named. Twelve labels would bury the field.
          label: { show: isHero(name) },
        })),
        label: {
          show: false,
          position: 'top',
          distance: 6,
          color: INK,
          fontFamily: SANS,
          fontSize: 8.5,
          fontWeight: 800,
          // Knocked out of the page colour, so a name stays legible over the
          // stems behind it.
          textBorderColor: PAPER,
          textBorderWidth: 3,
          formatter: (p: CallbackDataParams) => {
            const [price, satisfaction] = p.value as [number, number];
            const found = products.find(([, x, y]) => x === price && y === satisfaction);
            return found ? `${found[0]} · ${found[2]}` : '';
          },
        },
        z: 3,
      },
    ],

    graphic: [
      {
        type: 'text',
        left: 'center',
        bottom: 6,
        style: {
          text: 'ONE DOT = ONE PRODUCT · STEM DROPS TO ITS PRICE · TICK = 5%',
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

export function PlumbScatter({ products = PRODUCTS }: { products?: readonly Product[] }) {
  const option = useMemo(() => buildOption(products), [products]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-plumb-scatter">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
