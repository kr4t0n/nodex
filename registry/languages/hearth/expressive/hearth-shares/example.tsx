import {
  HearthShares,
  type HearthSharesDatum,
  type HearthSharesPart,
} from './component';

const parts: HearthSharesPart[] = [
  { id: 'produce', label: 'Produce', tone: 'b' },
  { id: 'pantry', label: 'Pantry', tone: 'c' },
  { id: 'dairy', label: 'Dairy', tone: 'd' },
  { id: 'bakery', label: 'Bakery', tone: 'a' },
];

const data: HearthSharesDatum[] = [
  {
    id: 'week-1',
    label: 'First week',
    values: { produce: 24, pantry: 18, dairy: 12, bakery: 8 },
  },
  {
    id: 'week-2',
    label: 'Second week',
    values: { produce: 28, pantry: 9, dairy: 14, bakery: 9 },
  },
  {
    id: 'week-3',
    label: 'Third week',
    values: { produce: 31, pantry: 22, dairy: 11, bakery: 7 },
  },
  {
    id: 'week-4',
    label: 'Fourth week',
    values: { produce: 21, pantry: 12, dairy: 13, bakery: 12 },
  },
];

const pounds = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0,
});

export function Example({ animate = true }: { animate?: boolean }) {
  return (
    <HearthShares
      data={data}
      parts={parts}
      unitLabel="Where the basket goes"
      contextLabel="Four weeks of shopping"
      valueFormatter={(value) => pounds.format(value)}
      aria-label="Illustrative weekly grocery spend by kind of food"
      animate={animate}
    />
  );
}
