/**
 * The contributor field — mono-editorial
 *
 * One hub and five satellite islands. Eighty core contributors radiate from
 * the hub on a golden-angle spiral, so the spokes fill the disc evenly without
 * ever aligning into spurious rays. Each island has its own smaller swarm, and
 * a dotted arc marks the people who work across both.
 *
 * Positions are computed rather than simulated. A force layout would drift on
 * every render and settle differently each time; here every mark is a function
 * of its index, so the field is identical in a preview, a screenshot and a
 * consumer's app.
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

/** One island: where it sits, what it is, and how many people are on it. */
export type Island = readonly [x: number, y: number, name: string, people: number];

export const ISLANDS: readonly Island[] = [
  [322, 94, 'PLUGINS', 22],
  [406, -42, 'THEMES', 16],
  [240, -96, 'DOCS', 13],
  [-208, 100, 'FORKS', 12],
  [474, 114, 'MIRRORS', 9],
];

/** People on the main repository. */
export const CORE = 80;

/**
 * The golden angle. Successive spokes land in the largest remaining gap, so
 * eighty of them cover the disc evenly and never line up into false spokes.
 */
const GOLDEN = 137.508;

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const MUTED = '#8F8E88';
const GRID = '#DEDDD6';
const FAINT = '#C6C5BF';
const LABEL = '#6A6963';

const SANS = "'Inter', sans-serif";

const at = (cx: number, cy: number, r: number, deg: number): [number, number] => {
  const rad = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
};

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(islands: readonly Island[] = ISLANDS): EChartsOption {
  const spokes: ([number, number] | null)[] = [];
  const people: { value: [number, number]; symbolSize: number }[] = [];

  for (let i = 0; i < CORE; i++) {
    const length = 28 + rnd(i + 1, 7) * 88;
    const [x, y] = at(0, 0, length, i * GOLDEN);
    spokes.push([0, 0], [x, y], null);
    people.push({ value: [x, y], symbolSize: 3.2 + rnd(i + 1, 4) * 3.6 });
  }

  const islanders: { value: [number, number]; symbolSize: number }[] = [];
  const bridges: ([number, number] | null)[] = [];

  islands.forEach(([ix, iy, , count], ci) => {
    for (let k = 0; k < count; k++) {
      const length = 8 + rnd(k + 1, ci + 3) * 30;
      const [x, y] = at(ix, iy, length, k * GOLDEN + ci * 40);
      islanders.push({ value: [x, y], symbolSize: 2.4 + rnd(k + 2, ci + 5) * 2.4 });
    }
    // The people who work on both. A curve rather than a straight line, so it
    // reads as a relationship rather than as a structural edge.
    const steps = 18;
    for (let t = 0; t <= steps; t++) {
      const u = t / steps;
      const mx = (0 + ix) / 2;
      const my = (0 + iy) / 2 + 42;
      const x = (1 - u) ** 2 * 0 + 2 * (1 - u) * u * mx + u * u * ix;
      const y = (1 - u) ** 2 * 0 + 2 * (1 - u) * u * my + u * u * iy;
      bridges.push([x, y]);
    }
    bridges.push(null);
  });

  return {
    color: [FAINT, GRID, INK, MUTED, INK],
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
        return hit?.seriesIndex === 2 ? 'a core contributor' : 'an island contributor';
      },
    },

    grid: { left: 16, right: 16, top: 16, bottom: 34 },

    xAxis: { show: false, type: 'value', min: -280, max: 560 },
    yAxis: { show: false, type: 'value', min: -170, max: 200 },

    series: [
      {
        // The hub's spokes.
        type: 'line',
        data: spokes,
        symbol: 'none',
        // Hairline, well under the language's 1.4px ceiling.
        lineStyle: { color: FAINT, width: 0.6 },
        silent: true,
        z: 1,
      },
      {
        // Cross-contribution: dotted, because it is a softer fact than
        // membership and should not read as structure.
        type: 'line',
        data: bridges,
        symbol: 'none',
        lineStyle: { color: GRID, width: 0.9, type: [2, 4] },
        silent: true,
        z: 2,
      },
      {
        // The core.
        type: 'scatter',
        data: people,
        itemStyle: { color: INK, opacity: 0.85 },
        z: 3,
      },
      {
        // The islands.
        type: 'scatter',
        data: islanders,
        itemStyle: { color: MUTED, opacity: 0.8 },
        z: 3,
      },
      {
        // Island names, set on the island rather than in a legend.
        type: 'scatter',
        symbolSize: 0,
        silent: true,
        data: islands.map(([x, y, name, count]) => ({ value: [x, y], name: `${name} ${count}` })),
        label: {
          show: true,
          position: 'bottom',
          distance: 26,
          color: LABEL,
          fontFamily: SANS,
          fontSize: 7.5,
          fontWeight: 700,
          formatter: (p: CallbackDataParams) => String(p.name ?? ''),
        },
        z: 4,
      },
    ],

    graphic: [
      {
        type: 'text',
        left: 'center',
        bottom: 4,
        style: {
          text: 'ONE DOT = ONE CONTRIBUTOR · DOTTED ARC = WORKS ON BOTH',
          font: `600 7px ${SANS}`,
          fill: MUTED,
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

export function ClusterField({ islands = ISLANDS }: { islands?: readonly Island[] }) {
  const option = useMemo(() => buildOption(islands), [islands]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-cluster-field">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
