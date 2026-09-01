/**
 * Sign-ups by state — mono-editorial
 *
 * A choropleth in five bands rather than a continuous ramp. Continuous shading
 * asks a reader to judge a grey against a legend gradient, which nobody can do;
 * five steps ask them to match a swatch, which anybody can. The bands are the
 * chart, and the ramp only orders them.
 *
 * A state with no sign-ups keeps the empty tone rather than being left white,
 * so "no data" reads as a value rather than as a hole in the map.
 *
 * **The geography is vendored.** It used to be fetched from a CDN when the
 * chart mounted, which broke offline, could not be smoke-tested, and left the
 * chart unrenderable at build time. See `geo.ts`.
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

import { GEO } from './geo.ts';

/** One row per state: `[state, signUpsK]`. */
export type State = readonly [state: string, signUpsK: number];

export const STATES: readonly State[] = [
  ['California', 96], ['New York', 78], ['Texas', 72], ['Washington', 68],
  ['Massachusetts', 66], ['Florida', 54], ['Illinois', 49], ['Colorado', 44],
  ['Georgia', 41], ['Virginia', 33], ['Pennsylvania', 31], ['North Carolina', 30],
  ['New Jersey', 28], ['Oregon', 22], ['Ohio', 21], ['Michigan', 19],
  ['Arizona', 18], ['Minnesota', 16], ['Utah', 15], ['Maryland', 14],
  ['Tennessee', 13], ['Wisconsin', 12], ['Missouri', 11], ['Indiana', 9],
  ['Nevada', 8], ['Connecticut', 7], ['South Carolina', 6], ['Alabama', 5],
  ['Kentucky', 5], ['Oklahoma', 4], ['Iowa', 4], ['Kansas', 3],
  ['Arkansas', 3], ['Louisiana', 3], ['New Hampshire', 2], ['Idaho', 2],
  ['New Mexico', 2], ['Hawaii', 2], ['Maine', 1], ['Nebraska', 1], ['Alaska', 1],
];

const MAP_NAME = 'mono-usa';

/**
 * Alaska, Hawaii and Puerto Rico, moved and scaled.
 *
 * Drawn true to position they would put most of the map in the Pacific. This
 * is the same compromise every US choropleth makes.
 */
const INSETS = {
  Alaska: { left: -131, top: 25, width: 15 },
  Hawaii: { left: -110, top: 28, width: 5 },
  'Puerto Rico': { left: -76, top: 26, width: 2 },
};

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const MUTED = '#8F8E88';
const EMPTY = '#E4E3DC';
const BANDS = ['#D8D7D1', '#B0AFA9', '#8F8E88', '#4A4944', '#1C1C1A'];

const SANS = "'Inter', sans-serif";

/** Registering the map is global to ECharts, so it is done once and guarded. */
let registered = false;
export function registerGeography(): void {
  if (registered) return;
  echarts.registerMap(MAP_NAME, GEO as never, INSETS as never);
  registered = true;
}

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(states: readonly State[] = STATES): EChartsOption {
  return {
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
        const v = hit.value as number;
        return Number.isNaN(v) || v === undefined
          ? `${hit.name} — no data`
          : `${hit.name} — ${v}k sign-ups`;
      },
    },

    // Five bands, each a swatch a reader can match. A continuous ramp would
    // ask them to judge a grey against a gradient instead.
    visualMap: {
      type: 'piecewise',
      bottom: 6,
      left: 'center',
      orient: 'horizontal',
      pieces: [
        { max: 9, label: '≤9k' },
        { min: 10, max: 20, label: '10–20k' },
        { min: 21, max: 38, label: '21–38k' },
        { min: 39, max: 64, label: '39–64k' },
        { min: 65, label: '65k+' },
      ],
      itemWidth: 11,
      itemHeight: 11,
      itemSymbol: 'rect',
      textStyle: { fontFamily: SANS, fontSize: 9, color: MUTED },
      inRange: { color: BANDS },
    },

    series: [
      {
        type: 'map',
        map: MAP_NAME,
        top: 10,
        bottom: 48,
        // Borders in the page colour, not in ink: a knockout gap separates
        // adjacent states without drawing 50 outlines.
        itemStyle: { areaColor: EMPTY, borderColor: PAPER, borderWidth: 1 },
        emphasis: {
          label: {
            show: true,
            fontFamily: SANS,
            fontSize: 10,
            fontWeight: 800,
            color: INK,
            textBorderColor: PAPER,
            textBorderWidth: 3,
          },
          itemStyle: { areaColor: undefined, borderColor: INK, borderWidth: 1.2 },
        },
        // A map is not a filter. Clicking a state should do nothing.
        select: { disabled: true },
        data: states.map(([name, value]) => ({
          name,
          value,
          // The leader is labelled in place, so the map has one anchor a reader
          // can start from without hovering anything.
          label:
            name === 'California'
              ? {
                  show: true,
                  formatter: 'CA 96k',
                  fontFamily: SANS,
                  fontSize: 9,
                  fontWeight: 800,
                  color: PAPER,
                  textBorderColor: INK,
                  textBorderWidth: 2,
                }
              : undefined,
        })),
      },
    ],
  };
}

/**
 * The option the sample data produces, with no arguments.
 *
 * The build and the conformance lint both need a chart's real marks without
 * mounting React — `useEffect` does not run under server rendering. The map
 * has to be registered first, because an option naming an unknown map draws an
 * empty frame rather than failing.
 */
export const previewOption = (): EChartsOption => {
  registerGeography();
  return buildOption();
};

export function ChoroplethStates({ states = STATES }: { states?: readonly State[] }) {
  const option = useMemo(() => {
    registerGeography();
    return buildOption(states);
  }, [states]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-choropleth-states">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
