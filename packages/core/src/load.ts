import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

import {
  componentMetaSchema,
  languageMetaSchema,
  registrySchema,
  type ComponentMeta,
  type LanguageMeta,
  type Registry,
} from './schema.ts';

export interface LoadedComponent {
  meta: ComponentMeta;
  /** Absolute path to the component's directory. */
  dir: string;
  /** Explicit runtime files, relative to the component directory. */
  files: string[];
}

export interface LoadedLanguage {
  meta: LanguageMeta;
  dir: string;
  expressive: LoadedComponent[];
}

export interface LoadedSource {
  languages: LoadedLanguage[];
  primitives: LoadedComponent[];
}

async function readJson<T>(
  file: string,
  parse: (value: unknown) => T,
): Promise<T> {
  const raw = await readFile(file, 'utf8');
  try {
    return parse(JSON.parse(raw));
  } catch (error) {
    throw new Error(
      `${file}: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
}

async function listDirs(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

async function loadComponent(dir: string): Promise<LoadedComponent> {
  const meta = await readJson(path.join(dir, 'meta.json'), (value) =>
    componentMetaSchema.parse(value),
  );
  for (const name of [...meta.files, meta.example.entry]) {
    if (!(await pathExists(path.join(dir, name)))) throw new Error(`${dir}: missing declared file ${name}`);
  }
  return { meta, dir, files: meta.files };
}

/**
 * Walk the registry source tree. Used by the build script; the CLI and gallery
 * consume the built manifest via `parseRegistry` instead.
 */
export async function loadSource(registryDir: string): Promise<LoadedSource> {
  const primitivesDir = path.join(registryDir, 'primitives');
  const primitives = await Promise.all(
    (await listDirs(primitivesDir)).map((name) =>
      loadComponent(path.join(primitivesDir, name)),
    ),
  );

  const languagesDir = path.join(registryDir, 'languages');
  const languages = await Promise.all(
    (await listDirs(languagesDir)).map(async (slug) => {
      const dir = path.join(languagesDir, slug);
      const meta = await readJson(path.join(dir, 'meta.json'), (value) =>
        languageMetaSchema.parse(value),
      );
      if (meta.slug !== slug) {
        throw new Error(
          `${dir}/meta.json declares slug "${meta.slug}" but lives in "${slug}"`,
        );
      }
      const expressiveDir = path.join(dir, 'expressive');
      const expressive = await Promise.all(
        (await listDirs(expressiveDir)).map((name) =>
          loadComponent(path.join(expressiveDir, name)),
        ),
      );
      return {
        meta,
        dir,
        expressive,
      } satisfies LoadedLanguage;
    }),
  );

  return { languages, primitives };
}

/** Validate an already-built manifest, whether read from disk or fetched. */
export function parseRegistry(value: unknown): Registry {
  return registrySchema.parse(value);
}

export async function readRegistryFile(file: string): Promise<Registry> {
  return readJson(file, parseRegistry);
}

export async function pathExists(target: string): Promise<boolean> {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}
