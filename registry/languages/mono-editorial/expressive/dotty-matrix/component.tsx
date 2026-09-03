/**
 * Four squads, six weeks, six lanes — mono-editorial
 *
 * Four decks stacked in axonometric projection, each a six-by-six grid of
 * days. Dot area is tasks closed. Stacking the squads rather than tiling them
 * lets a reader compare the *texture* of four teams at once: who works evenly,
 * who works in bursts, who has quiet lanes.
 *
 * The projection is arithmetic, not a 3D engine — `(c - r)` across and
 * `(c + r)` down, with each deck lifted clear of the one below. So the dots
 * are an ordinary scatter with computed coordinates, and the paper slabs are a
 * custom series reading the same axes through `api.coord()`. Both scale
 * together because both are in data space.
 *
 * The slabs are opaque on purpose: an upper deck must occlude the one beneath
 * it, or four overlaid grids read as one smudge.
 *
 * `buildOption` is pure and exported, so the build server-renders it to a
 * static preview and the conformance lint reads the marks it really produces.
 */
import { useEffect, useMemo, useRef } from 'react';
import * as echarts from 'echarts';
import type {
  CallbackDataParams,
  CustomSeriesRenderItemAPI,
  CustomSeriesRenderItemParams,
  CustomSeriesRenderItemReturn,
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

export const SQUADS = ['PLATFORM', 'GROWTH', 'MOBILE', 'INFRA'] as const;

/** Grid size per deck: weeks across, lanes down. */
const SIZE = 6;

/** Vertical clearance between decks, in data units. */
const DECK = 64;

/**
 * Tasks closed per squad, week and lane, generated.
 *
 * 144 cells will not read as a literal table. Roughly a third of the grid is
 * left empty on purpose: silence is part of the texture, and a deck with no
 * gaps would say every lane was busy every week.
 */
export const DECKS: readonly (readonly (readonly number[])[])[] = SQUADS.map((_, k) =>
  Array.from({ length: SIZE }, (__, r) =>
    Array.from({ length: SIZE }, (___, c) => {
      const load = rnd(k * 37 + r * SIZE + c + 1, k + 2);
      return load < 0.3 ? 0 : Math.round(load * 12);
    }),
  ),
);

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const GRID = '#DEDDD6';
const EMPTY = '#D8D6CE';
const FAINT = '#C6C5BF';
const MUTED = '#8F8E88';

/** One tone per deck, darkest on top so the newest squad reads first. */
const TONES = ['#C6C5BF', '#A8A7A0', '#6A6963', INK];

const SANS = "'Inter', sans-serif";

/** The projection: a cell's place on a deck, in data coordinates. */
const project = (c: number, r: number, k: number): [number, number] => [
  (c - r) * 20,
  -(c + r) * 10 + k * DECK,
];

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(
  decks: readonly (readonly (readonly number[])[])[] = DECKS,
): EChartsOption {
  const dots: {
    value: [number, number, number, number];
    symbolSize: number;
    itemStyle: { color: string };
  }[] = [];

  decks.forEach((deck, k) =>
    deck.forEach((row, r) =>
      row.forEach((v, c) => {
        const [x, y] = project(c, r, k);
        dots.push({
          value: [x, y, v, k],
          // Area, not radius. A quiet day keeps the smallest mark that reads,
          // because absent and zero are different facts.
          symbolSize: v === 0 ? 1.4 : 2 + Math.sqrt(v) * 2.3,
          itemStyle: { color: v === 0 ? EMPTY : TONES[k] ?? INK },
        });
      }),
    ),
  );

  return {
    color: [PAPER, INK, INK],
    // Draws once and holds. This language forbids looping animation.
    animationDuration: 900,
    animationEasing: 'quarticOut',
    animationDelay: (i: number) => i * 4,
    textStyle: { fontFamily: SANS },

    tooltip: {
      backgroundColor: INK,
      borderWidth: 0,
      padding: [10, 14],
      textStyle: { color: PAPER, fontFamily: SANS, fontSize: 12 },
      formatter: (p: CallbackDataParams | CallbackDataParams[]) => {
        const hit = Array.isArray(p) ? p[0] : p;
        if (!hit) return '';
        const [, , v, k] = hit.value as [number, number, number, number];
        return `${SQUADS[k]} — ${v} tasks`;
      },
    },

    grid: { left: 30, right: 96, top: 20, bottom: 20 },

    // Plain value axes: the projection has already decided where everything
    // goes, and the axes exist only to carry it.
    xAxis: { show: false, type: 'value', min: -130, max: 130 },
    yAxis: { show: false, type: 'value', min: -120, max: 4 * DECK + 20 },

    series: [
      {
        // The deck slabs. Opaque, so an upper deck hides the one below rather
        // than four grids overlaying into a smudge.
        type: 'custom',
        data: decks.map((_, k) => k),
        z: 1,
        silent: true,
        renderItem: (
          params: CustomSeriesRenderItemParams,
          api: CustomSeriesRenderItemAPI,
        ): CustomSeriesRenderItemReturn => {
          const k = params.dataIndex;
          const corners: [number, number][] = [
            project(-0.8, -0.8, k),
            project(SIZE - 0.2, -0.8, k),
            project(SIZE - 0.2, SIZE - 0.2, k),
            project(-0.8, SIZE - 0.2, k),
          ];
          const points = corners.map((pt) => api.coord(pt) as [number, number]);
          return {
            type: 'polygon',
            shape: { points },
            style: {
              fill: PAPER,
              opacity: 0.96,
              stroke: GRID,
              // Hairline, under the language's 1.4px ceiling.
              lineWidth: 0.9,
            },
          };
        },
      },
      {
        type: 'scatter',
        data: dots,
        z: 2,
      },
      {
        // A squad's name, off the right corner of its own deck. Set on the
        // deck rather than in a legend, so no colour has to be looked up.
        type: 'scatter',
        symbolSize: 0,
        silent: true,
        z: 3,
        data: decks.map((_, k) => ({ value: [...project(SIZE - 0.2, -0.8, k), k] })),
        label: {
          show: true,
          position: 'right',
          distance: 20,
          fontFamily: SANS,
          fontSize: 7.5,
          fontWeight: 700,
          formatter: (p: CallbackDataParams) => {
            const [, , k] = p.value as [number, number, number];
            return SQUADS[k] ?? '';
          },
          // The topmost deck is ink, so its label is too; the rest stay quiet.
          color: MUTED,
        },
      },
    ],

    graphic: [
      {
        type: 'text',
        left: 'center',
        bottom: 4,
        style: {
          text: 'ONE DOT = ONE DAY · DOT AREA = TASKS · TINY DOT = A QUIET DAY',
          font: `600 7px ${SANS}`,
          fill: FAINT,
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

export function DottyMatrix({
  decks = DECKS,
}: {
  decks?: readonly (readonly (readonly number[])[])[];
}) {
  const option = useMemo(() => buildOption(decks), [decks]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-dotty-matrix">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
