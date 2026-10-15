import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, type Browser } from '@playwright/test';
import type { GalleryRegistry } from '../../packages/core/src/schema.ts';

/** Keep compact headers within the select's layout budget at title wrap points. */
export async function checkGalleryModeLayout(
  browser: Browser,
  origin: string,
  evidence: string,
) {
  const catalog = (await fetch(`${origin}/r/gallery.json`).then((response) =>
    response.json(),
  )) as GalleryRegistry;
  const charts = catalog.items.filter(
    (item) => item.meta.language === 'hearth',
  );
  // Measured in Chromium on base 84284e8 with Hearth's embedded font loaded.
  const controlWidths = { light: 81.1875, dark: 79.1875 };
  const controlHeight = 46;
  const results = [];
  const page = await browser.newPage({
    baseURL: origin,
    viewport: { width: 390, height: 900 },
    reducedMotion: 'reduce',
  });
  try {
    for (const item of charts) {
      await page.setViewportSize({ width: 390, height: 900 });
      await page.goto(`/l/hearth/${item.name}`);
      const mode = page.getByRole('switch', { name: 'Dark mode', exact: true });
      await expect(mode).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const heading = page.getByRole('heading', { level: 1 });
      const boundary = await heading.evaluate((title, width) => {
        const row = title.parentElement!;
        const gap = parseFloat(getComputedStyle(row).columnGap);
        return Math.ceil(
          title.getBoundingClientRect().width +
            gap +
            width +
            2 * row.getBoundingClientRect().x,
        );
      }, controlWidths.light);
      const widths = [
        ...new Set([
          320,
          360,
          375,
          390,
          393,
          412,
          414,
          1365,
          // Base's dark control is 2px narrower; straddle both wrap points.
          boundary - 3,
          boundary - 2,
          boundary - 1,
          boundary,
          boundary + 1,
        ]),
      ]
        .filter((width) => width >= 320)
        .sort((a, b) => a - b);
      for (const width of widths) {
        await page.setViewportSize({ width, height: 900 });
        for (const selection of ['light', 'dark'] as const) {
          const controlWidth = controlWidths[selection];
          await mode.setChecked(selection === 'dark');
          const comparison = await heading.evaluate((title, selection) => {
            const row = title.parentElement!;
            const button = row.querySelector('[role="switch"]')!;
            const measure = (control: Element) => ({
              title: title.getBoundingClientRect().toJSON(),
              row: row.getBoundingClientRect().toJSON(),
              next: row.nextElementSibling!.getBoundingClientRect().toJSON(),
              control: control.getBoundingClientRect().toJSON(),
              overflow: document.documentElement.scrollWidth > innerWidth,
            });
            const actual = measure(button);
            // Base 84284e8's exact control markup, using the unchanged shell CSS.
            // Restore synchronously so React retains its mounted switch node.
            const select = document.createElement('select');
            select.className = 'nx-select nx-select--auto';
            for (const value of ['light', 'dark']) {
              select.add(
                new Option(value === 'light' ? 'Light' : 'Dark', value),
              );
            }
            select.value = selection;
            button.replaceWith(select);
            try {
              return { actual, reference: measure(select) };
            } finally {
              select.replaceWith(button);
            }
          }, selection);
          const { actual, reference } = comparison;
          const context = `${item.name}, ${width}px, ${selection}`;
          assert(
            Math.abs(reference.control.width - controlWidth) < 0.1,
            context,
          );
          assert(
            actual.control.width <= reference.control.width + 0.1,
            context,
          );
          assert.equal(actual.control.width, 44, context);
          assert.equal(actual.control.height, 24, context);
          assert.equal(reference.control.height, controlHeight, context);
          for (const part of ['title', 'row', 'next'] as const) {
            for (const dimension of ['x', 'width'] as const) {
              assert.equal(
                actual[part][dimension],
                reference[part][dimension],
                `${context}: ${part}.${dimension}`,
              );
            }
            assert(
              actual[part].y <= reference[part].y,
              `${context}: ${part} must not move down`,
            );
          }
          for (const part of ['title', 'next'] as const) {
            assert.equal(
              actual[part].height,
              reference[part].height,
              `${context}: ${part}.height`,
            );
          }
          assert(
            actual.row.height <= reference.row.height,
            `${context}: no taller header`,
          );
          const wraps = (layout: typeof actual) =>
            layout.control.y >= layout.title.bottom;
          assert(
            !wraps(actual) || wraps(reference),
            `${context}: no new header wrap`,
          );
          assert.equal(actual.overflow, false, context);
          results.push({
            item: item.name,
            width,
            mode: selection,
            ...comparison,
          });
          if (
            width === 390 ||
            (width === 360 && item.name === 'hearth-bars') ||
            (width === 414 && item.name === 'hearth-shares')
          ) {
            await expect(
              page.locator('[data-nx-preview]').first(),
            ).toHaveAttribute('data-nx-preview-state', 'ready');
            await page.screenshot({
              path: path.join(
                evidence,
                `hearth-header-${item.name}-${selection}-${width}.png`,
              ),
            });
          }
        }
      }
    }
    await writeFile(
      path.join(evidence, 'hearth-header-layout.json'),
      JSON.stringify(
        { reference: '84284e8', controlWidths, controlHeight, results },
        null,
        2,
      ) + '\n',
    );
  } finally {
    await page.close();
  }
}
