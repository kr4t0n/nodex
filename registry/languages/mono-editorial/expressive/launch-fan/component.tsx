/**
 * Twelve launches, fanned by week — mono-editorial
 *
 * A radial timeline. Each feature gets a spoke, and its dot sits at the week
 * it shipped — so the launches cascade along a diagonal arc and the gaps
 * between them are visible as gaps rather than as differences in a bar length.
 *
 * Dotted arcs mark every fifth week. They are the scale, and they curve
 * because the geometry does: a straight rule across a fan would cross the
 * spokes at twelve different radii and mean twelve different things.
 *
 * Drawn on hidden value axes with computed positions rather than on a polar
 * coordinate system, because the fan is a fixed 76° wedge anchored off-card —
 * a shape, not a full circle ECharts would want to centre.
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

/** One row per feature: `[feature, launchWeek]`. */
export type Launch = readonly [feature: string, week: number];

export const LAUNCHES: readonly Launch[] = [
  ['Editor', 1], ['Boards', 3], ['Docs', 4], ['Chat', 6],
  ['Flows', 8], ['Vault', 9], ['Pages', 11], ['Sync', 12],
  ['Grid', 14], ['Views', 16], ['Hub', 17], ['Forms', 19],
];

/** Where the fan is anchored, and how wide it opens. */
const ORIGIN: readonly [number, number] = [0, 0];
const FROM = -84;
const SWEEP = 76;

/** Which weeks are ruled. */
const GUIDES = [5, 10, 15, 20];

/** Radius for a given week. The offset keeps week one clear of the hub. */
const radiusOf = (week: number) => 56 + week * 9.7;

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const GUIDE = '#D8D6CE';
const QUIET = '#B0AFA9';
const MUTED = '#8F8E88';
const LABEL = '#6A6963';

const SANS = "'Inter', sans-serif";

const at = (radius: number, deg: number): [number, number] => {
  const rad = (deg * Math.PI) / 180;
  return [ORIGIN[0] + radius * Math.cos(rad), ORIGIN[1] - radius * Math.sin(rad)];
};

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(launches: readonly Launch[] = LAUNCHES): EChartsOption {
  const angleOf = (i: number) => FROM + i * (SWEEP / (launches.length - 1));

  // Each spoke runs from the hub out to its own launch week.
  const spokes: ([number, number] | null)[] = [];
  const dots: { value: [number, number]; name: string }[] = [];

  launches.forEach(([feature, week], i) => {
    const angle = angleOf(i);
    spokes.push(at(radiusOf(0), angle), at(radiusOf(week), angle), null);
    dots.push({ value: at(radiusOf(week), angle), name: `${feature} · W${week}` });
  });

  // The week guides, as real arcs rather than straight rules.
  const arcs: ([number, number] | null)[] = [];
  const guideLabels: { value: [number, number]; name: string }[] = [];
  for (const week of GUIDES) {
    const radius = radiusOf(week);
    for (let t = 0; t <= 24; t++) {
      arcs.push(at(radius, FROM + (t / 24) * SWEEP));
    }
    arcs.push(null);
    guideLabels.push({ value: at(radius, FROM - 4), name: `W${week}` });
  }

  const reach = radiusOf(Math.max(...launches.map(([, w]) => w))) + 30;

  return {
    color: [GUIDE, QUIET, INK, MUTED],
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
        return String(hit?.name ?? '');
      },
    },

    grid: { left: 26, right: 26, top: 20, bottom: 24 },

    // Both axes span the wedge the fan actually occupies. The projection puts
    // everything in the positive quadrant, and a range guessed from the hub's
    // position instead left the whole chart off the top of the card.
    xAxis: { show: false, type: 'value', min: -18, max: reach },
    yAxis: { show: false, type: 'value', min: 0, max: reach },

    series: [
      {
        // The week guides. Curved, because a straight rule across a fan would
        // cross the spokes at twelve different radii.
        type: 'line',
        data: arcs,
        symbol: 'none',
        // Hairline, under the language's 1.4px ceiling.
        lineStyle: { color: GUIDE, width: 1, type: [2, 5] },
        silent: true,
        z: 1,
      },
      {
        // The spokes, hub to launch.
        type: 'line',
        data: spokes,
        symbol: 'none',
        lineStyle: { color: QUIET, width: 0.7 },
        silent: true,
        z: 2,
      },
      {
        // The launches themselves, each named at its own dot.
        type: 'scatter',
        data: dots,
        symbolSize: 8,
        itemStyle: { color: INK },
        z: 3,
        label: {
          show: true,
          position: 'right',
          distance: 7,
          color: LABEL,
          fontFamily: SANS,
          fontSize: 7.5,
          fontWeight: 700,
          formatter: (p: CallbackDataParams) => String(p.name ?? ''),
        },
      },
      {
        // The week labels, off the fan's leading edge.
        type: 'scatter',
        data: guideLabels,
        symbolSize: 0,
        silent: true,
        z: 4,
        label: {
          show: true,
          position: 'left',
          color: QUIET,
          fontFamily: SANS,
          fontSize: 6.5,
          formatter: (p: CallbackDataParams) => String(p.name ?? ''),
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

export function LaunchFan({ launches = LAUNCHES }: { launches?: readonly Launch[] }) {
  const option = useMemo(() => buildOption(launches), [launches]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-launch-fan">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
