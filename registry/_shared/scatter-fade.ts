import type { AnimationInterpolateFn, ScatterPointItem } from 'recharts';

/** Recharts owns timing; compound marks fade at final coordinates so their parts stay attached. */
export const scatterFade: AnimationInterpolateFn<ScatterPointItem, 'horizontal' | 'vertical'> = (items, progress) =>
  (items ?? []).flatMap(item => item.status === 'removed' ? [] : [{ ...item.next, payload: { ...item.next.payload, opacity: progress } }]);
