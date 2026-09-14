import { StaggerDelay, type StaggerDelayDatum } from './component';
const markets: readonly StaggerDelayDatum[] = Array.from({ length: 50 }, (_, index) => ({
  market: `Market ${index + 1}`, value: Math.round(30 + 55 * Math.sin(index / 7.5) + 18 * Math.sin(index / 2.6) + (index % 5) * 3 + 28),
  axisLabel: index % 10 === 0 ? String(index + 1) : undefined,
}));
export function Example({ animate = true }: { animate?: boolean }) { return <StaggerDelay data={markets} animate={animate} />; }
