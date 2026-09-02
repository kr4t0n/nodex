/**
 * Releases by team, one tick per release — mono-editorial
 *
 * A unit chart lying down. Every release is a tick, so a row is counted rather
 * than measured, and a dot under every fifth tick gives the eye a place to
 * count from. The figure at the end of each row is for readers who would
 * rather not count.
 *
 * Drawn as a scatter with one mark per release rather than as a repeated
 * symbol, because each tick varies slightly in height and weight. That
 * variation is what makes a row read as a tally instead of as a bar.
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

/** One row per team: `[team, releases]`. Each release becomes one tick. */
export type Team = readonly [team: string, releases: number];

export const TEAMS: readonly Team[] = [
  ['PLATFORM', 34],
  ['GROWTH', 28],
  ['MOBILE', 22],
  ['INFRA', 17],
  ['ML', 11],
  ['DESIGN', 8],
];

/** A dot under every fifth tick, so a long row can be counted in fives. */
const EVERY = 5;

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const GRID = '#DEDDD6';
const FAINT = '#C6C5BF';
const QUIET = '#B0AFA9';
const LABEL = '#6A6963';

const SANS = "'Inter', sans-serif";

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(teams: readonly Team[] = TEAMS): EChartsOption {
  const ticks: {
    value: [number, number];
    symbolSize: [number, number];
    itemStyle: { color: string; opacity: number };
  }[] = [];
  const fifths: [number, number][] = [];

  teams.forEach(([, releases], i) => {
    for (let k = 0; k < releases; k++) {
      ticks.push({
        value: [k + 1, i],
        // Each tick a little different, so the row reads as a tally.
        symbolSize: [0.9, 9 + rnd(k + 1, i + 2) * 6],
        itemStyle: { color: INK, opacity: 0.55 + rnd(k + 3, i + 5) * 0.45 },
      });
      if (k % EVERY === EVERY - 1) fifths.push([k + 1, i]);
    }
  });

  const longest = Math.max(...teams.map(([, releases]) => releases));

  return {
    // The language's ramp *is* the palette. Without this ECharts assigns any
    // series that does not set its own colour from its default theme.
    color: [INK, FAINT, INK],
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
        const [, i] = hit.value as [number, number];
        const team = teams[i];
        return team ? `${team[0]} — ${team[1]} releases` : '';
      },
    },

    grid: { left: 84, right: 46, top: 22, bottom: 46 },

    // The ticks are the scale, so a numeric axis under them would be a second
    // way of saying the same thing.
    xAxis: { show: false, min: 0, max: longest + 2 },
    yAxis: {
      type: 'category',
      data: teams.map(([team]) => team),
      inverse: true,
      // A rule under each row, so a short row still has a baseline to sit on.
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: true, lineStyle: { color: GRID, width: 0.6 } },
      axisLabel: {
        color: LABEL,
        fontFamily: SANS,
        fontSize: 8,
        fontWeight: 700,
        margin: 12,
      },
    },

    series: [
      {
        // The ticks. One mark per release.
        type: 'scatter',
        symbol: 'rect',
        data: ticks,
        z: 2,
      },
      {
        // The counting dots, sitting just under the row.
        type: 'scatter',
        symbol: 'circle',
        symbolSize: 1.6,
        symbolOffset: [0, 11],
        itemStyle: { color: FAINT },
        data: fifths,
        silent: true,
        z: 3,
      },
      {
        // The total, past the end of each row.
        type: 'scatter',
        symbolSize: 0,
        silent: true,
        data: teams.map(([, releases], i) => ({ value: [releases + 1, i] })),
        label: {
          show: true,
          position: 'right',
          distance: 4,
          color: INK,
          fontFamily: SANS,
          fontSize: 11,
          fontWeight: 800,
          formatter: (p: CallbackDataParams) => {
            const [, i] = p.value as [number, number];
            return String(teams[i]?.[1] ?? '');
          },
        },
      },
    ],

    // What one mark represents.
    graphic: [
      {
        type: 'text',
        left: 'center',
        bottom: 6,
        style: {
          text: 'ONE TICK = ONE RELEASE · DOT MARKS EVERY FIFTH',
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

export function TickRows({ teams = TEAMS }: { teams?: readonly Team[] }) {
  const option = useMemo(() => buildOption(teams), [teams]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-tick-rows">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
