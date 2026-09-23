import { SketchBarsHorizontal, type SketchBarsHorizontalDatum } from './component';
const data: readonly SketchBarsHorizontalDatum[] = [
 { id: 'research', label: 'Research', value: 42, tone: 'a' }, { id: 'writing', label: 'Writing', value: 28, tone: 'b' },
 { id: 'sketching', label: 'Sketching', value: 34, tone: 'c' }, { id: 'review', label: 'Review', value: 18, tone: 'e' },
];
export function Example({ animate = true }: { animate?: boolean }) { return <SketchBarsHorizontal data={data} unitLabel="Studio hours" contextLabel="This week" animate={animate} />; }
