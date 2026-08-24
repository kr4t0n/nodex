import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

/**
 * `nodex.json` records the choices `init` made, so every later `add` needs no
 * flags. Mirrors shadcn's `components.json` so the mental model transfers.
 */
export interface ProjectConfig {
  language: string;
  registry?: string;
  paths: {
    components: string;
    tokens: string;
    design: string;
  };
}

export const CONFIG_FILE = 'nodex.json';

export const DEFAULT_PATHS: ProjectConfig['paths'] = {
  components: 'src/components/nodex',
  tokens: 'src/styles/nodex-tokens.css',
  design: 'docs/DESIGN.md',
};

/** Walk up so the CLI works from any subdirectory of a project. */
export async function findConfig(
  from = process.cwd(),
): Promise<{ dir: string; config: ProjectConfig } | undefined> {
  let dir = path.resolve(from);
  for (;;) {
    try {
      const raw = await readFile(path.join(dir, CONFIG_FILE), 'utf8');
      return { dir, config: JSON.parse(raw) as ProjectConfig };
    } catch {
      const parent = path.dirname(dir);
      if (parent === dir) return undefined;
      dir = parent;
    }
  }
}

export async function writeConfig(
  dir: string,
  config: ProjectConfig,
): Promise<string> {
  const file = path.join(dir, CONFIG_FILE);
  await writeFile(file, `${JSON.stringify(config, null, 2)}\n`);
  return file;
}

/**
 * The snippet `init` appends to a project's AGENTS.md.
 *
 * The point of nodex is that a coding agent knows the rules before it writes
 * anything, and an agent reads AGENTS.md. Dropping tokens into the project
 * without telling the agent they exist would waste the whole exercise.
 */
export function agentsSnippet(config: ProjectConfig, languageName: string): string {
  return `
## Design language: ${languageName}

This project uses the \`${config.language}\` design language from nodex.

- **Read \`${config.paths.design}\` before writing any UI.** It holds the rules
  that token values cannot express, including the anti-patterns.
- Tokens live in \`${config.paths.tokens}\`. Reference them as \`var(--nx-*)\`.
  Never hardcode a colour, radius, or stroke width that a token already names.
- Components fetched from nodex land in \`${config.paths.components}\`. They are
  yours to edit; nodex does not update them.
- Add more with \`nodex add ${config.language}/<component>\`, and search what is
  available with \`nodex search --design ${config.language}\`.
`;
}

export async function appendToAgentsFile(
  dir: string,
  snippet: string,
): Promise<{ file: string; created: boolean; skipped: boolean }> {
  const file = path.join(dir, 'AGENTS.md');
  let existing: string;
  let created = true;
  try {
    existing = await readFile(file, 'utf8');
    created = false;
  } catch {
    existing = '# AGENTS.md\n';
  }

  // Idempotent: re-running init must not stack duplicate sections.
  if (existing.includes('## Design language:')) {
    return { file, created: false, skipped: true };
  }

  await writeFile(file, `${existing.trimEnd()}\n${snippet}`);
  return { file, created, skipped: false };
}
