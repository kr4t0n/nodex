import { StackedBlocks, type StackedBlocksDatum, type StackedBlocksSeries } from './component';

const series: readonly StackedBlocksSeries[] = [
  { id: 'design', label: 'Design', tone: 'a' },
  { id: 'build', label: 'Build', tone: 'b' },
  { id: 'ship', label: 'Ship', tone: 'c' },
];
const teams: readonly StackedBlocksDatum[] = [
  { id: 'studio', label: 'Studio', values: { design: 32, build: 48, ship: 20 } },
  { id: 'product', label: 'Product', values: { design: 24, build: 56, ship: 32 } },
  { id: 'platform', label: 'Platform', values: { design: 16, build: 64, ship: 24 } },
  { id: 'labs', label: 'Labs', values: { design: 40, build: 32, ship: 16 } },
];

export function Example({ animate = true }: { animate?: boolean }) {
  return <StackedBlocks data={teams} series={series} unitLabel="Hours" contextLabel="This sprint"
    animate={animate} aria-label="Team hours by design, build and ship work" />;
}
