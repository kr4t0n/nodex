/**
 * Five pipelines, five tempos — mono-editorial
 *
 * A ridgeline of completion-time distributions, one row per pipeline. Each
 * crest is built from hairlines dropped to its own baseline rather than from a
 * solid fill: the area is made of marks, so the density stays visible as
 * texture instead of becoming a silhouette.
 *
 * The rows are opaque and overlap. An upper crest occludes the one below it,
 * which is what lets five distributions share the height of two — and it only
 * works because each row is filled in the page colour before its hairlines are
 * drawn.
 *
 * `buildOption` is pure and exported, so the build server-renders it to a
 * static preview and the conformance lint reads the marks it really produces.
 */
import { useEffect, useMemo, useRef } from 'react';
import * as echarts from 'echarts';
import type {
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

/** One row per pipeline: where its completion time centres, and how it spreads. */
export type Pipeline = readonly [pipeline: string, centreHours: number, spread: number];

export const PIPELINES: readonly Pipeline[] = [
  ['MOBILE', 3.2, 1.3],
  ['DESKTOP', 5.1, 1.9],
  ['API', 7.4, 2.3],
  ['IMPORTS', 10.8, 3.2],
  ['BATCH', 15.2, 4],
];

/** How far the scale runs, in hours. */
const MAX_HOURS = 24;

/** How many samples describe each crest. */
const RESOLUTION = 72;

/** How far a crest may rise, in row heights. Above 1 the rows overlap. */
const LIFT = 1.24;

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const MUTED = '#8F8E88';
const QUIET = '#B0AFA9';
const LABEL = '#6A6963';

const SANS = "'Inter', sans-serif";

/**
 * The density curve for one pipeline.
 *
 * Two humps rather than one: most runs finish around the centre, and a
 * smaller cluster takes roughly twice as long. That second hump is the finding
 * — a single normal curve would say these pipelines are simply slow.
 */
export function density(centre: number, spread: number): number[] {
  const raw = Array.from({ length: RESOLUTION }, (_, k) => {
    const h = (k / (RESOLUTION - 1)) * MAX_HOURS;
    return (
      Math.exp(-((h - centre) ** 2) / (2 * spread * spread)) +
      0.26 * Math.exp(-((h - centre * 2.1) ** 2) / (2 * (spread * 1.7) ** 2))
    );
  });
  const peak = Math.max(...raw);
  return raw.map((d) => d / peak);
}

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(pipelines: readonly Pipeline[] = PIPELINES): EChartsOption {
  const rows = pipelines.length;
  const series: NonNullable<EChartsOption['series']> = [];

  pipelines.forEach(([, centre, spread], i) => {
    const curve = density(centre, spread);
    // Later rows sit lower and are drawn first, so an upper crest occludes
    // the one beneath it.
    const base = rows - 1 - i;

    // The hairlines that make up the area. Every other sample, so they stay
    // countable rather than merging into a fill.
    const stems: ([number, number] | null)[] = [];
    curve.forEach((d, k) => {
      if (k % 2) return;
      const x = (k / (RESOLUTION - 1)) * MAX_HOURS;
      stems.push([x, base], [x, base + d * LIFT], null);
    });

    series.push(
      {
        // The page-coloured fill, which is what makes the row opaque.
        type: 'line',
        data: curve.map((d, k) => [
          (k / (RESOLUTION - 1)) * MAX_HOURS,
          base + d * LIFT,
        ]),
        symbol: 'none',
        lineStyle: { width: 0 },
        areaStyle: { color: PAPER, opacity: 0.96, origin: 'start' },
        silent: true,
        z: i * 3 + 1,
      },
      {
        type: 'line',
        data: stems,
        symbol: 'none',
        // Hairline, well under the language's 1.4px ceiling.
        lineStyle: { color: MUTED, width: 0.5, opacity: 0.5 },
        silent: true,
        z: i * 3 + 2,
      },
      {
        // The crest itself.
        type: 'line',
        data: curve.map((d, k) => [
          (k / (RESOLUTION - 1)) * MAX_HOURS,
          base + d * LIFT,
        ]),
        symbol: 'none',
        lineStyle: { color: INK, width: 0.9 },
        silent: true,
        z: i * 3 + 3,
      },
    );
  });

  return {
    color: [PAPER, MUTED, INK],
    // Draws once and holds. This language forbids looping animation.
    animationDuration: 900,
    animationEasing: 'quarticOut',
    textStyle: { fontFamily: SANS },
    tooltip: { show: false },

    grid: { left: 88, right: 26, top: 24, bottom: 46 },

    xAxis: {
      type: 'value',
      min: 0,
      max: MAX_HOURS,
      splitLine: { show: false },
      axisLine: { lineStyle: { color: QUIET, width: 0.8 } },
      axisTick: { show: true, length: 4, lineStyle: { color: QUIET, width: 0.6 } },
      axisLabel: {
        color: MUTED,
        fontFamily: SANS,
        fontSize: 7,
        fontWeight: 600,
        formatter: (v: number) => `${v}h`,
      },
    },
    yAxis: {
      type: 'value',
      min: -0.1,
      max: rows - 1 + LIFT + 0.15,
      splitLine: { show: false },
      axisLine: { show: false },
      axisTick: { show: false },
      // One label per row, placed at the row's own baseline.
      interval: 1,
      axisLabel: {
        color: LABEL,
        fontFamily: SANS,
        fontSize: 8,
        fontWeight: 700,
        margin: 12,
        formatter: (v: number) => pipelines[rows - 1 - v]?.[0] ?? '',
      },
    },

    series,

    graphic: [
      {
        type: 'text',
        left: 'center',
        bottom: 6,
        style: {
          text: 'EACH CREST IS MADE OF HAIRLINES · ONE ROW = ONE PIPELINE',
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

export function Ridgeline({ pipelines = PIPELINES }: { pipelines?: readonly Pipeline[] }) {
  const option = useMemo(() => buildOption(pipelines), [pipelines]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-ridgeline">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
