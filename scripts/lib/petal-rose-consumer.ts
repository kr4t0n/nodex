import assert from 'node:assert/strict';

import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

export const PETAL_ROSE_CONSUMER_SOURCE = `import { useEffect, useState } from 'react';
import { PetalRose, type PetalRoseDatum } from './components/nodex/petal-rose/component';

type Mode = 'normal' | 'empty' | 'single' | 'zero' | 'invalid' | 'partial';
declare global { interface Window { nodexPetalFixture: { setMode: (value: Mode) => void; setRevision: (value: number) => void } } }

export function PetalRoseConsumer({ animate }: { animate: boolean }) {
  const [mode, setMode] = useState<Mode>('normal');
  const [revision, setRevision] = useState(0);
  useEffect(() => { window.nodexPetalFixture = { setMode, setRevision }; }, []);
  const normal: PetalRoseDatum[] = [
    { name: 'Alpha', count: revision ? 10 : 100 }, { name: 'Beta', count: 75 },
    { name: 'Gamma', count: 50 }, { name: 'Delta', count: 25 },
    { name: 'Echo', count: 90 }, { name: 'Foxtrot', count: 65 },
    { name: 'Golf', count: 40 }, { name: 'Hotel', count: revision ? 200 : 10 },
  ];
  const data: PetalRoseDatum[] = mode === 'normal' ? normal
    : mode === 'empty' ? []
    : mode === 'single' ? [{ name: 'Only', count: 3 }]
    : mode === 'zero' ? [{ name: 'Low', count: 0 }, { name: 'Middle', count: 0 }, { name: 'High', count: 0 }]
    : mode === 'invalid' ? [{ name: 'Invalid', count: NaN }, { name: 'Unbounded', count: Infinity }, { name: 'Negative', count: -1 }]
    : [{ name: 'Present', count: 10 }, { name: 'Absent', count: null }, { name: 'Zero', count: 0 }, { name: 'Negative', count: -2 }, { name: 'Invalid', count: NaN }, { name: 'Unbounded', count: Infinity }];
  return <>
    <section id="petal-primary" className="w-[660px]"><PetalRose data={data} height={420} animate={animate} aria-label="Category observations" /></section>
    <section id="petal-secondary" className="w-[520px]"><PetalRose data={[{ name: 'Independent', count: 8 }, { name: 'Second', count: 6 }, { name: 'Third', count: 3 }]} height={320} animate={false} aria-label="Independent categories" /></section>
  </>;
}
`;

const PRIMARY = '#petal-primary';
const SECONDARY = '#petal-secondary';

async function setMode(page: Page, mode: string): Promise<void> {
  await page.evaluate((value) => (window as unknown as { nodexPetalFixture: { setMode: (mode: string) => void } }).nodexPetalFixture.setMode(value), mode);
}

async function tooltip(page: Page, text: string): Promise<void> {
  await expect(page.locator(`${PRIMARY} .recharts-tooltip-wrapper:visible`)).toHaveText(text);
  await expect(page.locator(`${SECONDARY} .recharts-tooltip-wrapper:visible`)).toHaveCount(0);
}

async function hoverShape(page: Page, index: number, shape: 'track' | 'mark'): Promise<{ x: number; y: number }> {
  const locator = page.locator(`${PRIMARY} [data-nx-petal="${index}"] .nx-petal-${shape}`);
  await locator.scrollIntoViewIfNeeded();
  // Find actual visible fill, since a sector's bounding-box center can miss the sector.
  const point = await locator.evaluate((element) => {
    const sector = element as SVGGeometryElement;
    const box = sector.getBBox();
    const transform = sector.getScreenCTM();
    if (!transform) return null;
    for (let row = 1; row < 20; row++) {
      for (let column = 1; column < 20; column++) {
        const local = new DOMPoint(box.x + box.width * column / 20, box.y + box.height * row / 20);
        const screen = local.matrixTransform(transform);
        if (sector.isPointInFill(local) && document.elementFromPoint(screen.x, screen.y) === sector) return { x: screen.x, y: screen.y };
      }
    }
    return null;
  });
  assert(point, `Petal ${index} must expose its ${shape} to the pointer`);
  await page.mouse.move(point.x, point.y);
  return point;
}

async function paint(page: Page, selector: string) {
  return page.locator(selector).evaluate((root) => [...root.querySelectorAll('[data-nx-petal]')].map((element) => {
    const index = element.getAttribute('data-nx-petal');
    return {
      track: getComputedStyle(element.querySelector('.nx-petal-track')!).fill,
      mark: element.querySelector('.nx-petal-mark') ? getComputedStyle(element.querySelector('.nx-petal-mark')!).fill : null,
      count: getComputedStyle(root.querySelector(`[data-nx-count="${index}"]`)!).fill,
      label: getComputedStyle(root.querySelector(`[data-nx-label="${index}"]`)!).fill,
    };
  }));
}

