import type { CurveProps } from 'recharts';

type CurveFactory = Exclude<NonNullable<CurveProps['type']>, string>;
type Point = readonly [number, number];
const clamp = (value: number, a: number, b: number) => Math.max(Math.min(a, b), Math.min(Math.max(a, b), value));

/** Chord-weighted cubic tangents, constrained between neighboring observations. */
export function constrainedCurve(smoothing: number): CurveFactory {
  return chordCurve(smoothing, true);
}

/** The same chord-weighted tangents without bounds, as used by parallel-coordinate polylines. */
export function softPolylineCurve(smoothing: number): CurveFactory {
  return chordCurve(smoothing, false);
}

function chordCurve(smoothing: number, constrain: boolean): CurveFactory {
  return context => {
    let points: Point[] = []; let boundary: 0 | 1 | null = null;
    return {
      areaStart() { boundary = 0; },
      areaEnd() { boundary = null; },
      lineStart() { points = []; },
      point(x: number, y: number) { points.push([x, y]); },
      lineEnd() {
        const first = points[0];
        if (first) {
          if (boundary === 1) context.lineTo(first[0], first[1]); else context.moveTo(first[0], first[1]);
          const controls = points.map((point, index): { incoming: Point; outgoing: Point } => {
            const before = points[index - 1]; const after = points[index + 1];
            if (!before || !after) return { incoming: point, outgoing: point };
            const previousLength = Math.hypot(point[0] - before[0], point[1] - before[1]);
            const nextLength = Math.hypot(after[0] - point[0], after[1] - point[1]);
            if (!previousLength || !nextLength) return { incoming: point, outgoing: point };
            const incoming: [number, number] = [0, 0]; const outgoing: [number, number] = [0, 0];
            for (const axis of [0, 1] as const) {
              const tangent = (after[axis] - before[axis]) * smoothing / (previousLength + nextLength);
              if (!constrain) {
                incoming[axis] = point[axis] - tangent * previousLength;
                outgoing[axis] = point[axis] + tangent * nextLength;
                continue;
              }
              const forward = clamp(point[axis] + tangent * nextLength, point[axis], after[axis]);
              incoming[axis] = clamp(point[axis] - (forward - point[axis]) * previousLength / nextLength, before[axis], point[axis]);
              outgoing[axis] = point[axis] + (point[axis] - incoming[axis]) * nextLength / previousLength;
            }
            return { incoming, outgoing };
          });
          for (let index = 1; index < points.length; index++) {
            const previous = controls[index - 1]!.outgoing; const next = controls[index]!.incoming; const point = points[index]!;
            context.bezierCurveTo(previous[0], previous[1], next[0], next[1], point[0], point[1]);
          }
          if (boundary === 1) context.closePath();
        }
        if (boundary !== null) boundary = boundary === 0 ? 1 : 0;
      },
    };
  };
}
