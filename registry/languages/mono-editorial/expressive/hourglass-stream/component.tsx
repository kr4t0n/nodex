/**
 * Five funnel stages, one tick per forty people — mono-editorial
 *
 * A funnel drawn as five barcode strips rather than five stacked trapezoids.
 * The strip's width is the count, so the narrowing is still the shape of the
 * funnel, but the strip is made of countable ticks: the reader sees a
 * population thinning rather than an area shrinking, and an area is the thing
 * a funnel chart is routinely accused of misreading.
 *
 * Threads trickle between the strips. They are illustrative rather than
 * measured — thirty-four of them regardless of the volume — and they carry the
 * sense of a flow that the rate in the margin states exactly.
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

/** One row per stage: `[stage, people]`. Descending, as a funnel is. */
export type Stage = readonly [stage: string, people: number];

export const STAGES: readonly Stage[] = [
  ['VISITORS', 4200],
  ['SIGN-UPS', 1900],
  ['ACTIVATED', 960],
  ['RETAINED', 540],
  ['PAYING', 310],
];

/** One tick is forty people. Stated on the card, because it has to be. */
const PER_TICK = 40;

/** How many threads are drawn between two strips. Illustrative, not measured. */
const THREADS = 34;

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const THREAD = '#B0AFA9';
const RULE = '#DEDDD6';
const MUTED = '#8F8E88';
const FAINT = '#C6C5BF';
const LABEL = '#4A4944';