async function keyboardObservations(page: Page, observations: string[]): Promise<void> {
  // Recharts gives same-plot mouse hover priority over keyboard selection.
  await page.mouse.move(800, 10);
  await page.locator(`${PRIMARY} svg.recharts-surface`).focus();
  for (const [index, observation] of observations.entries()) {
    if (index) await page.keyboard.press('ArrowRight');
    await tooltip(page, observation);
  }
  await page.keyboard.press('ArrowRight');
  await tooltip(page, observations.at(-1)!);
}

export async function checkPetalRoseConsumer(page: Page): Promise<void> {
  await page.locator(PRIMARY).scrollIntoViewIfNeeded();
  const marks = page.locator(`${PRIMARY} .nx-petal-mark`);
  const tracks = page.locator(`${PRIMARY} .nx-petal-track`);
  const counts = page.locator(`${PRIMARY} [data-nx-count]`);
  await expect(tracks).toHaveCount(8);
  await expect(marks).toHaveCount(8);
  await expect(counts).toHaveText(['100', '75', '50', '25', '90', '65', '40', '10']);
  await expect(page.locator(`${PRIMARY} [tabindex="0"]`)).toHaveCount(1);

  await hoverShape(page, 0, 'mark');
  await tooltip(page, 'Alpha — named 100 times');
  await hoverShape(page, 7, 'track');
  await tooltip(page, 'Hotel — named 10 times');
  await keyboardObservations(page, [
    'Alpha — named 100 times', 'Beta — named 75 times', 'Gamma — named 50 times', 'Delta — named 25 times',
    'Echo — named 90 times', 'Foxtrot — named 65 times', 'Golf — named 40 times', 'Hotel — named 10 times',
  ]);
  await page.keyboard.press('ArrowLeft');
  await tooltip(page, 'Golf — named 40 times');

  // Native SVG groups can receive pointer focus even with tabindex=-1.
  const hit = await hoverShape(page, 0, 'mark');
  await page.mouse.click(hit.x, hit.y);
  await expect.poll(() => page.locator(PRIMARY).evaluate((root) => {
    const focused = document.activeElement;
    if (!focused || !root.contains(focused) || focused.matches(':focus-visible')) return false;
    const style = getComputedStyle(focused);
    return style.outlineStyle === 'none' || parseFloat(style.outlineWidth) === 0;
  })).toBe(true);
  await page.mouse.move(800, 10);
  await page.keyboard.press('Shift+Tab');
  const surface = page.locator(`${PRIMARY} svg.recharts-surface`);
  await expect(surface).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await tooltip(page, 'Hotel — named 10 times');
  await expect.poll(() => surface.evaluate((element) => {
    const style = getComputedStyle(element);
    return element.matches(':focus-visible') && style.outlineStyle === 'solid'
      && style.outlineColor === style.color && style.outlineWidth === style.getPropertyValue('--nx-stroke-mark').trim();
  })).toBe(true);

  const siblingPaint = await paint(page, SECONDARY);
  const siblingGaps = await page.locator(`${SECONDARY} .nx-petal-track, ${SECONDARY} .nx-petal-mark`).evaluateAll((elements) => elements.map((element) => getComputedStyle(element).stroke));
  const siblingType = await page.locator(`${SECONDARY} [data-nx-count]`).first().evaluate((element) => getComputedStyle(element).fontSize);
  await page.locator(PRIMARY).evaluate((element) => {
    const node = element as HTMLElement;
    for (const [role, value] of Object.entries({ ink: '#123456', paper: '#faf5eb', bg: '#f6f1e6', muted: '#879ba7', faint: '#bdcbd3', plotTrack: '#d1c8ba', markStrong: '#345f71', 'stroke-mark': '2px', 'type-plotValue-size': '20px', 'type-caption-size': '12px' })) node.style.setProperty(`--nx-${role}`, value);
  });
  const ink = 'rgb(18, 52, 86)';
  const paper = 'rgb(250, 245, 235)';
  const muted = 'rgb(135, 155, 167)';
  const faint = 'rgb(189, 203, 211)';
  const strong = 'rgb(52, 95, 113)';
  await expect.poll(() => surface.evaluate((element) => {
    const style = getComputedStyle(element);
    return { color: style.outlineColor, width: style.outlineWidth, style: style.outlineStyle };
  })).toEqual({ color: ink, width: '2px', style: 'solid' });
  await expect.poll(() => paint(page, PRIMARY)).toEqual([
    { track: 'rgb(209, 200, 186)', mark: ink, count: paper, label: faint },
    { track: 'rgb(209, 200, 186)', mark: strong, count: paper, label: faint },
    { track: 'rgb(209, 200, 186)', mark: muted, count: ink, label: muted },
    { track: 'rgb(209, 200, 186)', mark: faint, count: ink, label: muted },
    { track: 'rgb(209, 200, 186)', mark: ink, count: paper, label: faint },
    { track: 'rgb(209, 200, 186)', mark: strong, count: ink, label: muted },
    { track: 'rgb(209, 200, 186)', mark: muted, count: ink, label: muted },
    { track: 'rgb(209, 200, 186)', mark: faint, count: ink, label: muted },
  ]);
  await expect.poll(() => page.locator(`${PRIMARY} .nx-petal-track, ${PRIMARY} .nx-petal-mark`).evaluateAll((elements) => elements.every((element) => getComputedStyle(element).stroke === 'rgb(246, 241, 230)'))).toBe(true);
  await expect.poll(() => counts.first().evaluate((element) => getComputedStyle(element).fontSize)).toBe('20px');
  await expect.poll(() => page.locator(`${PRIMARY} [data-nx-label]`).first().evaluate((element) => getComputedStyle(element).fontSize)).toBe('12px');
  assert.deepEqual(await paint(page, SECONDARY), siblingPaint, 'Scoped petal paint and label changes must not affect another instance');
  assert.deepEqual(await page.locator(`${SECONDARY} .nx-petal-track, ${SECONDARY} .nx-petal-mark`).evaluateAll((elements) => elements.map((element) => getComputedStyle(element).stroke)), siblingGaps, 'Scoped knockout ground must not affect another instance');
  assert.equal(await page.locator(`${SECONDARY} [data-nx-count]`).first().evaluate((element) => getComputedStyle(element).fontSize), siblingType, 'Scoped count type must not affect another instance');

  const firstPath = await marks.first().getAttribute('d');
  const secondPath = await marks.nth(1).getAttribute('d');
  const siblingPaths = await page.locator(`${SECONDARY} .nx-petal-mark`).evaluateAll((elements) => elements.map((element) => element.getAttribute('d')));
  await page.evaluate(() => (window as unknown as { nodexPetalFixture: { setRevision: (value: number) => void } }).nodexPetalFixture.setRevision(1));
  await expect(counts).toHaveText(['10', '75', '50', '25', '90', '65', '40', '200']);
  await expect(marks.first()).not.toHaveAttribute('d', firstPath!);
  await expect(marks.nth(1)).not.toHaveAttribute('d', secondPath!);
  await expect.poll(async () => (await paint(page, PRIMARY)).map((item) => item.count)).toEqual([ink, ink, ink, ink, ink, ink, ink, paper]);
  await expect.poll(async () => (await paint(page, PRIMARY))[1]?.mark).toBe(muted);
  assert.deepEqual(await page.locator(`${SECONDARY} .nx-petal-mark`).evaluateAll((elements) => elements.map((element) => element.getAttribute('d'))), siblingPaths, 'Updating one rose must not reshape another');
  await hoverShape(page, 7, 'mark');
  await tooltip(page, 'Hotel — named 200 times');

  const width = Number(await page.locator(`${PRIMARY} svg`).getAttribute('width'));
  const trackPath = await tracks.first().getAttribute('d');
  await page.locator(PRIMARY).evaluate((element) => { (element as HTMLElement).style.width = '340px'; });
  await expect.poll(async () => Number(await page.locator(`${PRIMARY} svg`).getAttribute('width'))).toBeLessThan(width);
  await expect(tracks.first()).not.toHaveAttribute('d', trackPath!);
  assert(Number(await page.locator(`${SECONDARY} svg`).getAttribute('width')) > 340, 'Resizing one rose must not resize its sibling');
  await hoverShape(page, 0, 'track');
  await tooltip(page, 'Alpha — named 10 times');

  for (const mode of ['empty', 'single', 'zero', 'invalid'] as const) {
    await setMode(page, mode);
    if (mode === 'empty' || mode === 'invalid') await expect(page.locator(`${PRIMARY} [role="status"]`)).toContainText('available');
    else {
      await expect(tracks).toHaveCount(mode === 'single' ? 1 : 3);
      await expect(marks).toHaveCount(mode === 'single' ? 1 : 0);
      await expect(counts).toHaveText(mode === 'single' ? ['3'] : ['0', '0', '0']);
      await keyboardObservations(page, mode === 'single' ? ['Only — named 3 times'] : ['Low — named 0 times', 'Middle — named 0 times', 'High — named 0 times']);
    }
    assert.equal(await page.locator(PRIMARY).evaluate((element) => /NaN|Infinity/.test(element.innerHTML)), false, `Petal-rose ${mode} data generated invalid DOM`);
  }

  await setMode(page, 'partial');
  await expect(tracks).toHaveCount(6);
  await expect(marks).toHaveCount(1);
  await expect(counts).toHaveText(['10', '—', '0', '—', '—', '—']);
  await hoverShape(page, 1, 'track');
  await tooltip(page, 'Absent — Unavailable');
  await keyboardObservations(page, [
    'Present — named 10 times', 'Absent — Unavailable', 'Zero — named 0 times',
    'Negative — Unavailable', 'Invalid — Unavailable', 'Unbounded — Unavailable',
  ]);
  assert.equal(await page.locator(PRIMARY).evaluate((element) => /NaN|Infinity/.test(element.innerHTML)), false, 'Missing petal counts generated invalid DOM');
  await setMode(page, 'normal');
  await expect(tracks).toHaveCount(8);
  console.log('Validated petal-rose pointer/keyboard categories, tokenized tracks/tones/labels, normalized data updates, independent instances, resizing and missing/zero/invalid data.');
}
