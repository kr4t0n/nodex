/**
 * What people fear about the next year — mono-editorial
 *
 * A multi-select survey drawn as four rows of a hundred people. Every option
 * gets the whole hundred, and the ones who picked it are inked — so the rows
 * do not sum to a hundred and are not supposed to, which a stacked bar would
 * quietly imply.
 *
 * The unpicked ninety are drawn, short and pale, rather than left as empty
 * space. That is the difference between "forty-six percent" and "forty-six
 * people out of these hundred": the denominator is visible.
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

/** One row per option: `[option, pickedOutOfAHundred]`. */
export type Option = readonly [option: string, picked: number];

export const OPTIONS: readonly Option[] = [
  ['DO MORE WITH THE SAME PAY', 51],
  ['AN UNSUSTAINABLE PACE', 46],
  ['QUALITY OF WORK SLIPPING', 41],
  ['BEING REPLACED OUTRIGHT', 22],
];

/** Everyone asked. Each row shows all of them. */
const PEOPLE = 100;

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const GRID = '#DEDDD6';
const UNPICKED = '#CFCEC7';
const FAINT = '#C6C5BF';
const QUIET = '#B0AFA9';
const LABEL = '#6A6963';

const SANS = "'Inter', sans-serif";

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(options: readonly Option[] = OPTIONS): EChartsOption {
  const picked: { value: [number, number]; symbolSize: [number, number] }[] = [];
  const unpicked: { value: [number, number]; symbolSize: [number, number] }[] = [];
  const beads: [number, number][] = [];

  options.forEach(([, count], i) => {
    for (let k = 0; k < PEOPLE; k++) {
      const chosen = k < count;
      // A picked tick is tall and varies; an unpicked one is short and even.
      // The texture difference carries as much as the tone does.
      const height = chosen ? 12 + rnd(k + 1, i + 2) * 5 : 4.5 + rnd(k + 1, i + 5) * 2;
      const mark = {
        value: [k, i] as [number, number],
        symbolSize: [chosen ? 0.9 : 0.55, height] as [number, number],
      };
      (chosen ? picked : unpicked).push(mark);
      // A bead every tenth person, so a row can be counted in tens.
      if (k % 10 === 0) beads.push([k, i]);
    }
  });

  return {
    color: [UNPICKED, INK, FAINT, INK],
    // Draws once and holds. This language forbids looping animation.
    animationDuration: 900,
    animationEasing: 'quarticOut',
    animationDelay: (i: number) => i * 4,
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
        const option = options[i];
        return option
          ? `${option[1]} of ${PEOPLE} picked this — they could pick several`
          : '';
      },
    },

    grid: { left: 22, right: 22, top: 38, bottom: 44 },

    xAxis: {
      show: false,
      type: 'value',
      min: -1,
      max: PEOPLE,
    },
    yAxis: {
      type: 'category',
      data: options.map(([option]) => option),
      inverse: true,
      axisLine: { show: false },
      axisTick: { show: false },
      // A rule under each row, so a row of short ticks still has a baseline.
      splitLine: { show: true, lineStyle: { color: GRID, width: 0.6 } },
      axisLabel: { show: false },
    },

    series: [
      {
        // The ninety who did not pick it. Drawn, so the denominator is visible.
        type: 'scatter',
        symbol: 'rect',
        symbolOffset: [0, -6],
        itemStyle: { color: UNPICKED },
        data: unpicked,
        silent: true,
        z: 1,
      },
      {
        // The people who did.
        type: 'scatter',
        symbol: 'rect',
        symbolOffset: [0, -9],
        itemStyle: { color: INK },
        data: picked,
        z: 2,
      },
      {
        // The counting beads, just under each row.
        type: 'scatter',
        symbolSize: 1.6,
        symbolOffset: [0, 5],
        itemStyle: { color: FAINT },
        data: beads,
        silent: true,
        z: 3,
      },
      {
        // The count, at the boundary between picked and not.
        type: 'scatter',
        symbolSize: 0,
        silent: true,
        z: 4,
        data: options.map(([, count], i) => ({ value: [count - 1, i] })),
        label: {
          show: true,
          position: 'top',
          distance: 14,
          color: INK,
          fontFamily: SANS,
          fontSize: 11,
          fontWeight: 800,
          // Knocked out of the page colour, so the figure stays legible over
          // whichever ticks it lands on.
          textBorderColor: PAPER,
          textBorderWidth: 3,
          formatter: (p: CallbackDataParams) => {
            const [, i] = p.value as [number, number];
            return String(options[i]?.[1] ?? '');
          },
        },
      },
    ],

    graphic: [
      // Each option named above its own row. A category axis would put these
      // down the left and squeeze the hundred ticks into nothing.
      ...options.map(([option], i) => ({
        type: 'text' as const,
        left: 22,
        top: `${13 + i * 22}%`,
        style: {
          text: option,
          font: `700 7.5px ${SANS}`,
          fill: LABEL,
        },
      })),
      {
        type: 'text' as const,
        left: 'center',
        bottom: 6,
        style: {
          text: 'EACH ROW IS THE SAME HUNDRED PEOPLE · THEY COULD PICK SEVERAL',
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

export function BallotTally({ options = OPTIONS }: { options?: readonly Option[] }) {
  const option = useMemo(() => buildOption(options), [options]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-ballot-tally">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
