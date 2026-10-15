/** Pure token contract shared by the compiler, browser and standalone CLI. */
export type Tokens = Record<string, unknown>;
export type TokenMode = 'light' | 'dark';

function object(value: unknown, label: string): Tokens {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${label} must be an object`);
  return value as Tokens;
}

function keys(value: Tokens): string[] {
  return Object.keys(value).filter((key) => !key.startsWith('$'));
}

function paint(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !value.trim() || /[;{}<>]/.test(value))
    throw new Error(`${label} must be a CSS color without declaration syntax`);
}

/** A mode may replace paint, but cannot add roles or change shared geometry. */
export function resolveTokenModes(tokens: Tokens): {
  light: Tokens;
  dark?: Tokens;
} {
  const { modes, ...light } = tokens;
  if (modes === undefined) return { light };
  const declarations = object(modes, 'modes');
  if (keys(declarations).some((key) => key !== 'dark'))
    throw new Error('modes supports only dark; top-level tokens define light');
  if (declarations.dark === undefined) return { light };
  const dark = object(declarations.dark, 'modes.dark');
  if (keys(dark).some((key) => key !== 'color' && key !== 'ramp'))
    throw new Error('modes.dark may override only color and ramp');
  const baseColors = object(tokens.color, 'color');
  const colors = object(dark.color, 'modes.dark.color');
  if (!keys(colors).length)
    throw new Error('modes.dark.color must override paint');
  for (const key of keys(colors)) {
    if (!Object.hasOwn(baseColors, key))
      throw new Error(`modes.dark.color introduces unknown role ${key}`);
    paint(colors[key], `modes.dark.color.${key}`);
  }
  const ramp = object(dark.ramp, 'modes.dark.ramp');
  if (
    keys(ramp).some((key) => key !== 'steps') ||
    !Array.isArray(ramp.steps) ||
    ramp.steps.length < 2
  )
    throw new Error('modes.dark.ramp must declare at least two steps');
  for (const value of ramp.steps) paint(value, 'modes.dark.ramp.steps');
  return {
    light,
    dark: { ...light, color: { ...baseColors, ...colors }, ramp },
  };
}

export function resolveTokens(
  tokens: Tokens,
  mode: TokenMode = 'light',
): Tokens {
  const resolved = resolveTokenModes(tokens)[mode];
  if (!resolved) throw new Error(`Language does not declare ${mode} mode`);
  return resolved;
}

export function tokenModes(tokens: Tokens): TokenMode[] {
  return resolveTokenModes(tokens).dark ? ['light', 'dark'] : ['light'];
}

/** Explicit language boundaries reset all roles, including nested light scopes. */
export function tokenScope(slug: string): string {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
    throw new Error('Invalid token language slug');
  return `:where(:root:not([data-nx-language]), [data-nx-language="${slug}"])`;
}

/** Retarget every generated rule together; never rewrite just the first root. */
export function scopeTokenCss(
  css: string,
  slug: string,
  selector: string,
): string {
  const scope = tokenScope(slug);
  if (!css.includes(scope))
    throw new Error('Language stylesheet has no token scope');
  return css.replaceAll(scope, `:where(${selector})`);
}
