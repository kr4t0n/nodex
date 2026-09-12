import { DualArea, type DualAreaDatum } from './component';

// Preserve the original specimen's daily spend ($K) and sign-up observations.
const observations: readonly DualAreaDatum[] = [
  { day: 1, spendK: 2, signUps: 42 },
  { day: 2, spendK: 0, signUps: 45 },
  { day: 3, spendK: 4, signUps: 44 },
  { day: 4, spendK: 8, signUps: 48 },
  { day: 5, spendK: 3, signUps: 52 },
  { day: 6, spendK: 0, signUps: 55 },
  { day: 7, spendK: 6, signUps: 53 },
  { day: 8, spendK: 12, signUps: 58 },
  { day: 9, spendK: 7, signUps: 64 },
  { day: 10, spendK: 3, signUps: 62 },
  { day: 11, spendK: 9, signUps: 66 },
  { day: 12, spendK: 15, signUps: 71 },
  { day: 13, spendK: 6, signUps: 69 },
  { day: 14, spendK: 2, signUps: 75 },
  { day: 15, spendK: 11, signUps: 82 },
  { day: 16, spendK: 5, signUps: 79 },
  { day: 17, spendK: 8, signUps: 84 },
  { day: 18, spendK: 14, signUps: 80 },
  { day: 19, spendK: 4, signUps: 86 },
  { day: 20, spendK: 9, signUps: 92 },
  { day: 21, spendK: 6, signUps: 88 },
  { day: 22, spendK: 13, signUps: 95 },
  { day: 23, spendK: 3, signUps: 91 },
  { day: 24, spendK: 7, signUps: 97 },
  { day: 25, spendK: 10, signUps: 104 },
  { day: 26, spendK: 5, signUps: 101 },
  { day: 27, spendK: 12, signUps: 108 },
  { day: 28, spendK: 8, signUps: 105 },
  { day: 29, spendK: 15, signUps: 112 },
  { day: 30, spendK: 6, signUps: 118 },
];

export function Example({ animate = true }: { animate?: boolean }) {
  return <DualArea data={observations} animate={animate} aria-label="Daily ad spend and sign-ups over 30 days" />;
}
