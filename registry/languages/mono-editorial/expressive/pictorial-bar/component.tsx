/**
 * Trees planted, five years — mono-editorial
 *
 * A unit chart drawn with the thing being counted. Each glyph is ten thousand
 * trees, so the row length is countable rather than merely comparable, and a
 * ghost row behind each bar shows the target the year fell short of.
 *
 * The tone ladder runs backwards on purpose — the earliest year is lightest and
 * the latest is ink — so the run reads as accumulating rather than as five
 * unrelated categories. This language has no accent colour, so weight is the
 * only thing available to carry direction.
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

/** One row per year: `[year, treesPlantedThousands]`. */
export type Year = readonly [year: string, thousands: number];

export const YEARS: readonly Year[] = [
  ['2022', 26],
  ['2023', 41],
  ['2024', 63],
  ['2025', 88],
  ['2026', 117],
];

/** One glyph stands for ten thousand trees. */
const PER_GLYPH = 10;

/** The full row, so every bar is read against the same target. */
const TRACK = 13;

// A tree, drawn once and repeated along each bar.
const TREE =
  'path://M20,0 L38,28 L29,28 L40,46 L26,46 L26,58 L14,58 L14,46 L0,46 L11,28 L2,28 Z';

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const MUTED = '#8F8E88';
const GHOST = '#DEDDD6';
// Lightest first: the ladder is walked backwards so the newest year is ink.
const LADDER = ['#1C1C1A', '#4A4944', '#6A6963', '#8F8E88', '#B0AFA9'];

const SANS = "'Inter', sans-serif";

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(years: readonly Year[]): EChartsOption {
  return {
    // The language's ramp *is* the palette. Without this ECharts assigns any
    // series that does not set its own colour from its default theme.
    color: LADDER,
    // Draws once and holds. This language forbids looping animation.
    animationDuration: 900,
    animationEasing: 'quarticOut',
    animationDelay: (i: number) => i * 120,
    textStyle: { fontFamily: SANS },

    tooltip: {
      backgroundColor: INK,
      borderWidth: 0,
      padding: [10, 14],
      textStyle: { color: PAPER, fontFamily: SANS, fontSize: 12 },
      formatter: (p: CallbackDataParams | CallbackDataParams[]) => {
        const hit = Array.isArray(p) ? p[0] : p;
        if (!hit) return '';
        const row = years[hit.dataIndex ?? 0];
        return row ? `${row[0]} — ${row[1]}k trees` : '';
      },
    },

    grid: { left: 44, right: 56, top: 10, bottom: 8 },

    yAxis: {
      type: 'category',
      data: years.map(([year]) => year),
      inverse: true,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: MUTED, fontFamily: SANS, fontSize: 10.5, fontWeight: 700 },
    },
    // The glyphs carry the count, so a numeric scale under them would be a
    // second way of saying the same thing.
    xAxis: { show: false, max: TRACK },

    series: [
      {
        type: 'pictorialBar',
        symbol: TREE,
        symbolRepeat: true,
        symbolSize: [17, 24],
        symbolMargin: 3,
        // Clipped, so a partial year ends in a partial tree rather than
        // rounding up to a whole one it did not plant.
        symbolClip: true,
        z: 10,
        data: years.map(([year, thousands], i) => ({
          name: year,
          value: thousands / PER_GLYPH,
          itemStyle: { color: LADDER[Math.max(0, LADDER.length - 1 - i)] ?? INK },
        })),
        label: {
          show: true,
          position: 'right',
          offset: [8, 0],
          color: INK,
          fontFamily: SANS,
          fontSize: 12,
          fontWeight: 700,
          formatter: (p: CallbackDataParams) => {
            const row = years[p.dataIndex ?? 0];
            return row ? `${row[1]}k` : '';
          },
        },
      },
      {
        // The unreached remainder, in the grid tone. A unit chart without it
        // shows five lengths; with it, it shows five shortfalls.
        type: 'pictorialBar',
        symbol: TREE,
        symbolRepeat: 'fixed',
        symbolSize: [17, 24],
        symbolMargin: 3,
        symbolClip: true,
        silent: true,
        z: 5,
        itemStyle: { color: GHOST },
        data: years.map(() => TRACK),
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
export const previewOption = (): EChartsOption => buildOption(YEARS);

export function PictorialBar({ years = YEARS }: { years?: readonly Year[] }) {
  const option = useMemo(() => buildOption(years), [years]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-pictorial-bar">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
