import { ForceGraph, type ForceGraphDatum } from './component';
const data: ForceGraphDatum[] = ([
  ['Core API', 52, 0],
  ['Slack', 34, 1],
  ['GitHub', 30, 1],
  ['Figma', 22, 1],
  ['Notion', 26, 1],
  ['Linear', 18, 1],
  ['Drive', 16, 1],
  ['Zoom', 10, 2],
  ['Jira', 14, 2],
  ['Sheets', 12, 2],
  ['Intercom', 8, 2],
  ['Stripe', 20, 1],
  ['Segment', 9, 2],
] as const).map(([name,syncsK,tier])=>({id:name,name,syncsK,tier}));
const sideRoads = [
  ['Slack', 'GitHub'],
  ['GitHub', 'Linear'],
  ['Figma', 'Notion'],
  ['Stripe', 'Sheets'],
].map(([source,target])=>({source:source!,target:target!}));
export function Example(){return <ForceGraph data={data} hubId='Core API' sideRoads={sideRoads}/>;}
