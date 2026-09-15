import assert from 'node:assert/strict';
import { expect, type Locator, type Page } from '@playwright/test';
export const FORCE_SLUGS = ['force-graph', 'force-graph-dense'];
export const FORCE_CONSUMER_SOURCE = `import{useEffect,useState}from'react';
import{AnimationControllerProvider,type AnimationController}from'recharts';
import{ForceGraph}from'./components/nodex/force-graph/component';
import{ForceGraphDense}from'./components/nodex/force-graph-dense/component';
type Mode='normal'|'revised'|'zero'|'partial'|'invalid'|'single'|'empty'|'duplicate';
const pending=new Set<(progress:number)=>void>();
const controller:AnimationController=(_timer,handle,listener)=>{handle.tick(0);handle.tick(handle.getAnimationBegin());const seek=(p:number)=>{handle.tick(handle.getAnimationBegin()+handle.getAnimationDuration()*p);if(p>=1)handle.complete();listener(handle.getInterpolated());};pending.add(seek);seek(0);return()=>{pending.delete(seek);};};
declare global{interface Window{nodexForceFixture:{setMode:(mode:Mode)=>void;setManual:(value:boolean)=>void;seek:(p:number)=>void;pending:()=>number}}}
function Charts({mode,animate}:{mode:Mode;animate:boolean}){const values=mode==='invalid'?[NaN,-1,Infinity,NaN]:mode==='zero'?[0,0,0,0]:mode==='partial'?[52,null,0,10]:mode==='revised'?[80,10,35,20]:[52,30,20,10];const all=values.map((value,index)=>({id:'id'+index,name:index===0?'Caller hub':'Same',syncsK:value,callsK:value,tier:(index===0?0:index===3?2:1)as 0|1|2,hub:index===0,domainIndex:index}));const data=mode==='empty'?[]:mode==='single'?all.slice(0,1):mode==='duplicate'?[all[0]!,all[0]!]:all;const sideRoads=[{source:'id1',target:'id2'},{source:'missing',target:'id0'}];const edges=data.slice(1).map((row,i)=>({source:row.id,target:'id0',width:mode==='zero'?0:mode==='partial'&&i===0?null:1+i,treatment:(i===0?'spoke':i===1?'backbone':'stray')as 'spoke'|'backbone'|'stray'}));return <><ForceGraph data={data} hubId='id0' sideRoads={sideRoads} animate={animate}/><ForceGraphDense data={data} edges={edges} animate={animate}/></>;}
export function ForceConsumer({animate}:{animate:boolean}){const[mode,setMode]=useState<Mode>('normal');const[manual,setManual]=useState(false);useEffect(()=>{window.nodexForceFixture={setMode,setManual,seek:p=>pending.forEach(fn=>fn(p)),pending:()=>pending.size};},[]);return <><section id='force-primary' className='w-[660px] space-y-6'><AnimationControllerProvider value={controller}><Charts mode={mode} animate={animate||manual}/></AnimationControllerProvider></section><section id='force-secondary' className='w-[520px] space-y-6'><Charts mode='normal' animate={false}/></section></>;}
`;
async function setMode(page: Page, mode: string) { await page.evaluate(value => (window as unknown as { nodexForceFixture: { setMode: (mode: string) => void } }).nodexForceFixture.setMode(value), mode); }
async function center(chart: Locator, index = 0): Promise<{ x: number; y: number }> {
  let position: { x: number; y: number } | null = null;
  // Marks remount as their coordinates change; find and measure one atomically from the stable root.
  await expect.poll(async () => {
    position = await chart.evaluate((root, index) => {
      const circle = root.querySelector<SVGCircleElement>(`[data-nx-service-mark="${index}"]`);
      const matrix = circle?.getScreenCTM();
      if (!circle?.isConnected || !matrix) return null;
      const point = new DOMPoint(circle.cx.baseVal.value, circle.cy.baseVal.value).matrixTransform(matrix);
      return Number.isFinite(point.x) && Number.isFinite(point.y) ? { x: point.x, y: point.y } : null;
    }, index);
    return position;
  }, { message: 'The current force mark must have connected, finite screen coordinates' }).not.toBeNull();
  assert(position);
  return position;
}
async function positions(node: Locator) { return node.locator('[data-nx-force-position]').evaluateAll(elements => elements.map(e => [Number(e.getAttribute('data-nx-model-x')), Number(e.getAttribute('data-nx-model-y'))])); }
export async function checkForceFit(chart: Locator): Promise<void> {
  await expect.poll(() => chart.evaluate(root => {
    const frame = root.querySelector('svg.recharts-surface')?.getBoundingClientRect();
    if (!frame?.width || !frame.height) return ['Missing force viewport'];
    const nodes = [...root.querySelectorAll('[data-nx-force-node]')];
    if (!nodes.length) return ['Missing force services'];
    return nodes.flatMap(node => {
      const box = node.getBoundingClientRect();
      return box.left < frame.left - 0.5 || box.right > frame.right + 0.5 || box.top < frame.top - 0.5 || box.bottom > frame.bottom + 0.5 ? [node.textContent] : [];
    });
  }), { message: 'Every force service circle and its complete label must fit inside the chart' }).toEqual([]);
}
export async function checkForceConsumer(page: Page): Promise<void> {
  const simple = page.locator('#force-primary [data-nx-chart="force-graph"]'); const dense = page.locator('#force-primary [data-nx-chart="force-graph-dense"]');
  await expect(simple.locator('[data-nx-service-mark]')).toHaveCount(4); await expect(simple.locator('[data-nx-force-link]')).toHaveCount(4); await expect(dense.locator('[data-nx-service-mark]')).toHaveCount(4); await expect(dense.locator('[data-nx-force-link]')).toHaveCount(3);
  assert.equal(Number(await simple.locator('[data-nx-service-mark="0"]').getAttribute('r')), (8 + 52 * 0.75) / 2);
  await checkForceFit(simple);
  assert(Math.abs(Number(await dense.locator('[data-nx-service-mark="0"]').getAttribute('r')) - (16 + Math.sqrt(52) * 1.6) / 2) < 1e-8);
  await expect.poll(() => dense.locator('[data-nx-service-mark="1"]').evaluate(e => getComputedStyle(e).fill)).toBe('rgb(51, 50, 45)');
  // Earlier consumer checks can overflow horizontally. Exercise that condition in focused runs too.
  const overflow = await page.addStyleTag({ content: 'body::after { content: ""; display: block; width: calc(100vw + 180px); height: 1px; }' });
  try {
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeGreaterThan(0);
    for (const node of [simple, dense]) {
      await node.scrollIntoViewIfNeeded(); await page.mouse.move(880,10); await node.locator('svg.recharts-surface').focus(); await page.keyboard.press('ArrowLeft'); await expect(node.getByRole('status')).toContainText('Same ↔ Caller hub'); await page.keyboard.press('ArrowRight'); await expect(node.getByRole('status')).toContainText('Same ↔ Caller hub');
      await expect(node.locator('[data-nx-force-node="3"]')).toHaveAttribute('data-nx-related','false');
      // Recharts leaves the arrows' native page scrolling enabled. Stop that scroll before
      // measuring screen coordinates for the independent pointer check.
      await page.evaluate(() => window.scrollTo({ left: 0, top: window.scrollY, behavior: 'instant' }));
      const p = await center(node); await page.mouse.move(p.x,p.y); await expect(node.getByRole('status')).toContainText(node === simple ? '52k syncs/mo' : '52k calls/day');
      const before = await positions(node); await page.mouse.down(); await page.mouse.move(p.x+35,p.y+18,{steps:5});
      await expect.poll(async () => (await center(node)).x).toBeCloseTo(p.x + 35, 3);
      await expect.poll(async () => (await center(node)).y).toBeCloseTo(p.y + 18, 3);
      await page.mouse.up(); await page.mouse.move(880,10); await expect.poll(async () => JSON.stringify(await positions(node))).not.toBe(JSON.stringify(before));
      if (node === simple) await checkForceFit(simple);
      const after = await positions(node); await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))); assert.deepEqual(await positions(node),after,'Released force graph must settle and hold without a timer');
      await node.evaluate(e => { const s=(e as HTMLElement).style; s.setProperty('--nx-ink','#123456'); s.setProperty('--nx-markHeavy','#234567'); s.setProperty('--nx-type-axis-size','12px'); });
      await expect.poll(() => node.locator('[data-nx-service-mark="0"]').evaluate(e=>getComputedStyle(e).fill)).toBe('rgb(18, 52, 86)');
      await expect.poll(() => node.locator('[data-nx-service-label="0"]').evaluate(e=>getComputedStyle(e).fontSize)).toBe(node===simple?'15.75px':'14.25px');
      if (node === simple) await checkForceFit(simple);
      const width=Number(await node.locator('svg').getAttribute('width')); await node.evaluate(e=>{(e as HTMLElement).style.width='400px';}); await expect.poll(async()=>Number(await node.locator('svg').getAttribute('width'))).toBeLessThan(width); await node.evaluate(e=>{(e as HTMLElement).style.width='';}); await expect.poll(async()=>Number(await node.locator('svg').getAttribute('width'))).toBe(width);
    }
  } finally {
    await overflow.evaluate(element => { element.parentNode?.removeChild(element); });
    await overflow.dispose();
  }
  const padding = await simple.evaluate(element => { const style = getComputedStyle(element); return parseFloat(style.paddingLeft) + parseFloat(style.paddingRight); });
  for (const width of [320, 800]) {
    await simple.evaluate((element, value) => { (element as HTMLElement).style.width = `${value}px`; }, width);
    await expect.poll(() => simple.locator('svg.recharts-surface').evaluate(element => element.getBoundingClientRect().width)).toBe(width - padding);
    await checkForceFit(simple);
  }
  await simple.evaluate(element => { (element as HTMLElement).style.width = ''; });
  assert.notEqual(await page.locator('#force-secondary [data-nx-chart="force-graph"] [data-nx-service-mark="0"]').evaluate(e=>getComputedStyle(e).fill),'rgb(18, 52, 86)');
  await dense.scrollIntoViewIfNeeded(); const svg=dense.locator('svg.recharts-surface'); const rect=await svg.boundingBox(); assert(rect); await page.mouse.move(rect.x+10,rect.y+10); const priorX=Number(await dense.locator('[data-nx-service-mark="0"]').getAttribute('cx')); await page.mouse.down(); await page.mouse.move(rect.x+38,rect.y+29,{steps:3}); await page.mouse.up(); await expect.poll(async()=>Number(await dense.locator('[data-nx-service-mark="0"]').getAttribute('cx'))).toBeCloseTo(priorX+28,4);
  const radius=Number(await dense.locator('[data-nx-service-mark="0"]').getAttribute('r')); await page.mouse.wheel(0,-120); await expect(dense).toHaveAttribute('data-nx-zoom','1.1'); await expect.poll(async()=>Number(await dense.locator('[data-nx-service-mark="0"]').getAttribute('r'))).toBeCloseTo(radius*1.06,5); await expect(page.locator('#force-secondary [data-nx-chart="force-graph-dense"]')).toHaveAttribute('data-nx-zoom','1');
  for(const mode of ['revised','partial','zero','single','invalid','empty','duplicate']) { await setMode(page,mode); for(const node of [simple,dense]) {if(['invalid','empty','duplicate'].includes(mode))await expect(node.getByRole('status')).toContainText('No unique');else await expect(node.locator('[data-nx-service-mark]')).toHaveCount(mode==='partial'?3:mode==='single'?1:4);assert.equal(await node.evaluate(e=>/NaN|Infinity/.test(e.innerHTML)),false);}if(mode==='zero'){await expect(dense.locator('[data-nx-force-link]')).toHaveCount(0);assert.equal(Number(await simple.locator('[data-nx-service-mark="0"]').getAttribute('r')),4);}if(mode==='revised')assert.equal(Number(await simple.locator('[data-nx-service-mark="0"]').getAttribute('r')),34); }
  await setMode(page,'normal'); const settled=await positions(simple);
  await page.locator('#force-primary').evaluate(e=>{const s=(e as HTMLElement).style;s.setProperty('--nx-motion-draw-duration','1s');s.setProperty('--nx-motion-draw-easing','linear');}); await page.emulateMedia({reducedMotion:'no-preference'}); await page.evaluate(()=>(window as unknown as {nodexForceFixture:{setManual:(value:boolean)=>void}}).nodexForceFixture.setManual(true)); await expect(simple).toHaveAttribute('data-nx-animated','true'); await expect.poll(()=>page.evaluate(()=>(window as unknown as {nodexForceFixture:{pending:()=>number}}).nodexForceFixture.pending())).toBeGreaterThanOrEqual(2);
  const start=await positions(simple); assert.notDeepEqual(start,settled,'Force entrance must start at the deterministic seed');
  await checkForceFit(simple);
  await page.evaluate(()=>(window as unknown as {nodexForceFixture:{seek:(p:number)=>void}}).nodexForceFixture.seek(0.5));
  await expect.poll(async()=>JSON.stringify(await positions(simple))).not.toBe(JSON.stringify(start)); const half=await positions(simple); assert.notDeepEqual(half,settled);
  await checkForceFit(simple);
  await page.evaluate(()=>(window as unknown as {nodexForceFixture:{seek:(p:number)=>void}}).nodexForceFixture.seek(1));
  await expect.poll(async()=>JSON.stringify(await positions(simple))).toBe(JSON.stringify(settled));
  await page.evaluate(()=>(window as unknown as {nodexForceFixture:{setManual:(value:boolean)=>void}}).nodexForceFixture.setManual(false)); await page.emulateMedia({reducedMotion:'reduce'});
  await checkForceFit(simple);
  console.log('Validated copied force physics, absolute node sizes, responsive fitting of circles and labels, adjacency, real dragging and settled state, native keyboard observations, mesh pan/zoom, scoped paints/type, unavailable/zero data and native intermediate force animation.');
}
