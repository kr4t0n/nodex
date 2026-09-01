/**
 * Eight products, eight years of revenue — mono-editorial
 *
 * A bar race: bars re-sort as the years advance, so overtaking is visible as
 * movement rather than inferred from two static charts. Tone is bound to rank
 * rather than to product, which means a product darkens as it climbs and the
 * leader is always ink.
 *
 * **It plays through once and holds on the final year.** The imported version
 * looped the eight years forever, which this language forbids outright —
 * "never animate on a loop". Playing once and stopping is not a compromise
 * here, it is the language's own motion model: marks draw themselves when they
 * scroll into view, and a click replays. Under `prefers-reduced-motion` it
 * skips straight to the last year.
 *
 * `buildOption` is pure and exported, so the build server-renders it to a
 * static preview and the conformance lint reads the marks it really produces.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
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
  const chart = useRef<echarts.ECharts>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const instance = echarts.init(node, null, { renderer: 'svg' });
    chart.current = instance;
    const observer = new ResizeObserver(() => instance.resize());
    observer.observe(node);

    return () => {
      observer.disconnect();
      instance.dispose();
      chart.current = null;
    };
  }, []);

  // Setting the option is separate from creating the chart, so advancing a year
  // moves the bars that are already there. Rebuilding the instance each frame
  // would restart the race from nothing and realtimeSort would have nothing to
  // sort against.
  useEffect(() => {
    chart.current?.setOption(option);
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

export const PRODUCTS = [
  'Editor',
  'Boards',
  'Docs',
  'Chat',
  'Flows',
  'Vault',
  'Pages',
  'Sync',
] as const;

export const YEARS = [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026] as const;

/**
 * Revenue in $K: one row per year, one column per product.
 *
 * Grown from a starting spread rather than written out, because sixty-four
 * literals would not read and the point is the overtaking. Each product grows
 * at its own steady-ish rate, so ranks change without the run looking random.
 */
export const REVENUE: readonly (readonly number[])[] = (() => {
  const first = [42, 38, 30, 26, 18, 14, 10, 8];
  const rows: number[][] = [first];
  for (let y = 1; y < YEARS.length; y++) {
    const prev = rows[y - 1] ?? first;
    rows.push(prev.map((v, i) => v * (1.04 + rnd(i + 1, y + 1) * 0.5)));
  }
  return rows;
})();

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const GRID = '#DEDDD6';
const LABEL = '#6A6963';
// Darkest first, indexed by rank: the leader is ink, the last is the palest.
const LADDER = ['#1C1C1A', '#4A4944', '#6A6963', '#8F8E88', '#B0AFA9', '#C6C5BF'];

const SANS = "'Inter', sans-serif";

/** How long one year holds before the next. */
const STEP_MS = 1150;

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(
  year: number,
  products: readonly string[] = PRODUCTS,
): EChartsOption {
  const row = REVENUE[year] ?? REVENUE[0] ?? [];
  // Rank once, so tone and position agree.
  const rank = row
    .map((v, i) => [v, i] as const)
    .sort((a, b) => b[0] - a[0])
    .map(([, i]) => i);

  return {
    color: LADDER,
    // No entry animation: the bars are already on screen and the motion that
    // matters is them re-sorting between years.
    animationDuration: 0,
    animationDurationUpdate: 950,
    animationEasingUpdate: 'linear',
    textStyle: { fontFamily: SANS },

    tooltip: {
      backgroundColor: INK,
      borderWidth: 0,
      padding: [10, 14],
      textStyle: { color: PAPER, fontFamily: SANS, fontSize: 12 },
      valueFormatter: (v) => `$${Math.round(v as number)}K`,
    },

    grid: { left: 64, right: 64, top: 8, bottom: 8 },

    xAxis: {
      type: 'value',
      max: 'dataMax',
      // The label on each bar carries its value, so a scale would repeat it —
      // and a scale that rescales every year is noise rather than reference.
      splitLine: { show: false },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { show: false },
    },
    yAxis: {
      type: 'category',
      data: [...products],
      inverse: true,
      max: products.length - 1,
      // Faster than the bars, so a label arrives with its row rather than
      // trailing it.
      animationDuration: 300,
      animationDurationUpdate: 300,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: LABEL, fontFamily: SANS, fontSize: 9.5, fontWeight: 600 },
    },

    series: [
      {
        type: 'bar',
        realtimeSort: true,
        barCategoryGap: '32%',
        data: row.map((v, i) => ({
          value: v,
          itemStyle: {
            color: LADDER[Math.min(LADDER.length - 1, rank.indexOf(i))] ?? INK,
            borderRadius: 99,
          },
        })),
        label: {
          show: true,
          position: 'right',
          valueAnimation: true,
          fontFamily: SANS,
          fontSize: 12,
          fontWeight: 800,
          color: INK,
          formatter: (p: CallbackDataParams) => `$${Math.round(p.value as number)}K`,
        },
      },
    ],

    // The year, large and quiet, in the corner the bars grow away from.
    graphic: [
      {
        id: 'yr',
        type: 'text',
        right: 18,
        bottom: 14,
        style: { text: String(YEARS[year] ?? ''), font: `800 44px ${SANS}`, fill: GRID },
      },
    ],
  };
}

/**
 * The option the sample data produces, with no arguments.
 *
 * The final year, because that is where the race comes to rest — a static
 * preview should show the state a reader is left looking at, not the start.
 */
export const previewOption = (): EChartsOption => buildOption(YEARS.length - 1);

export function BarRace({ products = PRODUCTS }: { products?: readonly string[] }) {
  const [year, setYear] = useState(0);
  const [run, setRun] = useState(0);
  const option = useMemo(() => buildOption(year, products), [year, products]);
  const ref = useECharts<HTMLDivElement>(option);

  useEffect(() => {
    const reduced =
      typeof matchMedia === 'function' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setYear(YEARS.length - 1);
      return;
    }

    setYear(0);
    // Plays through once and stops on the last year. Not a loop: the interval
    // clears itself at the end, and only a click starts another run.
    const timer = setInterval(() => {
      setYear((y) => {
        if (y >= YEARS.length - 1) {
          clearInterval(timer);
          return y;
        }
        return y + 1;
      });
    }, STEP_MS);

    return () => clearInterval(timer);
  }, [run]);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-bar-race">
      <div className="card">
        {/* A button rather than a click handler on the chart, so replaying is
            reachable by keyboard and announced. */}
        <button
          type="button"
          className="replay"
          onClick={() => setRun((r) => r + 1)}
          aria-label={`Showing ${YEARS[year]}. Replay from ${YEARS[0]}.`}
        >
          <div className="chart" ref={ref} />
        </button>
      </div>
    </div>
  );
}
