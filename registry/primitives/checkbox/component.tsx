'use client';

import type { ComponentPropsWithRef, ReactNode } from 'react';
import './component.css';

export type CheckboxProps = Omit<ComponentPropsWithRef<'input'>, 'type' | 'children'> & {
  label: ReactNode;
  indeterminate?: boolean;
  wrapperClassName?: string;
};

/** Indeterminate is controlled by the caller; update it together with checked in onChange. */
export function Checkbox({ label, indeterminate = false, disabled, ref, className = '', wrapperClassName = '', ...props }: CheckboxProps) {
  return (
    <label className={`nx-choice${disabled ? ' nx-choice--disabled' : ''} ${wrapperClassName}`.trim()}>
      <input
        {...props}
        ref={(element) => {
          if (element) element.indeterminate = indeterminate;
          if (typeof ref === 'function') return ref(element);
          if (ref) ref.current = element;
        }}
        className={`nx-checkbox ${className}`.trim()}
        type="checkbox"
        disabled={disabled}
        aria-checked={indeterminate ? 'mixed' : props['aria-checked']}
        data-indeterminate={indeterminate ? 'true' : undefined}
      />
      {label}
    </label>
  );
}

export function CheckboxGroup({ className = '', ...props }: ComponentPropsWithRef<'div'>) {
  return <div {...props} className={`nx-choice-group ${className}`.trim()} />;
}
