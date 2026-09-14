import { HundredField, type HundredFieldDatum } from './component';
const segments: readonly HundredFieldDatum[] = [
  { name: 'CHARGED', percent: 41 }, { name: 'TORN', percent: 35 },
  { name: 'ADRIFT', percent: 12 }, { name: 'AVERSE', percent: 12 },
];
export function Example({ animate = true }: { animate?: boolean }) {
  return <HundredField data={segments} animate={animate} />;
}
