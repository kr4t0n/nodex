import assert from 'node:assert/strict';
import { expect, type Locator, type Page } from '@playwright/test';

export const NOCTURNE_EXTENDED_SOURCE = `import { useEffect, useState } from 'react';
import { NocturnePromiseLanes, type NocturnePromiseDatum } from './components/nodex/nocturne-promise-lanes/component';
import { NocturneMarginLanes, type NocturneMarginDatum } from './components/nodex/nocturne-margin-lanes/component';
import { NocturneDriftTrails, type NocturneDriftSeries } from './components/nodex/nocturne-drift-trails/component';
type Mode = 'normal' | 'partial' | 'missing' | 'empty' | 'single' | 'zero' | 'invalid' | 'duplicates' | 'blank-id' | 'bad-time' | 'overflow' | 'many' | 'long';
declare global { interface Window { nodexNocturneNew: { setMode: (mode: Mode) => void; setRevision: (value: boolean) => void; setAnimate: (value: boolean) => void } } }
const normalPromise: NocturnePromiseDatum[] = [
  { id: 'a', label: 'Same', planned: [1,9], actual: [3,9] },
  { id: 'b', label: 'Same', planned: [-4,2], actual: [-5,4] },
  { id: 'c', label: 'Zero', planned: [0,0], actual: [0,0] },
  { id: 'd', label: 'Missing actual', planned: [6,12], actual: null },
];
const normalMargin: NocturneMarginDatum[] = [
  { id: 'a', label: 'Same', target: 100, value: 96, range: [94,102] },
  { id: 'b', label: 'Same', target: 40, value: 42, range: [45,45] },
  { id: 'c', label: 'Zero', target: 0, value: 0, range: [0,0] },
  { id: 'd', label: 'Missing current', target: 10, value: null, range: [8,12] },
];
const normalDrift: NocturneDriftSeries[] = [
  { id: 'a', label: 'Alpha', tone: 'a', observations: [
    { id: 't1', label: 'First', time: 1, x: 0, y: -2 },
    { id: 't2', label: 'Second', time: 3, x: 8, y: 6 },
    { id: 't3', label: 'Third', time: 5, x: 3, y: 9 },
    { id: 't4', label: 'Final', time: 9, x: 12, y: 4 },
  ] },
  { id: 'b', label: 'Beta', observations: [
    { id: 't1', label: 'First', time: 1, x: -4, y: 0 },
    { id: 't2', label: 'Final', time: 2, x: 0, y: 1 },
  ] },
];
export function NocturneExtendedConsumer() {
  const [mode, setMode] = useState<Mode>('normal');
  const [revision, setRevision] = useState(false);
  const [animate, setAnimate] = useState(false);
  useEffect(() => { window.nodexNocturneNew = { setMode, setRevision, setAnimate }; }, []);
  let promise: NocturnePromiseDatum[] = normalPromise.map(row => ({ ...row }));
  let margin: NocturneMarginDatum[] = normalMargin.map(row => ({ ...row }));
  let drift: NocturneDriftSeries[] = normalDrift.map(series => ({ ...series, observations: series.observations.map(row => ({ ...row })) }));
  if (mode === 'empty') { promise = []; margin = []; drift = []; }
  if (mode === 'single') { promise = promise.slice(0,1); margin = margin.slice(0,1); drift = [{ ...drift[0]!, observations: drift[0]!.observations.slice(0,1) }]; }
  if (mode === 'zero') {
    promise = [normalPromise[2]!]; margin = [normalMargin[2]!];
    drift = [{ ...normalDrift[0]!, observations: [{ id:'zero',label:'Zero',time:0,x:0,y:0 }] }];
  }
  if (mode === 'partial') {
    promise[0]!.planned = null; promise[1]!.actual = [4,1];
    margin[0]!.range = [102,94]; margin[1]!.value = null;
    drift = drift.map((series,index) => ({...series, observations:series.observations.map((row,i)=>({...row,x:i===1?null:row.x,y:index===1&&i===1?null:row.y}))}));
  }
  if (mode === 'missing' || mode === 'invalid') {
    promise = promise.map(row => ({...row,planned:mode==='missing'?null:[NaN,4],actual:mode==='missing'?null:[0,Infinity]}));
    margin = margin.map(row => ({...row,target:mode==='missing'?null:Infinity,value:mode==='missing'?null:NaN,range:mode==='missing'?null:[4,-2]}));
    drift = drift.map(series => ({...series,observations:series.observations.map(row=>({...row,x:mode==='missing'?null:NaN}))}));
  }
  if (mode === 'duplicates') { promise.push({...promise[0]!}); margin.push({...margin[0]!}); drift.push({...drift[0]!}); }
  if (mode === 'blank-id') { promise[0]!.id=' '; margin[0]!.id=' '; drift[0]!.observations=[{...drift[0]!.observations[0]!,id:''}]; }
  if (mode === 'bad-time') drift[0]!.observations=drift[0]!.observations.map(row=>({...row,time:1}));
  if (mode === 'overflow') {
    promise = [{id:'huge',label:'Huge',planned:[-Number.MAX_VALUE,-Number.MAX_VALUE/2],actual:[Number.MAX_VALUE/2,Number.MAX_VALUE]}];
    margin = [{id:'huge',label:'Huge',target:0,value:Number.MAX_VALUE,range:null}];
    drift = [{id:'huge',label:'Huge',observations:[{id:'a',label:'A',time:1,x:-Number.MAX_VALUE,y:0},{id:'b',label:'B',time:2,x:Number.MAX_VALUE,y:0}]}];
  }
  if (mode === 'many') {
    promise=Array.from({length:24},(_,i)=>({...normalPromise[0]!,id:String(i),label:'Long lane '+i}));
    margin=Array.from({length:24},(_,i)=>({...normalMargin[0]!,id:String(i),label:'Long target '+i}));
    drift=Array.from({length:12},(_,i)=>({...normalDrift[0]!,id:String(i),label:'Long series '+i}));
  }
  if (mode === 'long') {
    promise=promise.map(row=>({...row,label:'WWWWWWWWWWWWWWWWWWWWWWWWWWWW'}));
    margin=margin.map(row=>({...row,label:'WWWWWWWWWWWWWWWWWWWWWWWWWWWW'}));
  }
  if (revision) {
    promise=promise.toReversed().map(row=>row.id==='a'?{...row,actual:[2,11]}:row);
    margin=margin.toReversed().map(row=>row.id==='a'?{...row,value:104}:row);
    drift=drift.toReversed().map(series=>({...series,observations:series.observations.map(row=>({...row,x:row.x===null?null:row.x+2}))}));
  }
  const value=(v:number)=>'v'+v;
  const delta=(v:number)=>(v>0?'+':'')+v+(mode==='long'?' extremely long units':'d');
  return <div data-nocturne>
    <div id="nocturne-new-primary" className="w-[720px]">
      <NocturnePromiseLanes data={promise} valueFormatter={value} deltaFormatter={delta} height={mode==='many'?230:undefined} animate={animate}/>
      <NocturneMarginLanes data={margin} valueFormatter={value} deltaFormatter={delta} height={mode==='many'?230:undefined} animate={animate}/>
      <NocturneDriftTrails data={drift} xLabel="Cost" yLabel="Quality" xFormatter={value} yFormatter={value} height={mode==='many'?230:undefined} animate={animate}/>
    </div>
    <div id="nocturne-new-secondary" className="w-[620px]">
      <NocturnePromiseLanes data={normalPromise} animate={false}/>
      <NocturneMarginLanes data={normalMargin} animate={false}/>
      <NocturneDriftTrails data={normalDrift} animate={false}/>
    </div>
  </div>;
}
`;

