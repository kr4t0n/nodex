import { RungHistogram, type RungHistogramDatum } from './component';

const observations: readonly RungHistogramDatum[] = [6, 14, 22, 19, 13, 9, 6, 4, 3, 2, 1, 1].map((tickets, index) => ({ fromHours: index * 2, toHours: (index + 1) * 2, tickets }));

export function Example({ animate = true }: { animate?: boolean }) {
  return <RungHistogram data={observations} animate={animate} />;
}
