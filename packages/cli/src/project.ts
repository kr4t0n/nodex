import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { containedPath } from './safety.ts';

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
    let raw: string;
    try {
      raw = await readFile(path.join(dir, CONFIG_FILE), 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      const parent = path.dirname(dir);
      if (parent === dir) return undefined;
      dir = parent;
      continue;
    }
    let config: ProjectConfig;
    try {
      config = JSON.parse(raw) as ProjectConfig;
      if (!config || typeof config.language !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(config.language)) throw new Error('language must be a slug');
      if (config.registry !== undefined && typeof config.registry !== 'string') throw new Error('registry must be a path or URL');
      for (const name of ['components', 'tokens', 'design'] as const) {
        const value = config.paths?.[name];
        if (typeof value !== 'string' || path.isAbsolute(value)) throw new Error(`paths.${name} must be project-relative`);
        containedPath(dir, value);
      }
    } catch (cause) {
      throw new Error(`Invalid ${path.join(dir, CONFIG_FILE)}: ${String(cause)}`, { cause });
    }
    return { dir, config };
  }
}

/**
 * The snippet `init` appends to a project's AGENTS.md.
 *
 * The point of nodex is that a coding agent knows the rules before it writes
 * anything, and an agent reads AGENTS.md. Dropping tokens into the project
 * without telling the agent they exist would waste the whole exercise.
 */
export function agentsSnippet(config: ProjectConfig, languageName: string): string {
  return `<!-- nodex:start -->
## Design language: ${languageName}

This project uses the \`${config.language}\` design language from nodex.

- **Read \`${config.paths.design}\` before writing any UI.** It holds the rules
  that token values cannot express, including the anti-patterns.
- Tokens live in \`${config.paths.tokens}\`. Reference them as \`var(--nx-*)\`.
  Never hardcode a colour, radius, or stroke width that a token already names.
- Components fetched from nodex land in \`${config.paths.components}\`. They are
  yours to edit; nodex does not update them.
- **Use Nodex primitives for matching controls and surfaces.** Before implementing
  UI, inspect the installed primitives and existing application wrappers around
  them. Reuse, extend or compose them for buttons, inputs, selects, cards, dialogs
  and other supported interface elements.
- If a needed primitive is missing locally, search with
  \`nodex search --tier primitive --design ${config.language}\`, inspect its API
  with \`nodex show <primitive> --design ${config.language}\`, and install it with
  \`nodex add <primitive>\`. Read the delivered component's props before using it.
- Create a custom replacement only when no suitable primitive exists or a
  concrete functional or accessibility gap prevents reuse or composition.
  Use semantic HTML and language tokens for layouts and UI the primitives do
  not cover.
- Add more with \`nodex add ${config.language}/<component>\`, and search what is
  available with \`nodex search --design ${config.language}\`.
- Components accept real data through typed React props. Example datasets stay
  in the registry. Import the token stylesheet once at the application entry.
- \`nodex lint\` checks explicit source token references. Rendering, interactions,
  responsiveness and accessibility still need application verification.
<!-- nodex:end -->
`;
}

/** Only replace the section nodex owns; retain all other project instructions. */
export function withAgentsSnippet(existing: string | undefined, snippet: string): string {
  const source = existing ?? '# AGENTS.md\n';
  const start = source.indexOf('<!-- nodex:start -->');
  const end = source.indexOf('<!-- nodex:end -->', start);
  if (start !== -1 && end !== -1) {
    return `${source.slice(0, start)}${snippet.trimEnd()}${source.slice(end + '<!-- nodex:end -->'.length)}`;
  }
  return `${source.trimEnd()}\n\n${snippet}`;
}
