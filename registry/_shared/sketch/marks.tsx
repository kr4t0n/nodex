import { useId, useMemo } from 'react';
import rough from 'roughjs';
import type { Drawable } from 'roughjs/bin/core';
import type { SketchSettings } from './use-sketch-settings';

export const sketchGenerator = rough.generator();
interface DrawingProps { settings: SketchSettings | null; seed: number; paint: string; hatchWidth: string }
export function SketchPaths({ drawing, paint, hatchWidth, fillClip }: { drawing: Drawable; paint: string; hatchWidth: string; fillClip?: string }) {
  return <>{drawing.sets.map((set, index) => <path key={index} d={sketchGenerator.opsToPath(set)} data-nx-sketch-part={set.type}
    clipPath={set.type === 'path' ? undefined : fillClip}
    fill={set.type === 'fillPath' ? paint : 'none'} stroke={set.type === 'fillPath' ? 'none' : set.type === 'path' ? 'var(--nx-ink)' : paint}
    style={{ strokeWidth: set.type === 'path' ? 'var(--nx-stroke-mark)' : hatchWidth }} />)}</>;
}
/** Clip the fill to native quantity bounds; keep the thin boundary stroke whole. */
export function SketchRectangle({ x, y, width, height, settings, seed, paint, hatchWidth }: DrawingProps & { x: number; y: number; width: number; height: number }) {
  const id = useId();
  const drawing = useMemo(() => settings && width > 0 && height > 0 ? sketchGenerator.rectangle(0, 0, width, height, {
    ...settings, seed, fill: paint, stroke: 'var(--nx-ink)', preserveVertices: true,
  }) : null, [settings, seed, width, height, paint]);
  if (!(width > 0 && height > 0)) return null;
  return <g transform={`translate(${x},${y})`}>
    <defs><clipPath id={id}><rect width={width} height={height} /></clipPath></defs>
    <rect data-nx-sketch-rect width={width} height={height} fill="transparent" />
    <g pointerEvents="none" aria-hidden="true">{drawing ? <SketchPaths drawing={drawing} paint={paint} hatchWidth={hatchWidth} fillClip={`url(#${id})`} />
      : <rect width={width} height={height} fill={paint} stroke="var(--nx-ink)" style={{ strokeWidth: 'var(--nx-stroke-mark)' }} />}</g>
  </g>;
}
export function SketchCircle({ cx, cy, radius, settings, seed, paint, hatchWidth }: DrawingProps & { cx: number; cy: number; radius: number }) {
  const id = useId();
  const drawing = useMemo(() => settings && radius > 0 ? sketchGenerator.circle(0, 0, radius * 2, {
    ...settings, seed, fill: paint, stroke: 'var(--nx-ink)', preserveVertices: true,
  }) : null, [settings, seed, radius, paint]);
  if (!(radius > 0)) return null;
  return <g transform={`translate(${cx},${cy})`}>
    <defs><clipPath id={id}><circle r={radius} /></clipPath></defs>
    <circle data-nx-sketch-circle r={radius} fill="transparent" />
    <g clipPath={`url(#${id})`} pointerEvents="none" aria-hidden="true">{drawing ? <SketchPaths drawing={drawing} paint={paint} hatchWidth={hatchWidth} />
      : <circle r={radius} fill={paint} stroke="var(--nx-ink)" style={{ strokeWidth: 'var(--nx-stroke-mark)' }} />}</g>
  </g>;
}
/** One origin-relative segment; exact vertices preserve the supplied observations. */
export function SketchSegment({ x1, y1, x2, y2, settings, seed, paint, opacity = 1 }: Omit<DrawingProps, 'hatchWidth'> & { x1: number; y1: number; x2: number; y2: number; opacity?: number }) {
  const drawing = useMemo(() => settings ? sketchGenerator.line(0, 0, x2 - x1, y2 - y1, { ...settings, seed, preserveVertices: true }) : null,
    [settings, seed, x1, y1, x2, y2]);
  return <g transform={`translate(${x1},${y1})`} opacity={opacity} pointerEvents="none" aria-hidden="true">{drawing
    ? drawing.sets.map((set, index) => <path key={index} d={sketchGenerator.opsToPath(set)} fill="none" stroke={paint} style={{ strokeWidth: 'var(--nx-stroke-mark)' }} />)
    : <line x1={0} y1={0} x2={x2 - x1} y2={y2 - y1} stroke={paint} strokeWidth="var(--nx-stroke-mark)" />}</g>;
}
