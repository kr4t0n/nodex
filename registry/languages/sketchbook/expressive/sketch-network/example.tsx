import { SketchNetwork, type SketchNetworkDatum, type SketchNetworkLink } from './component';
const data: readonly SketchNetworkDatum[] = [
 { id: 'research', label: 'Research', value: 40, tone: 'a' }, { id: 'type', label: 'Typography', value: 26, tone: 'b' },
 { id: 'color', label: 'Color', value: 32, tone: 'c' }, { id: 'forms', label: 'Forms', value: 18, tone: 'e' },
 { id: 'motion', label: 'Motion', value: 22, tone: 'f' }, { id: 'systems', label: 'Systems', value: 35, tone: 'h' },
 { id: 'tools', label: 'Tools', value: 12, tone: 'd' }, { id: 'field', label: 'Fieldwork', value: 28, tone: 'i' },
];
const links: readonly SketchNetworkLink[] = [
 { id: 'a', source: 'research', target: 'field' }, { id: 'b', source: 'research', target: 'systems' },
 { id: 'c', source: 'systems', target: 'type' }, { id: 'd', source: 'systems', target: 'color' },
 { id: 'e', source: 'type', target: 'forms' }, { id: 'f', source: 'forms', target: 'motion' },
 { id: 'g', source: 'motion', target: 'tools' }, { id: 'h', source: 'tools', target: 'color' },
 { id: 'i', source: 'field', target: 'color' },
];
export function Example({ animate = true }: { animate?: boolean }) { return <SketchNetwork data={data} links={links} unitLabel="Research notes" contextLabel="Shared references" animate={animate} />; }
