'use client';

import { useId } from 'react';
import type { ComponentPropsWithRef, ReactNode } from 'react';
import './component.css';

export type TextareaProps = ComponentPropsWithRef<'textarea'> & {
  label?: ReactNode;
  help?: ReactNode;
  error?: ReactNode;
  count?: ReactNode;
  monospace?: boolean;
  autoSize?: boolean;
  wrapperClassName?: string;
};

export function Textarea({ label, help, error, count, monospace = false, autoSize = false, id, className = '', wrapperClassName = '', 'aria-describedby': describedBy, 'aria-invalid': invalid, ...props }: TextareaProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hasError = (error !== undefined && error !== null) && error !== false;
  const description = [describedBy, (help !== undefined && help !== null) && `${inputId}-help`, hasError && `${inputId}-error`].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`nx-field ${wrapperClassName}`.trim()} data-invalid={hasError || invalid === true || invalid === 'true' ? 'true' : undefined}>
      {(label !== undefined && label !== null) && <label className="nx-field__label" htmlFor={inputId}>{label}</label>}
      <textarea
        {...props}
        id={inputId}
        className={`nx-textarea${monospace ? ' nx-textarea--mono' : ''}${autoSize ? ' nx-textarea--auto' : ''} ${className}`.trim()}
        aria-invalid={hasError ? true : invalid}
        aria-describedby={description}
      />
      {(count !== undefined && count !== null) ? <div className="nx-field__foot">
        <span id={(help !== undefined && help !== null) ? `${inputId}-help` : undefined}>{help}</span>
        <span className="nx-field__count">{count}</span>
      </div> : (help !== undefined && help !== null) && <p className="nx-field__help" id={`${inputId}-help`}>{help}</p>}
      {hasError && <p className="nx-field__help" id={`${inputId}-error`}>{error}</p>}
    </div>
  );
}
