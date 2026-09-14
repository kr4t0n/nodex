import { BallotTally, type BallotTallyDatum } from './component';
const options: readonly BallotTallyDatum[] = [
  { option: 'DO MORE WITH THE SAME PAY', picked: 51 },
  { option: 'AN UNSUSTAINABLE PACE', picked: 46 },
  { option: 'QUALITY OF WORK SLIPPING', picked: 41 },
  { option: 'BEING REPLACED OUTRIGHT', picked: 22 },
];
export function Example({ animate = true }: { animate?: boolean }) {
  return <BallotTally data={options} animate={animate} />;
}
