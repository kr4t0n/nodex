/**
 * The last fifty minutes of active users — mono-editorial
 *
 * A window onto a live feed: fifty samples, the current figure parked at the
 * right-hand end of the line rather than on an axis, and a badge saying the
 * source is live.
 *
 * **It draws once and holds.** The imported version pushed a sample every
 * 300ms forever, which this language forbids outright: "never animate on a
 * loop". The distinction it was missing is between data that is live and a
 * *chart* that ticks — mono-editorial is built for charts that are read, and a
 * line redrawing four times a second cannot be read. A ticking version of this
 * belongs in a language whose rules ask for it; signal-console requires looping
 * motion for exactly this case.
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

/**
 * A deterministic hash, not `Math.random()`.
 *
 * Sample data must not change between page loads, or a preview and a
 * screenshot of it stop agreeing. Never swap this for a random source.
 */
const rnd = (i: number, k: number) =>
  (((i * 73856093) ^ (k * 19349663)) % 1000) / 1000;

/** How many samples the window holds. */
const WINDOW = 50;

/**
 * Active users, in thousands, one sample per minute.
 *
 * A random walk with a floor, generated rather than written out: the shape is
 * the point and fifty literals would not read. Swap real telemetry in through
 * the prop.
 */
export const SAMPLES: readonly number[] = (() => {
  const out: number[] = [];
  let v = 64;
  for (let t = 0; t < WINDOW; t++) {
    v = Math.max(30, v + (rnd(t + 1, 7) - 0.48) * 9);
    out.push(Math.round(v));
  }
  return out;
})();

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const DIM = '#4A4944';

const SANS = "'Inter', sans-serif";

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(samples: readonly number[]): EChartsOption {
  return {
    // Draws once and holds. This language forbids looping animation, so there
    // is no update duration here: nothing updates.
    animationDuration: 900,
    animationEasing: 'cubicOut',
    textStyle: { fontFamily: SANS },

    tooltip: {
      backgroundColor: INK,
      borderWidth: 0,
      padding: [10, 14],
      textStyle: { color: PAPER, fontFamily: SANS, fontSize: 12 },
      valueFormatter: (x) => `${x as number}k users`,
    },

    // Right margin is for the end label, which sits outside the plot.
    grid: { left: 14, right: 58, top: 44, bottom: 20 },

    xAxis: {
      type: 'category',
      data: samples.map((_, i) => i),
      boundaryGap: false,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
      // A rolling window has no meaningful absolute time, and the figure at the
      // end is the answer anyway.
      axisLabel: { show: false },
    },
    yAxis: { show: false, min: 20, max: 130 },

    series: [
      {
        type: 'line',
        data: [...samples],
        smooth: 0.45,
        symbol: 'none',
        // Hairline, under the language's 1.4px ceiling.
        lineStyle: { color: INK, width: 1.1 },
        // The current value, at the end of the line rather than on an axis:
        // the first question of a feed is "what is it now".
        endLabel: {
          show: true,
          fontFamily: SANS,
          fontSize: 14,
          fontWeight: 800,
          color: INK,
          formatter: (p) => `${p.value as number}k`,
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(28, 28, 26, 0.16)' },
              { offset: 1, color: 'rgba(28, 28, 26, 0)' },
            ],
          },
        },
      },
    ],

    // A static badge. It says the source is live; it does not pulse, because a
    // pulsing dot is a loop and the language has none.
    graphic: [
      {
        type: 'group',
        left: 16,
        top: 10,
        children: [
          { type: 'circle', shape: { cx: 5, cy: 5, r: 4 }, style: { fill: DIM } },
          {
            type: 'text',
            style: { text: 'LIVE', x: 16, y: 0, font: `800 11px ${SANS}`, fill: INK },
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
export const previewOption = (): EChartsOption => buildOption(SAMPLES);

export function DynamicData({ samples = SAMPLES }: { samples?: readonly number[] }) {
  const option = useMemo(() => buildOption(samples), [samples]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-dynamic-data">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
