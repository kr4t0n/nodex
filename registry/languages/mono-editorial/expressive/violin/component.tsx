/**
 * Time to first reply, four plans — mono-editorial
 *
 * Violins: the width at any height is how many tickets were answered in that
 * hour. Where a boxplot gives five numbers, this gives the shape — and the
 * shape is the finding, because the slower plans are not merely slower, they
 * are bimodal.
 *
 * **ECharts has no violin series.** This is a custom series drawing one closed
 * polygon per plan, with the outline computed from a kernel density estimate
 * and mirrored about the column. That is more code than a native series would
 * be, and it is the right trade here: the alternative is a boxplot, which
 * would delete the second hump this chart exists to show.
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

/** One row per plan: `[plan, centreHours, spread]`. */
export type Plan = readonly [plan: string, centreHours: number, spread: number];

export const PLANS: readonly Plan[] = [
  ['ENT', 1.6, 0.8],
  ['PRO', 3.4, 1.6],
  ['STARTER', 6.2, 2.6],
  ['FREE', 9.5, 4.2],
];

/** Tickets sampled per plan. */
const SAMPLES = 64;

/** The scale's ceiling, in hours. */
const MAX_HOURS = 17;

/** How many steps describe each violin's outline. */
const RESOLUTION = 48;

/**
 * Half-width of the widest violin, as a fraction of its own column.
 *
 * `api.size([1, 0])` gives the column width in pixels, so this is a real
 * proportion rather than a magic number: at 0.32 a violin fills about two
 * thirds of its column and the gaps stay wider than the bellies.
 */
const HALF_WIDTH = 0.32;

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const MUTED = '#8F8E88';
const RULE = '#E3E2DB';
const QUIET = '#B0AFA9';

/** Darkest is fastest. Rank, not category. */
const TONES = ['#1C1C1A', '#4A4944', '#8F8E88', '#B0AFA9'];

const SANS = "'Inter', sans-serif";

/**
 * Reply times for one plan.
 *
 * Three hashes summed, which is a cheap way to a bell that still has a tail —
 * and the tail is what makes the slower plans bimodal.
 */
export function samples(plan: Plan, g: number): number[] {
  const [, centre, spread] = plan;
  return Array.from({ length: SAMPLES }, (_, i) => {
    const noise = rnd(i + 1, g * 3 + 1) + rnd(i + 7, g * 3 + 2) + rnd(i + 13, g * 3 + 3);
    return Math.max(0.2, centre + spread * (noise - 1.5));
  }).sort((a, b) => a - b);
}

/** A kernel density estimate over the fixed scale, normalised to its own peak. */
export function density(values: readonly number[], bandwidth: number): number[] {
  const raw = Array.from({ length: RESOLUTION }, (_, k) => {
    const h = (k / (RESOLUTION - 1)) * MAX_HOURS;
    return values.reduce(
      (sum, v) => sum + Math.exp(-((h - v) ** 2) / (2 * bandwidth * bandwidth)),
      0,
    );
  });
  const peak = Math.max(...raw);
  return raw.map((d) => d / peak);
}

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(plans: readonly Plan[] = PLANS): EChartsOption {
  const shapes = plans.map((plan, g) => {
    const values = samples(plan, g);
    // A fuller bandwidth than the spread, which gives the classic rounded
    // belly rather than a spindle full of sampling noise.
    const curve = density(values, Math.max(0.9, plan[2] * 0.62));
    return {
      plan: plan[0],
      median: values[Math.floor(values.length / 2)] ?? 0,
      curve,
      tone: TONES[g] ?? INK,
    };
  });

  return {
    color: TONES,
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
        const shape = shapes[hit?.dataIndex ?? 0];
        return shape ? `${shape.plan} — median ${shape.median.toFixed(1)}h` : '';
      },
    },

    grid: { left: 44, right: 26, top: 30, bottom: 46 },

    xAxis: {
      type: 'category',
      data: shapes.map((s) => s.plan),
      boundaryGap: true,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: MUTED, fontFamily: SANS, fontSize: 7.5, fontWeight: 700 },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: MAX_HOURS,
      interval: 4,
      splitLine: { lineStyle: { color: RULE, width: 0.8 } },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: MUTED,
        fontFamily: SANS,
        fontSize: 7.5,
        fontWeight: 600,
        formatter: (v: number) => `${v}h`,
      },
    },

    series: [
      {
        // One closed polygon per plan, mirrored about its own column.
        type: 'custom',
        data: shapes.map((_, i) => i),
        z: 2,
        renderItem: (
          params: CustomSeriesRenderItemParams,
          api: CustomSeriesRenderItemAPI,
        ): CustomSeriesRenderItemReturn => {
          const shape = shapes[params.dataIndex];
          if (!shape) return { type: 'group', children: [] };

          // A category axis snaps api.coord to whole indices, so a fractional
          // offset collapses to zero. api.size gives the band's real width in
          // pixels, which is the only way to place anything within a column.
          const band = (api.size?.([1, 0]) as [number, number] | undefined)?.[0] ?? 0;
          const right: [number, number][] = [];
          const left: [number, number][] = [];
          shape.curve.forEach((d, k) => {
            const hours = (k / (RESOLUTION - 1)) * MAX_HOURS;
            const centre = api.coord([params.dataIndex, hours]) as [number, number];
            const half = d * HALF_WIDTH * band;
            right.push([centre[0] + half, centre[1]]);
            left.push([centre[0] - half, centre[1]]);
          });

          return {
            type: 'polygon',
            shape: { points: [...right, ...left.reverse()] },
            style: { fill: shape.tone },
          };
        },
      },
      {
        // The median, knocked out across the belly. Ink would vanish on the
        // darkest violin, which is the one a reader looks at first.
        type: 'custom',
        data: shapes.map((_, i) => i),
        z: 3,
        silent: true,
        renderItem: (
          params: CustomSeriesRenderItemParams,
          api: CustomSeriesRenderItemAPI,
        ): CustomSeriesRenderItemReturn => {
          const shape = shapes[params.dataIndex];
          if (!shape) return { type: 'group', children: [] };
          const band = (api.size?.([1, 0]) as [number, number] | undefined)?.[0] ?? 0;
          const centre = api.coord([params.dataIndex, shape.median]) as [number, number];
          const half = HALF_WIDTH * band * 0.55;
          return {
            type: 'line',
            shape: { x1: centre[0] - half, y1: centre[1], x2: centre[0] + half, y2: centre[1] },
            // `fill: 'none'` is not optional: a shape with no fill set is
            // given ZRender's default black, which paints nothing on a line
            // but does put an off-ramp colour in the rendered file.
            style: { fill: 'none', stroke: PAPER, lineWidth: 2.2 },
          };
        },
      },
      {
        // The median as a figure too, beside the violin rather than on it.
        type: 'scatter',
        symbolSize: 0,
        silent: true,
        z: 4,
        data: shapes.map((s, i) => ({ value: [i, s.median] })),
        label: {
          show: true,
          position: 'right',
          distance: 22,
          color: INK,
          fontFamily: SANS,
          fontSize: 9,
          fontWeight: 800,
          formatter: (p: CallbackDataParams) => {
            const [, median] = p.value as [number, number];
            return `${median.toFixed(1)}h`;
          },
        },
      },
    ],

    graphic: [
      {
        type: 'text',
        left: 'center',
        bottom: 6,
        style: {
          text: 'WIDTH = HOW MANY TICKETS · KNOCKED-OUT RULE = THE MEDIAN',
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

export function Violin({ plans = PLANS }: { plans?: readonly Plan[] }) {
  const option = useMemo(() => buildOption(plans), [plans]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-violin">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
