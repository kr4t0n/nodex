import type { CurveProps } from 'recharts';

/** Pack each diameter's occupied angle, sharing the remaining circumference equally. */
export function ringAngles(diameters: readonly number[], radius: number): number[] {
  if (!diameters.length) return [];
  const occupied = diameters.map(diameter => Math.asin(Math.min(1, Math.max(0, diameter) / Math.max(Number.EPSILON, radius * 2))));
  const gap = (Math.PI - occupied.reduce((sum, angle) => sum + angle, 0)) / diameters.length;
  let cursor = 0;
  return occupied.map(angle => { const half = angle + gap; const center = cursor + half; cursor += half * 2; return center; });
}

/** A native Curve factory for endpoint / quadratic control / endpoint triples. */
export const quadraticChord: Exclude<NonNullable<CurveProps['type']>, string> = context => {
  let points: [number, number][] = [];
  return {
    areaStart() {}, areaEnd() {}, lineStart() { points = []; },
    point(x: number, y: number) { points.push([x, y]); },
    lineEnd() {
      const [a, control, b] = points; if (!a || !control || !b) return;
      context.moveTo(a[0], a[1]);
      context.bezierCurveTo(a[0] + (control[0] - a[0]) * 2 / 3, a[1] + (control[1] - a[1]) * 2 / 3, b[0] + (control[0] - b[0]) * 2 / 3, b[1] + (control[1] - b[1]) * 2 / 3, b[0], b[1]);
    },
  };
};
