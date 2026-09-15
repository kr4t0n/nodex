import { ClusterField, type ClusterFieldDatum } from './component';
const data: readonly ClusterFieldDatum[] = [
  { x: 322, y: 94, name: 'PLUGINS', people: 22, connectedToCore: true }, { x: 406, y: -42, name: 'THEMES', people: 16, connectedToCore: true },
  { x: 240, y: -96, name: 'DOCS', people: 13, connectedToCore: true }, { x: -208, y: 100, name: 'FORKS', people: 12, connectedToCore: true },
  { x: 474, y: 114, name: 'MIRRORS', people: 9, connectedToCore: true },
];
export function Example() { return <ClusterField data={data} coreContributors={80} height={288} />; }
