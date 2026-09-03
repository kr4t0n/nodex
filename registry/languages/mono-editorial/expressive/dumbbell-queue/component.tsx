/**
 * Onboarding, before and after the redesign — mono-editorial
 *
 * Five steps, each a pair: the old time hollow, the new time filled. What is
 * strung between them is the point — one bead per minute saved, jittered off
 * the line so they stay countable. A plain connector would show that the step
 * got faster; the beads show *by how much*, in units a reader can count.
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

/** One row per step: `[step, wasMinutes, nowMinutes]`. */
export type Step = readonly [step: string, was: number, now: number];

export const STEPS: readonly Step[] = [
  ['INVITE FLOW', 14, 6],
  ['FIRST BOARD', 19, 9],
  ['IMPORT DATA', 26, 13],
  ['TEAM SETUP', 31, 21],
  ['GO LIVE', 38, 30],
];

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const MUTED = '#8F8E88';
const RAIL = '#E3E2DB';
const QUIET = '#B0AFA9';
const FAINT = '#C6C5BF';
const LABEL = '#6A6963';

const SANS = "'Inter', sans-serif";

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(steps: readonly Step[] = STEPS): EChartsOption {
  const beads: { value: [number, number]; symbolSize: number }[] = [];
  const rails: ([number, number] | null)[] = [];

  steps.forEach(([, was, now], i) => {
    rails.push([0, i], [42, i], null);
    const saved = was - now;
    for (let k = 0; k < saved; k++) {
      // Strung evenly between the two dots, nudged off the line so a bead
      // never hides behind its neighbour.
      const t = (k + 0.5) / saved;
      beads.push({
        value: [now + t * (was - now), i + (rnd(k + 1, i + 3) - 0.5) * 0.13],
        symbolSize: 3 + rnd(k + 2, i + 4) * 1.8,
      });
    }
  });

  return {
    color: [RAIL, MUTED, PAPER, INK],
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
        const [, i] = hit.value as [number, number];
        const step = steps[Math.round(i)];
        return step ? `${step[0]} — ${step[1]} min → ${step[2]} min` : '';
      },
    },

    grid: { left: 96, right: 30, top: 30, bottom: 50 },

    xAxis: {
      type: 'value',
      min: 0,
      max: 42,
      inverse: false,
      splitLine: { show: false },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: FAINT,
        fontFamily: SANS,
        fontSize: 7,
        fontWeight: 600,
        showMinLabel: true,
        showMaxLabel: true,
        formatter: (v: number) => (v === 0 ? 'FASTER ←' : v >= 42 ? 'MINUTES' : ''),
      },
    },
    yAxis: {
      type: 'category',
      data: steps.map(([step]) => step),
      inverse: true,
      splitLine: { show: false },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: LABEL,
        fontFamily: SANS,
        fontSize: 7.5,
        fontWeight: 700,
        margin: 12,
      },
    },

    series: [
      {
        // The rail each pair sits on. Palest tone in the ramp: it is a
        // guideline, not a measurement.
        type: 'line',
        data: rails,
        symbol: 'none',
        // Hairline, well under the language's 1.4px ceiling.
        lineStyle: { color: RAIL, width: 0.7 },
        silent: true,
        z: 1,
      },
      {
        // One bead per minute saved. This is the chart.
        type: 'scatter',
        data: beads,
        itemStyle: { color: MUTED, opacity: 0.85 },
        silent: true,
        z: 2,
      },
      {
        // Before: hollow, so it reads as the state being left behind.
        type: 'scatter',
        data: steps.map(([, was], i) => ({ value: [was, i] })),
        symbolSize: 8.4,
        itemStyle: { color: PAPER, borderColor: INK, borderWidth: 1.3 },
        z: 3,
        label: {
          show: true,
          position: 'top',
          distance: 6,
          offset: [10, 0],
          color: QUIET,
          fontFamily: SANS,
          fontSize: 8.5,
          fontWeight: 700,
          formatter: (p: CallbackDataParams) => {
            const [was] = p.value as [number, number];
            return String(was);
          },
        },
      },
      {
        // After: filled, and set in the heavier weight. Where the eye should
        // land.
        type: 'scatter',
        data: steps.map(([, , now], i) => ({ value: [now, i] })),
        symbolSize: 9.2,
        itemStyle: { color: INK },
        z: 4,
        label: {
          show: true,
          position: 'top',
          distance: 6,
          offset: [-10, 0],
          color: INK,
          fontFamily: SANS,
          fontSize: 10,
          fontWeight: 800,
          formatter: (p: CallbackDataParams) => {
            const [now] = p.value as [number, number];
            return String(now);
          },
        },
      },
    ],

    // What one mark represents.
    graphic: [
      {
        type: 'text',
        left: 'center',
        bottom: 6,
        style: {
          text: 'HOLLOW = BEFORE · SOLID = AFTER · ONE BEAD = ONE MINUTE SAVED',
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

export function DumbbellQueue({ steps = STEPS }: { steps?: readonly Step[] }) {
  const option = useMemo(() => buildOption(steps), [steps]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-dumbbell-queue">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
