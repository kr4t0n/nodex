/**
 * Traffic by channel, one tick per percent — mono-editorial
 *
 * A donut with the disc removed. A hundred ticks stand around a ring, each one
 * percent, grouped and toned by channel — so a share is counted along the ring
 * rather than judged from the angle of a wedge, which is the one thing a
 * reader cannot do accurately.
 *
 * A bead every tenth tick, inside the ring, gives the eye somewhere to count
 * from without adding a scale.
 *
 * The ring is drawn as line segments on hidden value axes rather than on a
 * polar coordinate system. Polar would give the angles for free but ties the
 * tick's *length* to a radius axis, and here the length is a hand-varied
 * texture rather than a measurement.
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

/** One row per channel: `[channel, percent]`. Shares must total a hundred. */
export type Channel = readonly [channel: string, percent: number];

export const CHANNELS: readonly Channel[] = [
  ['ORGANIC', 37],
  ['PAID', 28],
  ['REFERRAL', 21],
  ['SOCIAL', 14],
];

/** The ring's inner radius, in data units. */
const RADIUS = 64;

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const MUTED = '#8F8E88';
const FAINT = '#C6C5BF';
const QUIET = '#B0AFA9';

/** Darkest is the largest share. Rank, not category. */
const TONES = ['#1C1C1A', '#55554F', '#8F8E88', '#B0AFA9'];

const SANS = "'Inter', sans-serif";

/** Twelve o'clock, running clockwise. */
const at = (radius: number, index: number): [number, number] => {
  const deg = index * 3.6 - 90;
  const rad = (deg * Math.PI) / 180;
  return [radius * Math.cos(rad), -radius * Math.sin(rad)];
};

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(channels: readonly Channel[] = CHANNELS): EChartsOption {
  // One line series per channel, each a run of null-separated segments, so a
  // channel is one tone and one legend entry rather than a hundred marks.
  const runs = channels.map(() => [] as ([number, number] | null)[]);
  const beads: [number, number][] = [];

  let placed = 0;
  channels.forEach(([, percent], si) => {
    for (let k = 0; k < percent; k++) {
      const index = placed + k;
      // Length varies a little per tick: the ring is a tally, not a dial.
      const length = 10 + rnd(index + 1, si + 2) * 6;
      runs[si]?.push(at(RADIUS, index), at(RADIUS + length, index), null);
      if (index % 10 === 0) beads.push(at(RADIUS - 5, index));
    }
    placed += percent;
  });

  const span = RADIUS + 26;

  return {
    color: [...TONES, FAINT],
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
        const channel = channels[hit.seriesIndex ?? 0];
        return channel ? `${channel[0]} — ${channel[1]}% of traffic` : '';
      },
    },

    grid: { left: '4%', right: '4%', top: 14, bottom: 40 },

    // Square ranges, so the ring stays a ring rather than an ellipse.
    xAxis: { show: false, type: 'value', min: -span, max: span },
    yAxis: { show: false, type: 'value', min: -span, max: span },

    series: [
      ...channels.map(([name], si) => ({
        type: 'line' as const,
        name,
        data: runs[si] ?? [],
        symbol: 'none' as const,
        // Hairline, under the language's 1.4px ceiling.
        lineStyle: { color: TONES[si] ?? INK, width: 1 },
        z: 2,
      })),
      {
        // The counting beads, inside the ring.
        type: 'scatter' as const,
        data: beads,
        symbolSize: 1.6,
        itemStyle: { color: FAINT },
        silent: true,
        z: 3,
      },
    ],

    graphic: [
      // The key, along the bottom: swatch, name, share.
      ...channels.flatMap(([name, percent], si) => [
        {
          type: 'text' as const,
          left: `${8 + si * 23}%`,
          bottom: 20,
          style: {
            text: name,
            font: `700 7.5px ${SANS}`,
            fill: TONES[si] ?? INK,
          },
        },
        {
          type: 'text' as const,
          left: `${8 + si * 23}%`,
          bottom: 6,
          style: {
            text: `${percent}%`,
            font: `800 12px ${SANS}`,
            fill: si < 2 ? INK : MUTED,
          },
        },
      ]),
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

export function TickDonut({ channels = CHANNELS }: { channels?: readonly Channel[] }) {
  const option = useMemo(() => buildOption(channels), [channels]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-tick-donut">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
