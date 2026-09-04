/**
 * Ninety days as a barcode — mono-editorial
 *
 * Every day gets a hairline whether or not anything happened in it, and the
 * dot on each marks that day's peak. The full-height hairlines are the
 * calendar; the dots are the data. Reading the field comes before reading any
 * number, which is the whole argument of this language.
 *
 * The stem hanging below each dot is gravity rather than a second measurement.
 * It gives the dot somewhere to sit and stops ninety marks reading as a
 * scatter.
 *
 * Weekends are hollow, and the three highest days are labelled — kept six days
 * apart so two peaks never print on top of each other.
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

const DAYS = 90;

/**
 * Peak concurrent users per day.
 *
 * Generated rather than written out: ninety literals would not read, and the
 * shape is the point — a season with a slow swell and a weekly ripple over it.
 */
export const PEAKS: readonly number[] = Array.from(
  { length: DAYS },
  (_, d) => 95 + 55 * Math.sin(d / 9.5) + 30 * Math.sin(d / 3.7) + rnd(d + 1, 5) * 40,
);

/** Day 0 is a Monday. */
const isWeekend = (d: number) => d % 7 === 5 || d % 7 === 6;

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const GRID = '#DEDDD6';
const MUTED = '#8F8E88';
const QUIET = '#B0AFA9';

const SANS = "'Inter', sans-serif";

/**
 * The three highest days, kept apart.
 *
 * Two adjacent peaks are one peak, and labelling both prints two figures on
 * top of each other.
 */
export function peaks(values: readonly number[], apart = 6, count = 3): number[] {
  const found: number[] = [];
  for (const d of [...values.keys()].sort((a, b) => (values[b] ?? 0) - (values[a] ?? 0))) {
    if (found.every((f) => Math.abs(f - d) >= apart)) found.push(d);
    if (found.length === count) break;
  }
  return found;
}

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(values: readonly number[] = PEAKS): EChartsOption {
  const top = peaks(values);
  const floor = 0;
  const ceiling = Math.max(...values) * 1.18;

  // The calendar: one full-height hairline per day, drawn whether or not the
  // day did anything.
  const calendar: ([number, number] | null)[] = [];
  // The stems: from each dot down towards the floor, by a varying amount.
  const stems: ([number, number] | null)[] = [];

  values.forEach((v, d) => {
    calendar.push([d, floor], [d, ceiling], null);
    const drop = v - (14 + rnd(d + 1, 9) * 26);
    stems.push([d, v], [d, Math.max(floor, drop)], null);
  });

  return {
    color: [GRID, INK, INK, PAPER],
    // Draws once and holds. This language forbids looping animation.
    animationDuration: 900,
    animationEasing: 'quarticOut',
    animationDelay: (i: number) => i * 4,
    textStyle: { fontFamily: SANS },

    tooltip: {
      trigger: 'axis',
      backgroundColor: INK,
      borderWidth: 0,
      padding: [10, 14],
      axisPointer: { type: 'none' },
      textStyle: { color: PAPER, fontFamily: SANS, fontSize: 12 },
      formatter: (p: CallbackDataParams | CallbackDataParams[]) => {
        const hit = Array.isArray(p) ? p[0] : p;
        if (!hit) return '';
        const d = hit.dataIndex ?? 0;
        return `Day ${d + 1} — ${Math.round(values[d] ?? 0)} peak users`;
      },
    },

    grid: { left: 22, right: 22, top: 20, bottom: 42 },

    xAxis: {
      type: 'value',
      min: -1,
      max: DAYS,
      splitLine: { show: false },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: MUTED,
        fontFamily: SANS,
        fontSize: 7,
        fontWeight: 600,
        interval: 0,
        formatter: (v: number) =>
          v === 0 ? 'APR' : v === 44 ? 'MAY' : v === 88 ? 'JUN' : '',
      },
    },
    // The field is read as texture; a scale of numbers up the side would
    // invite exactly the reading the note argues against.
    yAxis: { show: false, min: floor, max: ceiling },

    series: [
      {
        // The calendar. Every day, whether or not it did anything.
        type: 'line',
        data: calendar,
        symbol: 'none',
        // Hairline, well under the language's 1.4px ceiling.
        lineStyle: { color: GRID, width: 0.7 },
        silent: true,
        z: 1,
      },
      {
        // The stems. Gravity, not a measurement.
        type: 'line',
        data: stems,
        symbol: 'none',
        lineStyle: { color: INK, width: 1.1 },
        silent: true,
        z: 2,
      },
      {
        // The peaks. One dot per day, hollow at the weekend, enlarged and
        // labelled on the three highest.
        type: 'scatter',
        data: values.map((v, d) => ({
          value: [d, v],
          symbolSize: top.includes(d) ? 9 : 4.6,
          itemStyle: {
            color: isWeekend(d) ? PAPER : INK,
            borderColor: INK,
            borderWidth: isWeekend(d) ? 1.1 : 0,
          },
          label: { show: top.includes(d) },
        })),
        label: {
          show: false,
          position: 'top',
          distance: 6,
          color: INK,
          fontFamily: SANS,
          fontSize: 9,
          fontWeight: 800,
          // Knocked out of the page colour, so a figure stays legible over the
          // calendar behind it.
          textBorderColor: PAPER,
          textBorderWidth: 3,
          formatter: (p: CallbackDataParams) => {
            const [, v] = p.value as [number, number];
            return String(Math.round(v));
          },
        },
        z: 3,
      },
    ],

    graphic: [
      {
        type: 'text',
        left: 'center',
        bottom: 6,
        style: {
          text: 'ONE HAIRLINE = ONE DAY · DOT = THAT DAY’S PEAK · HOLLOW = WEEKEND',
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

export function BarcodeLollipop({ values = PEAKS }: { values?: readonly number[] }) {
  const option = useMemo(() => buildOption(values), [values]);
  const ref = useECharts<HTMLDivElement>(option);

  // The note and the legend sit beside the marks rather than above the card.
  // They explain how to read the field, which is annotation and belongs in the
  // composition — unlike a title, which names the component and is printed by
  // whatever lists it.
  return (
    <div className="nx-barcode-lollipop">
      <div className="card">
        <div className="split">
          <div>
            <p className="note">
              Every hairline is a day, whether or not anything happened in it.
              The dot marks the day’s peak; the stem below it is just gravity.
              Read the field, not the numbers — the season has a texture before
              it has a value.
            </p>
            <ul className="legend">
              <li>● Weekday peak</li>
              <li>○ Weekend peak</li>
              <li>│ One calendar day</li>
              <li>◉ Top three, labelled</li>
            </ul>
          </div>
          <div className="chart" ref={ref} />
        </div>
      </div>
    </div>
  );
}
