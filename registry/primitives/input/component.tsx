'use client';

import { useId } from 'react';
import type { ComponentPropsWithRef, ReactNode } from 'react';
import './component.css';

export type InputProps = Omit<ComponentPropsWithRef<'input'>, 'children'> & {
  label?: ReactNode;
  help?: ReactNode;
  error?: ReactNode;
  wrapperClassName?: string;
};

/** Label and help IDs are stable across hydration and unique across instances. */
export function Input({ label, help, error, id, className = '', wrapperClassName = '', 'aria-describedby': describedBy, 'aria-invalid': invalid, ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hasError = (error !== undefined && error !== null) && error !== false;
  const description = [describedBy, (help !== undefined && help !== null) && `${inputId}-help`, hasError && `${inputId}-error`].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`nx-field ${wrapperClassName}`.trim()} data-invalid={hasError || invalid === true || invalid === 'true' ? 'true' : undefined}>
      {(label !== undefined && label !== null) && <label className="nx-field__label" htmlFor={inputId}>{label}</label>}
      <input {...props} id={inputId} className={`nx-input ${className}`.trim()} aria-invalid={hasError ? true : invalid} aria-describedby={description} />
      {(help !== undefined && help !== null) && <p className="nx-field__help" id={`${inputId}-help`}>{help}</p>}
      {hasError && <p className="nx-field__error" id={`${inputId}-error`}>{error}</p>}
    </div>
  );
}
