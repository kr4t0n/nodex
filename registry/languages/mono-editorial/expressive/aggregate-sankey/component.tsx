/**
 * Where a hundred accounts came from, and what they became — mono-editorial
 *
 * A sankey from five acquisition channels to three plans. Ribbon thickness is
 * accounts, so the convergence is the reading: most of what arrives ends up on
 * the free plan regardless of where it came from.
 *
 * Ribbons are toned by source rather than by destination, which is the choice
 * that makes the chart answer "where did this go" rather than "what is this
 * made of". Tone runs darkest for the largest channel — rank, not category.
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

/** One row per channel: its name and the accounts it sent to each plan. */
export type Channel = readonly [channel: string, toPlans: readonly number[]];

export const PLANS = ['FREE', 'PRO', 'TEAM'] as const;

export const CHANNELS: readonly Channel[] = [
  ['SEARCH', [20, 10, 4]],
  ['REFERRAL', [12, 9, 6]],
  ['SOCIAL', [12, 4, 2]],
  ['PAID', [6, 3, 3]],
  ['OTHER', [5, 2, 2]],
];

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const MUTED = '#8F8E88';
const LABEL = '#6A6963';

/** Darkest is the largest channel. Rank, not category. */
const TONES = ['#1C1C1A', '#4A4944', '#8F8E88', '#B0AFA9', '#C6C5BF'];

const SANS = "'Inter', sans-serif";

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(channels: readonly Channel[] = CHANNELS): EChartsOption {
  const total = (c: Channel) => c[1].reduce((a, b) => a + b, 0);
  // Largest first, so the tone ladder and the vertical order agree.
  const ranked = [...channels].sort((a, b) => total(b) - total(a));

  const toneOf = new Map(ranked.map(([name], i) => [name, TONES[i] ?? INK]));

  const nodes = [
    ...ranked.map(([name], i) => ({
      name,
      itemStyle: { color: toneOf.get(name) ?? INK, borderWidth: 0 },
      label: {
        position: 'left' as const,
        color: i < 2 ? INK : LABEL,
        fontFamily: SANS,
        fontSize: 8,
        fontWeight: 700,
      },
    })),
    ...PLANS.map((plan) => ({
      name: plan,
      itemStyle: { color: INK, borderWidth: 0 },
      label: {
        position: 'right' as const,
        color: INK,
        fontFamily: SANS,
        fontSize: 8.5,
        fontWeight: 800,
      },
    })),
  ];

  const links = ranked.flatMap(([name, toPlans]) =>
    toPlans
      .map((value, j) => ({
        source: name,
        target: PLANS[j] ?? '',
        value,
        lineStyle: {
          // The ribbon's *thickness* is the quantity, which is what sankey
          // does natively; the tone only says where it came from.
          color: toneOf.get(name) ?? INK,
          opacity: 0.5,
        },
      }))
      // A channel that sent nobody to a plan gets no ribbon, rather than a
      // hairline that would read as a small flow.
      .filter((link) => link.value > 0),
  );

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
        if (!hit) return '';
        if (hit.dataType === 'edge') {
          const edge = hit.data as { source?: string; target?: string; value?: number };
          return `${edge.source} → ${edge.target} — ${edge.value} accounts of 100`;
        }
        return String(hit.name ?? '');
      },
    },

    series: [
      {
        type: 'sankey',
        data: nodes,
        links,
        left: 76,
        right: 66,
        top: 20,
        bottom: 20,
        nodeWidth: 8,
        nodeGap: 12,
        // Fixed order, so the tone ladder is not reshuffled by the layout.
        layoutIterations: 0,
        emphasis: { focus: 'adjacency' },
        lineStyle: { curveness: 0.5 },
        label: { show: true },
      },
    ],

    graphic: [
      {
        type: 'text',
        left: 'center',
        bottom: 4,
        style: {
          text: 'RIBBON THICKNESS = ACCOUNTS · TONE = WHERE THEY CAME FROM',
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

export function AggregateSankey({ channels = CHANNELS }: { channels?: readonly Channel[] }) {
  const option = useMemo(() => buildOption(channels), [channels]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-aggregate-sankey">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
