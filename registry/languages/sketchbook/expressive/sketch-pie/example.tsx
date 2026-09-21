import { SketchPie, type SketchPieDatum } from './component';
const data: readonly SketchPieDatum[] = [
 { id: 'notes', label: 'Notes', value: 36, tone: 'a' }, { id: 'drafts', label: 'Drafts', value: 28, tone: 'b' },
 { id: 'reviews', label: 'Reviews', value: 22, tone: 'c' }, { id: 'finished', label: 'Finished', value: 14, tone: 'e' },
];
export function Example({ animate = true }: { animate?: boolean }) { return <SketchPie data={data} unitLabel="Projects" contextLabel="This month" animate={animate} />; }
