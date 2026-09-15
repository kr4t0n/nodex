'use client';

import { useId } from 'react';
import type { ComponentPropsWithRef, ReactNode } from 'react';
import './component.css';

export type SelectProps = ComponentPropsWithRef<'select'> & {
  label?: ReactNode;
  autoWidth?: boolean;
  wrapperClassName?: string;
};

/** Native options retain keyboard navigation, form submission, and the platform picker. */
export function Select({ label, autoWidth = false, id, className = '', wrapperClassName = '', ...props }: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  return (
    <div className={`nx-field ${wrapperClassName}`.trim()}>
      {(label !== undefined && label !== null) && <label className="nx-field__label" htmlFor={selectId}>{label}</label>}
      <select {...props} id={selectId} className={`nx-select${autoWidth ? ' nx-select--auto' : ''} ${className}`.trim()} />
    </div>
  );
}
