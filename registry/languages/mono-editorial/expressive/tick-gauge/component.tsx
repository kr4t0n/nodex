/**
 * Progress to the annual goal — mono-editorial
 *
 * A gauge with no needle and no dial. A hundred ticks across a 210° sweep,
 * one per percent: the ones reached are inked and long, the ones remaining are
 * pale and short. So the reading is a count along an arc rather than a pointer
 * angle, which is the same argument the tick donut makes.
 *
 * The remaining ticks are drawn rather than left blank. A gauge that shows only
 * progress hides the size of what is left, and the gap is the more useful half
 * of the picture.
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

/** Percent of the annual goal reached. */
export const REACHED = 73;

/** The arc: from this angle, through this sweep, in degrees. */
const FROM = -195;
const SWEEP = 210;

/** The ring's inner radius, in data units. */
const RADIUS = 104;

/** Where the scale is marked. */
const MARKS = [25, 50, 75, 100];

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const MUTED = '#8F8E88';
const REMAINING = '#CFCEC7';
const FAINT = '#C6C5BF';
const QUIET = '#B0AFA9';

const SANS = "'Inter', sans-serif";

/** A point on the arc, at a given radius and percent along the sweep. */
const at = (radius: number, percent: number): [number, number] => {
  const rad = ((FROM + (percent / 100) * SWEEP) * Math.PI) / 180;
  return [radius * Math.cos(rad), -radius * Math.sin(rad)];
};

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(reached: number = REACHED): EChartsOption {
  const inked: ([number, number] | null)[] = [];
  const left: ([number, number] | null)[] = [];

  for (let k = 0; k < 100; k++) {
    const done = k < reached;
    // A reached tick is long and varies; a remaining one is short and even.
    // The texture difference does as much work as the tone.
    const length = done ? 13 + rnd(k + 1, 3) * 6 : 5 + rnd(k + 1, 7) * 2.5;
    (done ? inked : left).push(at(RADIUS, k), at(RADIUS + length, k), null);
  }

  const span = RADIUS + 30;

  return {
    color: [REMAINING, INK, QUIET],
    // Draws once and holds. This language forbids looping animation.
    animationDuration: 900,
    animationEasing: 'quarticOut',
    textStyle: { fontFamily: SANS },

    tooltip: { show: false },

    grid: { left: '4%', right: '4%', top: 10, bottom: 10 },

    // Square ranges, so the arc keeps its shape.
    xAxis: { show: false, type: 'value', min: -span, max: span },
    yAxis: { show: false, type: 'value', min: -span, max: span * 0.62 },

    series: [
      {
        // What is left. Drawn, not omitted: the gap is the useful half.
        type: 'line',
        data: left,
        symbol: 'none',
        // Hairline, well under the language's 1.4px ceiling.
        lineStyle: { color: REMAINING, width: 0.6 },
        silent: true,
        z: 1,
      },
      {
        // What is reached.
        type: 'line',
        data: inked,
        symbol: 'none',
        lineStyle: { color: INK, width: 1 },
        silent: true,
        z: 2,
      },
      {
        // The scale marks, inside the arc.
        type: 'scatter',
        data: MARKS.map((m) => ({ value: at(RADIUS - 7, m) })),
        symbolSize: 2,
        itemStyle: { color: QUIET },
        silent: true,
        z: 3,
        label: {
          show: true,
          position: 'inside',
          distance: 0,
          offset: [0, 0],
          color: FAINT,
          fontFamily: SANS,
          fontSize: 7,
          fontWeight: 600,
          formatter: (p: CallbackDataParams) => String(MARKS[p.dataIndex ?? 0] ?? ''),
        },
      },
    ],

    graphic: [
      // The figure, in the arc's own well. A gauge's whole job is one number.
      {
        type: 'text' as const,
        left: 'center',
        top: '52%',
        style: {
          text: `${reached}%`,
          font: `800 40px ${SANS}`,
          fill: INK,
        },
      },
      {
        type: 'text' as const,
        left: 'center',
        top: '74%',
        style: {
          text: 'OF THE ANNUAL GOAL',
          font: `600 8px ${SANS}`,
          fill: MUTED,
        },
      },
      {
        type: 'text' as const,
        left: 'center',
        bottom: 4,
        style: {
          text: 'ONE TICK = ONE PERCENT · PALE TICKS ARE WHAT REMAINS',
          font: `600 7px ${SANS}`,
          fill: QUIET,
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

export function TickGauge({ reached = REACHED }: { reached?: number }) {
  const option = useMemo(() => buildOption(reached), [reached]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-tick-gauge">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
