import { HearthLine, type HearthLineDatum } from './component';

const data: HearthLineDatum[] = [
  { id: 'one', label: 'Batch 1', x: 1, value: 24 },
  { id: 'two', label: 'Batch 2', x: 2, value: 21 },
  { id: 'three', label: 'Batch 3', x: 3, value: 23 },
  { id: 'four', label: 'Batch 4', x: 4, value: 18 },
  { id: 'five', label: 'Batch 5', x: 5, value: 19 },
];

export function Example({ animate = true }: { animate?: boolean }) {
  return (
    <HearthLine
      data={data}
      unitLabel="Minutes of preparation"
      contextLabel="Five afternoons in the kitchen"
      aria-label="Illustrative preparation time over five batches"
      animate={animate}
    />
  );
}
