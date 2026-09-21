import { SketchLine, type SketchLineDatum, type SketchLineSeries } from './component';
const series: readonly SketchLineSeries[] = [{ id: 'notes', label: 'Notes', tone: 'a' }, { id: 'drafts', label: 'Drafts', tone: 'b' }];
const data: readonly SketchLineDatum[] = [
 { id: 'mon', label: 'Monday', x: 1, values: { notes: 12, drafts: 4 } }, { id: 'tue', label: 'Tuesday', x: 2, values: { notes: 24, drafts: 10 } },
 { id: 'thu', label: 'Thursday', x: 4, values: { notes: 18, drafts: 16 } }, { id: 'fri', label: 'Friday', x: 5, values: { notes: 36, drafts: 22 } },
 { id: 'sun', label: 'Sunday', x: 7, values: { notes: 42, drafts: 30 } },
];
export function Example({ animate = true }: { animate?: boolean }) { return <SketchLine data={data} series={series} unitLabel="Ideas recorded" contextLabel="Day of the week" animate={animate} />; }
