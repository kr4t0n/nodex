/**
 * A service mesh, eight domains deep — mono-editorial
 *
 * Eight domain hubs, each with a swarm of services around it, a backbone of
 * hub-to-hub calls, and a scatter of cross-domain wires that nobody designed.
 * One mark per service — 180-odd of them — because the mess is the finding and
 * a chart showing eight tidy boxes would be describing an architecture diagram
 * rather than a running system.
 *
 * **The layout is seeded, and that is load-bearing.** ECharts starts a force
 * simulation from random positions, so the same data settles somewhere new on
 * every render and a server-rendered preview would change on every build.
 * Giving each node a starting `x`/`y` from the same deterministic hash the
 * sample data uses makes it settle identically every time, while staying a real
 * force layout that can be dragged and roamed in a browser.
 *
 * Only the hubs are labelled. Two hundred names would be a grey fog.
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
  (((i * 73856093) ^ (k * 19349663)) % 1000) / 1000;

/** One domain: its name, how many services it owns, and the tone they share. */
export type Domain = readonly [domain: string, services: number, tone: string];

export const DOMAINS: readonly Domain[] = [
  ['auth', 26, '#1C1C1A'],
  ['billing', 24, '#33322D'],
  ['content', 28, '#4A4944'],
  ['search', 20, '#6A6963'],
  ['notify', 22, '#7C7A72'],
  ['media', 20, '#8F8E88'],
  ['analytics', 18, '#9C9A91'],
  ['edge', 14, '#B0AFA9'],
];

export interface Node {
  readonly name: string;
  readonly callsK: number;
  readonly hub: boolean;
  readonly tone: string;
  readonly domain: number;
}

export interface Edge {
  readonly source: string;
  readonly target: string;
  readonly width: number;
  readonly tone: string;
  readonly opacity: number;
  readonly curveness?: number;
}

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const SPOKE = '#C6C5BF';
const SHORTCUT = '#DEDDD6';
const BACKBONE = '#B0AFA9';
const STRAY = '#E3E2DB';

const SANS = "'Inter', sans-serif";

/** Generated: two hundred services will not read as a literal table. */
export function mesh(domains: readonly Domain[] = DOMAINS): {
  nodes: Node[];
  edges: Edge[];
} {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  domains.forEach(([domain, count, tone], di) => {
    nodes.push({
      name: domain,
      callsK: 60 + Math.round(rnd(di + 1, 3) * 50),
      hub: true,
      tone,
      domain: di,
    });

    for (let i = 0; i < count; i++) {
      // A few mid-weights per domain, then a long tail of small services.
      const calls = i < 3 ? 14 + rnd(di + 2, i + 4) * 18 : 2 + rnd(di + 5, i + 9) * 9;
      const name = `${domain}-${String(i + 1).padStart(2, '0')}`;
      nodes.push({ name, callsK: Math.round(calls), hub: false, tone, domain: di });

      edges.push({
        source: name,
        target: domain,
        width: 0.5 + calls * 0.05,
        tone: SPOKE,
        opacity: 0.5,
      });

      // The occasional shortcut inside a domain, which is how these grow.
      if (i > 1 && rnd(di + 3, i + 11) < 0.22) {
        const peer = String(1 + Math.floor(rnd(di + 4, i + 13) * i)).padStart(2, '0');
        edges.push({
          source: name,
          target: `${domain}-${peer}`,
          width: 0.5,
          tone: SHORTCUT,
          opacity: 0.4,
        });
      }
    }
  });

  // The backbone: every domain talks to two or three others.
  for (let a = 0; a < domains.length; a++) {
    for (let b = a + 1; b < domains.length; b++) {
      if (rnd(a + 7, b + 9) < 0.42) {
        edges.push({
          source: domains[a]?.[0] ?? '',
          target: domains[b]?.[0] ?? '',
          width: 1.6 + rnd(a + 2, b + 3) * 2.2,
          tone: BACKBONE,
          opacity: 0.65,
          curveness: 0.08,
        });
      }
    }
  }

  // Cross-domain wires nobody designed. These are the point of the chart.
  for (let k = 0; k < 26; k++) {
    const a = nodes[1 + Math.floor(rnd(k + 1, 17) * (nodes.length - 1))];
    const b = nodes[1 + Math.floor(rnd(k + 3, 23) * (nodes.length - 1))];
    if (a && b && a.name !== b.name && a.domain !== b.domain && !a.hub && !b.hub) {
      edges.push({
        source: a.name,
        target: b.name,
        width: 0.5,
        tone: STRAY,
        opacity: 0.38,
        curveness: 0.15,
      });
    }
  }

  return { nodes, edges };
}

