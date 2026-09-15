import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { writablePath } from './safety.ts';

export interface PlannedFile {
  relative: string;
  absolute: string;
  content: string;
  changed: boolean;
}

export async function readOptional(file: string): Promise<string | undefined> {
  try { return await readFile(file, 'utf8'); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

/** Read and validate the entire batch before creating any directories or files. */
export async function planFiles(root: string, files: Array<{ relative: string; content: string }>, force = false): Promise<PlannedFile[]> {
  const planned = new Map<string, PlannedFile>();
  for (const file of files) {
    const absolute = await writablePath(root, file.relative);
    const duplicate = planned.get(absolute);
    if (duplicate) {
      if (duplicate.content !== file.content) throw new Error(`Components supply conflicting content for ${file.relative}.`);
      continue;
    }
    const existing = await readOptional(absolute);
    if (existing !== undefined && existing !== file.content && !force) {
      throw new Error(`${file.relative} already contains different content. Use --force to replace it.`);
    }
    planned.set(absolute, { ...file, absolute, changed: existing !== file.content });
  }
  for (const absolute of planned.keys()) {
    let parent = path.dirname(absolute);
    while (parent !== path.dirname(parent)) {
      if (planned.has(parent)) throw new Error(`A delivered file conflicts with a directory: ${parent}.`);
      parent = path.dirname(parent);
    }
  }
  return [...planned.values()];
}

export async function writeFiles(root: string, files: PlannedFile[]): Promise<void> {
  for (const file of files) {
    if (!file.changed) continue;
    // Recheck immediately before writing in case an install script changed a path.
    const absolute = await writablePath(root, file.relative);
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, file.content);
  }
}
