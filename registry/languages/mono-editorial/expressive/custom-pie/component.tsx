/**
 * Where the day goes, by users and by minutes — mono-editorial
 *
 * A pie carrying two variables at once: the angle of a wedge is the share of
 * users who touch that surface, and its radius is how long they stay. So a
 * narrow wedge reaching the outer ring is a small group of people living in
 * one place, and a wide shallow one is everybody passing through.
 *
 * Written as a `custom` series because no built-in does this. A pie fixes the
 * radius and a rose fixes the angle; here both carry data, and the dashed rings
 * at 15, 30 and 45 minutes are what make the radius readable as a quantity
 * rather than as decoration.
 *
 * `buildOption` is pure and exported, so the build server-renders it to a
 * static preview and the conformance lint reads the marks it really produces.
 */
import { useEffect, useMemo, useRef } from 'react';
import * as echarts from 'echarts';
import type {
  CallbackDataParams,
  CustomSeriesRenderItemAPI,
  CustomSeriesRenderItemParams,
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
 * inspect, so a canvas chart cannot be checked by `nodex lint`.
 */
function useECharts<T extends HTMLElement>(option: EChartsOption) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const chart = echarts.init(node, null, { renderer: 'svg' });
    chart.setOption(option);

    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(node);

    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, [option]);

  return ref;
}

/** One row per surface: `[surface, shareOfUsers, minutesPerDay]`. */
export type Surface = readonly [
  surface: string,
  sharePct: number,
  minutesPerDay: number,
];

export const SURFACES: readonly Surface[] = [
  ['Editor', 34, 42],
  ['Boards', 22, 31],
  ['Docs', 18, 38],
  ['Chat', 12, 11],
  ['Automations', 8, 24],
  ['Other', 6, 7],
];

/** The outer ring, in minutes. Radius is read against this, not against the max. */
const SCALE = 45;

/** Where the dashed reference rings sit, in minutes. */
const RINGS = [15, 30, 45];

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const RING = '#D8D6CE';
const LABEL = '#55544E';
// Darkest carries the longest stay, the way every other chart here reads.
const LADDER = ['#1C1C1A', '#4A4944', '#6A6963', '#8F8E88', '#B0AFA9', '#C6C5BF'];

const SANS = "'Inter', sans-serif";

const TAU = Math.PI * 2;

interface Wedge {
  name: string;
  sharePct: number;
  minutes: number;
  from: number;
  to: number;
  colour: string;
}

/** Angles accumulated by share, tone assigned by minutes. */
export function wedges(surfaces: readonly Surface[]): Wedge[] {
  const byShare = [...surfaces].sort((a, b) => b[1] - a[1]);
  const minutesDesc = surfaces.map(([, , m]) => m).sort((a, b) => b - a);

  let acc = 0;
  return byShare.map(([name, sharePct, minutes]) => {
    // Twelve o'clock is the start, so the largest share reads first.
    const from = -Math.PI / 2 + (acc / 100) * TAU;
    acc += sharePct;
    const to = -Math.PI / 2 + (acc / 100) * TAU;
    return {
      name,
      sharePct,
      minutes,
      from,
      to,
      colour: LADDER[Math.min(LADDER.length - 1, minutesDesc.indexOf(minutes))] ?? INK,
    };
  });
}

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(surfaces: readonly Surface[]): EChartsOption {
  const slices = wedges(surfaces);

  return {
    // Draws once and holds. This language forbids looping animation.
    animationDuration: 900,
    animationEasing: 'cubicOut',
    animationDelay: (i: number) => i * 130,
    textStyle: { fontFamily: SANS },

    tooltip: {
      backgroundColor: INK,
      borderWidth: 0,
      padding: [10, 14],
      textStyle: { color: PAPER, fontFamily: SANS, fontSize: 12 },
      formatter: (p: CallbackDataParams | CallbackDataParams[]) => {
        const hit = Array.isArray(p) ? p[0] : p;
        const s = slices[hit?.dataIndex ?? 0];
        return s ? `${s.name} — ${s.sharePct}% of users · ${s.minutes} min/day` : '';
      },
    },

    // A custom series still needs a coordinate system to live in, even though
    // it positions everything itself.
    xAxis: { show: false, min: -1, max: 1 },
    yAxis: { show: false, min: -1, max: 1 },
    grid: { left: 0, right: 0, top: 0, bottom: 0 },

    series: [
      {
        type: 'custom',
        data: slices.map((s) => s.sharePct),
        renderItem: (
          params: CustomSeriesRenderItemParams,
          api: CustomSeriesRenderItemAPI,
        ): CustomSeriesRenderItemReturn => {
          const s = slices[params.dataIndex];
          if (!s) return { type: 'group', children: [] };

          const cx = api.getWidth() / 2;
          const cy = api.getHeight() / 2 + 6;
          const R = Math.min(api.getWidth(), api.getHeight()) * 0.37;
          const r0 = R * 0.24;
          const radiusAt = (m: number) => r0 + ((R - r0) * m) / SCALE;

          const mid = (s.from + s.to) / 2;
          const cos = Math.cos(mid);
          const labelRadius = R + 14;

          // Typed as the group's own child list, or TypeScript infers a union
          // from the first element pushed and rejects the rest.
          const children: NonNullable<
            Extract<CustomSeriesRenderItemReturn, { type: 'group' }>['children']
          > = [];

          // Drawn once, with the first wedge, so the rings sit under every
          // sector rather than being repeated six times.
          if (params.dataIndex === 0) {
            for (const minutes of RINGS) {
              children.push({
                type: 'circle' as const,
                shape: { cx, cy, r: radiusAt(minutes) },
                // Hairline, under the language's 1.4px ceiling.
                style: { fill: 'none', stroke: RING, lineWidth: 1, lineDash: [3, 4] },
              });
            }
          }

          children.push({
            type: 'sector' as const,
            shape: {
              cx,
              cy,
              r0,
              r: radiusAt(s.minutes),
              startAngle: s.from,
              endAngle: s.to,
              clockwise: true,
              cornerRadius: 5,
            },
            // A gap painted in the page colour, not an ink outline.
            style: { fill: s.colour, stroke: PAPER, lineWidth: 3 },
            // Grows out of the hub rather than fading in, so the radius is
            // seen to be a measurement.
            enterFrom: { shape: { r: r0 } },
          });

          children.push({
            type: 'text' as const,
            style: {
              x: cx + cos * labelRadius,
              y: cy + Math.sin(mid) * labelRadius,
              text: `${s.name}  ${s.sharePct}% · ${s.minutes}m`,
              font: `600 10px ${SANS}`,
              fill: LABEL,
              // Labels near top or bottom centre themselves; the rest read
              // outward, away from the circle.
              align: Math.abs(cos) < 0.25 ? 'center' : cos > 0 ? 'left' : 'right',
              verticalAlign: 'middle',
            },
            enterFrom: { style: { opacity: 0 } },
          });

          return { type: 'group' as const, children };
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
export const previewOption = (): EChartsOption => buildOption(SURFACES);

export function CustomPie({ surfaces = SURFACES }: { surfaces?: readonly Surface[] }) {
  const option = useMemo(() => buildOption(surfaces), [surfaces]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-custom-pie">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