export const NOCTURNE_EXTENDED_SLUGS = ['nocturne-promise-lanes', 'nocturne-margin-lanes', 'nocturne-drift-trails'];
const chart = (page: Page, slug: string) => page.locator('#nocturne-new-primary [data-nx-chart="' + slug + '"]');
const mode = (page: Page, value: string) => page.evaluate(value => (window as unknown as { nodexNocturneNew: { setMode: (mode: string) => void } }).nodexNocturneNew.setMode(value), value);
const revision = (page: Page, value: boolean) => page.evaluate(value => (window as unknown as { nodexNocturneNew: { setRevision: (value: boolean) => void } }).nodexNocturneNew.setRevision(value), value);
const close = (a: number, b: number, message: string) => assert(Math.abs(a - b) < 0.01, message + ': ' + a + ' vs ' + b);
async function bounds(node: Locator) { return node.evaluate(element => { const b = (element as SVGGraphicsElement).getBBox(); return { x: b.x, y: b.y, width: b.width, height: b.height }; }); }
async function assertJoined(lane: Locator) {
  const plan = await bounds(lane.locator('[data-nx-promise-plan]')); const actual = await bounds(lane.locator('[data-nx-promise-actual]'));
  const links = await lane.locator('[data-nx-promise-link]').evaluateAll(elements => elements.map(element => ['x1','x2','y1','y2'].map(name => Number(element.getAttribute(name)))));
  close(links[0]![0]!, plan.x, 'Start connector owns planned start'); close(links[0]![1]!, actual.x, 'Start connector owns actual start');
  close(links[1]![0]!, plan.x + plan.width, 'Finish connector owns planned finish'); close(links[1]![1]!, actual.x + actual.width, 'Finish connector owns actual finish');
  close(links[0]![2]!, plan.y + plan.height, 'Connectors meet the lower planned edge'); close(links[0]![3]!, actual.y, 'Connectors meet the upper actual edge');
}

