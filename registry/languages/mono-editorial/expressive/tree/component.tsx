/**
 * The platform, by area and feature — mono-editorial
 *
 * An orthogonal tree read left to right. Each branch and everything hanging
 * from it share one tone, so a subtree is legible as a subtree without a
 * bounding box or a fill — which is the only grouping device a language with no
 * accent colour has.
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

/** One area of the platform and the features under it. */
export interface Area {
  readonly name: string;
  readonly features: readonly string[];
}

export const ROOT = 'Platform';

export const AREAS: readonly Area[] = [
  { name: 'Editor', features: ['Blocks', 'Tables', 'Comments', 'History'] },
  { name: 'Automate', features: ['Workflows', 'Triggers', 'Webhooks'] },
  { name: 'Collaborate', features: ['Spaces', 'Guests', 'Mentions'] },
  { name: 'Integrate', features: ['API', 'Slack', 'GitHub'] },
];

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const MUTED = '#8F8E88';
const FAINT = '#C6C5BF';
const LABEL = '#6A6963';
// One tone per area, walked in order. Ordering carries no meaning here, so the
// ladder is used for separation rather than for rank.
const LADDER = ['#1C1C1A', '#4A4944', '#6A6963', '#8F8E88', '#B0AFA9', '#C6C5BF'];

const SANS = "'Inter', sans-serif";

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(areas: readonly Area[], root = ROOT): EChartsOption {
  const branch = (area: Area, tone: string) => ({
    name: area.name,
    itemStyle: { color: tone },
    lineStyle: { color: tone },
    children: area.features.map((feature) => ({
      name: feature,
      itemStyle: { color: tone },
      lineStyle: { color: tone },
    })),
  });

  return {
    color: LADDER,
    // Draws once and holds. This language forbids looping animation.
    animationDuration: 1100,
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
        type: 'tree',
        layout: 'orthogonal',
        orient: 'LR',
        left: 64,
        right: 96,
        top: 8,
        bottom: 8,
        symbol: 'circle',
        symbolSize: 7,
        initialTreeDepth: 2,
        // A static diagram, not an explorer. Collapsing branches would hide
        // the shape the chart exists to show.
        expandAndCollapse: false,
        roam: false,
        itemStyle: { borderWidth: 0 },
        // At the language's 1.4px ceiling: a connector is a line.
        lineStyle: { width: 1.4, curveness: 0.5 },
        label: {
          fontFamily: SANS,
          fontSize: 10,
          fontWeight: 600,
          color: LABEL,
          position: 'left',
        },
        // Leaves label to the right so they read outward, away from the trunk.
        leaves: { label: { position: 'right', color: MUTED, fontWeight: 500 } },
        data: [
          {
            name: root,
            itemStyle: { color: INK },
            lineStyle: { color: FAINT },
            label: { fontSize: 11.5, color: INK },
            children: areas.map((area, i) =>
              branch(area, LADDER[Math.min(LADDER.length - 1, i)] ?? INK),
            ),
          },
        ],
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
export const previewOption = (): EChartsOption => buildOption(AREAS);

export function Tree({ areas = AREAS, root = ROOT }: { areas?: readonly Area[]; root?: string }) {
  const option = useMemo(() => buildOption(areas, root), [areas, root]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-tree">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
