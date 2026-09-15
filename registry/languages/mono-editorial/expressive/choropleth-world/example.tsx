import {ChoroplethWorld, type ChoroplethWorldDatum} from './component';
const readings=[
  ['United States', 95], ['India', 62], ['United Kingdom', 48], ['Germany', 41],
  ['Brazil', 39], ['Canada', 34], ['France', 30], ['Australia', 28],
  ['China', 26], ['Japan', 26], ['Korea', 21], ['Spain', 19],
  ['Italy', 17], ['Singapore', 16], ['Indonesia', 15], ['Mexico', 14],
  ['Netherlands', 13], ['Poland', 13], ['Sweden', 12], ['Ireland', 12],
  ['Philippines', 11], ['Turkey', 10], ['Vietnam', 9], ['South Africa', 9],
  ['Denmark', 9], ['Norway', 8], ['Thailand', 8], ['Malaysia', 8],
  ['United Arab Emirates', 8], ['Argentina', 7], ['Finland', 7], ['Nigeria', 7],
  ['Chile', 6], ['Colombia', 6], ['Saudi Arabia', 6], ['Ukraine', 6],
  ['New Zealand', 6], ['Egypt', 5], ['Pakistan', 5], ['Russia', 5],
  ['Portugal', 5], ['Greece', 4], ['Kenya', 4], ['Peru', 4],
  ['Morocco', 3], ['Iceland', 2], ['Iran', 2], ['Kazakhstan', 2],
  ['Ethiopia', 2], ['Ghana', 2], ['Ecuador', 2], ['Algeria', 2],
  ['Mongolia', 1], ['Libya', 1],
];
const anchors: Record<string, readonly [string, readonly [number, number]]> = {
  'United States': ['US 95k', [0, 0]],
  India: ['IN 62k', [0, 4]],
  'United Kingdom': ['UK 48k', [-26, -12]],
  Germany: ['DE 41k', [26, 14]],
  Brazil: ['BR 39k', [0, 0]],
};
const data: ChoroplethWorldDatum[] = readings.map(([name,value])=>{const country=name as string;const anchor=anchors[country];return {country,monthlyActivesK:value as number,...(anchor?{annotation:{text:anchor[0],offset:anchor[1]}}:{})};});
export function Example(){return <ChoroplethWorld data={data}/>;}
