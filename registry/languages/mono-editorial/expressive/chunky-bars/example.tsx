import { ChunkyBars, type ChunkyBarsDatum } from './component';

const plans: readonly ChunkyBarsDatum[] = [
  { plan: 'STARTER', mrrK: 182 },
  { plan: 'PRO', mrrK: 486 },
  { plan: 'TEAM', mrrK: 391 },
  { plan: 'ENT', mrrK: 274 },
];

export function Example({ animate = true }: { animate?: boolean }) {
  return <ChunkyBars data={plans} animate={animate} aria-label="Q2 2026 monthly recurring revenue by plan in thousands of dollars" />;
}
