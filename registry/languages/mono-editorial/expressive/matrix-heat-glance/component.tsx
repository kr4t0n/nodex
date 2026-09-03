/**
 * Feature adoption across five releases — mono-editorial
 *
 * Thirty cells, every one carrying its own figure. Where `matrix-heat` is a
 * field to be read as a shape, this is a table to be read as numbers — the
 * tone puts the falling-off pattern in front of you and the figure answers the
 * follow-up without a hover.
 *
 * A figure on a dark cell knocks out to paper. That is not styling: at these
 * band tones, ink on the darkest two is unreadable, and a chart whose labels
 * disappear on its own strongest values has thrown away its best rows.
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

export const FEATURES = ['EDITOR', 'BOARDS', 'DOCS', 'CHAT', 'FLOWS', 'VAULT'] as const;
export const RELEASES = ['v2.0', 'v1.9', 'v1.8', 'v1.7', 'v1.6'] as const;

/** Adoption on the newest release, which every older one is measured against. */
const BASELINE = [88, 74, 61, 42, 35, 27];

/**
 * Share of accounts using each feature on each release, generated.
 *
 * Adoption decays as a release ages, faster for the features that were never
 * popular. That decay is the shape the chart exists to show.
 */
export const ADOPTION: readonly (readonly number[])[] = RELEASES.map((_, r) =>
  FEATURES.map((__, c) =>
    Math.max(
      2,
      Math.round(
        (BASELINE[c] ?? 0) - r * (6 + c * 0.8) + (rnd(r * 6 + c + 1, c + 3) - 0.5) * 10,
      ),
    ),
  ),
);

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const MUTED = '#8F8E88';
const QUIET = '#B0AFA9';
const LABEL = '#6A6963';

/** Five countable bands, darkest strongest. */
const BANDS = ['#D8D7D1', '#B0AFA9', '#8F8E88', '#4A4944', '#1C1C1A'];

/** Above this, the cell is dark enough that its figure must knock out. */
const KNOCKOUT_AT = 46;

const SANS = "'Inter', sans-serif";

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(
  adoption: readonly (readonly number[])[] = ADOPTION,
): EChartsOption {
  const cells = adoption.flatMap((row, r) =>
    row.map((v, c) => ({
      value: [c, r, v] as [number, number, number],
      // Per-cell rather than per-series, because the label's colour depends on
      // the band underneath it and a series-wide colour cannot know that.
      label: { color: v > KNOCKOUT_AT ? PAPER : INK },
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
        const [c, r, v] = hit.value as [number, number, number];
        return `${FEATURES[c]} on ${RELEASES[r]} — ${v}% of accounts`;
      },
    },

    grid: { left: 60, right: 18, top: 40, bottom: 44 },

    xAxis: {
      type: 'category',
      data: [...FEATURES],
      position: 'top',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { color: MUTED, fontFamily: SANS, fontSize: 6.5, fontWeight: 700 },
    },
    yAxis: {
      type: 'category',
      data: [...RELEASES],
      inverse: true,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { color: LABEL, fontFamily: SANS, fontSize: 8.5, fontWeight: 700 },
    },

    visualMap: {
      type: 'piecewise',
      show: false,
      pieces: [
        { max: 15 },
        { min: 16, max: 30 },
        { min: 31, max: 46 },
        { min: 47, max: 64 },
        { min: 65 },
      ],
      inRange: { color: BANDS },
      seriesIndex: 0,
    },

    series: [
      {
        type: 'heatmap',
        data: cells,
        // A generous radius and a gap in the page colour, so the grid reads as
        // thirty separate readings rather than as one ruled table.
        itemStyle: { borderRadius: 9, borderColor: PAPER, borderWidth: 3 },
        label: {
          show: true,
          fontFamily: SANS,
          fontSize: 10.5,
          fontWeight: 800,
          formatter: (p: CallbackDataParams) => {
            const [, , v] = p.value as [number, number, number];
            return String(v);
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
          text: 'SHARE OF ACCOUNTS USING EACH FEATURE, BY RELEASE',
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

export function MatrixHeatGlance({
  adoption = ADOPTION,
}: {
  adoption?: readonly (readonly number[])[];
}) {
  const option = useMemo(() => buildOption(adoption), [adoption]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-matrix-heat-glance">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
