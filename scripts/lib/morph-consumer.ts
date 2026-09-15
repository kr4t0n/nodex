import assert from 'node:assert/strict';
import { expect, type Locator, type Page } from '@playwright/test';
export const MORPH_SLUGS = ['scatter-morph'];
export const MORPH_CONSUMER_SOURCE = `import{useEffect,useState}from'react';
import{AnimationControllerProvider,type AnimationController}from'recharts';
import{ScatterMorph}from'./components/nodex/scatter-morph/component';
type Mode='normal'|'revised'|'zero'|'partial'|'missingRevenue'|'invalid'|'single'|'empty'|'duplicate'|'reordered'|'inserted'|'removed'|'reranked';
const pending=new Set<(p:number)=>void>();const controller:AnimationController=(_timer,handle,listener)=>{handle.tick(0);handle.tick(handle.getAnimationBegin());const seek=(p:number)=>{handle.tick(handle.getAnimationBegin()+handle.getAnimationDuration()*p);if(p>=1)handle.complete();listener(handle.getInterpolated());};pending.add(seek);seek(0);return()=>{pending.delete(seek);};};
declare global{interface Window{nodexMorphFixture:{setMode:(mode:Mode)=>void;setManual:(value:boolean)=>void;seek:(p:number)=>void;pending:()=>number}}}
function Charts({mode,animate}:{mode:Mode;animate:boolean}){
  const all=[486,391,274,318].map((value,index)=>({id:'product'+index,product:'Same',priceUsd:mode==='partial'&&index===1?null:[12,18,9,15][index]!,csat:[9.1,8.4,8.8,8][index]!,revenueK:mode==='zero'?0:mode==='invalid'?NaN:mode==='missingRevenue'&&index===1?null:mode==='revised'?value*2:mode==='reranked'?[200,480,350,100][index]!:value}));
  const data=mode==='empty'?[]:mode==='single'?all.slice(0,1):mode==='duplicate'?[all[0]!,all[0]!]:mode==='reordered'?[...all].reverse():mode==='removed'?all.filter(row=>row.id!=='product1'):mode==='inserted'?[{id:'new-product',product:'Same',priceUsd:22,csat:7.8,revenueK:150},...all]:all;
  return <ScatterMorph data={data} animate={animate}/>;
}
export function MorphConsumer({animate}:{animate:boolean}){const[mode,setMode]=useState<Mode>('normal');const[manual,setManual]=useState(false);useEffect(()=>{window.nodexMorphFixture={setMode,setManual,seek:p=>pending.forEach(fn=>fn(p)),pending:()=>pending.size};},[]);return <><section id='morph-primary' className='w-[660px]'><AnimationControllerProvider value={controller}><Charts mode={mode} animate={animate||manual}/></AnimationControllerProvider></section><section id='morph-secondary' className='w-[520px]'><Charts mode='normal' animate={false}/></section></>;}
`;
async function setMode(page: Page, mode: string) { await page.evaluate(value => (window as unknown as { nodexMorphFixture: { setMode: (mode: string) => void } }).nodexMorphFixture.setMode(value), mode); }
async function advance(node: Locator, view: string) { await node.getByRole('button').press('Space'); await expect(node).toHaveAttribute('data-nx-view',view); }
async function boxes(node: Locator) { return node.locator('[data-nx-product-id]').evaluateAll(elements=>Object.fromEntries(elements.map(e=>{const geometry=e.querySelector<SVGGraphicsElement>('[data-nx-moving-mark], [data-nx-native-mark][data-nx-visible="true"] :is(path,circle,rect)');const b=geometry!.getBBox();return [e.getAttribute('data-nx-product-id')!,[b.x,b.y,b.width,b.height]];}))); }
function nearBoxes(a: Record<string,number[]>,b: Record<string,number[]>,tolerance=0.4) { assert.deepEqual(Object.keys(a).sort(),Object.keys(b).sort());for(const key of Object.keys(a))for(let i=0;i<4;i++)assert(Math.abs(a[key]![i]!-b[key]![i]!)<tolerance,`${key} outline jumped in dimension ${i}`); }

