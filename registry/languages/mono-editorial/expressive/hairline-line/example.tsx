import { HairlineLine, type HairlineDatum } from './component';

// Preserve the original specimen's deterministic observations.
const rnd = (i: number, k: number) => Math.abs(((i * 73856093) ^ (k * 19349663)) % 1000) / 1000;
const observations: readonly HairlineDatum[] = Array.from({ length: 30 }, (_, day) => ({
  label: `JUN ${day + 1}`,
  value: 46 + 22 * Math.sin(day / 4.6) + 14 * Math.sin(day / 2.1) + rnd(day + 1, 5) * 12,
  hollow: day % 7 === 5 || day % 7 === 6,
}));

export function Example({ animate = true }: { animate?: boolean }) {
  return <HairlineLine data={observations} animate={animate} aria-label="Daily signups during June" />;
}
