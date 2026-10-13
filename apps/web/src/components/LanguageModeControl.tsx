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
      className="group relative inline-flex shrink-0 cursor-pointer items-center rounded-[var(--nx-radius-pill)] border-y-[length:var(--nx-stroke-hairline)] border-transparent bg-transparent p-[var(--nx-space-controlPadding)] px-0 [font-family:var(--nx-font-ui)] text-[length:var(--nx-type-control-size)] leading-[var(--nx-type-control-lineHeight)] text-[var(--nx-ink)] focus-visible:outline-[length:var(--nx-stroke-hairline)] focus-visible:outline-offset-2 focus-visible:outline-[var(--nx-ink)] forced-colors:border-none"
      onClick={() => onChange(mode === 'dark' ? 'light' : 'dark')}
    >
      {/* Retain the previous control's font-dependent footprint in each mode:
          long chart titles must keep their existing phone wrap points. This
          hidden sizer is neither a visible label nor an accessible name. */}
      <span
        aria-hidden="true"
        className="invisible pr-[calc(2.3em+var(--nx-space-choiceGap))] forced-colors:border-y-[length:var(--nx-stroke-hairline)]"
      >
        {mode === 'dark' ? 'Dark' : 'Light'}
      </span>
      <span
        aria-hidden="true"
        data-mode-track
        className="absolute inset-x-0 top-1/2 h-[2em] -translate-y-1/2 rounded-[var(--nx-radius-pill)] border-[length:var(--nx-stroke-hairline)] border-[var(--nx-ink)] bg-[var(--nx-fieldFill)] group-aria-checked:bg-[var(--nx-selectionFill)]"
      >
        <span
          data-mode-thumb
          className="absolute top-1/2 left-[0.1875em] flex size-[1.5em] -translate-y-1/2 items-center justify-center rounded-full bg-[var(--nx-ink)] text-[var(--nx-fieldFill)] transition-[left] duration-[var(--nx-motion-toggle-duration)] ease-[var(--nx-motion-toggle-easing)] group-aria-checked:left-[calc(100%-1.6875em)] group-aria-checked:bg-[var(--nx-selectionText)] group-aria-checked:text-[var(--nx-selectionFill)] motion-reduce:transition-none forced-colors:bg-[CanvasText] forced-colors:text-[Canvas] forced-colors:forced-color-adjust-none forced-colors:group-aria-checked:bg-[CanvasText] forced-colors:group-aria-checked:text-[Canvas]"
        >
          {mode === 'dark' ? (
            <MoonIcon
              data-mode-icon="moon"
              size="1em"
              weight="bold"
              aria-hidden="true"
              focusable="false"
            />
          ) : (
            <SunIcon
              data-mode-icon="sun"
              size="1em"
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
