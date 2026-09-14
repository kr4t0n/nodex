import { ForceGraphDense, type ForceGraphDenseEdge } from './component';
const rnd = (i: number, k: number) =>
  (((i * 73856093) ^ (k * 19349663)) % 1000) / 1000;

/** One domain: its name, how many services it owns, and the tone they share. */
type Domain = readonly [domain: string, services: number, tone: string];

const DOMAINS: readonly Domain[] = [
  ['auth', 26, '0'],
  ['billing', 24, '1'],
  ['content', 28, '2'],
  ['search', 20, '3'],
  ['notify', 22, '4'],
  ['media', 20, '5'],
  ['analytics', 18, '6'],
  ['edge', 14, '7'],
];

interface Node {
  readonly name: string;
  readonly callsK: number;
  readonly hub: boolean;
  readonly tone: string;
  readonly domain: number;
}

interface Edge {
  readonly source: string;
  readonly target: string;
  readonly width: number;
  readonly tone: string;
  readonly opacity: number;
  readonly curveness?: number;
}

function mesh(domains: readonly Domain[] = DOMAINS): {
  nodes: Node[];
  edges: Edge[];
} {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  domains.forEach(([domain, count, tone], di) => {
    nodes.push({
      name: domain,
      callsK: 60 + Math.round(rnd(di + 1, 3) * 50),
      hub: true,
      tone,
      domain: di,
    });

    for (let i = 0; i < count; i++) {
      // A few mid-weights per domain, then a long tail of small services.
      const calls = i < 3 ? 14 + rnd(di + 2, i + 4) * 18 : 2 + rnd(di + 5, i + 9) * 9;
      const name = `${domain}-${String(i + 1).padStart(2, '0')}`;
      nodes.push({ name, callsK: Math.round(calls), hub: false, tone, domain: di });

      edges.push({
        source: name,
        target: domain,
        width: 0.5 + calls * 0.05,
        tone: 'spoke',
        opacity: 0.5,
      });

      // The occasional shortcut inside a domain, which is how these grow.
      if (i > 1 && rnd(di + 3, i + 11) < 0.22) {
        const peer = String(1 + Math.floor(rnd(di + 4, i + 13) * i)).padStart(2, '0');
        edges.push({
          source: name,
          target: `${domain}-${peer}`,
          width: 0.5,
          tone: 'shortcut',
          opacity: 0.4,
        });
      }
    }
  });

  // The backbone: every domain talks to two or three others.
  for (let a = 0; a < domains.length; a++) {
    for (let b = a + 1; b < domains.length; b++) {
      if (rnd(a + 7, b + 9) < 0.42) {
        edges.push({
          source: domains[a]?.[0] ?? '',
          target: domains[b]?.[0] ?? '',
          width: 1.6 + rnd(a + 2, b + 3) * 2.2,
          tone: 'backbone',
          opacity: 0.65,
          curveness: 0.08,
        });
      }
    }
  }

  // Cross-domain wires nobody designed. These are the point of the chart.
  for (let k = 0; k < 26; k++) {
    const a = nodes[1 + Math.floor(rnd(k + 1, 17) * (nodes.length - 1))];
    const b = nodes[1 + Math.floor(rnd(k + 3, 23) * (nodes.length - 1))];
    if (a && b && a.name !== b.name && a.domain !== b.domain && !a.hub && !b.hub) {
      edges.push({
        source: a.name,
        target: b.name,
        width: 0.5,
        tone: 'stray',
        opacity: 0.38,
        curveness: 0.15,
      });
    }
  }

  return { nodes, edges };
}

const MESH = mesh();
const NODES = MESH.nodes;
const EDGES = MESH.edges;

const data=NODES.map(n=>({id:n.name,name:n.name,callsK:n.callsK,hub:n.hub,domainIndex:n.domain}));
const edges=EDGES.map(e=>({source:e.source,target:e.target,width:e.width,treatment:e.tone as ForceGraphDenseEdge['treatment']}));
export function Example(){return <ForceGraphDense data={data} edges={edges}/>;}
