/**
 * Eight services, who calls whom — signal-console
 *
 * ECharts supplies the circular layout, label placement and adjacency
 * highlighting; the design language supplies every value it draws with. The
 * option builder is pure and exported, so the build can server-render it to a
 * static preview and the conformance lint can read the marks it produces
 * without a browser.
 */
import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';

import { useECharts } from '../../../../lib/use-echarts.ts';

export type NodeState = 'ok' | 'warn' | 'crit';

/** The data contract, as a type rather than as something to reverse-engineer. */
export type ServiceNode = readonly [name: string, rps: number, state: NodeState];
export type Flow = readonly [from: number, to: number, rps: number];

export const NODES: readonly ServiceNode[] = [
  ['edge', 18.4, 'ok'],
  ['auth', 12.1, 'ok'],
  ['orders', 9.6, 'ok'],
  ['catalog', 7.8, 'ok'],
  ['payments', 6.2, 'warn'],
  ['search', 5.1, 'ok'],
  ['ledger', 3.4, 'crit'],
  ['audit', 1.9, 'ok'],
];

/**
 * Aggregated by pair. This language never draws one mark per record past
 * roughly fifty — a mesh emits millions of calls a minute, and the chart's job
 * is the shape of the traffic, not its transcript.
 */
export const FLOWS: readonly Flow[] = [
  [0, 1, 8.1], [0, 2, 6.4], [0, 3, 5.2], [0, 5, 4.0],
  [1, 2, 3.6], [1, 4, 2.8], [1, 7, 1.1],
  [2, 4, 5.5], [2, 3, 2.2], [2, 6, 1.6],
  [3, 5, 2.4],
  [4, 6, 2.9], [4, 7, 0.8],
  [6, 7, 0.6],
];

/**
 * The accent ladder, quietest to loudest, paired with four discrete weights.
 *
 * Magnitude uses this ladder and nothing else — the neutrals carry structure
 * and the status pair carries state — so a thick green chord can only ever mean
 * "a lot". Four thicknesses can be counted across a ring where twenty cannot,
 * which is why this is a scale rather than a continuous interpolation.
 */
const ACCENT = ['#12352B', '#1D6B52', '#2FA37C', '#4DD4A8'] as const;
const WEIGHT = [2, 2.6, 3.2, 4] as const;
const NEUTRAL = { label: '#8A94A3', ink: '#D7DEE8' } as const;
const STATE: Record<NodeState, string> = {
  ok: '#D7DEE8',
  warn: '#E3B341',
  crit: '#F0616D',
};

const MONO =
  "'JetBrains Mono', ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace";

export interface CircularGraphData {
  nodes: readonly ServiceNode[];
  flows: readonly Flow[];
}

/**
 * Pure. No DOM, no React. Everything the design language decides lives here,
 * which is what lets the lint check the real marks instead of parsing source.
 */
export function buildOption({ nodes, flows }: CircularGraphData): EChartsOption {
  const maxFlow = Math.max(...flows.map((f) => f[2]));
  const maxRps = Math.max(...nodes.map((n) => n[1]));

  return {
    // Marks arrive fast, with no stagger long enough to notice: a console that
    // animates in slowly is lying about how fresh its data is.
    animationDuration: 350,
    animationEasing: 'cubicOut',
    textStyle: { fontFamily: MONO },
    series: [
      {
        type: 'graph',
        layout: 'circular',
        circular: { rotateLabel: false },
        // Fills the card. Whitespace in this language reads as missing data.
        top: 26,
        bottom: 26,
        left: 70,
        right: 70,
        data: nodes.map(([name, rps, state], i) => {
          // ECharts lays a circular graph out from three o'clock, clockwise, in
          // data order. Recomputing the angle here is what lets each label sit
          // outside the ring on its own side; the default puts every one to the
          // right, which collides with the ring on the left half.
          const a = (i / nodes.length) * Math.PI * 2;
          return {
            name,
            value: rps,
            symbolSize: 6 + (rps / maxRps) * 7,
            itemStyle: { color: STATE[state] },
            label: {
              position: Math.cos(a) < -0.15 ? 'left' : 'right',
              color: state === 'ok' ? NEUTRAL.label : STATE[state],
              fontWeight: state === 'ok' ? 600 : 700,
            },
          };
        }),
        links: flows.map(([from, to, rps]) => {
          const step = Math.min(
            ACCENT.length - 1,
            Math.floor((rps / maxFlow) * ACCENT.length),
          );
          return {
            source: nodes[from]![0],
            target: nodes[to]![0],
            value: rps,
            // One step indexes both ladders, so weight and colour never
            // disagree about how much traffic a link carries.
            lineStyle: {
              color: ACCENT[step],
              width: WEIGHT[step],
              opacity: 0.45 + (rps / maxFlow) * 0.45,
              // Bowed by how *little* it carries, so heavy links read short and
              // direct and light ones fall away toward the centre.
              curveness: 0.1 + (1 - rps / maxFlow) * 0.35,
            },
          };
        }),
        label: {
          show: true,
          distance: 8,
          fontSize: 9,
          fontWeight: 600,
          // Zero or positive tracking, never negative: monospace is already
          // evenly spaced and tightening it reads as a rendering fault.
          letterSpacing: 0.8,
          formatter: (p: { name: string }) => p.name.toUpperCase(),
        },
        emphasis: {
          focus: 'adjacency',
          lineStyle: { opacity: 0.95 },
          label: { color: NEUTRAL.ink },
        },
        tooltip: {
          formatter: (p: { dataType?: string; name?: string; value?: number }) =>
            p.dataType === 'edge'
              ? `${p.name} · ${Number(p.value).toFixed(1)}k rps`
              : `${p.name} · ${Number(p.value).toFixed(1)}k rps`,
        },
      },
    ],
    tooltip: {
      backgroundColor: '#12161D',
      borderColor: '#1E242E',
      textStyle: { color: '#D7DEE8', fontFamily: MONO, fontSize: 11 },
    },
  };
}

export interface CircularGraphProps extends Partial<CircularGraphData> {
  /** Head label, left of the current value. */
  label?: string;
  source?: string;
  window?: string;
}

export function CircularGraph({
  nodes = NODES,
  flows = FLOWS,
  label = 'SERVICE MESH',
  source = 'MESH TELEMETRY',
  window: windowLabel = '60S WINDOW',
}: CircularGraphProps) {
  const option = useMemo(() => buildOption({ nodes, flows }), [nodes, flows]);
  const ref = useECharts<HTMLDivElement>(option);
  const total = nodes.reduce((sum, n) => sum + n[1], 0);

  return (
    <div className="nx-circular-graph">
      <div className="card">
        {/* The head carries the current value, because the first question
            asked of a live chart is "what is it now". */}
        <div className="head">
          <span className="label">{label}</span>
          <span className="value">{total.toFixed(1)}k</span>
        </div>

        <div className="chart" ref={ref} />

        <div className="foot">
          <span>{source}</span>
          <span>{windowLabel}</span>
          <span>UPDATED 0S AGO</span>
        </div>
      </div>
    </div>
  );
}
