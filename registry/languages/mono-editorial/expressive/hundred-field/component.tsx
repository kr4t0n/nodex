/**
 * A hundred people, four dispositions — mono-editorial
 *
 * Four shares of a survey, decomposed into the hundred people they describe.
 * Each cluster is a phyllotaxis disc — the golden angle again — so a share is
 * countable rather than merely readable, and the discs pack evenly without any
 * dot landing on top of another.
 *
 * This is the language's central claim at its most literal: 41% is drawn as
 * forty-one people. A bar would be quicker to read and would have thrown away
 * the only thing worth showing.
 *
 * Dashed hairlines tie the four cluster cores, so the set reads as one survey
 * rather than as four unrelated fields.
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

/** One row per disposition: `[name, percent, tone]`. Shares total a hundred. */
export type Segment = readonly [name: string, percent: number, tone: string];

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const DEEP = '#55554F';
const MUTED = '#8F8E88';
const QUIET = '#B0AFA9';
const GRID = '#DEDDD6';
const LABEL = '#6A6963';

export const SEGMENTS: readonly Segment[] = [
  ['CHARGED', 41, INK],
  ['TORN', 35, DEEP],
  ['ADRIFT', 12, MUTED],
  ['AVERSE', 12, QUIET],
];

/** Where each cluster's core sits. */
const CORES: readonly (readonly [number, number])[] = [
  [-72, 26],
  [72, 50],
  [-18, -86],
  [118, -72],
];

/** Which cores are tied together, so the four read as one survey. */
const TIES: readonly (readonly [number, number])[] = [
  [0, 1],
  [0, 2],
  [1, 3],
  [2, 3],
];

/**
 * The golden angle. Successive dots land in the largest remaining gap, so a
 * disc packs evenly and no two people sit on top of each other.
 */
const GOLDEN = 137.508;

const SANS = "'Inter', sans-serif";

const at = (cx: number, cy: number, r: number, deg: number): [number, number] => {
  const rad = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
};

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(segments: readonly Segment[] = SEGMENTS): EChartsOption {
  const people = segments.map(() => [] as { value: [number, number]; symbolSize: number }[]);
  const spokes: ([number, number] | null)[] = [];

  segments.forEach(([, percent], ci) => {
    const core = CORES[ci] ?? [0, 0];
    for (let k = 0; k < percent; k++) {
      // sqrt(k) keeps the area per dot constant, which is what makes the disc
      // pack evenly instead of crowding at the centre.
      const radius = 4 + Math.sqrt(k) * 5.9 + rnd(k + 1, ci + 2) * 3;
      const [x, y] = at(core[0], core[1], radius, k * GOLDEN + ci * 55);
      people[ci]?.push({ value: [x, y], symbolSize: 4.4 });
      // A spoke every fifth person, so a disc can be counted in fives.
      if (k % 5 === 0) spokes.push([core[0], core[1]], [x, y], null);
    }
  });

  const ties: ([number, number] | null)[] = [];
  TIES.forEach(([a, b]) => {
    const from = CORES[a] ?? [0, 0];
    const to = CORES[b] ?? [0, 0];
    ties.push([from[0], from[1]], [to[0], to[1]], null);
  });

  return {
    color: [GRID, GRID, ...segments.map((s) => s[2]), INK],
    // Draws once and holds. This language forbids looping animation.
    animationDuration: 900,
    animationEasing: 'quarticOut',
    animationDelay: (i: number) => i * 6,
    textStyle: { fontFamily: SANS },

    tooltip: {
      backgroundColor: INK,
      borderWidth: 0,
      padding: [10, 14],
      textStyle: { color: PAPER, fontFamily: SANS, fontSize: 12 },
      formatter: (p: CallbackDataParams | CallbackDataParams[]) => {
        const hit = Array.isArray(p) ? p[0] : p;
        const segment = segments[(hit?.seriesIndex ?? 2) - 2];
        return segment ? `${segment[0]} — ${segment[1]} people in a hundred` : '';
      },
    },

    grid: { left: 20, right: 20, top: 20, bottom: 40 },

    xAxis: { show: false, type: 'value', min: -180, max: 210 },
    yAxis: { show: false, type: 'value', min: -150, max: 130 },

    series: [
      {
        // The constellation tying the four cores.
        type: 'line',
        data: ties,
        symbol: 'none',
        // Hairline, well under the language's 1.4px ceiling.
        lineStyle: { color: GRID, width: 0.7, type: [2, 5] },
        silent: true,
        z: 1,
      },
      {
        // A spoke every fifth person.
        type: 'line',
        data: spokes,
        symbol: 'none',
        lineStyle: { color: GRID, width: 0.5 },
        silent: true,
        z: 2,
      },
      ...segments.map(([name, , tone], ci) => ({
        type: 'scatter' as const,
        name,
        data: people[ci] ?? [],
        itemStyle: { color: tone },
        z: 3,
      })),
      {
        // Each cluster named and counted, beneath its own disc.
        type: 'scatter' as const,
        symbolSize: 0,
        silent: true,
        z: 4,
        data: segments.map(([name, percent], ci) => ({
          value: [CORES[ci]?.[0] ?? 0, (CORES[ci]?.[1] ?? 0) - 46],
          name: `${name} ${percent}`,
        })),
        label: {
          show: true,
          position: 'bottom' as const,
          color: LABEL,
          fontFamily: SANS,
          fontSize: 7.5,
          fontWeight: 700,
          formatter: (p: CallbackDataParams) => String(p.name ?? ''),
        },
      },
    ],

    // What one mark represents.
    graphic: [
      {
        type: 'text',
        left: 'center',
        bottom: 4,
        style: {
          text: 'ONE DOT = ONE PERSON IN A HUNDRED · SPOKE MARKS EVERY FIFTH',
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

export function HundredField({ segments = SEGMENTS }: { segments?: readonly Segment[] }) {
  const option = useMemo(() => buildOption(segments), [segments]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-hundred-field">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
