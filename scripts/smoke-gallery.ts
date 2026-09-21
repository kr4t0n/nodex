/** Browser checks for native examples, bounded startup and retained interaction. */
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium, expect, type Locator, type Page } from '@playwright/test';

import type { GalleryRegistry } from '../packages/core/src/schema.ts';
import { nativePreviewFixture } from './lib/native-preview-fixture.ts';
import { startSite } from './lib/site.ts';

const languagePath = '/l/mono-editorial';
const preview = (page: Page, key: string) => page.locator(`[data-nx-preview="${key}"]`);
const started = (page: Page) => page.locator('[data-nx-preview]:not([data-nx-preview-state="waiting"])');
const waitForReady = (element: Locator) => expect(element.first()).toHaveAttribute('data-nx-preview-state', 'ready', { timeout: 20_000 });

/** Hold example modules while allowing the shell and route prefetches through. */
async function blockExamples(page: Page) {
  let release!: () => void;
  let collecting = true;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route(/\/_next\/static\/chunks\/.*\.js$/, async (route) => {
    const response = await route.fetch();
    // Every current fixture exports Example. Inspect the module's export, not
    // its hashed URL; blocking route chunks would also block client navigation.
    if (collecting && /\["Example",/.test(await response.text())) await gate;
    if (!page.isClosed()) await route.fulfill({ response });
  });
  return { release, stopCollecting: () => { collecting = false; } };
}

let site: Awaited<ReturnType<typeof startSite>> | undefined;

async function main() {
  const origin = process.argv[2] ?? (site = await startSite()).origin;
  const catalog = await fetch(`${origin}/r/gallery.json`).then((response) => response.json()) as GalleryRegistry;
  const browser = await chromium.launch({ headless: true });
  const errors: string[] = [];
  async function newPage() {
    const page = await browser.newPage({ baseURL: origin, viewport: { width: 1365, height: 900 }, reducedMotion: 'reduce' });
    page.on('pageerror', (error) => errors.push(error.message));
    return page;
  }
  try {
    const page = await newPage();
    const requests: string[] = [];
    page.on('request', (request) => requests.push(new URL(request.url()).pathname));
    await page.goto(languagePath);
    await waitForReady(started(page));
    await delay(1800);
    assert(requests.includes('/r/gallery.json'), 'Browsing must fetch the lightweight gallery manifest');
    assert(!requests.includes('/r/registry.json'), 'Browsing must not fetch embedded source');
    assert(!requests.some((url) => url.includes('/registry/_preview/') || url.endsWith('/index.html')), 'Native previews must not fetch standalone documents or their runtimes');
    await expect(page.locator('iframe')).toHaveCount(0);
    assert(await page.locator('[data-nx-preview]').count() > 60, 'Exercise the full language catalogue');
    assert(await started(page).count() < 10, 'Distant examples must stay unmounted beyond the observer fallback');
    await expect(page.locator('[data-nx-preview]').last()).toHaveAttribute('data-nx-preview-state', 'waiting');

    const input = preview(page, 'shared/input');
    await input.scrollIntoViewIfNeeded();
    await waitForReady(input);
    const field = input.getByRole('searchbox', { name: 'Search components' });
    await field.fill('retained gallery draft');
    await expect(page).toHaveURL(`${origin}${languagePath}`);
    await page.getByRole('heading', { name: 'Charts', exact: true }).evaluate((element) => element.scrollIntoView());
    await waitForReady(preview(page, 'mono-editorial/dual-area'));
    await input.scrollIntoViewIfNeeded();
    await expect(field).toHaveValue('retained gallery draft');
    const links = preview(page, 'shared/link');
    await links.scrollIntoViewIfNeeded();
    await waitForReady(links);
    const scroll = await page.evaluate(() => window.scrollY);
    await links.getByRole('link').first().click();
    assert.equal(await page.evaluate(() => window.scrollY), scroll, 'Placeholder specimen links must not scroll the host page');

    // Keyboard and pointer inspection must both work under the gallery scale.
    const hairline = preview(page, 'mono-editorial/hairline-line');
    await hairline.scrollIntoViewIfNeeded();
    await waitForReady(hairline);
    const chart = hairline.locator('.recharts-surface').first();
    await chart.focus();
    await chart.press('ArrowRight');
    await expect(hairline.getByRole('status')).toContainText('JUN');
    await expect(page).toHaveURL(`${origin}${languagePath}`);
    await hairline.locator('.recharts-line-dots circle').nth(5).hover();
    await expect(hairline.getByRole('status')).toContainText('JUN 6');
    await page.locator(`a[href="${languagePath}/hairline-line"]`).click();
    await expect(page).toHaveURL(`${origin}${languagePath}/hairline-line`);
    await waitForReady(preview(page, 'mono-editorial/hairline-line'));
    await expect(page.locator('[data-nx-preview]')).toHaveCount(1);
    await page.close();
    console.log('Gallery: native discovery, viewport deferral, retained forms, specimen links and scaled keyboard/pointer inspection');

    const queued = await newPage();
    const gate = await blockExamples(queued);
    try {
      await queued.goto(languagePath, { waitUntil: 'domcontentloaded' });
      await expect(started(queued)).toHaveCount(3);
      await delay(1800);
      await expect(started(queued)).toHaveCount(3);
      const initial = await started(queued).evaluateAll((elements) => elements.map((element) => element.getAttribute('data-nx-preview')));
      await queued.locator('[data-nx-preview]').last().scrollIntoViewIfNeeded();
      await delay(200);
      await expect(started(queued)).toHaveCount(3);
      gate.release();
      await waitForReady(queued.locator('[data-nx-preview]').last());
      const admitted = await started(queued).evaluateAll((elements) => elements.map((element) => ({ key: element.getAttribute('data-nx-preview'), top: element.getBoundingClientRect().top })));
      assert(admitted.filter((element) => !initial.includes(element.key)).every((element) => element.top > -1000 && element.top < 1200),
        'Freed slots must serve the current viewport, not candidates left behind by scrolling');
    } finally { gate.release(); await queued.close(); }
    console.log('Gallery: concurrent startup cap and fast-scroll reprioritization');

    const cancelled = await newPage();
    const pending = await blockExamples(cancelled);
    try {
      await cancelled.goto(languagePath, { waitUntil: 'domcontentloaded' });
      await expect(started(cancelled)).toHaveCount(3);
      await delay(1800);
      pending.stopCollecting();
      const documentStart = await cancelled.evaluate(() => performance.timeOrigin);
      await cancelled.locator(`a[href="${languagePath}/hairline-line"]`).click();
      await expect(cancelled).toHaveURL(`${origin}${languagePath}/hairline-line`);
      await waitForReady(preview(cancelled, 'mono-editorial/hairline-line'));
      await expect(started(cancelled)).toHaveCount(1);
      assert.equal(await cancelled.evaluate(() => performance.timeOrigin), documentStart, 'Exercise client navigation cleanup');
    } finally { pending.release(); await cancelled.close(); }
    console.log('Gallery: client navigation cancels queued and active startup work');

    const stalled = await newPage();
    const unavailable = await blockExamples(stalled);
    try {
      await stalled.goto(languagePath, { waitUntil: 'domcontentloaded' });
      await expect(started(stalled)).toHaveCount(3);
      unavailable.stopCollecting();
      await stalled.locator('[data-nx-preview]').last().scrollIntoViewIfNeeded();
      await waitForReady(stalled.locator('[data-nx-preview]').last());
    } finally { unavailable.release(); await stalled.close(); }
    console.log('Gallery: stalled imports cannot starve subsequent visible examples');

    const fallback = await newPage();
    await fallback.addInitScript(() => {
      window.IntersectionObserver = class implements IntersectionObserver {
        readonly root = null;
        readonly rootMargin = '0px';
        readonly thresholds = [0];
        observe() {}
        unobserve() {}
        disconnect() {}
        takeRecords() { return []; }
      };
      let frame = 0;
      window.requestAnimationFrame = () => ++frame;
      window.cancelAnimationFrame = () => {};
    });
    await fallback.goto(languagePath, { waitUntil: 'domcontentloaded' });
    await waitForReady(started(fallback));
    await expect(fallback.locator('[data-nx-preview]').last()).toHaveAttribute('data-nx-preview-state', 'waiting');
    assert(await started(fallback).count() < 10, 'Observer fallback must retain viewport eligibility');
    await fallback.locator('[data-nx-preview]').last().evaluate((element) => element.scrollIntoView());
    await waitForReady(fallback.locator('[data-nx-preview]').last());
    await fallback.close();
    console.log('Gallery: startup and readiness progress without observer or animation-frame delivery');

    // Every example must render through the website's shared runtime and CSS.
    const all = await newPage();
    for (const language of [...new Set(catalog.items.filter((item) => item.meta.tier === 'expressive').map((item) => item.meta.language))]) {
      await all.goto(`/l/${language}`);
      for (const item of catalog.items.filter((item) => item.meta.language === language || item.meta.language === 'shared')) {
        const example = preview(all, `${item.meta.language}/${item.name}`);
        await example.scrollIntoViewIfNeeded();
        await waitForReady(example);
        if (item.meta.tier === 'expressive') {
          assert(await example.locator('svg :is(path,circle,ellipse,rect,line,polyline,polygon):not(defs *)').count() > 0, `${language}/${item.name} must draw chart marks`);
          const dimensions = await example.locator('[data-nx-example]').evaluate((element) => ({ width: (element as HTMLElement).offsetWidth, height: (element as HTMLElement).offsetHeight }));
          assert.equal(dimensions.width, item.meta.preview.width, `${item.name}: preserve the logical composition width`);
          assert(Math.abs(dimensions.height - item.meta.preview.height) <= 2, `${item.name}: expected height ${item.meta.preview.height}, received ${dimensions.height}`);
        }
      }
      await expect(all.locator('iframe')).toHaveCount(0);
      const duplicateIds = await all.locator('[data-nx-example] [id]').evaluateAll((elements) => {
        const ids = elements.map((element) => element.id);
        return ids.filter((id, index) => ids.indexOf(id) !== index);
      });
      assert.deepEqual(duplicateIds, [], `${language}: independent instances must not share document IDs`);
    }
    await all.setViewportSize({ width: 320, height: 740 });
    for (const language of ['mono-editorial', 'signal-console', 'neo-brutalism', 'sketchbook']) {
      for (const name of ['dialog', 'input', 'textarea']) {
        await all.goto(`/l/${language}/${name}`);
        await waitForReady(preview(all, `shared/${name}`));
        assert(await all.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${language}/${name} must fit on mobile`);
        assert(await all.locator(':modal').count() === 0, 'Inline dialog specimens must not take over the host document');
      }
    }
    await all.close();
    console.log('Gallery: all chart and primitive examples, logical dimensions, unique IDs and mobile controls');

    const fixture = await nativePreviewFixture(origin);
    const scoped = await newPage();
    try {
      await scoped.goto(fixture.origin);
      const mono = preview(scoped, 'mono-editorial/hairline-line');
      const sketch = preview(scoped, 'sketchbook/sketch-bars').first();
      await waitForReady(mono);
      await waitForReady(sketch);
      const backgrounds = await scoped.locator('[data-nx-example]').evaluateAll((elements) => elements.slice(0, 2).map((element) => getComputedStyle(element).backgroundColor));
      assert.notEqual(backgrounds[0], backgrounds[1], 'Simultaneous language scopes must retain their own backgrounds');
      const sketchInk = await sketch.locator('svg text').first().evaluate((element) => getComputedStyle(element).fill);
      await mono.evaluate((element) => { element.style.setProperty('--nx-ink', '#17365d'); });
      await expect(mono.locator('.recharts-line-curve')).toHaveCSS('stroke', 'rgb(23, 54, 93)');
      assert.equal(await sketch.locator('svg text').first().evaluate((element) => getComputedStyle(element).fill), sketchInk, 'A scoped override must leave sibling charts unchanged');
      const radios = preview(scoped, 'shared/radio');
      await radios.last().scrollIntoViewIfNeeded();
      await waitForReady(radios.first());
      await waitForReady(radios.last());
      await radios.last().getByRole('radio', { name: 'Glance', exact: true }).check();
      await expect(radios.first().getByRole('radio', { name: 'Close read', exact: true })).toBeChecked();
      await expect(radios.last().getByRole('radio', { name: 'Glance', exact: true })).toBeChecked();
      const missing = preview(scoped, 'shared/unavailable');
      await missing.scrollIntoViewIfNeeded();
      await expect(missing).toHaveAttribute('data-nx-preview-state', 'error');
      await expect(missing.getByRole('status')).toHaveText('Preview unavailable.');
      await waitForReady(preview(scoped, 'sketchbook/sketch-bars').last());
      const ids = await scoped.locator('[data-nx-example] [id]').evaluateAll((elements) => elements.map((element) => element.id));
      assert.equal(new Set(ids).size, ids.length, 'Repeated examples must retain independent IDs in one document');
      await expect(scoped.locator('iframe')).toHaveCount(0);
    } finally { await scoped.close(); await fixture.close(); }
    console.log('Gallery: simultaneous languages, scoped overrides, independent radio groups, repeated charts and contained failures');
    assert.deepEqual(errors, [], 'Gallery pages must not raise browser errors');
  } finally { await browser.close(); }
}

try { await main(); } finally { await site?.close(); }