async function renderedFrame(page: Page) {
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

/** Inspect the actual wedge area independently of the series' animation payload. */
async function wedgeAreas(node: Locator): Promise<Record<string, number>> {
  return node.locator('[data-nx-native-mark]').evaluateAll(elements => Object.fromEntries(elements.map(element => {
    const geometry = element.querySelector<SVGGeometryElement>('path');
    const length = geometry?.getTotalLength() ?? 0;
    if (!geometry || !Number.isFinite(length) || length <= 0) return [element.getAttribute('data-nx-native-mark')!, 0];
    const points = Array.from({ length: 512 }, (_, index) => geometry.getPointAtLength(length * index / 512));
    const area = Math.abs(points.reduce((sum, point, index) => {
      const next = points[(index + 1) % points.length]!;
      return sum + point.x * next.y - next.x * point.y;
    }, 0)) / 2;
    return [element.getAttribute('data-nx-native-mark')!, area];
  })));
}

async function checkProductIdentity(page: Page, node: Locator, seek: (progress: number) => Promise<void>) {
  const scatter = await boxes(node);
  for (const mode of ['reordered', 'inserted', 'removed']) {
    const retained = Object.fromEntries(Object.entries(scatter).filter(([id]) => mode !== 'removed' || id !== 'product1'));
    await setMode(page, mode);
    await renderedFrame(page);
    for (const progress of [0, 0.5, 1]) {
      await seek(progress);
      const current = await boxes(node);
      nearBoxes(Object.fromEntries(Object.entries(current).filter(([id]) => id in retained)), retained);
      if (mode === 'removed') assert(!('product1' in current), 'A removed scatter product must leave the observation series');
      if (mode === 'inserted' && progress > 0) assert((current['new-product']?.[2] ?? 0) > 0, 'The new product must animate in with its own mark');
    }
    await setMode(page, 'normal');
    await renderedFrame(page);
    await seek(1);
    nearBoxes(await boxes(node), scatter);
  }

  // Ranking changes move bars between columns; each starts with its own old rectangle.
  await advance(node, 'bar');
  await seek(1);
  const barsBefore = await boxes(node);
  await setMode(page, 'reranked');
  await renderedFrame(page);
  nearBoxes(await boxes(node), barsBefore);
  await seek(0.5);
  const barsMiddle = await boxes(node);
  await seek(1);
  const barsAfter = await boxes(node);
  assert(barsAfter.product1![0]! < barsAfter.product2![0]! && barsAfter.product2![0]! < barsAfter.product0![0]! && barsAfter.product0![0]! < barsAfter.product3![0]!, 'Bars must finish in the new revenue order');
  nearBoxes(barsMiddle, Object.fromEntries(Object.entries(barsBefore).map(([id, before]) => [id, before.map((value, index) => (value + barsAfter[id]![index]!) / 2)])));
  await setMode(page, 'normal');
  await renderedFrame(page);
  await seek(1);

  // A pie can rearrange angular positions, but its starting area must still belong to the same product.
  await advance(node, 'donut');
  await seek(1);
  const areasBefore = await wedgeAreas(node);
  await setMode(page, 'reranked');
  await renderedFrame(page);
  const areasStart = await wedgeAreas(node);
  assert.deepEqual(Object.keys(areasStart).sort(), Object.keys(areasBefore).sort());
  for (const [id, area] of Object.entries(areasBefore)) {
    assert(area > 0 && Math.abs(areasStart[id]! - area) / area < 0.01, `${id} inherited another product's wedge area`);
  }
  await seek(0.5);
  const areasMiddle = await wedgeAreas(node);
  await seek(1);
  const areasAfter = await wedgeAreas(node);
  for (const [id, area] of Object.entries(areasBefore)) {
    assert(areasMiddle[id]! > Math.min(area, areasAfter[id]!) && areasMiddle[id]! < Math.max(area, areasAfter[id]!), `${id} must interpolate its own revenue share`);
  }
  await setMode(page, 'normal');
  await renderedFrame(page);
  await seek(1);
  await advance(node, 'scatter');
  await seek(1);
  nearBoxes(await boxes(node), scatter);
}

export async function checkMorphConsumer(page: Page): Promise<void> {
  const node=page.locator('#morph-primary [data-nx-chart="scatter-morph"]');const secondary=page.locator('#morph-secondary [data-nx-chart="scatter-morph"]');
  await expect(node).toHaveAttribute('data-nx-view','scatter');await expect(node.locator('[data-nx-product-id]')).toHaveCount(4);await expect(node.locator('[data-nx-view-caption]')).toHaveText('PRICE VS RATING');await expect(node.locator('.recharts-scatter')).toHaveCount(1);
  const first=node.locator('[data-nx-native-mark="product0"] circle');assert(Math.abs(Number(await first.getAttribute('r'))-Math.sqrt(486)*.6)<1e-8);const colors=await node.locator('[data-nx-product-id]').evaluateAll(elements=>Object.fromEntries(elements.map(e=>[e.getAttribute('data-nx-product-id'),getComputedStyle(e).fill])));
  for(const view of ['scatter','bar','donut']as const){await node.scrollIntoViewIfNeeded();await page.mouse.move(880,10);await node.locator('svg.recharts-surface').focus();await page.keyboard.press('ArrowLeft');await expect(node.getByRole('status')).toContainText(view==='scatter'?'Same — $12 · CSAT 9.1':'Same — $486K');await page.keyboard.press('ArrowRight');await expect(node.getByRole('status')).toContainText(view==='scatter'?'Same — $18 · CSAT 8.4':'Same — $391K');const current=await node.locator('[data-nx-product-id]').evaluateAll(elements=>Object.fromEntries(elements.map(e=>[e.getAttribute('data-nx-product-id'),getComputedStyle(e).fill])));assert.deepEqual(current,colors);await expect(secondary).toHaveAttribute('data-nx-view','scatter');await advance(node,view==='scatter'?'bar':view==='bar'?'donut':'scatter');}
  await node.evaluate(e=>{const s=(e as HTMLElement).style;s.setProperty('--nx-ink','#123456');s.setProperty('--nx-type-axis-size','12px');s.setProperty('--nx-stroke-mark','0.5px');});await expect.poll(()=>node.locator('[data-nx-native-mark="product0"] circle').evaluate(e=>getComputedStyle(e).fill)).toBe('rgb(18, 52, 86)');await expect.poll(()=>node.locator('[data-nx-view-caption]').evaluate(e=>getComputedStyle(e).fontSize)).toBe('13.5px');assert.notEqual(await secondary.locator('[data-nx-native-mark="product0"] circle').evaluate(e=>getComputedStyle(e).fill),'rgb(18, 52, 86)');
  const width=Number(await node.locator('svg').getAttribute('width'));await node.evaluate(e=>{(e as HTMLElement).style.width='360px';});await expect.poll(async()=>Number(await node.locator('svg').getAttribute('width'))).toBeLessThan(width);await node.evaluate(e=>{(e as HTMLElement).style.width='';});await expect.poll(async()=>Number(await node.locator('svg').getAttribute('width'))).toBe(width);
  for(const mode of ['revised','partial','missingRevenue','zero','single','invalid','empty','duplicate']){await setMode(page,mode);const invalid=['invalid','empty','duplicate'].includes(mode);if(invalid)await expect(node.getByRole('status')).toContainText('No complete');else await expect(node.locator('[data-nx-product-id]')).toHaveCount(mode==='zero'?0:mode==='single'?1:['partial','missingRevenue'].includes(mode)?3:4);await advance(node,'bar');if(!invalid)await expect(node.locator('[data-nx-product-id]')).toHaveCount(mode==='zero'?0:mode==='single'?1:mode==='missingRevenue'?3:4);await advance(node,'donut');if(mode==='zero')await expect(node.getByRole('status')).toHaveText('Total revenue is zero.');else if(invalid||mode==='missingRevenue')await expect(node.getByRole('status')).toContainText('No complete');else await expect(node.locator('[data-nx-product-id]')).toHaveCount(mode==='single'?1:4);assert.equal(await node.evaluate(e=>/NaN|Infinity/.test(e.innerHTML)),false);await advance(node,'scatter');}
  await setMode(page,'normal');await page.locator('#morph-primary').evaluate(e=>{const s=(e as HTMLElement).style;s.setProperty('--nx-motion-draw-duration','1s');s.setProperty('--nx-motion-draw-easing','linear');});await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>(window as unknown as {nodexMorphFixture:{setManual:(value:boolean)=>void}}).nodexMorphFixture.setManual(true));await expect(node).toHaveAttribute('data-nx-animated','true');await expect.poll(()=>page.evaluate(()=>(window as unknown as {nodexMorphFixture:{pending:()=>number}}).nodexMorphFixture.pending())).toBeGreaterThan(0);
  const seek=async(p:number)=>{await page.evaluate(p=>(window as unknown as {nodexMorphFixture:{seek:(p:number)=>void}}).nodexMorphFixture.seek(p),p);await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));};await seek(1);
  await checkProductIdentity(page, node, seek);
  const scatter=await boxes(node);await advance(node,'bar');await expect(node.locator('[data-nx-moving-mark]')).toHaveCount(4);nearBoxes(await boxes(node),scatter);await seek(.5);const middle=await boxes(node);assert.notDeepEqual(middle,scatter);await expect(node.locator('[data-nx-moving-mark]')).toHaveCount(4);
  // A second click during motion must continue from the outline the reader can currently see.
  await advance(node,'donut');await expect(node.locator('[data-nx-moving-mark]')).toHaveCount(4);nearBoxes(await boxes(node),middle);await seek(.5);assert.notDeepEqual(await boxes(node),middle);await seek(1);await expect(node.locator('[data-nx-moving-mark]')).toHaveCount(0);await expect(node.locator('.recharts-pie')).toHaveCount(1);const donut=await boxes(node);await advance(node,'scatter');await expect(node.locator('[data-nx-moving-mark]')).toHaveCount(4);nearBoxes(await boxes(node),donut);await seek(1);nearBoxes(await boxes(node),scatter,1e-6);await expect(node.locator('[data-nx-moving-mark]')).toHaveCount(0);
  await advance(node,'bar');await seek(1);await expect(node.locator('.recharts-bar')).toHaveCount(1);await expect(node.locator('[data-nx-native-mark] path')).toHaveCount(4);await node.evaluate(e=>{(e as HTMLElement).style.width='400px';});await expect.poll(async()=>Number(await node.locator('svg').getAttribute('width'))).toBeLessThan(width);await expect(node.locator('[data-nx-moving-mark]')).toHaveCount(0);await seek(1);await node.evaluate(e=>{(e as HTMLElement).style.width='';});await expect.poll(async()=>Number(await node.locator('svg').getAttribute('width'))).toBe(width);await expect(node.locator('[data-nx-moving-mark]')).toHaveCount(0);await seek(1);await setMode(page,'revised');await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));await expect(node.locator('[data-nx-moving-mark]')).toHaveCount(0);await seek(1);await setMode(page,'normal');await seek(1);await advance(node,'donut');await seek(1);await advance(node,'scatter');await seek(1);
  await page.evaluate(()=>(window as unknown as {nodexMorphFixture:{setManual:(value:boolean)=>void}}).nodexMorphFixture.setManual(false));await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await node.evaluate(e=>/NaN|Infinity/.test(e.innerHTML)),false);
  console.log('Validated native scatter/bar/pie delivery, stable identities through reordered, inserted, removed and reranked products, actual outline morphs including interrupted transitions and later native data updates and resizes, original click sequence, scoped tokens, keyboard data, zero/missing revenue and reduced motion.');
}
