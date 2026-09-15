'use client';

import { useId } from 'react';
import type { ComponentPropsWithRef, CSSProperties, ReactNode } from 'react';
import './component.css';

export type SliderProps = Omit<ComponentPropsWithRef<'input'>, 'type' | 'children'> & {
  label: ReactNode;
  valueLabel?: ReactNode;
  hollow?: boolean;
  ticks?: number;
  wrapperClassName?: string;
};

/** A single native range input. valueLabel is presentation; value and onChange control the value. */
export function Slider({ label, valueLabel, hollow = false, ticks, id, className = '', wrapperClassName = '', ...props }: SliderProps) {
  const generatedId = useId();
  const sliderId = id ?? generatedId;
  const tickCount = ticks !== undefined && Number.isFinite(ticks) && ticks > 0 ? Math.floor(ticks) : 0;
  return (
    <div className={`nx-slider-field ${wrapperClassName}`.trim()}>
      <div className="nx-slider-value"><label htmlFor={sliderId}>{label}</label>{(valueLabel !== undefined && valueLabel !== null) && <span>{valueLabel}</span>}</div>
      <input {...props} id={sliderId} className={`nx-slider${hollow ? ' nx-slider--hollow' : ''} ${className}`.trim()} type="range" />
      {tickCount > 0 && <div aria-hidden="true" className="nx-slider-ticks" style={{ '--slider-steps': tickCount } as CSSProperties} />}
    </div>
  );
}
