import type { TokenMode } from '../../../../packages/cli/src/tokens.ts';
import type { Language } from '@/lib/registry.ts';

export function LanguageModeControl({
  language,
  mode,
  onChange,
}: {
  language: Language;
  mode: TokenMode;
  onChange: (mode: TokenMode) => void;
}) {
  if (!language.modes?.some((entry) => entry === 'dark')) return null;
  return (
    <select
      className="nx-select nx-select--auto"
      aria-label="Color mode"
      value={mode}
      onChange={(event) =>
        onChange(event.target.value === 'dark' ? 'dark' : 'light')
      }
    >
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  );
}
