import assert from 'node:assert/strict';
import { expect, type Locator, type Page } from '@playwright/test';

export const NOCTURNE_MATRIX_SOURCE = `import {useEffect,useState} from 'react';
import {NocturneScatterMatrix,type NocturneMatrixDatum,type NocturneMatrixDimension,type NocturneMatrixCohort} from './components/nodex/nocturne-scatter-matrix/component';
type Mode='normal'|'empty'|'missing'|'single'|'zero'|'partial'|'updated'|'duplicates'|'blank'|'cohort'|'dimension'|'duplicate-dimension'|'duplicate-cohort'|'bins'|'overflow'|'many'|'long';
declare global {interface Window {nodexNocturneMatrix:{setMode:(v:Mode)=>void;setRevision:(v:boolean)=>void;setAnimate:(v:boolean)=>void}}}
const dimensions:NocturneMatrixDimension[]=[{id:'x',label:'Load',unit:'req/s'},{id:'y',label:'Delta',unit:'ms'},{id:'z',label:'CPU',unit:'%'}];
const cohorts:NocturneMatrixCohort[]=[{id:'a',label:'Alpha',tone:'a'},{id:'b',label:'Beta',tone:'b'},{id:'c',label:'Empty'}];
const data:NocturneMatrixDatum[]=[
 {id:'a0',label:'First',cohortId:'a',values:{x:0,y:-4,z:10}},
 {id:'a1',label:'Same',cohortId:'a',values:{x:2,y:0,z:12}},
 {id:'a2',label:'Same',cohortId:'a',values:{x:4,y:4,z:14}},
 {id:'a3',label:'Partial',cohortId:'a',values:{x:4,y:null,z:16}},
 {id:'b0',label:'Other',cohortId:'b',values:{x:0,y:4,z:16}},
 {id:'b1',label:'Other',cohortId:'b',values:{x:2,y:2,z:12}},
 {id:'b2',label:'Partial beta',cohortId:'b',values:{x:null,y:0,z:null}},
];
export function NocturneMatrixConsumer(){
 const [mode,setMode]=useState<Mode>('normal');const [revision,setRevision]=useState(false);const [animate,setAnimate]=useState(false);
 useEffect(()=>{window.nodexNocturneMatrix={setMode,setRevision,setAnimate};},[]);
 let rows=data.map(row=>({...row,values:{...row.values}}));let metrics=dimensions.map(d=>({...d}));let groups=cohorts.map(g=>({...g}));let bins=2;
 if(mode==='empty')rows=[];
 if(mode==='missing')rows=rows.map(row=>({...row,values:{x:null,y:NaN,z:Infinity}}));
 if(mode==='single')rows=[rows[1]!];
 if(mode==='zero')rows=[{id:'zero',label:'Zero',cohortId:'a',values:{x:0,y:0,z:0}}];
 if(mode==='partial')rows=rows.map(row=>({...row,values:{x:row.values.x!,y:null}}));
 if(mode==='updated')rows[1]!.values.x=8;
 if(mode==='duplicates')rows.push(rows[0]!);
 if(mode==='blank')rows[0]!.id=' ';
 if(mode==='cohort')rows[0]!.cohortId='unknown';
 if(mode==='dimension')rows[0]!.values.unknown=1;
 if(mode==='duplicate-dimension')metrics.push(metrics[0]!);
 if(mode==='duplicate-cohort')groups.push(groups[0]!);
 if(mode==='bins')bins=2.5;
 if(mode==='overflow'){rows[0]!.values.x=-Number.MAX_VALUE;rows[1]!.values.x=Number.MAX_VALUE;}
 if(mode==='many'){
  metrics=Array.from({length:5},(_,i)=>({id:'m'+i,label:'Metric '+i,unit:'u'}));
  rows=Array.from({length:30},(_,i)=>({id:'row'+i,label:'Observation '+i,cohortId:i%2?'a':'b',values:Object.fromEntries(metrics.map((d,j)=>[d.id,i*(j+1)]))}));
 }
 if(mode==='long'){metrics=metrics.map(d=>({...d,label:'WWWWWWWWWWWWWWWWWWWWWWW',unit:'very long measurement unit',valueFormatter:(v:number)=>v+' formatted'}));groups=groups.map(g=>({...g,label:'WWWWWWWWWWWWWWWWWWWWWWWW'}));}
 if(revision){rows=rows.toReversed();metrics=metrics.toReversed();groups=groups.toReversed();}
 return <div data-nocturne><div id="nocturne-matrix-primary" className="w-[760px]">
  <NocturneScatterMatrix data={rows} dimensions={metrics} cohorts={groups} binCount={bins} animate={animate} height={mode==='many'?230:undefined}/>
 </div><div id="nocturne-matrix-secondary" className="w-[760px]">
  <NocturneScatterMatrix data={data} dimensions={dimensions} cohorts={cohorts} binCount={2} animate={false}/>
 </div></div>;
}
`;

