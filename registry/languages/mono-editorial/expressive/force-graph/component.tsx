/**
 * What talks to the Core API — mono-editorial
 *
 * A force layout, so distance carries meaning: the twelve integrations settle
 * around the hub at a remove set by how much traffic they push through it, and
 * the four app-to-app side roads pull their pairs together. Node area is
 * monthly syncs.
 *
 * **The layout is seeded, and that is load-bearing.** ECharts starts a force
 * simulation from random positions, so the same data lays out differently on
 * every render — a preview would change on every build and no screenshot of it
 * would reproduce. Giving each node a starting `x`/`y` from the same
 * deterministic hash the rest of the corpus uses makes the simulation settle
 * identically every time, while staying a real force layout that can still be
 * dragged in a browser.
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

/**
 * A deterministic hash, not `Math.random()`.
 *
 * Sample data must not change between page loads, or a preview and a
 * screenshot of it stop agreeing. Never swap this for a random source.
 */
const rnd = (i: number, k: number) =>
  (((i * 73856093) ^ (k * 19349663)) % 1000) / 1000;

/**
 * One row per service: `[name, syncsPerMonthK, tier]`.
 *
 * Tier 0 is the hub, 1 is a first-party integration, 2 is everything else.
 */
export type Service = readonly [name: string, syncsK: number, tier: number];

export const HUB = 'Core API';

export const SERVICES: readonly Service[] = [
  [HUB, 52, 0],
  ['Slack', 34, 1],
  ['GitHub', 30, 1],
  ['Figma', 22, 1],
  ['Notion', 26, 1],
  ['Linear', 18, 1],
  ['Drive', 16, 1],
  ['Zoom', 10, 2],
  ['Jira', 14, 2],
  ['Sheets', 12, 2],
  ['Intercom', 8, 2],
  ['Stripe', 20, 1],
  ['Segment', 9, 2],
];

/** Connections that do not go through the hub. */
export const SIDE_ROADS: readonly (readonly [string, string])[] = [
  ['Slack', 'GitHub'],
  ['GitHub', 'Linear'],
  ['Figma', 'Notion'],
  ['Stripe', 'Sheets'],
];

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const MUTED = '#8F8E88';
const QUIET = '#B0AFA9';
const FAINT = '#C6C5BF';
const LABEL = '#6A6963';

const SANS = "'Inter', sans-serif";

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(
  services: readonly Service[],
  sideRoads: readonly (readonly [string, string])[] = SIDE_ROADS,
): EChartsOption {
  const tone = (tier: number) => (tier === 0 ? INK : tier === 1 ? LABEL : QUIET);

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
      formatter: (p: CallbackDataParams | CallbackDataParams[]) => {
        const hit = Array.isArray(p) ? p[0] : p;
        if (!hit || hit.dataType !== 'node') return '';
        return `${hit.name} — ${hit.value as number}k syncs/mo`;
      },
    },

    series: [
      {
        type: 'graph',
        layout: 'force',
        force: { repulsion: 220, edgeLength: [36, 110], gravity: 0.12, friction: 0.18 },
        roam: false,
        draggable: true,
        left: 14,
        right: 14,
        top: 14,
        bottom: 14,
        data: services.map(([name, syncs, tier], i) => ({
          name,
          value: syncs,
          symbolSize: 8 + syncs * 0.75,
          // Seeded start. Without these the simulation begins from random
          // positions and the same data lays out differently every render.
          x: 60 + rnd(i + 1, 3) * 260,
          y: 40 + rnd(i + 5, 7) * 200,
          itemStyle: { color: tone(tier) },
          label: {
            show: true,
            position: 'right',
            distance: 6,
            color: tier === 0 ? INK : MUTED,
            fontFamily: SANS,
            fontSize: tier === 0 ? 10.5 : 9,
            fontWeight: tier === 0 ? 800 : 600,
          },
        })),
        links: [
          ...services
            .filter(([name]) => name !== HUB)
            .map(([name, syncs]) => ({
              source: name,
              target: HUB,
              lineStyle: {
                // The width *is* the quantity, which is why this component
                // declares strokeAsArea: thinning these to the hairline ceiling
                // would delete the traffic volumes the chart exists to show.
                width: Math.max(0.8, syncs * 0.09),
                color: QUIET,
                opacity: 0.6,
              },
            })),
          ...sideRoads.map(([source, target]) => ({
            source,
            target,
            // Uniform and paler: a side road is a fact about topology, not a
            // quantity, so it must not read as a measured width.
            lineStyle: { width: 1.2, color: FAINT, opacity: 0.5 },
          })),
        ],
        // Hovering a service lifts its own edges out of the weave.
        emphasis: { focus: 'adjacency', lineStyle: { color: INK, opacity: 0.85 } },
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
export const previewOption = (): EChartsOption => buildOption(SERVICES);

export function ForceGraph({ services = SERVICES }: { services?: readonly Service[] }) {
  const option = useMemo(() => buildOption(services), [services]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-force-graph">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
