/**
 * Time to resolve, one dot per ticket — mono-editorial
 *
 * Four priority bands, each dot a real ticket, jittered off its band line so
 * overlapping cases stay countable. This is the language's core claim made
 * literal: 284 marks rather than four medians, because the long tail on P2 and
 * P3 is the finding and an average would hide it.
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

/** One ticket: `[hoursToResolve, band]`, where band carries the jitter. */
export type Ticket = readonly [hours: number, band: number];

export const BANDS = ['P0 CRITICAL', 'P1 HIGH', 'P2 NORMAL', 'P3 LOW'] as const;

/**
 * A deterministic hash, not `Math.random()`.
 *
 * Sample data must not change between page loads, or a preview and a
 * screenshot of it stop agreeing. Never swap this for a random source.
 */
const rnd = (i: number, k: number) =>
  (((i * 73856093) ^ (k * 19349663)) % 1000) / 1000;

function band(
  ci: number,
  n: number,
  median: number,
  spread: number,
  outliers: number,
): Ticket[] {
  const pts: Ticket[] = [];
  for (let i = 0; i < n; i++) {
    const u = rnd(i + 1, ci + 1);
    const v = rnd(i + 7, ci + 3);
    let x = median + (u - 0.5) * spread * 2 + (v > 0.5 ? u * spread * 0.6 : 0);
    // A handful of genuine stragglers per band, which is what the chart is for.
    if (i < outliers) x = median + spread * 2.2 + u * spread * 3;
    // Jitter off the band line so coincident tickets stay countable.
    const jy = ci + (rnd(i + 13, ci + 5) - 0.5) * 0.58;
    pts.push([Math.max(0.2, x), jy]);
  }
  return pts;
}

export const TICKETS: readonly Ticket[] = [
  ...band(0, 38, 0.8, 0.5, 2),
  ...band(1, 64, 2.4, 1.1, 3),
  ...band(2, 110, 6.5, 2.4, 4),
  ...band(3, 72, 14, 4.5, 3),
];

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const MUTED = '#8F8E88';
const GRID = '#DEDDD6';
const FAINT = '#C6C5BF';
const LABEL = '#6A6963';
// Darkest band first: severity is an order, so it reads as one.
const LADDER = ['#1C1C1A', '#4A4944', '#6A6963', '#8F8E88'];

const SANS = "'Inter', sans-serif";

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(tickets: readonly Ticket[]): EChartsOption {
  return {
    // The language's ramp *is* the palette. Without this ECharts assigns any
    // series that does not set its own colour from its default theme, which is
    // how a lime green ended up on an invisible label anchor here.
    color: LADDER,
    // Draws once and holds. This language forbids looping animation.
    animationDuration: 450,
    animationEasing: 'cubicOut',
    // Band by band, so the eye is led down the severity ladder rather than
    // having 284 dots arrive at once.
    animationDelay: (i: number) => {
      const t = tickets[i];
      return t ? Math.round(t[1]) * 260 + (i % 37) * 9 : 0;
    },
    textStyle: { fontFamily: SANS },

    tooltip: {
      backgroundColor: INK,
      borderWidth: 0,
      padding: [10, 14],
      textStyle: { color: PAPER, fontFamily: SANS, fontSize: 12 },
      formatter: (p: CallbackDataParams | CallbackDataParams[]) => {
        const hit = Array.isArray(p) ? p[0] : p;
        if (!hit) return '';
        const [hours, b] = hit.value as [number, number];
        return `${BANDS[Math.round(b)] ?? ''} — ${hours.toFixed(1)}h to resolve`;
      },
    },

    grid: { left: 86, right: 16, top: 14, bottom: 30 },

    xAxis: {
      type: 'value',
      name: 'HOURS TO RESOLVE',
      nameTextStyle: { color: FAINT, fontSize: 8.5 },
      splitLine: { lineStyle: { color: GRID } },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: MUTED,
        fontFamily: SANS,
        fontSize: 9.5,
        formatter: (v: number) => `${v}h`,
      },
    },
    yAxis: {
      // A value axis rather than a category one, because the jitter needs
      // fractional positions between the band lines.
      type: 'value',
      min: -0.6,
      max: 3.6,
      inverse: true,
      splitLine: { show: false },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { show: false },
    },

    series: [
      {
        type: 'scatter',
        data: tickets.map((t) => [...t]),
        symbolSize: 7,
        itemStyle: {
          color: (p: CallbackDataParams) => {
            const [, b] = p.value as [number, number];
            return LADDER[Math.round(b)] ?? INK;
          },
          // Overlap has to stay readable as overlap: solid dots at this density
          // would merge into a blob and lose the count.
          opacity: 0.62,
        },
      },
      {
        // Invisible anchors carrying the band names. A value axis cannot label
        // four positions the way a category axis would.
        type: 'scatter',
        silent: true,
        symbolSize: 0,
        itemStyle: { color: INK },
        data: BANDS.map((name, i) => ({
          value: [0, i],
          label: {
            show: true,
            position: 'left' as const,
            offset: [-6, 0],
            color: LABEL,
            fontFamily: SANS,
            fontSize: 9,
            fontWeight: 700,
            formatter: name,
          },
        })),
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
export const previewOption = (): EChartsOption => buildOption(TICKETS);

export function JitterStrip({ tickets = TICKETS }: { tickets?: readonly Ticket[] }) {
  const option = useMemo(() => buildOption(tickets), [tickets]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-jitter-strip">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
