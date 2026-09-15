import { lstat, realpath } from 'node:fs/promises';
import path from 'node:path';

/** Registry addresses are portable relative paths, never URLs or escaped paths. */
export function registryPath(value: string, label = 'registry path'): string {
  if (!value || !/^[A-Za-z0-9_@./-]+$/.test(value) || value.split('/').some((segment) => !segment || segment === '.' || segment === '..')) {
    throw new Error(`Unsafe ${label}: ${JSON.stringify(value)}.`);
  }
  return value;
}

export function containedPath(root: string, relative: string): string {
  const target = path.resolve(root, relative);
  const fromRoot = path.relative(path.resolve(root), target);
  if (!fromRoot || fromRoot === '..' || fromRoot.startsWith(`..${path.sep}`) || path.isAbsolute(fromRoot)) {
    throw new Error(`Path must stay inside ${root}: ${relative}.`);
  }
  return target;
}

/** Check every existing ancestor before mkdir/write; symlinks cannot escape a project. */
export async function writablePath(root: string, relative: string): Promise<string> {
  const canonicalRoot = await realpath(root);
  const target = containedPath(canonicalRoot, relative);
  const parts = path.relative(canonicalRoot, target).split(path.sep);
  let current = canonicalRoot;
  for (const part of parts) {
    current = path.join(current, part);
    try {
      const info = await lstat(current);
      if (info.isSymbolicLink()) {
        throw new Error(`Refusing to write through a symbolic link: ${current}.`);
      }
      if (current !== target && !info.isDirectory()) {
        throw new Error(`A file blocks the destination directory: ${current}.`);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') break;
      throw error;
    }
  }
  return target;
}
