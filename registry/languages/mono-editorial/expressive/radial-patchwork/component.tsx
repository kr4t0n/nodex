/**
 * Forty-six deploys across a twenty-four hour dial — mono-editorial
 *
 * Each deploy is a translucent wedge: its angle is the hour it went out, its
 * reach is how much it changed. They are drawn in the same ink at a low
 * opacity, so where deploys pile up the ink accumulates and the busy hours
 * darken on their own. No count is being encoded — the density *is* the count,
 * which is why the late-morning and late-afternoon peaks are legible without a
 * histogram beside them.
 *
 * Three wedges are outlined instead of filled. Those paged somebody, and an
 * outline reads as a different kind of event without spending a second colour
 * or breaking the pile-up the rest of the chart depends on.
 *
 * `buildOption` is pure and exported, so the build server-renders it to a
 * static preview and the conformance lint reads the marks it really produces.
 */
import { useEffect, useMemo, useRef } from 'react';
import * as echarts from 'echarts';
import type {
  CallbackDataParams,
  CustomSeriesRenderItemAPI,
  CustomSeriesRenderItemReturn,
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

/** One deploy: when it went out, how wide a window it took, and its reach. */
export type Deploy = {
  readonly hour: number;
  readonly spanDegrees: number;
  readonly reach: number;
  readonly paged: boolean;
};

const COUNT = 46;

/** Which deploys paged somebody. */
const INCIDENTS = new Set([4, 17, 31]);

export const DEPLOYS: readonly Deploy[] = Array.from({ length: COUNT }, (_, i) => {
  // Deploys cluster around 11:00 and 16:00 and thin out overnight, which is
  // the shape the dial exists to show.
  const peak = rnd(i + 1, 2) > 0.5 ? 11 : 16;
  return {
    hour: (peak + (rnd(i + 1, 3) - 0.5) * 7 + 24) % 24,
    spanDegrees: 10 + rnd(i + 1, 4) * 34,
    reach: 34 + rnd(i + 1, 5) * 100,
    paged: INCIDENTS.has(i),
  };
});

/** The dial's inner hole and the rim the hour ticks sit on. */
const HOLE = 16;
const RIM = 140;

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const TICK = '#C6C5BF';
const MUTED = '#8F8E88';
const QUIET = '#B0AFA9';

const SANS = "'Inter', sans-serif";

const at = (radius: number, deg: number): [number, number] => {
  const rad = (deg * Math.PI) / 180;
  return [radius * Math.cos(rad), radius * Math.sin(rad)];
};

/** Midnight at the top, and the clock running clockwise as a clock does. */
const hourAngle = (hour: number) => 90 - hour * 15;

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(deploys: readonly Deploy[] = DEPLOYS): EChartsOption {
  const reach = RIM + 34;

  // The quarter-hour rim, with every hour marked longer.
  const minorTicks: ([number, number] | null)[] = [];
  const majorTicks: ([number, number] | null)[] = [];
  for (let t = 0; t < 96; t++) {
    const deg = 90 - t * 3.75;
    const onTheHour = t % 4 === 0;
    (onTheHour ? majorTicks : minorTicks).push(
      at(RIM, deg),
      at(onTheHour ? RIM + 6 : RIM + 3, deg),
      null,
    );
  }

  // A wedge is an annular sector, which no cartesian series draws — so it is
  // rendered directly. Radii are converted to pixels from the axis scale so
  // the dial stays circular whatever the card's aspect ratio.
  const sector = (
    params: { dataIndex: number },
    api: CustomSeriesRenderItemAPI,
  ): CustomSeriesRenderItemReturn => {
    const deploy = deploys[params.dataIndex]!;
    const [cx = 0, cy = 0] = api.coord([0, 0]);
    const [ux = 0] = api.coord([1, 0]);
    const [, uy = 0] = api.coord([0, 1]);
    const scale = Math.min(Math.abs(ux - cx), Math.abs(uy - cy));

    const from = hourAngle(deploy.hour);
    const to = from - deploy.spanDegrees;

    return {
      type: 'sector',
      shape: {
        cx,
        cy,
        r0: HOLE * scale,
        r: deploy.reach * scale,
        // ECharts measures a sector's angles with the y axis pointing down, so
        // the sign is flipped from the maths above rather than the geometry
        // being redefined.
        startAngle: (-from * Math.PI) / 180,
        endAngle: (-to * Math.PI) / 180,
        clockwise: true,
      },
      style: deploy.paged
        ? { fill: 'none', stroke: INK, lineWidth: 1.1 }
        : { fill: INK, opacity: 0.07 + rnd(params.dataIndex + 1, 6) * 0.09 },
    };
  };

  return {
    color: [INK, TICK, MUTED],
    // Draws once and holds. This language forbids looping animation.
    animationDuration: 900,
    animationEasing: 'quarticOut',
    animationDelay: (i: number) => i * 12,
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

    grid: { left: 10, right: 10, top: 10, bottom: 26 },

    xAxis: { show: false, type: 'value', min: -reach, max: reach },
    yAxis: { show: false, type: 'value', min: -reach, max: reach },

    series: [
      {
        // The quarter hours.
        type: 'line',
        data: minorTicks,
        symbol: 'none',
        // Hairline, well under the language's 1.4px ceiling.
        lineStyle: { color: TICK, width: 0.5 },
        silent: true,
        z: 1,
      },
      {
        // The hours.
        type: 'line',
        data: majorTicks,
        symbol: 'none',
        lineStyle: { color: TICK, width: 1 },
        silent: true,
        z: 1,
      },
      {
        // The deploys. Translucent ink, so the pile-up is the count.
        type: 'custom',
        renderItem: sector,
        z: 2,
        data: deploys.map((deploy, i) => ({
          value: [0, 0],
          name: deploy.paged
            ? `deploy #${i + 1} — triggered an incident`
            : `deploy #${i + 1} — ${String(Math.floor(deploy.hour)).padStart(2, '0')}:${String(
                Math.floor((deploy.hour % 1) * 60),
              ).padStart(2, '0')} · ${Math.round(deploy.reach * 6)} files`,
        })),
      },
      {
        // Six-hourly labels, and the pin at the middle of the dial.
        type: 'scatter',
        symbolSize: 0,
        silent: true,
        z: 3,
        data: [0, 6, 12, 18].map((hour) => ({
          value: at(RIM + 17, hourAngle(hour)),
          name: String(hour).padStart(2, '0'),
        })),
        label: {
          show: true,
          color: MUTED,
          fontFamily: SANS,
          fontSize: 8,
          fontWeight: 700,
          formatter: (p: CallbackDataParams) => String(p.name ?? ''),
        },
      },
      {
        type: 'scatter',
        data: [[0, 0]],
        symbolSize: 6,
        itemStyle: { color: INK },
        silent: true,
        z: 4,
      },
    ],

    graphic: [
      {
        type: 'text',
        left: 'center',
        bottom: 2,
        style: {
          text: 'OUTLINED = TRIGGERED AN INCIDENT',
          font: `600 7.5px ${SANS}`,
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

export function RadialPatchwork({ deploys = DEPLOYS }: { deploys?: readonly Deploy[] }) {
  const option = useMemo(() => buildOption(deploys), [deploys]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-radial-patchwork">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
