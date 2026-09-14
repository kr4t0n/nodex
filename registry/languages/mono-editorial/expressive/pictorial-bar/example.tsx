import { PictorialBar, type PictorialBarDatum } from './component';
const years: readonly PictorialBarDatum[] = [
  { year: '2022', treesK: 26 }, { year: '2023', treesK: 41 }, { year: '2024', treesK: 63 },
  { year: '2025', treesK: 88 }, { year: '2026', treesK: 117 },
];
export function Example({ animate = true }: { animate?: boolean }) {
  return <PictorialBar data={years} targetK={130} animate={animate} />;
}
