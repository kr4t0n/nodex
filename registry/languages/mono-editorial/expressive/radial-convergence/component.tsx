/**
 * Forty-eight feature requests, five themes — mono-editorial
 *
 * Every request is a coded dot on the rim, and a hairline carries it inward to
 * the theme it belongs to. The hubs are sized by the square root of their
 * count, so the areas compare rather than the radii, and the drawing says both
 * things at once: which themes dominate, and that each is made of individually
 * countable requests you could go and read.
 *
 * The rim codes are set radially and flipped through the left half, which is
 * what keeps forty-eight labels legible on a ring this size without turning
 * the card.
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

/** One row per theme: `[theme, requests, degreesOnTheDial]`. */
export type Theme = readonly [theme: string, requests: number, degrees: number];

export const THEMES: readonly Theme[] = [
  ['PERF', 15, 75],
  ['INTEGRATIONS', 10, 3],
  ['PRICING', 9, -69],
  ['MOBILE', 8, -141],
  ['UX', 6, -213],
];

const REQUESTS = 48;

/** Rim radius, and how far in the hubs sit. */
const RIM = 116;
const HUB = 34;

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const STRAND = '#A8A7A0';
const DOT = '#6A6963';
const MUTED = '#8F8E88';
const FAINT = '#C6C5BF';

const SANS = "'Inter', sans-serif";

const at = (radius: number, deg: number): [number, number] => {
  const rad = (deg * Math.PI) / 180;
  return [radius * Math.cos(rad), radius * Math.sin(rad)];
};

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(themes: readonly Theme[] = THEMES): EChartsOption {
  // Requests sit in contiguous blocks per theme, with a little leakage, so the
  // bundles read as bundles rather than as a perfectly combed fan.
  const blocks = themes.flatMap(([, n], h) => Array<number>(n).fill(h));
  const themeOf = (i: number) =>
    rnd(i + 1, 11) > 0.92 ? ((blocks[i] ?? 0) + 2) % themes.length : (blocks[i] ?? 0);

  const counts = themes.map((_, h) =>
    Array.from({ length: REQUESTS }, (_, i) => themeOf(i)).filter((t) => t === h).length,
  );

  const hubAt = (h: number) => at(HUB, themes[h]![2]);

  const strands: ([number, number] | null)[] = [];
  const rimDots: { value: [number, number]; name: string }[] = [];
  const rimLabels: { value: [number, number]; name: string; label: { rotate: number } }[] = [];

  for (let i = 0; i < REQUESTS; i++) {
    const deg = 90 - (i / REQUESTS) * 360;
    const from = at(RIM, deg);
    const to = hubAt(themeOf(i));

    // A cubic pulled toward the centre at both ends, so the strands gather
    // into a bundle instead of crossing the middle as a starburst.
    for (let t = 0; t <= 18; t++) {
      const u = t / 18;
      const c1: [number, number] = [from[0] * 0.42, from[1] * 0.42];
      const c2: [number, number] = [to[0] * 0.3, to[1] * 0.3];
      strands.push([
        (1 - u) ** 3 * from[0] + 3 * (1 - u) ** 2 * u * c1[0] + 3 * (1 - u) * u * u * c2[0] + u ** 3 * to[0],
        (1 - u) ** 3 * from[1] + 3 * (1 - u) ** 2 * u * c1[1] + 3 * (1 - u) * u * u * c2[1] + u ** 3 * to[1],
      ]);
    }
    strands.push(null);

    const code = `R-${String(i + 1).padStart(2, '0')}`;
    rimDots.push({ value: from, name: code });

    // Flipped through the left half, or half the ring reads upside down.
    const flipped = Math.cos((deg * Math.PI) / 180) < 0;
    // The angle rides on the datum rather than on the series, because a
    // series-level `label.rotate` is one number for every point — and forty-
    // eight labels on a ring need forty-eight different ones.
    rimLabels.push({
      value: at(RIM + 7, deg),
      name: code,
      label: { rotate: flipped ? deg + 180 : deg },
    });
  }

  // A dashed leader from each hub out past the rim to its own name.
  const leaders: ([number, number] | null)[] = [];
  themes.forEach((_, h) => {
    leaders.push(hubAt(h), at(RIM + 22, themes[h]![2]), null);
  });

  const reach = RIM + 46;

  return {
    color: [STRAND, DOT, INK, FAINT],
    // Draws once and holds. This language forbids looping animation.
    animationDuration: 900,
    animationEasing: 'quarticOut',
    animationDelay: (i: number) => i * 6,
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

    grid: { left: 12, right: 12, top: 10, bottom: 10 },

    xAxis: { show: false, type: 'value', min: -reach, max: reach },
    yAxis: { show: false, type: 'value', min: -reach, max: reach },

    series: [
      {
        // The strands.
        type: 'line',
        data: strands,
        symbol: 'none',
        // Hairline, well under the language's 1.4px ceiling.
        lineStyle: { color: STRAND, width: 0.7, opacity: 0.55 },
        silent: true,
        z: 1,
      },
      {
        // Hub to label, skimming past the rim.
        type: 'line',
        data: leaders,
        symbol: 'none',
        lineStyle: { color: FAINT, width: 0.7, type: [1, 3] },
        silent: true,
        z: 2,
      },
      {
        // One dot per request.
        type: 'scatter',
        data: rimDots,
        symbolSize: 3.2,
        itemStyle: { color: DOT },
        z: 3,
      },
      {
        // The rim codes, each turned to its own spoke.
        type: 'scatter',
        data: rimLabels,
        symbolSize: 0,
        silent: true,
        z: 3,
        label: {
          show: true,
          color: MUTED,
          fontFamily: SANS,
          fontSize: 5.5,
          formatter: (p: CallbackDataParams) => String(p.name ?? ''),
        },
      },
      {
        // The hubs. Area is the count, so a theme twice as large looks twice
        // as large rather than four times.
        type: 'scatter',
        z: 4,
        data: themes.map(([theme, , deg], h) => ({
          value: at(HUB, deg),
          name: `${theme} — ${counts[h]} requests`,
          symbolSize: Math.sqrt(counts[h] ?? 0) * 3.1,
        })),
        itemStyle: { color: INK },
      },
      {
        // Theme names, parked outside the code ring.
        type: 'scatter',
        symbolSize: 0,
        silent: true,
        z: 4,
        data: themes.map(([theme, , deg], h) => ({
          value: at(RIM + 34, deg),
          name: `${theme} · ${counts[h]}`,
        })),
        label: {
          show: true,
          color: INK,
          fontFamily: SANS,
          fontSize: 8,
          fontWeight: 800,
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

export function RadialConvergence({ themes = THEMES }: { themes?: readonly Theme[] }) {
  const option = useMemo(() => buildOption(themes), [themes]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-radial-convergence">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
