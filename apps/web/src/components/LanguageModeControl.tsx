import { MoonIcon, SunIcon } from '@phosphor-icons/react';
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
    <button
      type="button"
      role="switch"
      aria-label="Dark mode"
      aria-checked={mode === 'dark'}
      className="group relative inline-flex h-[1.5em] min-h-[24px] w-[2.75em] min-w-[24px] shrink-0 cursor-pointer items-center rounded-[var(--nx-radius-pill)] bg-transparent p-0 [font-family:var(--nx-font-ui)] text-[length:var(--nx-type-control-size)] leading-[var(--nx-type-control-lineHeight)] text-[var(--nx-ink)] focus-visible:outline-[length:var(--nx-stroke-hairline)] focus-visible:outline-offset-2 focus-visible:outline-[var(--nx-ink)]"
      onClick={() => onChange(mode === 'dark' ? 'light' : 'dark')}
    >
      <span
        aria-hidden="true"
        data-mode-track
        className="absolute inset-x-0 top-1/2 h-[1.5em] -translate-y-1/2 rounded-[var(--nx-radius-pill)] border-[length:var(--nx-stroke-hairline)] border-[var(--nx-ink)] bg-[var(--nx-fieldFill)] group-aria-checked:bg-[var(--nx-selectionFill)]"
      >
        <span
          data-mode-thumb
          className="absolute top-1/2 left-[0.125em] flex size-[1.125em] -translate-y-1/2 items-center justify-center rounded-full bg-[var(--nx-ink)] text-[var(--nx-fieldFill)] transition-[left] duration-[var(--nx-motion-toggle-duration)] ease-[var(--nx-motion-toggle-easing)] group-aria-checked:left-[calc(100%-1.25em)] group-aria-checked:bg-[var(--nx-selectionText)] group-aria-checked:text-[var(--nx-selectionFill)] motion-reduce:transition-none forced-colors:bg-[CanvasText] forced-colors:text-[Canvas] forced-colors:forced-color-adjust-none forced-colors:group-aria-checked:bg-[CanvasText] forced-colors:group-aria-checked:text-[Canvas]"
        >
          {mode === 'dark' ? (
            <MoonIcon
              data-mode-icon="moon"
              size="0.875em"
              weight="bold"
              aria-hidden="true"
              focusable="false"
            />
          ) : (
            <SunIcon
              data-mode-icon="sun"
              size="0.875em"
              weight="bold"
              aria-hidden="true"
              focusable="false"
            />
          )}
        </span>
      </span>
    </button>
  );
}
