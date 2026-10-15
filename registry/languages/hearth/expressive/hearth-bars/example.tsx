import { HearthBars, type HearthBarsDatum } from './component';

const data: HearthBarsDatum[] = [
  { id: 'carbohydrate', label: 'Carbohydrate', value: 42, tone: 'a' },
  { id: 'protein', label: 'Protein', value: 18, tone: 'b' },
  { id: 'fat', label: 'Fat', value: 11, tone: 'c' },
  { id: 'fibre', label: 'Fibre', value: 9, tone: 'd' },
];

export function Example({ animate = true }: { animate?: boolean }) {
  return (
    <HearthBars
      data={data}
      unitLabel="Grams per serving"
      contextLabel="Squash & lentil bowl"
      aria-label="Illustrative nutrition quantities per serving"
      animate={animate}
    />
  );
}
