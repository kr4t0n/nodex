import {ChoroplethStates, type ChoroplethStatesDatum} from './component';
const readings=[
  ['California', 96], ['New York', 78], ['Texas', 72], ['Washington', 68],
  ['Massachusetts', 66], ['Florida', 54], ['Illinois', 49], ['Colorado', 44],
  ['Georgia', 41], ['Virginia', 33], ['Pennsylvania', 31], ['North Carolina', 30],
  ['New Jersey', 28], ['Oregon', 22], ['Ohio', 21], ['Michigan', 19],
  ['Arizona', 18], ['Minnesota', 16], ['Utah', 15], ['Maryland', 14],
  ['Tennessee', 13], ['Wisconsin', 12], ['Missouri', 11], ['Indiana', 9],
  ['Nevada', 8], ['Connecticut', 7], ['South Carolina', 6], ['Alabama', 5],
  ['Kentucky', 5], ['Oklahoma', 4], ['Iowa', 4], ['Kansas', 3],
  ['Arkansas', 3], ['Louisiana', 3], ['New Hampshire', 2], ['Idaho', 2],
  ['New Mexico', 2], ['Hawaii', 2], ['Maine', 1], ['Nebraska', 1], ['Alaska', 1],
];
const anchors: Record<string, readonly [string, readonly [number,number]]> = {'California':['CA 96k',[0,0]]};
const data: ChoroplethStatesDatum[] = readings.map(([name,value])=>{const state=name as string;const anchor=anchors[state];return {state,signUpsK:value as number,...(anchor?{annotation:{text:anchor[0],offset:anchor[1]}}:{})};});
export function Example(){return <ChoroplethStates data={data}/>;}
