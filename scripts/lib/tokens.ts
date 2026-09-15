import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';

import { dependencyPin } from '../../packages/cli/src/install.ts';
import { rulesFromTokens } from '../../packages/cli/src/lint.ts';
import { containedPath, registryPath } from '../../packages/cli/src/safety.ts';

export type Tokens = Record<string, unknown>;

export interface TokenFontFace {
  /** Exact package version, also pinned in the repository dependencies. */
  package: string;
  file: string;
  family: string;
  weight: string;
  style: 'normal' | 'italic';
}

export function fontFaces(tokens: Tokens): TokenFontFace[] {
  const font = tokens.font as Record<string, unknown> | undefined;
  if (font?.webfont !== undefined) throw new Error('font.webfont is obsolete; declare embedded fonts in font.faces');
  const faces = font?.faces ?? [];
  if (!Array.isArray(faces)) throw new Error('font.faces must be an array');
  return faces.map((value: unknown) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Each font face must be an object');
    const face = value as Record<string, unknown>;
    if (typeof face.package !== 'string' || typeof face.file !== 'string' || typeof face.family !== 'string' || typeof face.weight !== 'string') {
      throw new Error('A font face must declare package, file, family and weight strings');
    }
    const { name } = dependencyPin(face.package);
    if (!name.startsWith('@fontsource-variable/')) throw new Error(`Font package ${name} must come from @fontsource-variable`);
    registryPath(face.file, 'font file');
    if (!face.file.endsWith('.woff2')) throw new Error('Embedded font files must be WOFF2');
    if (!/^[A-Za-z0-9][A-Za-z0-9 -]*$/.test(face.family)) throw new Error(`Unsupported font family name: ${face.family}`);
    if (!/^\d{1,4}(?: \d{1,4})?$/.test(face.weight)) throw new Error(`Invalid font weight: ${face.weight}`);
    const weights = face.weight.split(' ').map(Number);
    if (weights.some((weight) => weight < 1 || weight > 1000) || (weights[1] !== undefined && weights[0]! > weights[1])) {
      throw new Error(`Invalid font weight range: ${face.weight}`);
    }
    if (face.style !== 'normal' && face.style !== 'italic') throw new Error('Font style must be normal or italic');
    return face as unknown as TokenFontFace;
  });
}

/** Embed licensed font bytes so one token stylesheet works offline after CLI init. */
export async function renderFontFaces(tokens: Tokens, repositoryRoot: string): Promise<string> {
  const faces = fontFaces(tokens);
  if (!faces.length) return '';
  const rootPackage = JSON.parse(await readFile(path.join(repositoryRoot, 'package.json'), 'utf8')) as {
    dependencies?: Record<string, string>; devDependencies?: Record<string, string>;
  };
  const pinned = { ...rootPackage.devDependencies, ...rootPackage.dependencies };
  const modules = await realpath(path.join(repositoryRoot, 'node_modules'));
  const licenses = new Set<string>();
  const styles: string[] = [];
  for (const face of faces) {
    const { name, version } = dependencyPin(face.package);
    if (pinned[name] !== version) throw new Error(`Font package ${name} must be pinned to ${version} in package.json`);
    const packageRoot = await realpath(containedPath(modules, name));
    containedPath(modules, path.relative(modules, packageRoot));
    const readPackageFile = async (file: string): Promise<Buffer> => {
      const actual = await realpath(containedPath(packageRoot, file));
      containedPath(packageRoot, path.relative(packageRoot, actual));
      return readFile(actual);
    };
    const metadata = JSON.parse((await readPackageFile('package.json')).toString('utf8')) as { name?: string; version?: string };
    if (metadata.name !== name || metadata.version !== version) throw new Error(`Installed ${name} does not match declared font version ${version}`);
    if (!licenses.has(face.package)) {
      const license = (await readPackageFile('LICENSE')).toString('utf8').trim();
      if (!license.includes('SIL OPEN FONT LICENSE')) throw new Error(`${name}: expected an Open Font License`);
      styles.push(`/*! ${face.package}\n${license.replace(/\*\//g, '* /')}\n*/`);
      licenses.add(face.package);
    }
    const font = await readPackageFile(face.file);
    if (font.subarray(0, 4).toString('ascii') !== 'wOF2') throw new Error(`${name}/${face.file} is not a WOFF2 font`);
    styles.push(`@font-face {\n  font-family: ${JSON.stringify(face.family)};\n  font-style: ${face.style};\n  font-weight: ${face.weight};\n  font-display: swap;\n  src: url("data:font/woff2;base64,${font.toString('base64')}") format("woff2");\n}`);
  }
  return `${styles.join('\n\n')}\n`;
}

/** One naming convention for authored tokens and their CSS representation. */
export function tokenVariables(tokens: Tokens): Record<string, string> {
  fontFaces(tokens);
  const variables: Record<string, string> = {};
  function walk(value: unknown, parts: string[]) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      for (const [key, child] of Object.entries(value)) {
        if (!key.startsWith('$')) walk(child, [...parts, key]);
      }
    } else if (typeof value === 'string' || typeof value === 'number') {
      const name = `--nx-${parts.join('-')}`;
      // Typography names a semantic color rather than repeating its literal.
      const colors = tokens.color as Record<string, string> | undefined;
      variables[name] = parts[0] === 'type' && parts.at(-1) === 'color' && colors?.[String(value)]
        ? `var(--nx-${value})` : String(value);
    }
  }
  for (const [key, value] of Object.entries(tokens)) {
    if (!key.startsWith('$') && key !== 'ramp') walk(value, key === 'color' ? [] : [key]);
  }
  const rules = rulesFromTokens(tokens);
  if (!Number.isFinite(rules.lineMax) || rules.lineMax <= 0) throw new Error('tokens.stroke.lineMax must be a positive width');
  for (const required of ['--nx-bg', '--nx-ink', '--nx-muted', '--nx-font-sans', '--nx-stroke-hairline']) {
    if (!(required in variables)) throw new Error(`Missing required token ${required}`);
  }
  for (const [name, value] of Object.entries(variables)) {
    if (/[;{}<>]/.test(value)) throw new Error(`${name} contains CSS declaration syntax; font metadata belongs in font.faces`);
    for (const match of value.matchAll(/var\(\s*(--nx-[\w-]+)/g)) {
      if (!(match[1]! in variables)) throw new Error(`${name} references missing token ${match[1]}`);
    }
  }
  return variables;
}

export function renderTokens(tokens: Tokens, name: string, fontCss = ''): string {
  const variables = tokenVariables(tokens);
  return `${fontCss}/* ${name.replace(/\*\//g, '* /')}: generated from the language tokens.json. */\n:root {\n${
    Object.entries(variables).map(([key, value]) => `  ${key}: ${value};`).join('\n')
  }\n}\n`;
}
