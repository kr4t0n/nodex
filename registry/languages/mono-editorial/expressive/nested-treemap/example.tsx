import{NestedTreemap}from'./component';
const areas=[
  {
    name: 'PRODUCT',
    teams: [
      ['Core app', 260],
      ['Collaboration', 190],
      ['Search', 110],
      ['Mobile', 80],
    ],
  },
  {
    name: 'PLATFORM',
    teams: [
      ['AI systems', 170],
      ['Data infra', 120],
      ['APIs', 105],
    ],
  },
  {
    name: 'GROWTH',
    teams: [
      ['Acquisition', 90],
      ['Retention', 80],
      ['Onboarding', 75],
    ],
  },
];
const data=areas.map(area=>({name:area.name,teams:area.teams.map(([name,hours])=>({name:name as string,hours:hours as number}))}));
export function Example(){return <NestedTreemap data={data}/>;}