const mode = (page: Page, value: string) => page.evaluate(value => (window as unknown as { nodexNocturneMatrix: { setMode: (v: string) => void } }).nodexNocturneMatrix.setMode(value), value);
const revision = (page: Page, value: boolean) => page.evaluate(value => (window as unknown as { nodexNocturneMatrix: { setRevision: (v: boolean) => void } }).nodexNocturneMatrix.setRevision(value), value);
const cell = (root: Locator, x: string, y: string) => root.locator('[data-nx-matrix-cell=' + JSON.stringify(JSON.stringify([x, y])) + ']');
const near = (a: number, b: number, message: string) => assert(Math.abs(a - b) < .05, message + ': ' + a + ' vs ' + b);
async function point(root: Locator, id: string) { return root.locator('[data-nx-matrix-point="' + id + '"]').evaluate(el => ({ x: Number(el.getAttribute('cx')), y: Number(el.getAttribute('cy')), paint: getComputedStyle(el).fill })); }
async function bins(root: Locator, cohort: string) { return root.locator('[data-nx-matrix-bin][data-nx-cohort="' + cohort + '"]').evaluateAll(elements => elements.map(el => ({
  from: Number(el.getAttribute('data-nx-from')), to: Number(el.getAttribute('data-nx-to')), count: Number(el.getAttribute('data-nx-count')),
  x: Number(el.getAttribute('x')), width: Number(el.getAttribute('width')), height: Number(el.getAttribute('height')),
}))); }

async function checkInspectionStability(page: Page, matrix: Locator): Promise<void> {
  const xy = cell(matrix, 'x', 'y'); const xz = cell(matrix, 'x', 'z'); const yz = cell(matrix, 'y', 'z');
  await matrix.scrollIntoViewIfNeeded(); await page.mouse.move(900, 10);
  await expect.poll(() => matrix.locator('[data-nx-matrix-point],[data-nx-matrix-bin]').evaluateAll(elements => elements.every(el =>
    Number((el.matches('[data-nx-matrix-point]') ? el.parentElement : el)?.getAttribute('opacity')) === 1))).toBe(true);
  const probe = await matrix.evaluateHandle(root => {
    const selector = '[data-nx-matrix-point],[data-nx-matrix-bin]';
    const original = [...root.querySelectorAll(selector)];
    const changes = { opacity: 0, geometry: 0 };
    const observer = new MutationObserver(records => {
      for (const record of records) {
        const el = record.target as Element;
        if (record.attributeName === 'opacity' && (el.matches('[data-nx-matrix-bin]') || el.querySelector('[data-nx-matrix-point]'))) changes.opacity++;
        if (['cx', 'cy', 'x', 'y', 'width', 'height'].includes(record.attributeName ?? '') && el.matches(selector)) changes.geometry++;
      }
    });
    observer.observe(root, { subtree: true, attributes: true });
    return { original, changes, observer };
  });
  try {
    await xy.locator('[data-nx-matrix-point="a1"]').hover();
    await expect(xy.locator('.recharts-tooltip-wrapper:visible')).toContainText('SameAlphaLoad: 2 req/sDelta: 0 ms');
    await expect(matrix.locator('[data-nx-matrix-point="a1"][data-nx-selected="true"]')).toHaveCount(6);
    await expect(matrix.locator('[data-nx-matrix-bin][data-nx-selected="true"]')).toHaveCount(3);
    await xz.locator('[data-nx-matrix-point="a3"]').hover();
    await expect(matrix.locator('[data-nx-matrix-point][data-nx-selected="true"]')).toHaveCount(2);
    await page.mouse.move(900, 10);
    await expect(matrix.locator('[data-nx-selected="true"]')).toHaveCount(0);
    await yz.locator('svg.recharts-surface').focus();
    await expect(matrix.locator('[data-nx-matrix-point="a0"][data-nx-selected="true"]')).toHaveCount(6);
    await page.keyboard.press('ArrowRight');
    await expect(yz.locator('.recharts-tooltip-wrapper:visible')).toContainText('SameAlphaDelta: 0 msCPU: 12 %');
    await expect(matrix.locator('[data-nx-matrix-point="a1"][data-nx-selected="true"]')).toHaveCount(6);
    await page.keyboard.press('Escape');
    await expect(matrix.locator('[data-nx-selected="true"]')).toHaveCount(0);
    // Observe a full configured draw duration: inspection must never start another fade.
    await page.waitForTimeout(1100);
    assert.deepEqual(await probe.evaluate(({ original, changes }) => ({ ...changes, retained: original.every(el => el.isConnected) })),
      { opacity: 0, geometry: 0, retained: true }, 'Pointer and keyboard inspection retain native marks, geometry and animation state');
  } finally {
    await probe.evaluate(({ observer }) => observer.disconnect());
    await probe.dispose();
  }
}

