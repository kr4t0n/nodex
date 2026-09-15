import { PetalRose, type PetalRoseDatum } from './component';

// Preserve the original retrospective's eight named reactions.
const observations: readonly PetalRoseDatum[] = [
  { name: 'Happiness', count: 12 },
  { name: 'Awe', count: 10 },
  { name: 'Admiration', count: 5 },
  { name: 'Surprise', count: 12 },
  { name: 'Sadness', count: 6 },
  { name: 'Fear', count: 4 },
  { name: 'Anger', count: 2 },
  { name: 'Anticipation', count: 5 },
];

export function Example({ animate = true }: { animate?: boolean }) {
  return <PetalRose data={observations} animate={animate} aria-label="Reactions tagged in the H1 2026 retrospective" />;
}
