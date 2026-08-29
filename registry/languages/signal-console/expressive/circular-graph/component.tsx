/**
 * Eight services, who calls whom — signal-console
 *
 * React port, written to test whether a React-only registry is a cleaner
 * artifact than the framework-free fragment. The stylesheet is unchanged and
 * still scoped under `.nx-circular-graph`: the design layer stays portable, and
 * only the implementation binds to a framework.
 */
import { useEffect, useRef, useState } from 'react';

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
 * Aggregated by pair on purpose. This language never draws one mark per record
 * past roughly fifty — a mesh emits millions of calls a minute, and the chart's
 * job is the shape of the traffic, not its transcript.
 */
export const FLOWS: readonly Flow[] = [
  [0, 1, 8.1], [0, 2, 6.4], [0, 3, 5.2], [0, 5, 4.0],
  [1, 2, 3.6], [1, 4, 2.8], [1, 7, 1.1],
  [2, 4, 5.5], [2, 3, 2.2], [2, 6, 1.6],
  [3, 5, 2.4],
  [4, 6, 2.9], [4, 7, 0.8],
  [6, 7, 0.6],
];

// The accent ladder, quietest to loudest, paired with four discrete weights.
// Magnitude uses this and nothing else; the neutral ladder carries structure
// and the status pair carries state, so a thick green chord can only ever mean
// "a lot". Four thicknesses can be counted across a ring where twenty cannot.
const ACCENT = ['#12352B', '#1D6B52', '#2FA37C', '#4DD4A8'] as const;
const WEIGHT = [2, 2.6, 3.2, 4] as const;
const NEUTRAL = { rule: '#1E242E', label: '#8A94A3', ink: '#D7DEE8' } as const;
const STATE: Record<NodeState, string> = {
  ok: '#4DD4A8',
  warn: '#E3B341',
  crit: '#F0616D',
};

const CX = 210;
const CY = 126;
const R = 88;

export interface CircularGraphProps {
  nodes?: readonly ServiceNode[];
  flows?: readonly Flow[];
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
  const maxFlow = Math.max(...flows.map((f) => f[2]));
  const maxRps = Math.max(...nodes.map((n) => n[1]));
  const total = nodes.reduce((sum, n) => sum + n[1], 0);

  // Twelve o'clock, running clockwise, so the busiest service — first in the
  // data — sits where the eye lands first.
  const at = (i: number) => {
    const a = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
    return { x: CX + Math.cos(a) * R, y: CY + Math.sin(a) * R, a };
  };

  return (
    <div className="nx-circular-graph">
      <div className="card">
        {/* The head carries the current value, because the first question asked
            of a live chart is "what is it now". */}
        <div className="head">
          <span className="label">{label}</span>
          <span className="value">{total.toFixed(1)}k</span>
        </div>

        <svg viewBox="0 0 420 268" preserveAspectRatio="xMinYMid meet">
          <circle
            cx={CX} cy={CY} r={R}
            fill="none" stroke={NEUTRAL.rule} strokeWidth={1}
            className="arrive"
          />

          {/* Chords first, so nodes and labels sit above the traffic. */}
          {flows.map(([from, to, rps]) => {
            const a = at(from);
            const b = at(to);
            const t = rps / maxFlow;
            // Bowed toward the centre by how *little* it carries, so heavy
            // links read as short and direct and light ones fall away.
            const bow = 0.18 + (1 - t) * 0.5;
            const mx = CX + ((a.x + b.x) / 2 - CX) * bow;
            const my = CY + ((a.y + b.y) / 2 - CY) * bow;
            const step = Math.min(ACCENT.length - 1, Math.floor(t * ACCENT.length));
            return (
              <path
                key={`${from}-${to}`}
                d={`M${a.x.toFixed(1)} ${a.y.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`}
                fill="none"
                // One step indexes both ladders, so weight and value never disagree.
                stroke={ACCENT[step]}
                strokeWidth={WEIGHT[step]}
                strokeLinecap="round"
                opacity={0.4 + t * 0.5}
                pathLength={1}
                className="chord"
              >
                <title>{`${nodes[from]![0]} → ${nodes[to]![0]} · ${rps.toFixed(1)}k rps`}</title>
              </path>
            );
          })}

          {nodes.map(([name, rps, state], i) => {
            const { x, y, a } = at(i);
            const r = 3 + (rps / maxRps) * 3.5;
            const lx = CX + Math.cos(a) * (R + 16);
            const ly = CY + Math.sin(a) * (R + 16);
            const anchor =
              Math.cos(a) < -0.2 ? 'end' : Math.cos(a) > 0.2 ? 'start' : 'middle';
            return (
              <g key={name}>
                {/* Only a failing node loops. A live dot that has stopped
                    pulsing is indistinguishable from a dead one. */}
                <circle
                  cx={x.toFixed(1)} cy={y.toFixed(1)} r={r.toFixed(1)}
                  fill={state === 'ok' ? NEUTRAL.ink : STATE[state]}
                  className={state === 'crit' ? 'live' : 'arrive'}
                >
                  <title>{`${name} · ${rps.toFixed(1)}k rps · ${state}`}</title>
                </circle>
                <text
                  x={lx.toFixed(1)} y={(ly + 3).toFixed(1)}
                  fontSize={9} fontWeight={600} letterSpacing="0.08em"
                  fill={state === 'ok' ? NEUTRAL.label : STATE[state]}
                  textAnchor={anchor}
                  className="arrive"
                >
                  {name.toUpperCase()}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="foot">
          <span>{source}</span>
          <span>{windowLabel}</span>
          <Age />
        </div>
      </div>
    </div>
  );
}

/**
 * UPDATED is honest or it is worse than absent: a status line that always says
 * "0s ago" teaches the reader to stop believing it.
 *
 * Its own component so the ticking state re-renders one span rather than the
 * whole chart every second. The interval is cleaned up on unmount, which the
 * framework-free version had to hand back for the embedder to call.
 */
function Age() {
  const started = useRef(Date.now());
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(
      () => setSeconds(Math.round((Date.now() - started.current) / 1000)),
      1000,
    );
    return () => clearInterval(timer);
  }, []);

  return <span>{`UPDATED ${seconds}S AGO`}</span>;
}
