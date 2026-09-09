/** Pure checks shared by the registry build and the dependency-free CLI. */
export interface LanguageRules {
  palette: string[];
  lineMax: number;
  tokenNames: string[];
  background?: string;
}

export interface Finding {
  rule: 'palette' | 'tokens' | 'stroke' | 'motion' | 'determinism';
  severity: 'error' | 'warning';
  message: string;
}

export interface Source {
  tsx?: string;
  css?: string;
}

export interface RenderedMark {
  fill: string;
  stroke: string;
  /** Screen-space width after the renderer's transforms. */
  strokeWidth: number;
  tag?: string;
}

export interface LintOptions {
  strokeAsArea?: boolean;
}

const COLOR_LITERAL = /#[\da-f]{8}\b|#[\da-f]{6}\b|#[\da-f]{4}\b|#[\da-f]{3}\b|\b(?:rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|hwb)\([^)]*\)/gi;

/**
 * This checks explicit source spellings; it does not execute React, calculate
 * geometry, or prove that arbitrary expressions produce conforming marks.
 * The build supplements it with browser rendering and computed-style checks.
 */
export function lintSource(source: Source, rules: LanguageRules): Finding[] {
  const findings: Finding[] = [];
  const tsx = (source.tsx ?? '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const css = (source.css ?? '').replace(/\/\*[\s\S]*?\*\//g, '');
  const code = `${tsx}\n${css}`;
  const literals = [...new Set(code.match(COLOR_LITERAL) ?? [])];
  if (literals.length) {
    findings.push({ rule: 'palette', severity: 'error', message: `Use language tokens instead of literal colors: ${literals.join(', ')}.` });
  }
  const named = [
    ...code.matchAll(/\b(?:fill|stroke|color|backgroundColor|borderColor)\s*(?:=|:)\s*\{?\s*['"]([a-z]+)['"]/gi),
    ...css.matchAll(/\b(?:fill|stroke|color|background(?:-color)?|border-color|outline-color)\s*:\s*([a-z]+)(?=[\s;},])/gi),
  ].map((match) => match[1]!)
    .filter((name) => !['none', 'transparent', 'currentcolor', 'inherit', 'initial', 'unset', 'revert', 'revert-layer'].includes(name.toLowerCase()));
  if (named.length) {
    findings.push({ rule: 'palette', severity: 'error', message: `Use language tokens instead of named paint colors: ${[...new Set(named)].join(', ')}.` });
  }
  const known = new Set(rules.tokenNames);
  // --nx-* is reserved for language tokens. Local component state uses its own prefix.
  const uses = [...code.matchAll(/var\(\s*(--nx-[\w-]+)/g), ...code.matchAll(/(--nx-[\w-]+)\s*['"]?\s*:/g)];
  const missing = [...new Set(uses.map((match) => match[1]!))]
    .filter((name) => !known.has(name));
  if (missing.length) {
    findings.push({ rule: 'tokens', severity: 'error', message: `Unknown language token(s): ${missing.join(', ')}.` });
  }
  if (/\bMath\.random\s*\(/.test(tsx)) {
    findings.push({ rule: 'determinism', severity: 'error', message: 'Use deterministic example data; Math.random() makes previews irreproducible.' });
  }
  if (/\banimation(?:-name)?\s*:\s*(?!none\b)/.test(css) && !/prefers-reduced-motion/.test(css)) {
    findings.push({ rule: 'motion', severity: 'error', message: 'CSS animation needs a prefers-reduced-motion guard.' });
  }
  const enabledAnimation = [...tsx.matchAll(/\bisAnimationActive\s*=\s*\{([^}]*)\}/g)]
    .some((match) => match[1]?.trim() !== 'false');
  if (enabledAnimation
      && !/use(?:ReducedMotion|PrefersReducedMotion|ChartMotion)|prefers-reduced-motion/.test(tsx)) {
    findings.push({ rule: 'motion', severity: 'error', message: 'Chart animation needs reduced-motion handling.' });
  }
  return findings;
}

/** Normalize browser RGB and token hex colors to a comparable opaque hex. */
export function normalizeColor(color: string): string | undefined {
  const value = color.trim().toLowerCase();
  if (!value || value === 'none' || value === 'transparent') return undefined;
  if (/^#[\da-f]{3,4}$/.test(value)) {
    const chars = value.slice(1).split('').map((char) => char + char).join('');
    if (chars.length === 8 && chars.slice(6) === '00') return undefined;
    return `#${chars.slice(0, 6)}`.toUpperCase();
  }
  if (/^#[\da-f]{6}(?:[\da-f]{2})?$/.test(value)) {
    if (value.length === 9 && value.slice(7) === '00') return undefined;
    return value.slice(0, 7).toUpperCase();
  }
  const rgb = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+)%?)?\s*\)$/.exec(value);
  if (rgb) {
    if (rgb[4] !== undefined && Number(rgb[4]) === 0) return undefined;
    return `#${rgb.slice(1, 4).map((channel) => Math.round(Number(channel)).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
  }
  // Unknown output is reported rather than accepted as though it were a token.
  return value;
}

export function lintRendered(marks: RenderedMark[], rules: LanguageRules, options: LintOptions = {}): Finding[] {
  const findings: Finding[] = [];
  const legal = new Set(rules.palette.map(normalizeColor));
  const unexpected = new Set<string>();
  const over = new Set<number>();
  const background = rules.background ? normalizeColor(rules.background) : undefined;
  for (const mark of marks) {
    const stroke = normalizeColor(mark.stroke);
    for (const color of [normalizeColor(mark.fill), stroke]) {
      if (color && !color.startsWith('url(') && !legal.has(color)) unexpected.add(color);
    }
    if (!options.strokeAsArea && stroke && stroke !== background && mark.tag !== 'text' && mark.strokeWidth > rules.lineMax + 0.001) {
      over.add(Math.round(mark.strokeWidth * 1000) / 1000);
    }
  }
  if (unexpected.size) findings.push({ rule: 'palette', severity: 'error', message: `Rendered color(s) outside the language tokens: ${[...unexpected].join(', ')}.` });
  if (over.size) findings.push({ rule: 'stroke', severity: 'error', message: `Rendered stroke-width ${[...over].join(', ')} exceeds lineMax ${rules.lineMax}px.` });
  return findings;
}

/** Uses the same token naming convention as the generated CSS layer. */
export function rulesFromTokens(tokens: Record<string, unknown>): LanguageRules {
  const palette = new Set<string>();
  const tokenNames = new Set<string>();
  const walk = (value: unknown, prefix: string): void => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      for (const [key, entry] of Object.entries(value)) {
        if (!key.startsWith('$')) walk(entry, prefix ? `${prefix}-${key}` : key);
      }
    } else if (typeof value === 'string' || typeof value === 'number') {
      tokenNames.add(`--nx-${prefix}`);
      if (typeof value === 'string' && /^(?:#|rgba?\(|hsla?\(|oklch\()/i.test(value)) {
        const color = normalizeColor(value);
        if (color) palette.add(color);
      }
    }
  };
  for (const [key, value] of Object.entries(tokens)) {
    if (key.startsWith('$') || key === 'ramp') continue;
    walk(value, key === 'color' ? '' : key);
  }
  const ramp = tokens.ramp as { steps?: unknown[] } | undefined;
  for (const color of ramp?.steps ?? []) {
    if (typeof color === 'string') {
      const normalized = normalizeColor(color);
      if (normalized) palette.add(normalized);
    }
  }
  const stroke = tokens.stroke as { lineMax?: string | number; hairline?: string | number } | undefined;
  const color = tokens.color as { bg?: string } | undefined;
  return { palette: [...palette], lineMax: Number.parseFloat(String(stroke?.lineMax ?? '1.4')), tokenNames: [...tokenNames], ...(color?.bg ? { background: color.bg } : {}) };
}
