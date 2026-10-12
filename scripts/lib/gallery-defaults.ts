/** Catalogue growth must not choose the identity of existing surfaces. */
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { expect, type Browser } from '@playwright/test';
import type {
  GalleryRegistry,
  PublishedLanguage,
} from '../../packages/core/src/schema.ts';
import { nativePreviewFixture } from './native-preview-fixture.ts';

export async function checkGalleryDefaults(
  browser: Browser,
  origin: string,
  evidence: string,
) {
  await mkdir(evidence, { recursive: true });
  const catalog = (await fetch(`${origin}/r/gallery.json`).then((response) =>
    response.json(),
  )) as GalleryRegistry;
  const languages = (await fetch(`${origin}/r/languages.json`).then(
    (response) => response.json(),
  )) as PublishedLanguage[];
  assert.notEqual(
    languages[0]!.slug,
    'mono-editorial',
    'Exercise a catalogue whose first language differs from the default',
  );
  const fixture = await nativePreviewFixture(origin, 'index');
  try {
    for (const width of [1365, 390]) {
      const page = await browser.newPage({
        viewport: { width, height: 900 },
        reducedMotion: 'reduce',
      });
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      try {
        await page.goto(fixture.origin);
        await expect(
          page.getByRole('heading', { name: 'Design languages' }),
        ).toBeVisible();
        await expect(page.locator('html')).toHaveAttribute(
          'data-nx-language',
          'mono-editorial',
        );
        await expect(page.locator('body')).toHaveCSS(
          'background-color',
          'rgb(240, 239, 235)',
        );
        await expect(page.locator('body')).toHaveCSS('font-family', /Inter/);
        const tiles = page.locator('section[data-nx-scope]');
        assert.deepEqual(
          await tiles.evaluateAll((nodes) =>
            nodes.map((node) => node.getAttribute('data-nx-scope')),
          ),
          languages.map((language) => language.slug),
        );
        const hearth = page.locator('section[data-nx-scope="hearth"]');
        await expect(hearth).toHaveCSS(
          'background-color',
          'rgb(245, 240, 230)',
        );
        await expect(hearth).toHaveCSS('font-family', /Source Sans 3/);
        await expect(
          hearth.locator('[data-nx-preview]').first(),
        ).toHaveAttribute('data-nx-preview-state', 'ready', {
          timeout: 30_000,
        });
        await page.evaluate(() => document.fonts.ready.then(() => undefined));
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        );
        await page.screenshot({
          path: path.join(evidence, `index-mono-default-${width}.png`),
        });
        assert.deepEqual(errors, []);
      } finally {
        await page.close();
      }
    }
  } finally {
    await fixture.close();
  }

  const primitives = catalog.items.filter(
    (item) => item.meta.tier === 'primitive',
  );
  assert.equal(primitives.length, 24);
  for (const javaScriptEnabled of [false, true]) {
    const page = await browser.newPage({
      javaScriptEnabled,
      reducedMotion: 'reduce',
    });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    try {
      for (const item of primitives) {
        await page.goto(`${origin}/${item.meta.preview.path}`);
        if (javaScriptEnabled)
          await page.waitForFunction(
            () => document.documentElement.dataset.nxReady === 'true',
          );
        await expect(page.locator('#nx-tokens')).toHaveAttribute(
          'href',
          /languages\/mono-editorial\/tokens\.css$/,
        );
        await expect(page.locator('body')).toHaveCSS(
          'background-color',
          'rgb(240, 239, 235)',
        );
        await expect(page.locator('body')).toHaveCSS('font-family', /Inter/);
        if (item.name === 'button')
          await page.screenshot({
            path: path.join(
              evidence,
              `primitive-mono-default-js-${javaScriptEnabled}.png`,
            ),
          });
      }
      if (javaScriptEnabled) {
        const button = primitives.find((item) => item.name === 'button')!;
        // Hold the new sheet behind the module so font readiness cannot pass
        // merely because a warm cache hid the default-to-selected CSS race.
        await page.route('**/languages/hearth/tokens.css', async (route) => {
          await delay(200);
          await route.continue();
        });
        for (const selection of ['hearth', 'unknown-language']) {
          await page.goto(
            `${origin}/${button.meta.preview.path}?lang=${selection}`,
          );
          await page.waitForFunction(
            () => document.documentElement.dataset.nxReady === 'true',
          );
          await expect(page.locator('#nx-tokens')).toHaveAttribute(
            'href',
            selection === 'hearth'
              ? /languages\/hearth\/tokens\.css$/
              : /languages\/mono-editorial\/tokens\.css$/,
          );
          await expect(page.locator('body')).toHaveCSS(
            'background-color',
            selection === 'hearth'
              ? 'rgb(245, 240, 230)'
              : 'rgb(240, 239, 235)',
          );
          await expect(page.locator('body')).toHaveCSS(
            'font-family',
            selection === 'hearth' ? /Source Sans 3/ : /Inter/,
          );
        }
      }
      assert.deepEqual(errors, []);
    } finally {
      await page.close();
    }
  }
  console.log(
    'Gallery defaults: real index chrome and 24 standalone primitives retain Mono Editorial, independent of catalogue order; explicit preview selection remains available',
  );
}