export async function checkNocturneExtendedConsumer(page: Page): Promise<void> {
  const promise = chart(page, NOCTURNE_EXTENDED_SLUGS[0]!); const margin = chart(page, NOCTURNE_EXTENDED_SLUGS[1]!); const drift = chart(page, NOCTURNE_EXTENDED_SLUGS[2]!);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(promise.locator('[data-nx-promise-lane]')).toHaveCount(4);
  await expect(promise.locator('[data-nx-promise-lane="a"] [data-nx-promise-change]')).toHaveText(['+2d', '0d', '-2d']);
  await expect(promise.locator('[data-nx-promise-lane="b"] [data-nx-promise-change]')).toHaveText(['-1d', '+2d', '+3d']);
  await assertJoined(promise.locator('[data-nx-promise-lane="a"]'));
  const planned = await bounds(promise.locator('rect[data-nx-promise-plan="a"]')); const actual = await bounds(promise.locator('rect[data-nx-promise-actual="a"]'));
  close(actual.width / planned.width, 6 / 8, 'Interval lengths preserve exact duration');
  await expect(promise.locator('line[data-nx-promise-plan="c"]')).toHaveCount(1);
  await expect(promise.locator('[data-nx-promise-lane="d"] [data-nx-promise-link]')).toHaveCount(0);
  await expect(margin.locator('[data-nx-margin-reading]')).toHaveText(['-4d', '+2d', '0d', '—']);
  const zero = Number(await margin.locator('.recharts-reference-line line').getAttribute('x1'));
  const coordinates = await margin.locator('[data-nx-margin-current]').evaluateAll(elements => Object.fromEntries(elements.map(element => [element.getAttribute('data-nx-margin-current')!, Number(element.getAttribute('cx'))])));
  close(coordinates.c!, zero, 'Measured zero lies exactly on its target');
  close((zero - coordinates.a!) / (coordinates.b! - zero), 2, 'All targets share the same deviation unit');
  const interval = await bounds(margin.locator('[data-nx-margin-range="a"]'));
  assert(interval.x < zero && interval.x + interval.width > zero, 'A crossing range must span the actual target line');
  await expect(margin.locator('[data-nx-margin-range="b"] rect')).toHaveCount(0);
  await expect(margin.locator('[data-nx-margin-range="d"]')).toHaveCount(1);
  await expect(margin.locator('[data-nx-margin-current="d"]')).toHaveCount(0);

  await expect(drift.locator('[data-nx-drift-point]')).toHaveCount(6);
  await expect(drift.locator('[data-nx-drift-segment]')).toHaveCount(4);
  await expect(drift.locator('[data-nx-latest="true"]')).toHaveCount(2);
  const alpha = drift.locator('[data-nx-drift-series="a"]');
  const xs = await alpha.locator('[data-nx-drift-point]').evaluateAll(elements => elements.map(element => Number(element.getAttribute('cx'))));
  assert(xs[1]! > xs[2]!, 'Chronological trajectories must retain numeric X reversals');
  const paths = await alpha.locator('[data-nx-drift-segment]').evaluateAll(elements => elements.map(element => element.getAttribute('d')));
  assert(paths.every(d => d?.includes('L') && !/[CQ]/.test(d)), 'Trails use native straight segments');
  const paints = () => page.locator('#nocturne-new-secondary [data-nx-drift-point]').evaluateAll(elements => elements.map(element => getComputedStyle(element).stroke));
  const siblingPaint = await paints();
  await page.locator('#nocturne-new-primary').evaluate(element => {
    const style = (element as HTMLElement).style; style.setProperty('--nx-seriesA', '#923b61'); style.setProperty('--nx-muted', '#63857c'); style.setProperty('--nx-radius-bar', '5px');
  });
  await expect(promise.locator('rect[data-nx-promise-actual="a"]')).toHaveCSS('fill', 'rgb(146, 59, 97)');
  await expect(promise.locator('rect[data-nx-promise-plan="a"]')).toHaveCSS('stroke', 'rgb(99, 133, 124)');
  await expect(promise.locator('rect[data-nx-promise-actual="a"]')).toHaveCSS('rx', '5px');
  await expect(margin.locator('[data-nx-margin-current="a"]')).toHaveCSS('fill', 'rgb(146, 59, 97)');
  await expect(alpha.locator('[data-nx-drift-point]').first()).toHaveCSS('stroke', 'rgb(146, 59, 97)');
  assert.deepEqual(await paints(), siblingPaint, 'Overrides remain inside their descendant scope');
  await page.locator('#nocturne-new-primary').evaluate(element => element.removeAttribute('style'));

  for (const [node, first, second] of [[promise, 'Planned: v1 → v9', 'Planned: v-4 → v2'], [margin, 'Target: v100', 'Target: v40'], [drift, 'Alpha · First', 'Alpha · Second']] as const) {
    await node.scrollIntoViewIfNeeded(); await page.mouse.move(880, 10); await node.locator('svg.recharts-surface').focus();
    await expect(node.locator('.recharts-tooltip-wrapper:visible')).toContainText(first);
    await page.keyboard.press('ArrowRight'); await expect(node.locator('.recharts-tooltip-wrapper:visible')).toContainText(second);
  }
  await promise.locator('[data-nx-promise-lane="a"]').hover();
  await expect(promise.locator('.recharts-tooltip-wrapper:visible')).toContainText('Duration change: -2d');
  await margin.locator('[data-nx-margin-current="a"]').hover();
  await expect(margin.locator('.recharts-tooltip-wrapper:visible')).toContainText('Expected: v94 → v102');
  await alpha.locator('[data-nx-drift-point="t4"]').hover();
  await expect(drift.locator('.recharts-tooltip-wrapper:visible')).toContainText('Latest supplied position');

  const beforePaint = await alpha.locator('[data-nx-drift-point]').first().evaluate(element => getComputedStyle(element).stroke);
  await revision(page, true);
  await expect(promise.locator('[data-nx-promise-lane="a"] [data-nx-promise-change]')).toHaveText(['+1d', '+2d', '+1d']);
  await assertJoined(promise.locator('[data-nx-promise-lane="a"]'));
  await expect(margin.locator('[data-nx-margin-reading="a"]')).toHaveText('+4d');
  await expect(drift.locator('[data-nx-drift-latest="a"]')).toHaveText('v14 / v4');
  assert.equal(await alpha.locator('[data-nx-drift-point]').first().evaluate(element => getComputedStyle(element).stroke), beforePaint, 'Series paint survives reorder');
  await revision(page, false);
  await mode(page, 'partial');
  await expect(promise.locator('[data-nx-promise-plan="a"]')).toHaveCount(0);
  await expect(promise.locator('[data-nx-promise-actual="a"]')).toHaveCount(1);
  await expect(promise.locator('[data-nx-promise-actual="b"]')).toHaveCount(0);
  await expect(promise.locator('[data-nx-promise-link]')).toHaveCount(2);
  await expect(margin.locator('[data-nx-margin-range="a"]')).toHaveCount(0);
  await expect(margin.locator('[data-nx-margin-current="a"]')).toHaveCount(1);
  await expect(margin.locator('[data-nx-margin-current="b"]')).toHaveCount(0);
  await expect(alpha.locator('[data-nx-drift-point]')).toHaveCount(3);
  await expect(alpha.locator('[data-nx-drift-segment]')).toHaveCount(1);
  await expect(drift.locator('[data-nx-drift-latest="b"]')).toHaveText('—');
  await expect(drift.locator('[data-nx-drift-key="b"]')).toContainText('1 unavailable');
  await expect(drift.locator('[data-nx-drift-series="b"] [data-nx-latest="true"]')).toHaveCount(0);
  for (const state of ['missing', 'invalid']) {
    await mode(page, state);
    await expect(promise.locator('[data-nx-promise-plan],[data-nx-promise-actual]')).toHaveCount(0);
    await expect(promise.locator('[data-nx-promise-lane]')).toHaveCount(4);
    await expect(margin.locator('[data-nx-margin-current],[data-nx-margin-range]')).toHaveCount(0);
    await expect(margin.locator('[data-nx-margin-lane]')).toHaveCount(4);
    await expect(drift.getByRole('status')).toHaveText('No complete positions available.');
  }
  for (const state of ['empty', 'duplicates', 'blank-id', 'overflow']) {
    await mode(page, state);
    for (const slug of NOCTURNE_EXTENDED_SLUGS) await expect(chart(page, slug).getByRole('status')).toHaveCount(1);
  }
  await mode(page, 'bad-time'); await expect(drift.getByRole('status')).toContainText('strictly increasing');
  await mode(page, 'single');
  await expect(promise.locator('[data-nx-promise-lane]')).toHaveCount(1); await expect(drift.locator('[data-nx-drift-point]')).toHaveCount(1);
  await expect(drift.locator('[data-nx-drift-segment]')).toHaveCount(0);
  await mode(page, 'zero');
  await expect(promise.locator('rect[data-nx-promise-plan],rect[data-nx-promise-actual]')).toHaveCount(0);
  await expect(promise.locator('line[data-nx-promise-plan],line[data-nx-promise-actual]')).toHaveCount(2);
  await expect(margin.locator('[data-nx-margin-current]')).toHaveCount(1);
  await expect(drift.locator('[data-nx-drift-point][data-nx-latest="true"]')).toHaveCount(1);
  await mode(page, 'long');
  for (const node of [promise.locator('[data-nx-promise-lane="a"]'), margin.locator('[data-nx-margin-lane="a"]')]) {
    assert(await node.locator('foreignObject span').evaluateAll(elements => elements.every(element => getComputedStyle(element).textOverflow === 'ellipsis' && element.getAttribute('title') === element.textContent)), 'Compact labels retain full readings in native titles');
  }
  await mode(page, 'many');
  await page.locator('#nocturne-new-primary').evaluate(element => (element as HTMLElement).style.width = '280px');
  for (const slug of NOCTURNE_EXTENDED_SLUGS) {
    assert(await chart(page, slug).evaluate(element => element.scrollWidth <= element.clientWidth + 1 && element.scrollHeight <= element.clientHeight + 1), slug + ': constrained content stays inside the surface');
  }
  for (const node of [promise, margin, drift]) {
    assert(await node.evaluate(element => [...element.querySelectorAll('div')].some(child => getComputedStyle(child).overflowY === 'auto' && child.scrollHeight > child.clientHeight)), 'Dense lanes and trajectory legends scroll vertically inside a constrained height');
  }
  await page.locator('#nocturne-new-primary').evaluate(element => element.removeAttribute('style'));
  await mode(page, 'normal');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.locator('#nocturne-new-primary').evaluate(element => (element as HTMLElement).style.setProperty('--nx-motion-draw-duration', '1s'));
  await page.evaluate(() => (window as unknown as { nodexNocturneNew: { setAnimate: (value: boolean) => void } }).nodexNocturneNew.setAnimate(true));
  for (const slug of NOCTURNE_EXTENDED_SLUGS) await expect(chart(page, slug)).toHaveAttribute('data-nx-animated', 'true');
  await revision(page, true);
  await expect.poll(() => promise.locator('[data-nx-promise-lane="a"]').getAttribute('opacity').then(value => Number(value) > 0 && Number(value) < 1)).toBe(true);
  await assertJoined(promise.locator('[data-nx-promise-lane="a"]'));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const slug of NOCTURNE_EXTENDED_SLUGS) await expect(chart(page, slug)).toHaveAttribute('data-nx-animated', 'false');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.locator('#nocturne-new-primary').evaluate(element => (element as HTMLElement).style.setProperty('--nx-motion-draw-duration', '0s'));
  for (const slug of NOCTURNE_EXTENDED_SLUGS) await expect(chart(page, slug)).toHaveAttribute('data-nx-animated', 'false');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('#nocturne-new-primary').evaluate(element => element.removeAttribute('style'));
  await revision(page, false);
  assert.equal(await page.locator('#nocturne-new-primary svg').evaluateAll(elements => elements.some(element => /(?:NaN|Infinity)/.test(element.innerHTML))), false, 'Final geometry remains finite');
  console.log('Validated Promise lanes, Margin lanes and Drift trails: exact intervals, shared targets, chronological reversals, gaps, native inspection, scoped tokens, independent instances and motion.');
}
