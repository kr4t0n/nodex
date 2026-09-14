import assert from 'node:assert/strict';
import { expect, type Page } from '@playwright/test';

export const SCATTER_FAMILY_SLUGS = ['plumb-scatter', 'single-axis', 'brand-spectrum', 'jitter-strip'];
export const SCATTER_FAMILY_CONSUMER_SOURCE = `import { useEffect, useState } from 'react';
import { PlumbScatter } from './components/nodex/plumb-scatter/component';
import { SingleAxis } from './components/nodex/single-axis/component';
import { BrandSpectrum } from './components/nodex/brand-spectrum/component';
import { JitterStrip } from './components/nodex/jitter-strip/component';

type Mode = 'normal' | 'revised' | 'empty' | 'zero' | 'invalid' | 'partial' | 'single';
declare global { interface Window { nodexScatterFixture: { setMode: (value: Mode) => void } } }
function Charts({ mode, animate }: { mode: Mode; animate: boolean }) {
  const empty = mode === 'empty';
  const zero = mode === 'zero';
  const invalid = mode === 'invalid';
  const revised = mode === 'revised';
  const partial = mode === 'partial';
  const single = mode === 'single';
  const products = [
    { product: 'Alpha', pricePercentile: invalid ? NaN : zero ? 0 : 20, satisfaction: invalid ? Infinity : zero ? 0 : revised ? 90 : 80 },
    { product: 'Alpha', pricePercentile: invalid ? -1 : zero ? 0 : 40, satisfaction: invalid || partial ? null : zero ? 0 : 60 },
    { product: 'Bravo', pricePercentile: invalid ? 101 : zero ? 0 : 70, satisfaction: invalid || partial ? null : zero ? 0 : 30 },
  ];
  const hours = [
    { day: 'MON', hour: invalid ? NaN : 9, tickets: invalid ? NaN : zero ? 0 : revised ? 4 : 2 },
    { day: 'MON', hour: invalid ? -1 : 12, tickets: invalid || partial ? null : zero ? 0 : 3 },
    { day: 'TUE', hour: invalid ? 24 : 9, tickets: invalid || partial ? null : zero ? 0 : 1 },
  ];
  const traits = [
    { left: 'LEFT', right: 'RIGHT', us: invalid ? NaN : zero ? 0 : revised ? 0.9 : 0.8, competitors: invalid ? [NaN, 2] : zero ? [0, 0] : partial ? [null, 0.5] : [0.3, 0.5] },
    { left: 'LEFT', right: 'OTHER', us: invalid || partial ? null : zero ? 0 : 0.2, competitors: invalid || partial ? [null, null] : zero ? [0, 0] : [0.4, 0.6] },
  ];
  const tickets = [
    {hours: invalid ? NaN : zero ? 0 : revised ? 5 : 10, band: 0.1},
    {hours: invalid ? -1 : partial ? null : zero ? 0 : 20, band: 0.2},
    {hours: invalid ? Infinity : partial ? null : zero ? 0 : 30, band: 1},
  ];
  return <>
    <PlumbScatter data={empty ? [] : single ? products.slice(0, 1) : products} animate={animate} />
    <SingleAxis data={empty ? [] : single ? hours.slice(0, 1) : hours} animate={animate} />
    <BrandSpectrum data={empty ? [] : single ? traits.slice(0, 1) : traits} animate={animate} />
    <JitterStrip data={empty ? [] : single ? tickets.slice(0, 1) : tickets} bands={['A', 'A']} animate={animate} />
  </>;
}
export function ScatterFamilyConsumer({ animate }: { animate: boolean }) {
  const [mode, setMode] = useState<Mode>('normal');
  useEffect(() => { window.nodexScatterFixture = { setMode }; }, []);
  return <>
    <section id="scatter-primary" className="w-[660px] space-y-6"><Charts mode={mode} animate={animate} /></section>
    <section id="scatter-secondary" className="w-[520px] space-y-6"><Charts mode="normal" animate={false} /></section>
  </>;
}
`;

async function setMode(page: Page, mode: string) {
  await page.evaluate((value) => (window as unknown as { nodexScatterFixture: { setMode: (mode: string) => void } }).nodexScatterFixture.setMode(value), mode);
}

