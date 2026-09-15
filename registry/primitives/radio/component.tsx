import type { ComponentPropsWithRef, ReactNode } from 'react';
import './component.css';

export type RadioProps = Omit<ComponentPropsWithRef<'input'>, 'type' | 'children'> & {
  label: ReactNode;
  name: string;
  wrapperClassName?: string;
};

/** Radios in one group must share a name, distinct from other groups on the page. */
export function Radio({ label, disabled, className = '', wrapperClassName = '', ...props }: RadioProps) {
  return (
    <label className={`nx-choice${disabled ? ' nx-choice--disabled' : ''} ${wrapperClassName}`.trim()}>
      <input {...props} className={`nx-radio ${className}`.trim()} type="radio" disabled={disabled} />
      {label}
    </label>
  );
}

export type RadioGroupProps = ComponentPropsWithRef<'div'> & { orientation?: 'horizontal' | 'vertical' };

export function RadioGroup({ orientation = 'vertical', className = '', ...props }: RadioGroupProps) {
  return <div {...props} role="radiogroup" aria-orientation={orientation} className={`nx-choice-group${orientation === 'horizontal' ? ' nx-choice-group--row' : ''} ${className}`.trim()} />;
}
