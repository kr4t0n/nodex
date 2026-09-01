/**
 * Eight emotions, by how often they were named — mono-editorial
 *
 * A rose where petal length is the count and tone follows it, so the shape and
 * the weight say the same thing twice. Three stacked pies do the work: a pale
 * track showing how far each petal could have reached, the petals themselves,
 * and a label layer on top.
 *
 * The label knocks out of the ink on a long petal and sits dark on the track
 * for a short one, which is the only way a figure stays readable when the
 * ground under it changes with the data.
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

/** One row per emotion: `[emotion, timesNamed]`. */
export type Emotion = readonly [emotion: string, timesNamed: number];

export const EMOTIONS: readonly Emotion[] = [
  ['Happiness', 12],
  ['Awe', 10],
  ['Admiration', 5],
  ['Surprise', 12],
  ['Sadness', 6],
  ['Fear', 4],
  ['Anger', 2],
  ['Anticipation', 5],
];

// Members of the language's recorded ramp. The conformance lint reads the
// rendered SVG and fails on any colour that is not.
const INK = '#1C1C1A';
const PAPER = '#F0EFEB';
const MUTED = '#8F8E88';
const FAINT = '#C6C5BF';
const TRACK = '#E4E3DD';

const SANS = "'Inter', sans-serif";

/** Above this share of the longest petal, a label sits on ink and knocks out. */
const KNOCKOUT_AT = 8;

/** Pure. No DOM, no React — the design language, checkable by running it. */
export function buildOption(emotions: readonly Emotion[]): EChartsOption {
  const max = Math.max(...emotions.map(([, count]) => count));

  // Darkest carries the most, the way every other chart in the language reads.
  const petal = (v: number) => {
    const t = v / max;
    if (t > 0.8) return INK;
    if (t > 0.6) return '#4A4944';
    if (t > 0.35) return MUTED;
    return FAINT;
  };

  const RING = { radius: ['14%', '92%'] as [string, string], center: ['50%', '50%'] as [string, string] };

  return {
    // Draws once and holds. This language forbids looping animation.
    animationDuration: 1100,
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
        const row = emotions[hit.dataIndex ?? 0];
        return row ? `${row[0]} — named ${row[1]} times` : '';
      },
    },

    series: [
      {
        // The track: how far a petal could have reached. Without it a short
        // petal reads as a small slice rather than as a low count.
        type: 'pie',
        ...RING,
        z: 1,
        itemStyle: {
          color: TRACK,
          borderRadius: 16,
          // A gap painted in the page colour, not an ink border.
          borderColor: PAPER,
          borderWidth: 5,
        },
        label: { show: false },
        emphasis: { scale: false },
        data: emotions.map(([name]) => ({ name, value: 1 })),
      },
      {
        // The petals. Equal-angle segments whose radius carries the count, so
        // eight emotions get eight equal shares of the circle and differ only
        // in reach.
        type: 'pie',
        roseType: 'area',
        silent: true,
        radius: ['14%', '88%'],
        center: ['50%', '50%'],
        z: 2,
        itemStyle: { borderRadius: 14, borderColor: PAPER, borderWidth: 5 },
        label: { show: false },
        data: emotions.map(([name, count]) => ({
          name,
          value: count,
          itemStyle: { color: petal(count) },
        })),
      },
      {
        // Labels last, on their own transparent ring, so they sit above every
        // petal regardless of how far it reached.
        type: 'pie',
        ...RING,
        silent: true,
        z: 3,
        itemStyle: { color: 'transparent' },
        label: { position: 'inside' },
        data: emotions.map(([name, count]) => ({
          name,
          value: 1,
          label: {
            formatter: `{n|${count}}\n{l|${name}}`,
            rich: {
              // A long petal reaches under its own label, so the text knocks
              // out of the ink; a short one leaves the label on the pale track.
              n: {
                fontSize: 17,
                fontWeight: 700,
                fontFamily: SANS,
                lineHeight: 20,
                color: count >= KNOCKOUT_AT ? PAPER : INK,
              },
              l: {
                fontSize: 9.5,
                fontFamily: SANS,
                color: count >= KNOCKOUT_AT ? FAINT : MUTED,
              },
            },
          },
        })),
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
export const previewOption = (): EChartsOption => buildOption(EMOTIONS);

export function PetalRose({ emotions = EMOTIONS }: { emotions?: readonly Emotion[] }) {
  const option = useMemo(() => buildOption(emotions), [emotions]);
  const ref = useECharts<HTMLDivElement>(option);

  // A card is the drawing and nothing else. What names this chart is printed by
  // whatever lists it, read from the manifest.
  return (
    <div className="nx-petal-rose">
      <div className="card">
        <div className="chart" ref={ref} />
      </div>
    </div>
  );
}
