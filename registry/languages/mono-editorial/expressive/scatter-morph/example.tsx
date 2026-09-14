import {ScatterMorph} from './component';
const data=([
  ['Editor', 12, 9.1, 486],
  ['Boards', 18, 8.4, 391],
  ['Forms', 9, 8.8, 274],
  ['Docs', 15, 8.0, 318],
  ['Chat', 7, 7.2, 182],
  ['Vault', 24, 7.8, 226],
  ['Flows', 21, 8.6, 352],
  ['Views', 11, 7.5, 198],
  ['Sync', 16, 6.9, 141],
  ['Pages', 8, 8.2, 243],
  ['Grid', 19, 7.1, 167],
  ['Hub', 13, 6.6, 118],
] as const).map(([product,priceUsd,csat,revenueK])=>({id:product,product,priceUsd,csat,revenueK}));
export function Example(){return <ScatterMorph data={data}/>;}
