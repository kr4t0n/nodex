/**
 * Forty-four repositories, ten teams — mono-editorial
 *
 * Every repository is a row on the left; every team is a stop on the right;
 * a hairline runs between them. The ownership skew is the finding — a few
 * teams hold most of the estate — and it reads as a thickening bundle rather
 * than as a bar, because each strand is one repository you could name.
 *
 * The type is deliberately small. Forty-four names at five points are a
 * texture you scan, and the one you are looking for is findable when you lean
 * in. Setting them at a comfortable reading size would need four cards.
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

export const TEAMS = [
  'PLATFORM', 'FRONTEND', 'BACKEND', 'DATA', 'INFRA',
  'MOBILE', 'SECURITY', 'GROWTH', 'ML', 'DESIGN',
] as const;

const PREFIXES = ['core', 'ui', 'api', 'data', 'auth', 'sync', 'mail', 'flag', 'edge', 'doc', 'bot'];
const SUFFIXES = ['-kit', '-svc', '-web', '-cli', '-db', '-gw', '-sdk', '-jobs'];

const REPOS = 44;

/**
 * Which team owns each repository, and what it is called.
 *
 * Ownership is skewed on purpose — `w * w` sends most repositories to the
 * first few teams — because an even split would draw a neat fan and say
 * nothing. The concentration is the point.
 */
export const OWNERSHIP: readonly (readonly [repo: string, team: number])[] = Array.from(
  { length: REPOS },
  (_, i) => {
    const w = rnd(i + 1, 17);
    const team = Math.min(TEAMS.length - 1, Math.floor(w * w * TEAMS.length));
    const name =
      (PREFIXES[i % PREFIXES.length] ?? '') +
      (SUFFIXES[Math.floor(rnd(i + 1, 8) * SUFFIXES.length) % SUFFIXES.length] ?? '') +
      (i > 21 ? '-v2' : '');
    return [name, team] as const;
  },
);

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const MUTED = '#8F8E88';
const QUIET = '#B0AFA9';
const STRAND = '#A8A7A0';
const LABEL = '#6A6963';

const SANS = "'Inter', sans-serif";

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(
  ownership: readonly (readonly [string, number])[] = OWNERSHIP,
): EChartsOption {
  const counts = TEAMS.map(
    (_, j) => ownership.filter(([, team]) => team === j).length,
  );

  // Rows are evenly spaced on the left; teams are evenly spaced on the right.
  const repoY = (i: number) => -i * 6.7;
  const teamY = (j: number) => -18 - j * 28;

  const strands: ([number, number] | null)[] = [];
  ownership.forEach(([, team], i) => {
    const from: [number, number] = [0, repoY(i)];
    const to: [number, number] = [100, teamY(team)];
    // A cubic, so a strand leaves its row horizontally and arrives at its team
    // horizontally — a straight chord would fan out from the first row and
    // read as a starburst rather than as a bundle.
    for (let t = 0; t <= 20; t++) {
      const u = t / 20;
      const x =
        (1 - u) ** 3 * from[0] +
        3 * (1 - u) ** 2 * u * 62 +
        3 * (1 - u) * u * u * 72 +
        u ** 3 * to[0];
      const y =
        (1 - u) ** 3 * from[1] +
        3 * (1 - u) ** 2 * u * from[1] +
        3 * (1 - u) * u * u * to[1] +
        u ** 3 * to[1];
      strands.push([x, y]);
    }
    strands.push(null);
  });

  return {
    color: [STRAND, QUIET, INK, MUTED],
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
        return String(hit?.name ?? '');
      },
    },

    grid: { left: 92, right: 96, top: 16, bottom: 16 },

    xAxis: { show: false, type: 'value', min: 0, max: 100 },
    yAxis: {
      show: false,
      type: 'value',
      min: teamY(TEAMS.length - 1) - 20,
      max: 12,
    },

    series: [
      {
        // The strands.
        type: 'line',
        data: strands,
        symbol: 'none',
        // Hairline, well under the language's 1.4px ceiling.
        lineStyle: { color: STRAND, width: 0.6, opacity: 0.6 },
        silent: true,
        z: 1,
      },
      {
        // A stub at each repository, so a row exists even before the eye
        // follows its strand.
        type: 'scatter',
        symbol: 'rect',
        symbolSize: [4, 2.4],
        itemStyle: { color: QUIET },
        data: ownership.map(([repo], i) => ({ value: [0, repoY(i)], name: repo })),
        z: 2,
        label: {
          show: true,
          position: 'left',
          distance: 4,
          color: MUTED,
          fontFamily: SANS,
          fontSize: 5,
          formatter: (p: CallbackDataParams) => String(p.name ?? ''),
        },
      },
      {
        // The teams, each with the count it owns.
        type: 'scatter',
        symbolSize: 0,
        silent: true,
        z: 3,
        data: TEAMS.map((team, j) => ({
          value: [100, teamY(j)],
          name: `${team} ${counts[j]}`,
        })),
        label: {
          show: true,
          position: 'right',
          distance: 10,
          color: INK,
          fontFamily: SANS,
          fontSize: 7.5,
          fontWeight: 700,
          formatter: (p: CallbackDataParams) => String(p.name ?? ''),
        },
      },
    ],

    graphic: [
      {
        type: 'text',
        left: 'center',
        bottom: 2,
        style: {
          text: 'ONE STRAND = ONE REPOSITORY',
          font: `600 7px ${SANS}`,
          fill: LABEL,
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

export function TypeColonnade({
  ownership = OWNERSHIP,
}: {
  ownership?: readonly (readonly [string, number])[];
}) {
  const option = useMemo(() => buildOption(ownership), [ownership]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-type-colonnade">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
