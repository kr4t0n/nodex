import assert from 'node:assert/strict';
import { expect, type Page } from '@playwright/test';

export const MARKET_SLUGS = ['candlestick'];
export const MARKET_CONSUMER_SOURCE = `import {useEffect,useState} from 'react';
import {Candlestick} from './components/nodex/candlestick/component';
type Mode='normal'|'revised'|'partial'|'invalid'|'zero'|'single'|'empty';
declare global {interface Window {nodexMarketFixture:{setMode:(mode:Mode)=>void}}}
function Charts({mode,animate}:{mode:Mode;animate:boolean}){
 const values=mode==='zero'?[[0,0,0,0],[0,0,0,0],[0,0,0,0]]:mode==='invalid'?[[10,20,12,25],[10,20,5,19],[NaN,Infinity,-1,10]]:[[10,mode==='revised'?18:20,5,25],[20,10,5,30],[15,15,10,20]];
 const rows=(mode==='empty'?[]:mode==='single'?values.slice(0,1):values).map(([open,close,low,high],index)=>({day:'Same',open:mode==='partial'&&index===1?null:open!,close:close!,low:low!,high:high!}));
 return <Candlestick data={rows} animate={animate}/>;
}
export function MarketConsumer({animate}:{animate:boolean}){
 const [mode,setMode]=useState<Mode>('normal');useEffect(()=>{window.nodexMarketFixture={setMode};},[]);
 return <><section id="market-primary" className="w-[660px] space-y-6"><Charts mode={mode} animate={animate}/></section><section id="market-secondary" className="w-[520px] space-y-6"><Charts mode="normal" animate={false}/></section></>;
}
`;
async function setMode(page:Page,mode:string){await page.evaluate(value=>(window as unknown as {nodexMarketFixture:{setMode:(mode:string)=>void}}).nodexMarketFixture.setMode(value),mode);}
export async function checkMarketConsumer(page:Page):Promise<void>{
 const node=page.locator('#market-primary [data-nx-chart="candlestick"]');const sibling=page.locator('#market-secondary [data-nx-chart="candlestick"]');
 await expect(node.locator('[data-nx-wick]')).toHaveCount(3);await expect(node.locator('[data-nx-candle]')).toHaveCount(2);await expect(node.locator('[data-nx-doji]')).toHaveCount(1);
 await expect(node.locator('[data-nx-direction="up"]')).toHaveCount(1);await expect(node.locator('[data-nx-direction="down"]')).toHaveCount(1);await expect(node.locator('[data-nx-extreme="high"]')).toHaveText('$30');await expect(node.locator('[data-nx-extreme="low"]')).toHaveText('$5');
 const body=await node.locator('[data-nx-candle="0"]').evaluate(e=>(e as SVGGraphicsElement).getBBox().height);const wick=await node.locator('[data-nx-wick="0"]').evaluate(e=>(e as SVGGraphicsElement).getBBox().height);assert(Math.abs(body/wick-0.5)<0.0001,'Candle body must encode open/close independently of its low/high wick');
 await node.scrollIntoViewIfNeeded();await node.locator('[data-nx-candle="0"]').hover();const tooltip=node.getByRole('status');await expect(tooltip).toContainText('open $10.0 · close $20.0 · high $25.0 · low $5.0');await page.mouse.move(880,10);await page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>r())));await node.locator('svg.recharts-surface').focus();await page.keyboard.press('ArrowLeft');await page.keyboard.press('ArrowRight');await expect(tooltip).toContainText('open $20.0 · close $10.0 · high $30.0 · low $5.0');await expect(sibling.getByRole('status')).toHaveCount(0);
 await node.evaluate(e=>{const s=(e as HTMLElement).style;s.setProperty('--nx-ink','#123456');s.setProperty('--nx-bg','#eeddcc');s.setProperty('--nx-stroke-emphasis','1.3px');s.setProperty('--nx-type-plotValue-size','34px');});await expect.poll(()=>node.locator('[data-nx-direction="up"]').evaluate(e=>getComputedStyle(e).fill)).toBe('rgb(238, 221, 204)');await expect.poll(()=>node.locator('[data-nx-direction="down"]').evaluate(e=>getComputedStyle(e).fill)).toBe('rgb(18, 52, 86)');await expect.poll(()=>node.locator('[data-nx-wick="0"]').evaluate(e=>getComputedStyle(e).strokeWidth)).toBe('1.3px');await expect.poll(()=>node.locator('[data-nx-extreme="high"]').evaluate(e=>getComputedStyle(e).fontSize)).toBe('16px');assert.notEqual(await sibling.locator('[data-nx-direction="up"]').evaluate(e=>getComputedStyle(e).fill),'rgb(238, 221, 204)');
 const width=Number(await node.locator('svg').getAttribute('width'));await node.evaluate(e=>{(e as HTMLElement).style.width='340px';});await expect.poll(async()=>Number(await node.locator('svg').getAttribute('width'))).toBeLessThan(width);await node.evaluate(e=>{(e as HTMLElement).style.width='';});await expect.poll(async()=>Number(await node.locator('svg').getAttribute('width'))).toBe(width);
 await setMode(page,'revised');assert((await node.locator('[data-nx-candle="0"]').evaluate(e=>(e as SVGGraphicsElement).getBBox().height))<body);
 await setMode(page,'partial');await expect(node.locator('[data-nx-wick]')).toHaveCount(2);await expect(node.locator('[data-nx-extreme="high"]')).toHaveText('$25');await page.mouse.move(880,10);await node.locator('svg.recharts-surface').focus();await page.keyboard.press('ArrowLeft');await page.keyboard.press('ArrowRight');await expect(tooltip).toHaveText('Same — Unavailable');
 for(const mode of ['zero','single','invalid','empty']){await setMode(page,mode);if(mode==='invalid'||mode==='empty')await expect(node.getByRole('status')).toContainText('available');else await expect(node.locator('svg.recharts-surface')).toHaveCount(1);if(mode==='zero'){await expect(node.locator('[data-nx-candle]')).toHaveCount(0);await expect(node.locator('[data-nx-doji]')).toHaveCount(3);await expect(node.locator('[data-nx-extreme]')).toHaveCount(1);}if(mode==='single')await expect(node.locator('[data-nx-wick]')).toHaveCount(1);assert.equal(await node.evaluate(e=>/NaN|Infinity/.test(e.innerHTML)),false);}
 await setMode(page,'normal');console.log('Validated independent OHLC encodings, hollow/ink bodies, unchanged and zero prices, full-quote availability, extrema, scoped paint and keyboard days.');
}
