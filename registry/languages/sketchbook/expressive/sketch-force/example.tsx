import { SketchForce, type SketchForceDatum } from './component';
const data: readonly SketchForceDatum[] = [
 { id: 'research', label: 'Research', value: 40, tone: 'a' }, { id: 'type', label: 'Typography', value: 26, tone: 'b' },
 { id: 'color', label: 'Color', value: 32, tone: 'c' }, { id: 'forms', label: 'Forms', value: 18, tone: 'e' },
 { id: 'motion', label: 'Motion', value: 22, tone: 'f' }, { id: 'systems', label: 'Systems', value: 35, tone: 'h' },
 { id: 'tools', label: 'Tools', value: 12, tone: 'd' }, { id: 'field', label: 'Fieldwork', value: 28, tone: 'i' },
];
export function Example({ animate = true }: { animate?: boolean }) { return <SketchForce data={data} unitLabel="Research notes" contextLabel="Area shows note count" animate={animate} />; }
