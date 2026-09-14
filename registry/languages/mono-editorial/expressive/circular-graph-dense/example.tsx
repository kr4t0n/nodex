import {CircularGraphDense} from './component';
const rnd = (i: number, k: number) =>
  (((i * 73856093) ^ (k * 19349663)) % 1000) / 1000;

/** One org: its name, how many repos it owns, and the tone they share. */
type Org = readonly [org: string, repos: number, tone: string];

const ORGS: readonly Org[] = [
  ['platform', 16, 'ink'],
  ['product', 14, 'strong'],
  ['data', 12, 'label'],
  ['infra', 10, 'muted'],
  ['labs', 8, 'quiet'],
];

interface Repo {
  readonly name: string;
  readonly org: number;
  readonly contributors: number;
}

interface Tie {
  readonly source: number;
  readonly target: number;
  readonly shared: number;
  readonly sameOrg: boolean;
}

/** Above this many contributors a repo earns a label. */


/** Generated, because sixty repos and their ties will not read as a literal. */
function repos(orgs: readonly Org[] = ORGS): Repo[] {
  const out: Repo[] = [];
  orgs.forEach(([org, count], oi) => {
    for (let i = 0; i < count; i++) {
      // A couple of giants per org, then a long tail. That distribution is the
      // finding, so it is generated rather than flattened.
      const activity = i < 2 ? 30 + rnd(oi + 1, i + 2) * 45 : 4 + rnd(oi + 3, i + 7) * 16;
      out.push({
        name: `${org}/${org.slice(0, 2)}-${String(i + 1).padStart(2, '0')}`,
        org: oi,
        contributors: Math.round(activity),
      });
    }
  });
  return out;
}

function ties(all: readonly Repo[]): Tie[] {
  const out: Tie[] = [];
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const a = all[i];
      const b = all[j];
      if (!a || !b) continue;
      const sameOrg = a.org === b.org;
      // People move within an org far more than across one.
      const chance = sameOrg ? 0.16 : 0.045;
      if (rnd(i + 1, j + 2) < chance) {
        out.push({ source: i, target: j, shared: 1 + Math.round(rnd(i + 2, j + 3) * 6), sameOrg });
      }
    }
  }
  return out;
}

const REPOS = repos();
const TIES = ties(REPOS);


const data = REPOS.map(repo=>({repository:repo.name,organizationIndex:repo.org,contributors:repo.contributors}));
export function Example(){return <CircularGraphDense data={data} ties={TIES} organizations={ORGS.map(org=>org[0])}/>;}
