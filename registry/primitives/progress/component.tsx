'use client';

import { useId } from 'react';
import type { ComponentPropsWithRef, ReactNode } from 'react';
import './component.css';

export type ProgressProps = Omit<ComponentPropsWithRef<'progress'>, 'max' | 'value'> & {
  label: ReactNode;
  value?: number;
  max?: number;
  valueLabel?: ReactNode;
  quiet?: boolean;
  thick?: boolean;
  wrapperClassName?: string;
};

/** Omit value for an indeterminate progress indicator. */
export function Progress({ label, value, max = 100, valueLabel, quiet = false, thick = false, id, className = '', wrapperClassName = '', ...props }: ProgressProps) {
  const generatedId = useId();
  const progressId = id ?? generatedId;
  const validMax = Number.isFinite(max) && max > 0 ? max : 100;
  const validValue = value !== undefined && Number.isFinite(value) ? Math.min(validMax, Math.max(0, value)) : undefined;
  const display = valueLabel ?? (validValue === undefined ? 'Unknown' : `${Math.round(validValue / validMax * 100)}%`);
  return (
    <div className={`nx-progress-field ${wrapperClassName}`.trim()}>
      <div className="nx-progress-label"><label htmlFor={progressId}>{label}</label><span>{display}</span></div>
      <progress {...props} id={progressId} className={`nx-progress${quiet ? ' nx-progress--quiet' : ''}${thick ? ' nx-progress--thick' : ''} ${className}`.trim()} max={validMax} value={validValue} />
    </div>
  );
}
