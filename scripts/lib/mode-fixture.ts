import { cp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Tokens } from '../../packages/cli/src/tokens.ts';
import { renderFontFaces, renderTokens } from './tokens.ts';

/** Paint-only test variation; never included in the published catalogue. */
export async function modeFixture(): Promise<Tokens> {
  const root = path.resolve(import.meta.dirname, '../..');
  const read = async (slug: string) =>
    JSON.parse(
      await readFile(
        path.join(root, 'registry/languages', slug, 'tokens.json'),
        'utf8',
      ),
    ) as Tokens;
  const light = await read('mono-editorial');
  const dark = await read('nocturne');
  const colors = light.color as Record<string, string>;
  const darkColors = dark.color as Record<string, string>;
  return {
    ...light,
    modes: {
      dark: {
        color: Object.fromEntries(
          Object.keys(colors).map((key) => [
            key,
            darkColors[key] ??
              (colors[key] === colors.bg ? darkColors.bg : darkColors.muted),
          ]),
        ),
        ramp: dark.ramp,
      },
    },
  };
}

export async function modeRegistry(directory: string) {
  const root = path.resolve(import.meta.dirname, '../..');
  await cp(path.join(root, 'public'), directory, { recursive: true });
  const tokens = await modeFixture();
  const css = renderTokens(
    tokens,
    'Mode fixture',
    await renderFontFaces(tokens, root),
    'mono-editorial',
  );
  const prefix = path.join(directory, 'registry/languages/mono-editorial');
  await writeFile(path.join(prefix, 'tokens.css'), css);
  await writeFile(path.join(prefix, 'tokens.json'), JSON.stringify(tokens));
  const manifest = path.join(directory, 'r/languages.json');
  const languages = JSON.parse(await readFile(manifest, 'utf8')) as Array<{
    slug: string;
    modes: string[];
  }>;
  languages.find((language) => language.slug === 'mono-editorial')!.modes = [
    'light',
    'dark',
  ];
  await writeFile(manifest, JSON.stringify(languages));
  return { tokens, css };
}
