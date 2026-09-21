import { SketchScatter, type SketchScatterDatum } from './component';
const data: readonly SketchScatterDatum[] = [
 { id: 'a', label: 'Field notes', x: 2, y: 32, tone: 'b' }, { id: 'b', label: 'First draft', x: 4, y: 55, tone: 'a' },
 { id: 'c', label: 'Paper study', x: 3, y: 65, tone: 'c' }, { id: 'd', label: 'Type study', x: 6, y: 48, tone: 'e' },
 { id: 'e', label: 'Poster', x: 7, y: 78, tone: 'a' }, { id: 'f', label: 'Prototype', x: 9, y: 68, tone: 'b' },
 { id: 'g', label: 'Workshop', x: 8, y: 89, tone: 'c' }, { id: 'h', label: 'Archive', x: 5, y: 40, tone: 'e' },
];
export function Example({ animate = true }: { animate?: boolean }) { return <SketchScatter data={data} xLabel="Hours exploring" yLabel="Clarity score" unitLabel="Studio experiments" contextLabel="Eight projects" animate={animate} />; }
