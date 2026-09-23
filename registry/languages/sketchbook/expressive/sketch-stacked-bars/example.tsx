import { SketchStackedBars, type SketchStackedBarsDatum, type SketchStackedBarsSeries } from './component';
const series: readonly SketchStackedBarsSeries[] = [{ id: 'research', label: 'Research', tone: 'b' }, { id: 'making', label: 'Making', tone: 'a' }, { id: 'review', label: 'Review', tone: 'c' }];
const data: readonly SketchStackedBarsDatum[] = [
 { id: 'w1', label: 'Week 1', values: { research: 16, making: 18, review: 6 } },
 { id: 'w2', label: 'Week 2', values: { research: 10, making: 24, review: 8 } },
 { id: 'w3', label: 'Week 3', values: { research: 8, making: 28, review: 10 } },
 { id: 'w4', label: 'Week 4', values: { research: 12, making: 20, review: 12 } },
];
export function Example({ animate = true }: { animate?: boolean }) { return <SketchStackedBars data={data} series={series} unitLabel="Studio hours" contextLabel="Four weeks" animate={animate} />; }