const MESH = mesh();
export const NODES = MESH.nodes;
export const EDGES = MESH.edges;

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(
  nodes: readonly Node[] = NODES,
  edges: readonly Edge[] = EDGES,
): EChartsOption {
  return {
    animationDuration: 300,
    textStyle: { fontFamily: SANS },

    tooltip: {
      backgroundColor: INK,
      borderWidth: 0,
      padding: [10, 14],
      textStyle: { color: PAPER, fontFamily: SANS, fontSize: 12 },
      formatter: (p: CallbackDataParams | CallbackDataParams[]) => {
        const hit = Array.isArray(p) ? p[0] : p;
        if (!hit || hit.dataType !== 'node') return '';
        return `${hit.name} — ${hit.value as number}k calls/day`;
      },
    },

    series: [
      {
        type: 'graph',
        layout: 'force',
        force: {
          repulsion: 46,
          edgeLength: [10, 42],
          gravity: 0.16,
          friction: 0.22,
          layoutAnimation: true,
        },
        roam: true,
        draggable: true,
        left: 6,
        right: 6,
        top: 6,
        bottom: 6,
        data: nodes.map((node, i) => ({
          name: node.name,
          value: node.callsK,
          // Area, not radius. Hubs get a floor so they read as hubs even when a
          // satellite happens to be busy.
          symbolSize: node.hub
            ? 16 + Math.sqrt(node.callsK) * 1.6
            : 2.5 + Math.sqrt(node.callsK) * 1.5,
          // Seeded start. Without these the simulation begins from random
          // positions and the same mesh settles differently every render.
          x: 40 + rnd(i + 1, 3) * 280,
          y: 30 + rnd(i + 5, 7) * 220,
          // A knockout gap in the page colour, not an ink outline: it separates
          // a hub from the swarm sitting on top of it.
          itemStyle: { color: node.tone, borderWidth: node.hub ? 2 : 0, borderColor: PAPER },
          label: {
            show: node.hub,
            position: 'inside',
            color: PAPER,
            fontFamily: SANS,
            fontSize: 9.5,
            fontWeight: 800,
          },
        })),
        links: edges.map((edge) => ({
          source: edge.source,
          target: edge.target,
          lineStyle: {
            // The width *is* the quantity, which is why this component declares
            // strokeAsArea: thinning these to the hairline ceiling would delete
            // the call volumes the chart exists to show.
            width: edge.width,
            color: edge.tone,
            opacity: edge.opacity,
            ...(edge.curveness === undefined ? {} : { curveness: edge.curveness }),
          },
        })),
        // At this density the mesh is only readable one node at a time.
        emphasis: {
          focus: 'adjacency',
          lineStyle: { color: INK, opacity: 0.9, width: 1.4 },
          label: { show: true, color: INK, position: 'right' },
        },
        blur: { itemStyle: { opacity: 0.1 }, lineStyle: { opacity: 0.03 } },
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

export function ForceGraphDense({
  nodes = NODES,
  edges = EDGES,
}: {
  nodes?: readonly Node[];
  edges?: readonly Edge[];
}) {
  const option = useMemo(() => buildOption(nodes, edges), [nodes, edges]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-force-graph-dense">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