export async function checkNocturneMatrixConsumer(page: Page): Promise<void> {
  const primary = page.locator('#nocturne-matrix-primary'); const matrix = primary.locator('[data-nx-chart]');
  const secondary = page.locator('#nocturne-matrix-secondary [data-nx-chart]');
  const xy = cell(matrix, 'x', 'y'); const xz = cell(matrix, 'x', 'z'); const xx = cell(matrix, 'x', 'x');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(matrix.locator('[data-nx-matrix-cell]')).toHaveCount(9);
  await expect(matrix.locator('[data-nx-matrix-kind="histogram"]')).toHaveCount(3);
  await expect(matrix.locator('[data-nx-matrix-point]')).toHaveCount(32);
  await expect(xy.locator('[data-nx-matrix-count]')).toHaveText('Pairs · 52 omitted');
  await expect(xx.locator('[data-nx-matrix-count]')).toHaveText('Count · 61 omitted');
  await expect(matrix.locator('[data-nx-matrix-key="c"]')).toHaveText('Emptyn=0');
  const a0 = await point(xy, 'a0'); const a1 = await point(xy, 'a1'); const a2 = await point(xy, 'a2');
  near(a1.x - a0.x, a2.x - a1.x, 'Numeric X spacing is exact'); near(a0.y - a1.y, a1.y - a2.y, 'Signed numeric Y spacing is exact');
  near((await point(xz, 'a1')).x, a1.x, 'Every panel uses the same per-metric scale');
  const alphaBins = await bins(xx, 'a'); const betaBins = await bins(xx, 'b');
  assert.deepEqual(alphaBins.map(b => [b.from, b.to, b.count]), [[0, 2, 1], [2, 4, 3]], 'Interior boundaries join the next bin; the upper endpoint stays in the last bin');
  assert.deepEqual(betaBins.map(b => b.count), [1, 1], 'Cohort counts overlay rather than stack');
  near(alphaBins[1]!.height / alphaBins[0]!.height, 3, 'Native histogram heights encode absolute count');
  near(alphaBins[0]!.width, alphaBins[1]!.width, 'Bins have equal numeric width');
  near(alphaBins[1]!.x, a1.x, 'Histogram edges and scatter coordinates share the same X scale');
  near(betaBins[0]!.height, alphaBins[0]!.height, 'Counts share a Y scale across cohorts');
  await matrix.scrollIntoViewIfNeeded(); await page.mouse.move(900, 10); await xy.locator('svg.recharts-surface').focus();
  await expect(xy.locator('.recharts-tooltip-wrapper:visible')).toContainText('FirstAlphaLoad: 0 req/sDelta: -4 ms');
  await expect(matrix.locator('[data-nx-matrix-point][data-nx-selected="true"]')).toHaveCount(6);
  await expect(matrix.locator('[data-nx-matrix-bin][data-nx-selected="true"]')).toHaveCount(3);
  await page.keyboard.press('ArrowRight');
  await expect(xy.locator('.recharts-tooltip-wrapper:visible')).toContainText('SameAlphaLoad: 2 req/sDelta: 0 ms');
  await expect(matrix.locator('[data-nx-matrix-point="a1"][data-nx-selected="true"]')).toHaveCount(6);
  await expect(secondary.locator('[data-nx-selected="true"]')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(matrix.locator('[data-nx-selected="true"]')).toHaveCount(0);
  await xz.locator('[data-nx-matrix-point="a3"]').hover({ timeout: 5000 });
  await expect(xz.locator('.recharts-tooltip-wrapper:visible')).toContainText('PartialAlphaLoad: 4 req/sCPU: 16 %');
  await expect(matrix.locator('[data-nx-matrix-point][data-nx-selected="true"]')).toHaveCount(2);
  await expect(matrix.locator('[data-nx-matrix-bin][data-nx-selected="true"]')).toHaveCount(2);
  await page.mouse.move(900, 10); await xx.locator('svg.recharts-surface').focus();
  await expect(xx.locator('.recharts-tooltip-wrapper:visible')).toContainText('0 req/s ≤ value < 2 req/sAlpha: 1Beta: 1Empty: 0');
  await page.keyboard.press('ArrowRight');
  await expect(xx.locator('.recharts-tooltip-wrapper:visible')).toContainText('2 req/s ≤ value ≤ 4 req/sAlpha: 3Beta: 1Empty: 0');
  await expect(matrix.locator('[data-nx-selected="true"]')).toHaveCount(0);

  const siblingPaint = (await point(cell(secondary, 'x', 'y'), 'a0')).paint;
  await primary.evaluate(el => { const style = (el as HTMLElement).style; style.setProperty('--nx-seriesA', '#923b61'); style.setProperty('--nx-stroke-hairline', '1.5px'); });
  await expect(xy.locator('[data-nx-matrix-point="a0"]')).toHaveCSS('fill', 'rgb(146, 59, 97)');
  await expect(xx.locator('[data-nx-matrix-bin][data-nx-cohort="a"]').first()).toHaveCSS('stroke', 'rgb(146, 59, 97)');
  await expect(xx.locator('[data-nx-matrix-bin]').first()).toHaveCSS('stroke-width', '1.5px');
  assert.equal((await point(cell(secondary, 'x', 'y'), 'a0')).paint, siblingPaint, 'Token scopes remain independent');
  await primary.evaluate(el => el.removeAttribute('style'));
  await revision(page, true);
  await expect(matrix.locator('[data-nx-matrix-key]')).toHaveText(['Emptyn=0', 'Betan=3', 'Alphan=4']);
  assert.deepEqual(await point(xy, 'a1'), a1, 'Observation geometry and cohort paint survive complete reorder');
  assert.deepEqual((await bins(xx, 'a')).map(b => [b.from, b.to, b.count]), [[0, 2, 1], [2, 4, 3]]);
  await revision(page, false);
  await mode(page, 'updated');
  const changed = await point(xy, 'a1'); const unchanged = await point(xy, 'a2');
  near(changed.x - a0.x, a2.x - a0.x, 'A changed maximum expands the native scale');
  near(unchanged.x - a0.x, (changed.x - a0.x) / 2, 'Existing observations move to their actual coordinates on the new scale');
  near((await point(xz, 'a2')).x, unchanged.x, 'An updated domain propagates to every pair');
  assert.equal((await bins(xx, 'a')).at(-1)!.to, 8, 'Marginal bin edges follow the shared updated extent');
  for (const value of ['duplicates', 'blank', 'cohort', 'dimension', 'duplicate-dimension', 'duplicate-cohort']) {
    await mode(page, value); await expect(matrix.getByRole('status')).toHaveText('Use unique, nonempty IDs and only declared dimensions and cohorts.');
  }
  await mode(page, 'bins'); await expect(matrix.getByRole('status')).toHaveText('Use an integer bin count from 2 to 24.');
  await mode(page, 'overflow'); await expect(matrix.getByRole('status')).toHaveText('A dimension span cannot be divided into finite, distinct bins.');
  await mode(page, 'empty'); await expect(matrix.getByRole('status')).toHaveText('No observations supplied.');
  await mode(page, 'missing'); await expect(matrix.locator('[data-nx-matrix-point],[data-nx-matrix-bin]')).toHaveCount(0);
  await expect(matrix.getByRole('status').last()).toHaveText('No finite coordinates available.');
  await mode(page, 'partial'); await expect(matrix.locator('[data-nx-matrix-point]')).toHaveCount(0);
  assert.equal((await bins(xx, 'a')).reduce((sum, bin) => sum + bin.count, 0), 4, 'Marginals retain values when other coordinates are unavailable');
  await expect(cell(matrix, 'y', 'y').locator('[data-nx-matrix-bin]')).toHaveCount(0);
  for (const value of ['single', 'zero']) {
    await mode(page, value); await expect(matrix.locator('[data-nx-matrix-point]')).toHaveCount(6);
    await expect(matrix.locator('[data-nx-matrix-bin]')).toHaveCount(3);
    assert((await bins(xx, 'a')).every(bin => bin.count === 1), 'Constant metrics keep exact counts without manufactured observations');
  }
  await mode(page, 'many'); await primary.evaluate(el => (el as HTMLElement).style.width = '280px');
  await expect(matrix.locator('[data-nx-matrix-cell]')).toHaveCount(25);
  assert(await matrix.evaluate(el => el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1), 'Constrained matrix stays inside its frame');
  assert(await matrix.evaluate(el => [...el.querySelectorAll('div')].some(div => getComputedStyle(div).overflowX === 'auto' && div.scrollWidth > div.clientWidth)), 'Narrow matrix scrolls locally');
  assert(await matrix.locator('ul').evaluate(el => { let p = el.parentElement; while (p) { if (getComputedStyle(p).overflowY === 'auto' && p.scrollHeight > p.clientHeight) return true; p = p.parentElement; } return false; }), 'Full cohort key shares the vertical scroller');
  await mode(page, 'long');
  assert(await matrix.evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'Long metric and cohort labels remain contained');
  await primary.evaluate(el => el.removeAttribute('style')); await mode(page, 'normal');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.evaluate(() => (window as unknown as { nodexNocturneMatrix: { setAnimate: (v: boolean) => void } }).nodexNocturneMatrix.setAnimate(true));
  await expect(matrix).toHaveAttribute('data-nx-animated', 'true');
  await primary.evaluate(el => (el as HTMLElement).style.setProperty('--nx-motion-draw-duration', '0s'));
  await expect(matrix).toHaveAttribute('data-nx-animated', 'false');
  await primary.evaluate(el => el.removeAttribute('style')); await expect(matrix).toHaveAttribute('data-nx-animated', 'true');
  await primary.evaluate(el => (el as HTMLElement).style.setProperty('--nx-motion-draw-duration', '1s'));
  await checkInspectionStability(page, matrix);
  await mode(page, 'updated');
  await expect.poll(() => xy.locator('[data-nx-matrix-point]').evaluateAll(elements => elements.some(el => {
    const opacity = Number(el.parentElement?.getAttribute('opacity')); return opacity > 0 && opacity < 1;
  }))).toBe(true);
  near((await point(xy, 'a2')).x, unchanged.x, 'Fading observations stay at their final native coordinates');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(matrix).toHaveAttribute('data-nx-animated', 'false');
  await expect(matrix.locator('[data-nx-matrix-point]')).toHaveCount(32);
  assert.equal(await matrix.locator('svg').evaluateAll(elements => elements.some(el => /(?:NaN|Infinity)/.test(el.innerHTML))), false, 'All native geometry remains finite');
  await primary.evaluate(el => el.removeAttribute('style')); await mode(page, 'normal');
  console.log('Validated Nocturne scatterplot matrix: native pair scales, exact shared bins and counts, linked keyboard/pointer inspection without animation restarts, missing coordinates, stable identities, independent scopes, constrained layouts and live motion.');
}
