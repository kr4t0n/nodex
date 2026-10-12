import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, type Browser } from '@playwright/test';
import { resolveTokens } from '../../packages/cli/src/tokens.ts';
import { modeFixture } from './mode-fixture.ts';
import { renderFontFaces, renderTokens } from './tokens.ts';

/** Serve a test-only variation through the real gallery's manifest and assets. */
export async function checkGalleryModes(
  browser: Browser,
  origin: string,
  evidence: string,
) {
  const tokens = await modeFixture();
  const dark = resolveTokens(tokens, 'dark').color as Record<string, string>;
  const css = renderTokens(
    tokens,
    'Mode fixture',
    await renderFontFaces(tokens, path.resolve(import.meta.dirname, '../..')),
    'mono-editorial',
  );
  await mkdir(evidence, { recursive: true });
  for (const width of [1365, 390]) {
    const page = await browser.newPage({
      baseURL: origin,
      viewport: { width, height: 900 },
      reducedMotion: 'reduce',
    });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    try {
      await page.route('**/r/languages.json', async (route) => {
        const response = await route.fetch();
        const languages = (await response.json()) as Array<{
          slug: string;
          modes: string[];
        }>;
        languages.find(
          (language) => language.slug === 'mono-editorial',
        )!.modes = ['light', 'dark'];
        await route.fulfill({ response, json: languages });
      });
      await page.route(
        '**/registry/languages/mono-editorial/tokens.css',
        (route) => route.fulfill({ contentType: 'text/css', body: css }),
      );
      await page.route(
        '**/registry/languages/mono-editorial/tokens.json',
        (route) => route.fulfill({ json: tokens }),
      );
      await page.goto('/l/mono-editorial');
      const mode = page.getByRole('combobox', { name: 'Color mode' });
      await expect(mode).toHaveValue('light');
      await expect(page.locator('html')).toHaveCSS('color-scheme', 'light');
      const inputPreview = page.locator('[data-nx-preview="shared/input"]');
      await inputPreview.scrollIntoViewIfNeeded();
      const input = inputPreview.getByRole('searchbox', {
        name: 'Search components',
      });
      await input.fill('Preserved gallery input');
      const inputNode = await input.elementHandle();
      const chart = page.locator(
        '[data-nx-preview="mono-editorial/hairline-line"]',
      );
      await chart.scrollIntoViewIfNeeded();
      await expect(chart).toHaveAttribute('data-nx-preview-state', 'ready', {
        timeout: 20_000,
      });
      await page.mouse.move(0, 0);
      const svg = chart.locator('.recharts-surface').first();
      await svg.focus();
      await svg.press('ArrowRight');
      await expect(chart.getByRole('status')).toContainText('JUN 2:');
      const chartNode = await svg.elementHandle();
      await mode.scrollIntoViewIfNeeded();
      await mode.focus();
      await page.screenshot({
        path: path.join(evidence, `gallery-light-${width}.png`),
      });
      await page.keyboard.press('Space');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      await expect(mode).toHaveValue('dark');
      await expect(mode).toBeFocused();
      await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark');
      assert(await input.evaluate((node, saved) => node === saved, inputNode));
      assert(await svg.evaluate((node, saved) => node === saved, chartNode));
      await expect(input).toHaveValue('Preserved gallery input');
      await expect(
        page
          .getByRole('region', { name: 'UI colors' })
          .locator(`li[title^="${dark.bg}"]`),
      ).toHaveCount(1);
      const resolved = await page.evaluate(() => {
        const chart = document.querySelector(
          '[data-nx-chart="hairline-line"]',
        )!;
        return {
          shell: getComputedStyle(document.body).backgroundColor,
          chart: getComputedStyle(chart).backgroundColor,
        };
      });
      assert.equal(resolved.shell, resolved.chart);
      await page.screenshot({
        path: path.join(evidence, `gallery-dark-${width}.png`),
      });
      await chart.scrollIntoViewIfNeeded();
      await svg.focus();
      // Recharts hides its tooltip on blur; the next arrow reveals whether its
      // keyboard index survived while focus moved to the native mode selector.
      await svg.press('ArrowRight');
      await expect(chart.getByRole('status')).toContainText('JUN 3:');
      await page.screenshot({
        path: path.join(evidence, `gallery-dark-chart-${width}.png`),
      });
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await expect(chart.locator('[data-nx-chart]')).toHaveAttribute(
        'data-nx-animated',
        'false',
      );
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await page.goto('/l/mono-editorial/input');
      await expect(mode).toHaveValue('light');
      await mode.selectOption('dark');
      await expect(page.locator('[data-nx-preview="shared/input"]')).toHaveCSS(
        'color-scheme',
        'dark',
      );
      await page.goto('/l/nocturne');
      await expect(page.locator('h1').first()).toHaveText('Nocturne');
      await expect(mode).toHaveCount(0);
      await expect(page.locator('html')).toHaveAttribute(
        'data-nx-mode',
        'light',
      );
      assert.deepEqual(errors, []);
    } finally {
      await page.close();
    }
  }
  console.log(
    'Gallery modes: active shell/palette, retained native/chart state, keyboard selection, mobile and reduced motion',
  );
}
