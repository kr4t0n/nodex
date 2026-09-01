/**
 * ARR accumulating over a half-year — mono-editorial
 *
 * A cumulative area that draws itself in while the headline figure counts up to
 * meet it. The two are one gesture: the number is the line's endpoint, so
 * reaching the total and finishing the curve happen together.
 *
 * The count is the only imperative thing in the component. It is a real
 * animation frame loop rather than an ECharts animation, because ECharts
 * animates marks and this is text — but it is bound to the same duration and
 * the same easing, or the two would arrive at different times.
 *
 * `buildOption` is pure and exported and holds the *final* figure, so the
 * server-rendered preview shows the total rather than an empty label.
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
 *
 * This one returns the instance as well as the ref, because the counter has to
 * write into the chart after it is mounted.
 */
function useECharts<T extends HTMLElement>(
  option: EChartsOption,
  onReady?: (chart: echarts.ECharts) => (() => void) | void,
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const chart = echarts.init(node, null, { renderer: 'svg' });
    chart.setOption(option);
    const stop = onReady?.(chart);

    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(node);

    return () => {
      stop?.();
      observer.disconnect();
      chart.dispose();
    };
    // `onReady` is deliberately not a dependency: it is a callback the caller
    // redefines every render, and depending on it would tear the chart down and
    // restart the count on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

/**
 * Daily bookings across 180 days, in thousands.
 *
 * Generated rather than written out: 180 literals would not be readable, and
 * the shape is what matters — a seasonal swell on a rising trend.
 */
export const DAILY: readonly number[] = Array.from(
  { length: 180 },
  (_, i) => 14 + 10 * Math.sin(i / 29) + i * 0.12 + rnd(i + 1, 3) * 6,
);

/** How long the curve takes to draw, and therefore how long the count runs. */
const DURATION = 2600;

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN'];

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const MUTED = '#8F8E88';
const FAINT = '#C6C5BF';

const SANS = "'Inter', sans-serif";

/** The running total at each day. */
function cumulative(daily: readonly number[]): number[] {
  let sum = 0;
  return daily.map((v) => (sum += v));
}

/** The headline, as ECharts graphic elements. Shared by the draw and the count. */
function kpi(millions: number) {
  return [
    {
      id: 'kpi',
      type: 'group' as const,
      left: 16,
      top: 8,
      children: [
        {
          type: 'text' as const,
          style: { text: `$${millions.toFixed(2)}M`, font: `800 32px ${SANS}`, fill: INK },
        },
        {
          type: 'text' as const,
          style: { text: 'ARR · H1 2026', y: 38, font: `600 10px ${SANS}`, fill: MUTED },
        },
      ],
    },
  ];
}

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(daily: readonly number[]): EChartsOption {
  const cum = cumulative(daily);
  const total = cum[cum.length - 1] ?? 0;

  return {
    animationDuration: DURATION,
    animationEasing: 'cubicOut',
    textStyle: { fontFamily: SANS },
    // The figure is the chart's subject and sits in the plot; a tooltip
    // repeating a day's running total would compete with it.
    tooltip: { show: false },

    // The finished figure. The mounted component counts up to it; a static
    // render shows it reached, which is the honest end state.
    graphic: kpi(total / 1000),

    grid: { left: 14, right: 20, top: 64, bottom: 24 },

    xAxis: {
      type: 'category',
      data: daily.map((_, i) => i),
      boundaryGap: false,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: {
        color: FAINT,
        fontFamily: SANS,
        fontSize: 9,
        fontWeight: 600,
        interval: 29,
        // A category axis hands its formatter the label as a string.
        formatter: (i: string) => MONTHS[Math.floor(Number(i) / 30)] ?? '',
      },
    },
    // The headline carries the magnitude, so a scale beside it would be a
    // second, quieter answer to the same question.
    yAxis: { show: false, max: total * 1.06 },

    series: [
      {
        type: 'line',
        data: cum.map((x) => Math.round(x)),
        smooth: 0.2,
        symbol: 'none',
        // Hairline, under the language's 1.4px ceiling.
        lineStyle: { color: INK, width: 1.1 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(28, 28, 26, 0.14)' },
              { offset: 1, color: 'rgba(28, 28, 26, 0)' },
            ],
          },
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
export const previewOption = (): EChartsOption => buildOption(DAILY);

export function DrawInCounter({ daily = DAILY }: { daily?: readonly number[] }) {
  const option = useMemo(() => buildOption(daily), [daily]);
  const total = useMemo(() => {
    const cum = cumulative(daily);
    return cum[cum.length - 1] ?? 0;
  }, [daily]);

  const ref = useECharts<HTMLDivElement>(option, (chart) => {
    // Same duration and easing as the line, so the figure lands as the curve
    // finishes. Draws once and stops — this language forbids looping motion.
    const reduced =
      typeof matchMedia === 'function' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    let frame = 0;
    const started = performance.now();
    const tick = () => {
      const p = Math.min(1, (performance.now() - started) / DURATION);
      const eased = 1 - Math.pow(1 - p, 3);
      chart.setOption({ graphic: kpi((total * eased) / 1000) });
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  });

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-draw-in-counter">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
