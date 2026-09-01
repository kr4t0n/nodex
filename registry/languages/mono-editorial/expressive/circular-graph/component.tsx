/**
 * Who works with whom — mono-editorial
 *
 * Ten teams on a ring, with a chord for every working relationship. Node area
 * is headcount, chord width is how much traffic runs between the pair, and the
 * tone ladder separates the four largest teams from the rest.
 *
 * A ring rather than a force layout, because the question here is *which pairs
 * are connected*, and a ring puts every node at a fixed, comparable distance
 * from every other. A force layout would answer a different question — which
 * clusters exist — by letting distance mean something.
 *
 * `buildOption` is pure and exported, so the build server-renders it to a
 * static preview and the conformance lint reads the marks it really produces.
 */
import { useEffect, useMemo, useRef } from 'react';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts/types/dist/shared';

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

/** One row per team: `[team, headcount]`. */
export type Team = readonly [team: string, headcount: number];

/** One row per relationship: `[fromIndex, toIndex, weeklyThreads]`. */
export type Tie = readonly [from: number, to: number, threads: number];

export const TEAMS: readonly Team[] = [
  ['Product', 52],
  ['Design', 38],
  ['Frontend', 46],
  ['Backend', 44],
  ['Data', 30],
  ['Growth', 34],
  ['Support', 22],
  ['Ops', 18],
  ['Legal', 9],
  ['Finance', 12],
];

export const TIES: readonly Tie[] = [
  [0, 1, 9], [0, 2, 8], [0, 3, 7], [1, 2, 9],
  [2, 3, 6], [3, 4, 7], [0, 5, 6], [5, 4, 5],
  [5, 6, 4], [6, 2, 3], [7, 3, 4], [7, 9, 3],
  [8, 9, 2], [0, 8, 2], [4, 2, 4], [1, 5, 3],
];

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const MUTED = '#8F8E88';
const QUIET = '#B0AFA9';
const LABEL = '#6A6963';

const SANS = "'Inter', sans-serif";

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(
  teams: readonly Team[],
  ties: readonly Tie[],
): EChartsOption {
  return {
    // Draws once and holds. This language forbids looping animation.
    animationDuration: 1200,
    animationEasing: 'quarticOut',
    textStyle: { fontFamily: SANS },

    tooltip: {
      backgroundColor: INK,
      borderWidth: 0,
      padding: [10, 14],
      textStyle: { color: PAPER, fontFamily: SANS, fontSize: 12 },
    },

    series: [
      {
        type: 'graph',
        layout: 'circular',
        // Labels stay upright. Rotating them to follow the ring makes half of
        // them upside down, which is decoration bought with legibility.
        circular: { rotateLabel: false },
        left: 52,
        right: 52,
        top: 34,
        bottom: 34,
        data: teams.map(([name, headcount], i) => ({
          name,
          value: headcount,
          symbolSize: headcount * 0.62,
          // Three bands rather than ten tones: the ladder is separating scale
          // of team here, not ranking every one against every other.
          itemStyle: { color: i < 4 ? INK : i < 8 ? MUTED : QUIET, borderWidth: 0 },
          label: {
            show: true,
            position: 'right',
            distance: 7,
            color: LABEL,
            fontFamily: SANS,
            fontSize: 9.5,
            fontWeight: 600,
          },
        })),
        links: ties.map(([from, to, threads]) => ({
          source: from,
          target: to,
          lineStyle: {
            // The width *is* the quantity, which is why this component declares
            // strokeAsArea: thinning these to the hairline ceiling would delete
            // the edge weights the chart exists to show.
            width: threads * 0.7,
            color: QUIET,
            opacity: 0.55,
            curveness: 0.28,
          },
        })),
        // Hovering a team lifts its own ties out of the weave, which is the
        // only way a sixteen-chord ring stays readable.
        emphasis: { focus: 'adjacency', lineStyle: { color: INK, opacity: 0.8 } },
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
export const previewOption = (): EChartsOption => buildOption(TEAMS, TIES);

export function CircularGraph({
  teams = TEAMS,
  ties = TIES,
}: {
  teams?: readonly Team[];
  ties?: readonly Tie[];
}) {
  const option = useMemo(() => buildOption(teams, ties), [teams, ties]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-circular-graph">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
