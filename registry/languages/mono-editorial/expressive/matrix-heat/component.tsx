/**
 * Which features are used together — mono-editorial
 *
 * An eight-by-eight co-use matrix. Every cell is the share of accounts using
 * both features, in five countable bands rather than a continuous ramp: five
 * steps ask a reader to match a swatch, a gradient asks them to judge a grey.
 *
 * The diagonal is a dash, not a blank. A feature paired with itself is not
 * zero and not missing, it is meaningless, and those are three different
 * things that a chart should not draw the same way.
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

/**
 * A deterministic hash, not `Math.random()`.
 *
 * Sample data must not change between page loads, or a preview and a
 * screenshot of it stop agreeing. Never swap this for a random source.
 */
const rnd = (i: number, k: number) =>
  Math.abs(((i * 73856093) ^ (k * 19349663)) % 1000) / 1000;

export const FEATURES = [
  'EDITOR', 'BOARDS', 'DOCS', 'CHAT', 'FLOWS', 'VAULT', 'PAGES', 'SYNC',
] as const;

/** A feature against itself: meaningless rather than zero. */
const SELF = -1;

/**
 * Share of accounts using both features, generated.
 *
 * Sixty-four cells is past the point where a literal table reads. Popularity
 * falls off down the list, so the strong pairings cluster top-left.
 */
export const MATRIX: readonly (readonly number[])[] = FEATURES.map((_, i) =>
  FEATURES.map((__, j) => {
    if (i === j) return SELF;
    const a = Math.min(i, j);
    const b = Math.max(i, j);
    const popularity = ((8 - a) / 8) * ((8 - b) / 8);
    return Math.round(popularity * 62 * (0.35 + rnd(a * 8 + b + 1, a + b + 3) * 0.9));
  }),
);

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const MUTED = '#8F8E88';
const EMPTY = '#D8D6CE';
const QUIET = '#B0AFA9';
const LABEL = '#6A6963';

/** Five countable bands, darkest strongest. */
const BANDS = ['#D8D7D1', '#B0AFA9', '#8F8E88', '#4A4944', '#1C1C1A'];

const SANS = "'Inter', sans-serif";

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(matrix: readonly (readonly number[])[] = MATRIX): EChartsOption {
  const cells: [number, number, number][] = [];
  const selves: [number, number][] = [];
  const zeros: [number, number][] = [];
  let max = 0;
  let peak: [number, number] = [0, 0];

  matrix.forEach((row, i) =>
    row.forEach((v, j) => {
      if (v === SELF) {
        selves.push([j, i]);
        return;
      }
      if (v === 0) {
        zeros.push([j, i]);
        return;
      }
      cells.push([j, i, v]);
      if (v > max) {
        max = v;
        peak = [j, i];
      }
    }),
  );

  return {
    color: [INK, EMPTY, EMPTY, INK],
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
        const [j, i, v] = hit.value as [number, number, number];
        return `${FEATURES[i]} × ${FEATURES[j]} — ${v}% of accounts use both`;
      },
    },

    grid: { left: 74, right: 20, top: 54, bottom: 56 },

    xAxis: {
      type: 'category',
      data: [...FEATURES],
      position: 'top',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: {
        color: MUTED,
        fontFamily: SANS,
        fontSize: 7,
        fontWeight: 700,
        rotate: 55,
      },
    },
    yAxis: {
      type: 'category',
      data: [...FEATURES],
      inverse: true,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { color: LABEL, fontFamily: SANS, fontSize: 7, fontWeight: 700 },
    },

    // Five bands, each a swatch a reader can match — and the legend for them.
    visualMap: {
      type: 'piecewise',
      bottom: 20,
      left: 'center',
      orient: 'horizontal',
      pieces: [
        { min: 1, max: 6, label: '1–6' },
        { min: 7, max: 14, label: '7–14' },
        { min: 15, max: 24, label: '15–24' },
        { min: 25, max: 36, label: '25–36' },
        { min: 37, label: '37+' },
      ],
      itemWidth: 11,
      itemHeight: 11,
      itemSymbol: 'rect',
      textStyle: { fontFamily: SANS, fontSize: 8, color: MUTED },
      inRange: { color: BANDS },
      seriesIndex: 0,
    },

    series: [
      {
        type: 'heatmap',
        data: cells,
        itemStyle: { borderRadius: 4, borderColor: PAPER, borderWidth: 2 },
        z: 2,
      },
      {
        // The diagonal: a dash, because a feature against itself is
        // meaningless rather than absent or zero.
        type: 'scatter',
        symbol: 'rect',
        symbolSize: [6, 1.2],
        itemStyle: { color: EMPTY },
        data: selves,
        silent: true,
        z: 3,
      },
      {
        // A real zero keeps a mark. An empty cell and a cell meaning nought
        // look identical, and only one of them is honest.
        type: 'scatter',
        symbolSize: 1.8,
        itemStyle: { color: EMPTY },
        data: zeros,
        silent: true,
        z: 3,
      },
      {
        // The strongest pairing, ringed and stated. Sixty-four cells need one
        // anchor a reader can start from.
        type: 'scatter',
        data: [{ value: peak }],
        symbol: 'rect',
        symbolSize: [30, 30],
        itemStyle: {
          color: 'transparent',
          borderColor: INK,
          // Hairline, under the language's 1.4px ceiling.
          borderWidth: 1,
          borderType: 'dashed',
        },
        label: {
          show: true,
          position: 'inside',
          formatter: String(max),
          color: PAPER,
          fontFamily: SANS,
          fontSize: 9,
          fontWeight: 800,
        },
        silent: true,
        z: 4,
      },
    ],

    graphic: [
      {
        type: 'text',
        left: 'center',
        bottom: 4,
        style: {
          text: 'DASH = A FEATURE AGAINST ITSELF · TINY DOT = A PAIRING NOBODY USES',
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

export function MatrixHeat({
  matrix = MATRIX,
}: {
  matrix?: readonly (readonly number[])[];
}) {
  const option = useMemo(() => buildOption(matrix), [matrix]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-matrix-heat">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
