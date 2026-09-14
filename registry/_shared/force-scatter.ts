import type { AnimationInterpolateFn, ScatterPointItem } from 'recharts';
import type { ForcePosition } from './force-layout';

export interface ForceScatterPosition extends ForcePosition {
  nodeIndex?: number;
  sourceIndex?: number;
  targetIndex?: number;
  curve?: number;
  from?: ForcePosition;
  to?: ForcePosition;
  control?: ForcePosition;
}
export function forceObservation<T extends ForceScatterPosition>(row: T, positions: readonly ForcePosition[]): T {
  if (row.nodeIndex !== undefined) return { ...row, ...positions[row.nodeIndex] };
  const from = positions[row.sourceIndex ?? -1]; const to = positions[row.targetIndex ?? -1];
  if (!from || !to) return row;
  const curve = row.curve ?? 0;
  const control = { x: (from.x + to.x) / 2 - (from.y - to.y) * curve, y: (from.y + to.y) / 2 - (to.x - from.x) * curve };
  return { ...row, from, to, control, x: (from.x + to.x + 2 * control.x) / 4, y: (from.y + to.y + 2 * control.y) / 4 };
}
/** Native Scatter's animation clock follows the actual force trajectory, including its tooltip coordinates. */
export function forceInterpolator(frames: readonly (readonly ForcePosition[])[], xScale: (value: number) => number | undefined, yScale: (value: number) => number | undefined): AnimationInterpolateFn<ScatterPointItem, 'horizontal' | 'vertical'> {
  return (items, progress) => {
    const at = Math.min(frames.length - 1, Math.max(0, progress * (frames.length - 1))); const index = Math.floor(at); const fraction = at - index;
    const before = frames[index] ?? []; const after = frames[Math.min(index + 1, frames.length - 1)] ?? before;
    const positions = before.map((point, i) => ({ x: point.x + ((after[i]?.x ?? point.x) - point.x) * fraction, y: point.y + ((after[i]?.y ?? point.y) - point.y) * fraction }));
    return (items ?? []).flatMap(item => {
      if (item.status === 'removed') return [];
      const point = item.next; const payload = forceObservation(point.payload as ForceScatterPosition, positions); const cx = xScale(payload.x); const cy = yScale(payload.y);
      if (cx === undefined || cy === undefined) return [];
      return [{ ...point, payload, cx, cy, x: cx - point.width / 2, y: cy - point.height / 2, tooltipPosition: { x: cx, y: cy } }];
    });
  };
}