const SANS = "'Inter', sans-serif";

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(stages: readonly Stage[] = STAGES): EChartsOption {
  const widest = Math.max(...stages.map(([, people]) => people));
  const halfWidth = (people: number) => (people / widest) * 145;
  const rowY = (k: number) => -k * 64;

  // Every tick is a mark you could count, jittered so the strip reads as a
  // population rather than as a ruler.
  const ticks: { value: [number, number]; itemStyle: { opacity: number } }[] = [];
  stages.forEach(([, people], k) => {
    const half = halfWidth(people);
    const n = Math.round(people / PER_TICK);
    for (let t = 0; t < n; t++) {
      const x = -half + ((t + 0.5) / n) * half * 2 + (rnd(t + 1, k + 3) - 0.5) * 3;
      ticks.push({
        value: [x, rowY(k)],
        itemStyle: { opacity: 0.45 + rnd(t + 2, k + 5) * 0.5 },
      });
    }
  });

  // The threads, as sampled cubics so each leaves its strip vertically and
  // arrives at the next vertically — straight chords would read as a fan.
  const threads: ([number, number] | null)[] = [];
  for (let k = 0; k < stages.length - 1; k++) {
    const half = halfWidth(stages[k]![1]);
    const nextHalf = halfWidth(stages[k + 1]![1]);
    const top = rowY(k) - 8;
    const bottom = rowY(k + 1) + 8;
    for (let t = 0; t < THREADS; t++) {
      const xt = (rnd(t + 1, k * 7 + 1) - 0.5) * 2 * half * 0.94;
      const xb = (rnd(t + 3, k * 7 + 5) - 0.5) * 2 * nextHalf * 0.94;
      for (let i = 0; i <= 14; i++) {
        const u = i / 14;
        const x =
          (1 - u) ** 3 * xt + 3 * (1 - u) ** 2 * u * xt +
          3 * (1 - u) * u * u * xb + u ** 3 * xb;
        const y =
          (1 - u) ** 3 * top + 3 * (1 - u) ** 2 * u * (top - 26) +
          3 * (1 - u) * u * u * (bottom + 26) + u ** 3 * bottom;
        threads.push([x, y]);
      }
      threads.push(null);
    }
  }

  // A leader from each strip's edge out to its name, so the label belongs to
  // the strip rather than floating beside the column.
  const leaders: ([number, number] | null)[] = [];
  stages.forEach(([, people], k) => {
    leaders.push([halfWidth(people) + 6, rowY(k)], [166, rowY(k)], null);
  });

  return {
    color: [THREAD, INK, RULE, MUTED],
    // Draws once and holds. This language forbids looping animation.
    animationDuration: 900,
    animationEasing: 'quarticOut',
    animationDelay: (i: number) => i * 2,
    textStyle: { fontFamily: SANS },

    tooltip: {
      backgroundColor: INK,
      borderWidth: 0,
      padding: [10, 14],
      textStyle: { color: PAPER, fontFamily: SANS, fontSize: 12 },
      formatter: (p: CallbackDataParams | CallbackDataParams[]) => {
        const hit = Array.isArray(p) ? p[0] : p;
        return String(hit?.name ?? '');
      },
    },

    grid: { left: 74, right: 96, top: 22, bottom: 26 },

    xAxis: { show: false, type: 'value', min: -152, max: 170 },
    yAxis: {
      show: false,
      type: 'value',
      min: rowY(stages.length - 1) - 26,
      max: 26,
    },

    series: [
      {
        // The threads, behind everything.
        type: 'line',
        data: threads,
        symbol: 'none',
        // Hairline, well under the language's 1.4px ceiling.
        lineStyle: { color: THREAD, width: 0.5, opacity: 0.32 },
        silent: true,
        z: 1,
      },
      {
        // The leaders out to the stage names.
        type: 'line',
        data: leaders,
        symbol: 'none',
        lineStyle: { color: RULE, width: 0.8 },
        silent: true,
        z: 2,
      },
      {
        // The strips. Drawn as filled rects rather than strokes, because a
        // tick here is a countable mark rather than a line.
        type: 'scatter',
        data: ticks,
        symbol: 'rect',
        symbolSize: [0.9, 12],
        itemStyle: { color: INK },
        silent: true,
        z: 3,
      },
      {
        // The stage names and their counts.
        type: 'scatter',
        symbolSize: 0,
        z: 4,
        data: stages.map(([stage, people], k) => ({
          value: [170, rowY(k)],
          name: `${stage} — ${people.toLocaleString()}`,
        })),
        label: {
          show: true,
          position: 'right',
          distance: 4,
          align: 'left',
          color: LABEL,
          fontFamily: SANS,
          fontSize: 7.5,
          fontWeight: 700,
          rich: {
            count: { color: INK, fontSize: 9.5, fontWeight: 800, fontFamily: SANS },
          },
          formatter: (p: CallbackDataParams) => {
            const [stage = '', count = ''] = String(p.name ?? '').split(' — ');
            return `${stage}\n{count|${count}}`;
          },
        },
      },
      {
        // The rate between each pair, parked in the left margin. This is the
        // measured number; the threads beside it are only the sense of one.
        type: 'scatter',
        symbolSize: 0,
        silent: true,
        z: 4,
        data: stages.slice(0, -1).map(([, people], k) => ({
          value: [-152, (rowY(k) + rowY(k + 1)) / 2],
          name: `${Math.round((stages[k + 1]![1] / people) * 100)}%`,
        })),
        label: {
          show: true,
          position: 'left',
          distance: 2,
          align: 'right',
          color: MUTED,
          fontFamily: SANS,
          fontSize: 8.5,
          fontWeight: 800,
          rich: {
            through: { color: FAINT, fontSize: 6, fontWeight: 600, fontFamily: SANS },
          },
          formatter: (p: CallbackDataParams) => `${p.name}\n{through|GET THROUGH}`,
        },
      },
    ],

    graphic: [
      {
        type: 'text',
        left: 'center',
        bottom: 2,
        style: {
          text: `ONE TICK = ${PER_TICK} PEOPLE`,
          font: `600 7px ${SANS}`,
          fill: MUTED,
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

export function HourglassStream({ stages = STAGES }: { stages?: readonly Stage[] }) {
  const option = useMemo(() => buildOption(stages), [stages]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-hourglass-stream">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
