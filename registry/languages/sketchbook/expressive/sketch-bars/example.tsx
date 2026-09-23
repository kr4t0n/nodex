import { SketchBars, type SketchBarsDatum } from './component';

const hours: readonly SketchBarsDatum[] = [
  { id: 'research', label: 'Research', value: 42, tone: 'a' },
  { id: 'writing', label: 'Writing', value: 28, tone: 'b' },
  { id: 'sketching', label: 'Sketching', value: 34, tone: 'c' },
  { id: 'review', label: 'Review', value: 18, tone: 'e' },
];

export function Example({ animate = true }: { animate?: boolean }) {
  return <SketchBars data={hours} unitLabel="Studio hours" contextLabel="This week" animate={animate}
    aria-label="Studio hours by activity this week" />;
}
