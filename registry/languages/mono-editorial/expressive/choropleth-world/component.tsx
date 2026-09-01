/**
 * Monthly actives by country — mono-editorial
 *
 * A choropleth in five bands rather than a continuous ramp. Continuous shading
 * asks a reader to judge a grey against a legend gradient, which nobody can do;
 * five steps ask them to match a swatch, which anybody can.
 *
 * Antarctica is cropped by `boundingCoords`. It carries no data, and leaving it
 * in spends a quarter of the card's height on a shape that says nothing.
 *
 * **The geography is vendored.** It used to be fetched at mount from a CDN
 * pinned to `echarts@4.9.0` — a different major version from the one drawing
 * the chart — which broke offline, could not be smoke-tested, and left the
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

/** One row per country: `[country, monthlyActivesK]`. */
export type Country = readonly [country: string, mauK: number];

export const COUNTRIES: readonly Country[] = [
  ['United States', 95], ['India', 62], ['United Kingdom', 48], ['Germany', 41],
  ['Brazil', 39], ['Canada', 34], ['France', 30], ['Australia', 28],
  ['China', 26], ['Japan', 26], ['Korea', 21], ['Spain', 19],
  ['Italy', 17], ['Singapore', 16], ['Indonesia', 15], ['Mexico', 14],
  ['Netherlands', 13], ['Poland', 13], ['Sweden', 12], ['Ireland', 12],
  ['Philippines', 11], ['Turkey', 10], ['Vietnam', 9], ['South Africa', 9],
  ['Denmark', 9], ['Norway', 8], ['Thailand', 8], ['Malaysia', 8],
  ['United Arab Emirates', 8], ['Argentina', 7], ['Finland', 7], ['Nigeria', 7],
  ['Chile', 6], ['Colombia', 6], ['Saudi Arabia', 6], ['Ukraine', 6],
  ['New Zealand', 6], ['Egypt', 5], ['Pakistan', 5], ['Russia', 5],
  ['Portugal', 5], ['Greece', 4], ['Kenya', 4], ['Peru', 4],
  ['Morocco', 3], ['Iceland', 2], ['Iran', 2], ['Kazakhstan', 2],
  ['Ethiopia', 2], ['Ghana', 2], ['Ecuador', 2], ['Algeria', 2],
  ['Mongolia', 1], ['Libya', 1],
];

/**
 * The five largest, labelled in place with a nudge where the shape is crowded.
 *
 * A map with no labels at all makes a reader hover to learn anything; labelling
 * every country makes a fog. Five anchors is enough to orient from.
 */
const ANCHORS: Record<string, readonly [string, readonly [number, number]]> = {
  'United States': ['US 95k', [0, 0]],
  India: ['IN 62k', [0, 4]],
  'United Kingdom': ['UK 48k', [-26, -12]],
  Germany: ['DE 41k', [26, 14]],
  Brazil: ['BR 39k', [0, 0]],
};

const MAP_NAME = 'mono-world';

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
  echarts.registerMap(MAP_NAME, GEO as never);
  registered = true;
}

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(countries: readonly Country[] = COUNTRIES): EChartsOption {
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
          ? `${hit.name} — not opened yet`
          : `${hit.name} — ${v}k MAU`;
      },
    },

    visualMap: {
      type: 'piecewise',
      bottom: 2,
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
        top: 4,
        bottom: 36,
        // Crops Antarctica, which has no data and would take a quarter of the
        // card to say so.
        boundingCoords: [
          [-170, 76],
          [190, -58],
        ],
        // Borders in the page colour, not in ink: a knockout gap separates
        // neighbours without outlining two hundred shapes.
        itemStyle: { areaColor: EMPTY, borderColor: PAPER, borderWidth: 0.7 },
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
          itemStyle: { areaColor: undefined, borderColor: INK, borderWidth: 1.1 },
        },
        // A map is not a filter. Clicking a country should do nothing.
        select: { disabled: true },
        data: countries.map(([name, value]) => {
          const anchor = ANCHORS[name];
          return {
            name,
            value,
            label: anchor
              ? {
                  show: true,
                  formatter: anchor[0],
                  offset: [...anchor[1]],
                  fontFamily: SANS,
                  fontSize: 9,
                  fontWeight: 800,
                  color: PAPER,
                  textBorderColor: INK,
                  textBorderWidth: 2,
                }
              : undefined,
          };
        }),
      },
    ],
  };
}

/**
 * The option the sample data produces, with no arguments.
 *
 * The build and the conformance lint both need a chart's real marks without
 * mounting React — `useEffect` does not run under server rendering. The map has
 * to be registered first, because an option naming an unknown map draws an
 * empty frame rather than failing.
 */
export const previewOption = (): EChartsOption => {
  registerGeography();
  return buildOption();
};

export function ChoroplethWorld({
  countries = COUNTRIES,
}: {
  countries?: readonly Country[];
}) {
  const option = useMemo(() => {
    registerGeography();
    return buildOption(countries);
  }, [countries]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-choropleth-world">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
