import assert from 'node:assert/strict';
import test from 'node:test';
import { execFile } from 'node:child_process';
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { chromium } from '@playwright/test';
import { publishedLanguageSchema } from '../packages/core/src/schema.ts';
import { rulesFromTokens, lintRendered } from '../packages/cli/src/lint.ts';
import {
  resolveTokenModes,
  resolveTokens,
  scopeTokenCss,
  tokenModes,
} from '../packages/cli/src/tokens.ts';
import { renderTokens, tokenVariables } from './lib/tokens.ts';
import { modeFixture } from './lib/mode-fixture.ts';

const tokens = await modeFixture();

test(
  'registry compilation publishes modes and checks the dark rendered palette',
  { timeout: 60_000 },
  async () => {
    const root = path.resolve(import.meta.dirname, '..');
    const directory = await mkdtemp(path.join(tmpdir(), 'nodex-mode-build-'));
    const run = promisify(execFile);
    try {
      for (const file of [
        'package.json',
        'scripts/build-registry.ts',
        'scripts/lib',
        'packages/core/src',
        'packages/cli/src',
        'styles',
        'registry/_shared',
        'registry/primitives/prose',
        'registry/languages/mono-editorial/expressive/hairline-line',
      ]) {
        await cp(path.join(root, file), path.join(directory, file), {
          recursive: true,
        });
      }
      await symlink(
        path.join(root, 'node_modules'),
        path.join(directory, 'node_modules'),
      );
      await symlink(
        path.join(root, 'packages/core/node_modules'),
        path.join(directory, 'packages/core/node_modules'),
      );
      const language = path.join(
        directory,
        'registry/languages/mono-editorial',
      );
      await mkdir(language, { recursive: true });
      await writeFile(
        path.join(language, 'tokens.json'),
        JSON.stringify(tokens),
      );
      await writeFile(path.join(language, 'DESIGN.md'), '# Test fixture');
      await writeFile(
        path.join(language, 'meta.json'),
        JSON.stringify({
          slug: 'mono-editorial',
          name: 'Mode fixture',
          description: 'Test fixture',
          density: ['glance', 'close-read'],
          featured: ['hairline-line'],
        }),
      );
      const build = () =>
        run(process.execPath, ['scripts/build-registry.ts'], {
          cwd: directory,
          timeout: 25_000,
          maxBuffer: 4 * 1024 * 1024,
        });
      await build();
      const manifest = JSON.parse(
        await readFile(path.join(directory, 'public/r/languages.json'), 'utf8'),
      );
      assert.deepEqual(manifest[0].modes, ['light', 'dark']);
      const published = JSON.parse(
        await readFile(
          path.join(
            directory,
            'public/registry/languages/mono-editorial/tokens.json',
          ),
          'utf8',
        ),
      );
      assert.deepEqual(published.modes, tokens.modes);
      const css = await readFile(
        path.join(
          directory,
          'public/registry/languages/mono-editorial/tokens.css',
        ),
        'utf8',
      );
      assert(css.includes('[data-nx-mode="dark"]'));
      assert(!css.includes('--nx-modes'));
      const bad = structuredClone(tokens);
      (bad.color as Record<string, string>).probe =
        'light-dark(#1C1C1A, #ABCDEF)';
      await writeFile(path.join(language, 'tokens.json'), JSON.stringify(bad));
      const component = path.join(
        language,
        'expressive/hairline-line/component.tsx',
      );
      await writeFile(
        component,
        (await readFile(component, 'utf8')).replaceAll(
          'var(--nx-ink)',
          'var(--nx-probe)',
        ),
      );
      await assert.rejects(build(), (error: { stderr?: string }) =>
        /\(dark\).*outside the language tokens/.test(error.stderr ?? ''),
      );
      assert.equal(
        await readFile(
          path.join(
            directory,
            'public/registry/languages/mono-editorial/tokens.css',
          ),
          'utf8',
        ),
        css,
        'Failed dark validation must preserve the last published CSS',
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  },
);

test('modes preserve the shared contract and reject unknown overrides', () => {
  const { light, dark } = resolveTokenModes(tokens);
  assert(dark);
  assert.deepEqual(tokenModes(tokens), ['light', 'dark']);
  assert.deepEqual(tokenModes(light), ['light']);
  assert.equal(dark.type, light.type);
  assert.equal(dark.motion, light.motion);
  assert.equal(dark.font, light.font);
  assert.equal(dark.stroke, light.stroke);
  assert(!('modes' in light));
  assert.throws(() => resolveTokens(light, 'dark'), /does not declare/);
  const declaration = (tokens.modes as { dark: Record<string, unknown> }).dark;
  for (const modes of [
    null,
    [],
    { light: declaration },
    { dusk: declaration },
    { dark: null },
    { dark: [] },
    { dark: { ...declaration, type: {} } },
    { dark: { ...declaration, motion: {} } },
    { dark: { ...declaration, color: {} } },
    { dark: { ...declaration, color: { typo: '#ffffff' } } },
    { dark: { ...declaration, color: { ink: { value: '#ffffff' } } } },
    { dark: { ...declaration, color: { ink: 'red; color: blue' } } },
    { dark: { ...declaration, ramp: { steps: ['#000000'] } } },
    { dark: { ...declaration, ramp: { steps: ['#000000', {}] } } },
    { dark: { color: { ink: '#ffffff' } } },
  ]) {
    assert.throws(() => resolveTokenModes({ ...tokens, modes }), /modes/);
    assert.throws(() => rulesFromTokens({ ...tokens, modes }), /modes/);
    assert.throws(() => renderTokens({ ...tokens, modes }, 'Invalid'), /modes/);
  }
  const partial = {
    ...tokens,
    modes: { dark: { ...declaration, color: { ink: '#ABCDEF' } } },
  };
  assert.equal(
    (resolveTokens(partial, 'dark').color as Record<string, string>).bg,
    (light.color as Record<string, string>).bg,
  );
  assert.deepEqual(
    Object.keys(tokenVariables(tokens)),
    Object.keys(tokenVariables(tokens, 'dark')),
  );
  for (const mode of tokenModes(tokens)) {
    const rules = rulesFromTokens(tokens, mode);
    assert(!rules.tokenNames.some((name) => name.includes('modes')));
    assert.equal(
      rules.background,
      (resolveTokens(tokens, mode).color as Record<string, string>).bg,
    );
  }
  assert(!renderTokens(tokens, 'Fixture').includes('--nx-modes'));
  assert.equal(
    publishedLanguageSchema.shape.modes.safeParse(['dark']).success,
    false,
  );
});

test('all generated scopes isolate modes, nested boundaries and descendant overrides', async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const css = renderTokens(tokens, 'Fixture', '', 'fixture');
    const other = {
      ...resolveTokens(tokens),
      color: { ...(tokens.color as object), ink: '#345678' },
    };
    const otherCss = renderTokens(other, 'Other', '', 'other');
    for (const [attribute, styles] of [
      ['data-nx-language', css + otherCss],
      [
        'data-nx-scope',
        scopeTokenCss(css, 'fixture', '[data-nx-scope="fixture"]') +
          scopeTokenCss(otherCss, 'other', '[data-nx-scope="other"]'),
      ],
      [
        'data-nx-landing-language',
        scopeTokenCss(css, 'fixture', '[data-nx-landing-language="fixture"]') +
          scopeTokenCss(
            otherCss,
            'other',
            '[data-nx-landing-language="other"]',
          ),
      ],
    ]) {
      await page.setContent(`<html data-nx-language="unrelated"><head><style>
        ${styles}
        .paint { color: var(--nx-ink); background: var(--nx-bg); }
        </style></head><body>
        <div id="unrelated" style="color: rgb(10, 20, 30)">Unrelated</div>
        <div id="light" class="paint" ${attribute}="fixture"><input value="retained"></div>
        <div id="dark" class="paint" ${attribute}="fixture" data-nx-mode="dark">
          <div id="inherited" class="paint">Inherited dark</div>
          <div id="override" class="paint" style="--nx-ink:#123456">Override</div>
          <div id="nested-light" class="paint" ${attribute}="fixture">Default light
            <div id="nested-dark" class="paint" ${attribute}="fixture" data-nx-mode="dark">Dark again</div>
          </div>
          <div id="other" class="paint" ${attribute}="other">Other language</div>
        </div>
        <div id="explicit-light" class="paint" ${attribute}="fixture" data-nx-mode="light">Light</div>
        </body></html>`);
      const paints = await page.evaluate(() =>
        Object.fromEntries(
          [...document.querySelectorAll('[id]')].map((element) => [
            element.id,
            {
              ink: getComputedStyle(element).color,
              scheme: getComputedStyle(element).colorScheme,
            },
          ]),
        ),
      );
      assert.equal(paints.light!.ink, 'rgb(28, 28, 26)');
      assert.equal(paints['explicit-light']!.ink, paints.light!.ink);
      assert.equal(paints['nested-light']!.ink, paints.light!.ink);
      assert.equal(paints.inherited!.ink, paints.dark!.ink);
      assert.equal(paints['nested-dark']!.ink, paints.dark!.ink);
      assert.notEqual(paints.light!.ink, paints.dark!.ink);
      assert.equal(paints.override!.ink, 'rgb(18, 52, 86)');
      assert.equal(paints.other!.ink, 'rgb(52, 86, 120)');
      assert.equal(paints.unrelated!.ink, 'rgb(10, 20, 30)');
      assert.equal(paints.dark!.scheme, 'dark');
      assert.equal(paints['nested-light']!.scheme, 'light');
      assert.equal(paints.other!.scheme, 'light');
      await page.locator('input').focus();
      await page.evaluate(
        () => (document.getElementById('light')!.dataset.nxMode = 'dark'),
      );
      assert.equal(await page.locator('input').inputValue(), 'retained');
      assert(
        await page
          .locator('input')
          .evaluate((input) => input === document.activeElement),
      );
    }
    await page.setContent(
      `<style>${css}</style><svg><rect width="20" height="20" fill="var(--nx-ink)"/></svg>`,
    );
    await page.evaluate(
      () => (document.documentElement.dataset.nxMode = 'dark'),
    );
    const fill = await page
      .locator('rect')
      .evaluate((mark) => getComputedStyle(mark).fill);
    assert.deepEqual(
      lintRendered(
        [{ fill, stroke: 'none', strokeWidth: 0 }],
        rulesFromTokens(tokens, 'dark'),
      ),
      [],
    );
    assert(
      lintRendered(
        [{ fill, stroke: 'none', strokeWidth: 0 }],
        rulesFromTokens(tokens),
      ).length,
    );
  } finally {
    await browser.close();
  }
});
