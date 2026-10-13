import { HearthCarton, type HearthCartonDatum } from './component';

const data: HearthCartonDatum[] = [
  { id: 'baking', label: 'Baking', count: 5, tone: 'c' },
  { id: 'breakfast', label: 'Breakfast', count: 3, tone: 'a' },
  { id: 'custard', label: 'A custard', count: 2, tone: 'b' },
];

export function Example({ animate = true }: { animate?: boolean }) {
  return (
    <HearthCarton
      data={data}
      emptyLabel="Still in the box"
      unitLabel="Eggs by use"
      contextLabel="One carton, one week"
      aria-label="Illustrative uses of a dozen eggs over one week"
      animate={animate}
    />
  );
}