export async function checkScatterFamilyConsumer(page: Page): Promise<void> {
  const chart = (slug: string, scope = 'primary') => page.locator(`#scatter-${scope} [data-nx-chart="${slug}"]`);
  const plumb = chart('plumb-scatter');
  const single = chart('single-axis');
  const brand = chart('brand-spectrum');
  const jitter = chart('jitter-strip');
  await expect(plumb.locator('[data-nx-product]')).toHaveCount(3);
  await expect(plumb.locator('[data-nx-stem]')).toHaveCount(3);
  await expect(single.locator('[data-nx-hour]')).toHaveCount(3);
  await expect(brand.locator('[data-nx-brand]')).toHaveCount(6);
  await expect(jitter.locator('[data-nx-ticket]')).toHaveCount(3);
  assert.notEqual(await jitter.locator('[data-nx-ticket="0"]').getAttribute('cy'), await jitter.locator('[data-nx-ticket="1"]').getAttribute('cy'), 'Fractional band positions must retain caller jitter');
  const radii = await single.locator('[data-nx-hour]').evaluateAll((nodes) => nodes.map((node) => Number(node.getAttribute('r'))));
  for (const [index, expected] of [2.6, 3.9, 1.3].entries()) expect(radii[index], 'Single-axis must retain diameter proportional to count').toBeCloseTo(expected);
  for (const slug of SCATTER_FAMILY_SLUGS) {
    const node = chart(slug);
    await node.scrollIntoViewIfNeeded();
    const firstMark = slug === 'plumb-scatter' ? '[data-nx-product="0"]' : slug === 'single-axis' ? '[data-nx-hour="0"]' : slug === 'jitter-strip' ? '[data-nx-ticket="0"]' : '[data-nx-observation="0:competitor:0"] circle';
    await node.locator(firstMark).hover();
    const tooltip = node.locator('.recharts-tooltip-wrapper:visible');
    await expect(tooltip).toContainText(slug === 'plumb-scatter' ? 'price' : slug === 'single-axis' ? 'tickets' : slug === 'jitter-strip' ? 'h to resolve' : 'toward');
    await page.mouse.move(880, 10);
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
    await node.locator('svg.recharts-surface').focus();
    await page.keyboard.press('ArrowRight');
    await expect(tooltip).toContainText(slug === 'plumb-scatter' ? 'satisfaction' : slug === 'single-axis' ? 'tickets' : slug === 'jitter-strip' ? 'h to resolve' : 'toward');
    await expect(chart(slug, 'secondary').locator('.recharts-tooltip-wrapper:visible')).toHaveCount(0);
    const siblingPaint = await chart(slug, 'secondary').locator('[data-nx-observation] circle').evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).fill));
    await node.evaluate((element) => {
      const style = (element as HTMLElement).style;
      style.setProperty('--nx-ink', '#123456');
      style.setProperty('--nx-muted', '#987654');
      style.setProperty('--nx-markDeep', '#567890');
    });
    const ink = node.locator(slug === 'brand-spectrum' ? '[data-nx-brand="us"]' : firstMark).first();
    await expect.poll(() => ink.evaluate((element) => getComputedStyle(element).fill)).toBe('rgb(18, 52, 86)');
    assert.deepEqual(await chart(slug, 'secondary').locator('[data-nx-observation] circle').evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).fill)), siblingPaint);
    const width = Number(await node.locator('svg').getAttribute('width'));
    await node.evaluate((element) => { (element as HTMLElement).style.width = '340px'; });
    await expect.poll(async () => Number(await node.locator('svg').getAttribute('width'))).toBeLessThan(width);
    await node.evaluate((element) => { (element as HTMLElement).style.width = ''; });
    await expect.poll(async () => Number(await node.locator('svg').getAttribute('width'))).toBe(width);
  }
  await expect.poll(() => plumb.locator('[data-nx-product="1"]').evaluate((element) => getComputedStyle(element).fill)).toBe('rgb(86, 120, 144)');
  const originalTicketX = await jitter.locator('[data-nx-ticket="0"]').getAttribute('cx');
  const original = await plumb.locator('[data-nx-product="0"]').getAttribute('cy');
  await setMode(page, 'revised');
  await expect(plumb.locator('[data-nx-product="0"]')).not.toHaveAttribute('cy', original!);
  await expect(single.locator('[data-nx-hour="0"]')).toHaveAttribute('r', '5.2');
  await expect(jitter.locator('[data-nx-ticket="0"]')).not.toHaveAttribute('cx', originalTicketX!);
  await setMode(page, 'partial');
  await expect(plumb.locator('[data-nx-product]')).toHaveCount(1);
  await expect(single.locator('[data-nx-hour]')).toHaveCount(1);
  await expect(brand.locator('[data-nx-brand]')).toHaveCount(2);
  await expect(jitter.locator('[data-nx-ticket]')).toHaveCount(1);
  for (const mode of ['single', 'zero', 'invalid', 'empty']) {
    await setMode(page, mode);
    for (const slug of SCATTER_FAMILY_SLUGS) {
      const node = chart(slug);
      if (mode === 'invalid' || mode === 'empty') await expect(node.getByRole('status')).toContainText('available');
      else await expect(node.locator('svg.recharts-surface')).toHaveCount(1);
      assert.equal(await node.evaluate((element) => /NaN|Infinity/.test(element.innerHTML)), false, `${slug}: ${mode} produced invalid DOM`);
    }
    if (mode === 'zero') await expect.poll(() => single.locator('[data-nx-hour]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('r')))).toEqual(['0', '0', '0']);
  }
  await setMode(page, 'normal');
  console.log('Validated scatter-family delivery, data-driven positions and radii, observation-only tooltips, keyboard access, token scopes, resizing and unavailable/zero data.');
}
