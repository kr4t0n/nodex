/**
 * Sixty repositories, wired by shared contributors — mono-editorial
 *
 * One mark per repository, arranged on a ring by org. A chord joins any two
 * repos that share contributors, and its width is how many. Links inside an
 * org are drawn darker than links across one, so the clustering is legible as
 * density rather than needing a legend.
 *
 * Sixty nodes is the point rather than an accident: the shape of an
 * engineering organisation is in the long tail of small repos, and any chart
 * that aggregates them into five bars has thrown that away.
 *
 * Only the giants are labelled. Sixty names on a ring is soup.
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

/** One org: its name, how many repos it owns, and the tone they share. */
export type Org = readonly [org: string, repos: number, tone: string];

export const ORGS: readonly Org[] = [
  ['platform', 16, '#1C1C1A'],
  ['product', 14, '#4A4944'],
  ['data', 12, '#6A6963'],
  ['infra', 10, '#8F8E88'],
  ['labs', 8, '#B0AFA9'],
];

export interface Repo {
  readonly name: string;
  readonly org: number;
  readonly contributors: number;
}

export interface Tie {
  readonly source: number;
  readonly target: number;
  readonly shared: number;
  readonly sameOrg: boolean;
}

/** Above this many contributors a repo earns a label. */
const LABEL_AT = 26;

/** Generated, because sixty repos and their ties will not read as a literal. */
export function repos(orgs: readonly Org[] = ORGS): Repo[] {
  const out: Repo[] = [];
  orgs.forEach(([org, count], oi) => {
    for (let i = 0; i < count; i++) {
      // A couple of giants per org, then a long tail. That distribution is the
      // finding, so it is generated rather than flattened.
      const activity = i < 2 ? 30 + rnd(oi + 1, i + 2) * 45 : 4 + rnd(oi + 3, i + 7) * 16;
      out.push({
        name: `${org}/${org.slice(0, 2)}-${String(i + 1).padStart(2, '0')}`,
        org: oi,
        contributors: Math.round(activity),
      });
    }
  });
  return out;
}

export function ties(all: readonly Repo[]): Tie[] {
  const out: Tie[] = [];
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const a = all[i];
      const b = all[j];
      if (!a || !b) continue;
      const sameOrg = a.org === b.org;
      // People move within an org far more than across one.
      const chance = sameOrg ? 0.16 : 0.045;
      if (rnd(i + 1, j + 2) < chance) {
        out.push({ source: i, target: j, shared: 1 + Math.round(rnd(i + 2, j + 3) * 6), sameOrg });
      }
    }
  }
  return out;
}

export const REPOS = repos();
export const TIES = ties(REPOS);

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const WITHIN = '#C0BFB8';
const ACROSS = '#DEDDD6';
const LABEL = '#6A6963';

const SANS = "'Inter', sans-serif";

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(
  all: readonly Repo[] = REPOS,
  edges: readonly Tie[] = TIES,
  orgs: readonly Org[] = ORGS,
): EChartsOption {
  return {
    // Draws once and holds. This language forbids looping animation.
    animationDuration: 1800,
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
        if (hit.dataType === 'node') return `${hit.name} — ${hit.value as number} contributors`;
        const edge = hit.data as { from?: string; to?: string; shared?: number };
        return `${edge.from} ↔ ${edge.to} — ${edge.shared} shared`;
      },
    },

    series: [
      {
        type: 'graph',
        layout: 'circular',
        circular: { rotateLabel: true },
        left: 24,
        right: 24,
        top: 24,
        bottom: 24,
        data: all.map((repo) => ({
          name: repo.name,
          value: repo.contributors,
          // Area, not radius, so a repo with four times the contributors looks
          // four times the size.
          symbolSize: 3.5 + Math.sqrt(repo.contributors) * 1.7,
          itemStyle: { color: orgs[repo.org]?.[2] ?? INK, borderWidth: 0 },
          label: {
            show: repo.contributors >= LABEL_AT,
            position: 'right',
            distance: 4,
            color: LABEL,
            fontFamily: SANS,
            fontSize: 8.5,
            fontWeight: 600,
          },
        })),
        links: edges.map((tie) => ({
          source: tie.source,
          target: tie.target,
          from: all[tie.source]?.name,
          to: all[tie.target]?.name,
          shared: tie.shared,
          lineStyle: {
            // The width *is* the quantity, which is why this component declares
            // strokeAsArea: thinning these to the hairline ceiling would delete
            // the contributor counts the chart exists to show.
            width: 0.4 + tie.shared * 0.28,
            color: tie.sameOrg ? WITHIN : ACROSS,
            opacity: tie.sameOrg ? 0.5 : 0.32,
            curveness: 0.3,
          },
        })),
        // At this density the weave is only readable one node at a time, so
        // hovering lifts a repo's own ties and fades everything else nearly out.
        emphasis: {
          focus: 'adjacency',
          lineStyle: { color: INK, opacity: 0.9, width: 1.1 },
          label: { show: true, color: INK },
        },
        blur: { itemStyle: { opacity: 0.12 }, lineStyle: { opacity: 0.03 } },
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

export function CircularGraphDense({
  all = REPOS,
  edges = TIES,
}: {
  all?: readonly Repo[];
  edges?: readonly Tie[];
}) {
  const option = useMemo(() => buildOption(all, edges), [all, edges]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-circular-graph-dense">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
