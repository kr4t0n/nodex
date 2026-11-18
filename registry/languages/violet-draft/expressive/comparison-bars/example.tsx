import { ComparisonBars, type ComparisonDatum } from './component';
const data: ComparisonDatum[] = [
  { id: 'north', label: 'Aster', value: 84, tone: 'a' },
  { id: 'east', label: 'Birch', value: 67, tone: 'b' },
  { id: 'south', label: 'Cedar', value: 52, tone: 'c' },
  { id: 'west', label: 'Dune', value: 38, tone: 'd' },
];
export function Example({ animate = true }: { animate?: boolean }) {
  return (
    <ComparisonBars
      data={data}
      title="Group comparison"
      subtitle="Completed observations · Sample data"
      animate={animate}
    />
  );
}
