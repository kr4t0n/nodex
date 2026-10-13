import {
  HearthScatter,
  type HearthScatterDatum,
  type HearthScatterGroup,
} from './component';

const groups: HearthScatterGroup[] = [
  { id: 'white', label: 'White bread flour', tone: 'c' },
  { id: 'wholemeal', label: 'Wholemeal', tone: 'a' },
  { id: 'rye', label: 'Light rye', tone: 'b' },
];

const bakes: [string, number, number][] = [
  ['white', 65, 31],
  ['white', 68, 34],
  ['white', 70, 37],
  ['white', 72, 39],
  ['white', 74, 41],
  ['white', 78, 22],
  ['wholemeal', 70, 24],
  ['wholemeal', 72, 26],
  ['wholemeal', 75, 29],
  ['wholemeal', 78, 31],
  ['wholemeal', 80, 30],
  ['rye', 72, 14],
  ['rye', 75, 17],
  ['rye', 78, 18],
  ['rye', 82, 21],
];

const data: HearthScatterDatum[] = bakes.map(([group, x, y], index) => ({
  id: `bake-${index + 1}`,
  label: `Bake ${index + 1}`,
  group,
  x,
  y,
  note: index === 5 ? 'Overproofed' : undefined,
}));

export function Example({ animate = true }: { animate?: boolean }) {
  return (
    <HearthScatter
      data={data}
      groups={groups}
      xLabel="Hydration"
      yLabel="Oven spring"
      unitLabel="Oven spring by hydration"
      contextLabel="Fifteen bakes this spring"
      xFormatter={(value) => `${value}%`}
      yFormatter={(value) => `${value} mm`}
      aria-label="Illustrative dough hydration against oven spring by flour"
      animate={animate}
    />
  );
}
