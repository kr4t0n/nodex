/**
 * Sixty seconds of request latency, three percentiles — signal-console
 *
 * Chosen for ECharts rather than hand-drawn SVG because the work here is
 * genuinely the library's: a value axis that picks its own ticks, an axis
 * pointer that reads all three series at once, and a `visualMap` that recolours
 * the p99 line where it crosses the objective. Doing that last one by hand
 * means splitting the path at every threshold crossing and interpolating the
 * crossing point, which is real geometry for no design gain.
 *
 * The option builder is pure and exported, so the build can server-render it to
 * a static preview and the conformance lint can read the marks it produces
 * without a browser.
 */
import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';

import { useECharts } from '../../../../lib/use-echarts.ts';

/**
 * One row per second: `[secondsAgo, p50, p95, p99]`, all latencies in ms.
 *
 * Percentiles, not requests. This language aggregates — the gateway serves
 * thousands of requests a second and the chart's job is the shape of the tail,
 * not a mark per call.
 */
export type LatencySample = readonly [
  secondsAgo: number,
  p50: number,
  p95: number,
  p99: number,
];

/** The latency objective this service is held to, in ms. */
export const OBJECTIVE_MS = 250;

/**
 * Deterministic, never `Math.random()`: a preview and a screenshot of it have
 * to agree, or no visual diff means anything.
 */
const seed = (i: number, k: number) =>
  Math.abs(((i * 73856093) ^ (k * 19349663)) % 1000) / 1000;

export const SAMPLES: readonly LatencySample[] = Array.from(
  { length: 60 },
  (_, i): LatencySample => {
    const second = 59 - i;
    // A slow burn into a breach around the 40s mark, so the chart has something
    // to say rather than sitting flat.
    const pressure = Math.max(0, (i - 34) / 25);
    const p50 = Math.round(42 + seed(i, 3) * 14 + pressure * 26);
    const p95 = Math.round(p50 + 58 + seed(i, 11) * 34 + pressure * 96);
    const p99 = Math.round(p95 + 46 + seed(i, 7) * 40 + pressure * 132);
    return [second, p50, p95, p99];
  },
);

// The accent ladder, quietest to loudest: p50 is background, p99 is the one
// being watched. Magnitude uses this ladder and nothing else, so the status
// pair stays free to mean "this is breaching" and only that.
const ACCENT = { p50: '#1D6B52', p95: '#2FA37C', p99: '#4DD4A8' } as const;
const BREACH = '#F0616D';
const OBJECTIVE = '#E3B341';
const AXIS = { label: '#5A6472', line: '#1E242E' } as const;

const MONO =
  "'JetBrains Mono', ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace";

const AXIS_TEXT = { color: AXIS.label, fontFamily: MONO, fontSize: 9 };

export interface LatencyPercentilesData {
  samples: readonly LatencySample[];
  objectiveMs: number;
}

/** Pure. No DOM, no React — the whole design language, checkable by running it. */
export function buildOption({
  samples,
  objectiveMs,
}: LatencyPercentilesData): EChartsOption {
  const seconds = samples.map(([s]) => s);

  // Carries one sample either side of a breach so the red segment meets the
  // green one at the crossing rather than floating clear of it.
  const breachOnly = (sample: LatencySample, i: number) => {
    const over = (s?: LatencySample) => (s ? s[3] > objectiveMs : false);
    return over(sample) || over(samples[i - 1]) || over(samples[i + 1])
      ? sample[3]
      : (null as unknown as number);
  };
  const series = (
    name: string,
    pick: (s: LatencySample, i: number) => number,
    color: string,
    width: number,
  ) => ({
    name,
    type: 'line' as const,
    data: samples.map(pick),
    showSymbol: false,
    // 2px floor: below it a mark is a rendering accident in this language.
    lineStyle: { color, width },
    itemStyle: { color },
    emphasis: { disabled: true },
  });

  return {
    // Marks arrive fast. A console that animates in slowly is lying about how
    // fresh its data is.
    animationDuration: 350,
    animationEasing: 'cubicOut',
    textStyle: { fontFamily: MONO },
    grid: { top: 18, right: 12, bottom: 22, left: 40 },

    xAxis: {
      type: 'category',
      data: seconds,
      boundaryGap: false,
      axisLine: { lineStyle: { color: AXIS.line } },
      axisTick: { show: false },
      axisLabel: {
        ...AXIS_TEXT,
        interval: 14,
        formatter: (v: string) => (v === '0' ? 'NOW' : `-${v}S`),
      },
    },
    yAxis: {
      type: 'value',
      // Whitespace here reads as missing data, so the axis starts at the floor
      // of the data rather than at zero.
      min: 0,
      splitLine: { lineStyle: { color: AXIS.line } },
      axisLabel: { ...AXIS_TEXT, formatter: (v: number) => `${v}` },
    },

    series: [
      series('p50', (s) => s[1], ACCENT.p50, 2),
      series('p95', (s) => s[2], ACCENT.p95, 2),
      {
        ...series('p99', (s) => s[3], ACCENT.p99, 2.6),
        markLine: {
          silent: true,
          symbol: 'none',
          data: [{ yAxis: objectiveMs }],
          lineStyle: { color: OBJECTIVE, width: 1, type: 'dashed' },
          label: {
            formatter: `SLO ${objectiveMs}MS`,
            color: OBJECTIVE,
            fontFamily: MONO,
            fontSize: 9,
            fontWeight: 600,
            position: 'insideEndTop',
          },
        },
      },
      {
        // The breach drawn last, so it lies over the p99 line rather than
        // under it, and at emphasis weight so it reads as the thing to look
        // at. Null everywhere within objective.
        //
        // `visualMap` is the obvious way to recolour a line by value, and it
        // throws under SSR: ECharts computes a gradient along the line and
        // finds no colour stops without a live coordinate system, so the
        // static preview and the lint both die. Splitting the data is what you
        // would have done by hand anyway.
        ...series('p99 breach', breachOnly, BREACH, 3.2),
        connectNulls: false,
      },
    ],

    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line', lineStyle: { color: AXIS.label, width: 1 } },
      backgroundColor: '#12161D',
      borderColor: AXIS.line,
      textStyle: { color: '#D7DEE8', fontFamily: MONO, fontSize: 11 },
    },
  };
}

export interface LatencyPercentilesProps
  extends Partial<LatencyPercentilesData> {
  label?: string;
  source?: string;
  window?: string;
}

export function LatencyPercentiles({
  samples = SAMPLES,
  objectiveMs = OBJECTIVE_MS,
  label = 'REQUEST LATENCY',
  source = 'EDGE GATEWAY',
  window: windowLabel = '60S WINDOW',
}: LatencyPercentilesProps) {
  const option = useMemo(
    () => buildOption({ samples, objectiveMs }),
    [samples, objectiveMs],
  );
  const ref = useECharts<HTMLDivElement>(option);

  // The head carries the current value, because the first question asked of a
  // live chart is "what is it now". The newest sample is the last row.
  const current = samples[samples.length - 1]?.[3] ?? 0;
  const breaching = current > objectiveMs;

  return (
    <div className="nx-latency-percentiles">
      <div className="card">
        <div className="head">
          <span className="label">{label}</span>
          <span className={breaching ? 'value breach' : 'value'}>
            {current}ms <span className="unit">P99</span>
          </span>
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
