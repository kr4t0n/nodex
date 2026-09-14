import { HourglassStream, type HourglassStreamDatum } from './component';
const data: readonly HourglassStreamDatum[] = [{ stage: 'VISITORS', people: 4200 }, { stage: 'SIGN-UPS', people: 1900 }, { stage: 'ACTIVATED', people: 960 }, { stage: 'RETAINED', people: 540 }, { stage: 'PAYING', people: 310 }];
export function Example() { return <HourglassStream data={data} />; }
