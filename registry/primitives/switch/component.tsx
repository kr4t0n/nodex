import type { ComponentPropsWithRef, ReactNode } from 'react';
import './component.css';

export type SwitchProps = Omit<ComponentPropsWithRef<'input'>, 'type' | 'children' | 'role'> & {
  label: ReactNode;
  spread?: boolean;
  wrapperClassName?: string;
};

/** A native checkbox announced as a switch, for settings that take effect immediately. */
export function Switch({ label, spread = false, disabled, className = '', wrapperClassName = '', ...props }: SwitchProps) {
  return (
    <label className={`nx-choice${spread ? ' nx-choice--spread' : ''}${disabled ? ' nx-choice--disabled' : ''} ${wrapperClassName}`.trim()}>
      {spread && label}
      <input {...props} className={`nx-switch ${className}`.trim()} type="checkbox" role="switch" disabled={disabled} />
      {!spread && label}
    </label>
  );
}

export function SwitchGroup({ className = '', ...props }: ComponentPropsWithRef<'div'>) {
  return <div {...props} className={`nx-choice-group ${className}`.trim()} />;
}
