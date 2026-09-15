import {CircularGraph} from './component';
const data = [
  ['Product', 52],
  ['Design', 38],
  ['Frontend', 46],
  ['Backend', 44],
  ['Data', 30],
  ['Growth', 34],
  ['Support', 22],
  ['Ops', 18],
  ['Legal', 9],
  ['Finance', 12],
].map(([team,headcount])=>({team:team as string,headcount:headcount as number}));
const ties = [
  [0, 1, 9], [0, 2, 8], [0, 3, 7], [1, 2, 9],
  [2, 3, 6], [3, 4, 7], [0, 5, 6], [5, 4, 5],
  [5, 6, 4], [6, 2, 3], [7, 3, 4], [7, 9, 3],
  [8, 9, 2], [0, 8, 2], [4, 2, 4], [1, 5, 3],
].map(([source,target,weeklyThreads])=>({source:source!,target:target!,weeklyThreads:weeklyThreads!}));
export function Example(){return <CircularGraph data={data} ties={ties}/>;}
