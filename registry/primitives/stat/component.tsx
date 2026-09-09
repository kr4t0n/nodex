import type { ComponentPropsWithRef, ReactNode } from 'react';
import './component.css';

export type StatProps = ComponentPropsWithRef<'div'> & {
  label: ReactNode;
  value: ReactNode;
  unit?: ReactNode;
  note?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  delta?: { direction: 'up' | 'down' | 'flat'; label: ReactNode; strong?: boolean };
};

export function Stat({ label, value, unit, note, size = 'md', delta, className = '', children, ...props }: StatProps) {
  return (
    <div {...props} className={`nx-stat${size !== 'md' ? ` nx-stat--${size}` : ''} ${className}`.trim()}>
      <span className="nx-stat__label">{label}</span>
      <span className="nx-stat__value">{value}{(unit !== undefined && unit !== null) && <span className="nx-stat__unit">{unit}</span>}</span>
      {delta && <span className={`nx-stat__delta nx-stat__delta--${delta.direction}${delta.strong ? ' nx-stat__delta--strong' : ''}`}>{delta.label}</span>}
      {(note !== undefined && note !== null) && <span className="nx-stat__note">{note}</span>}
      {children}
    </div>
  );
}

export type StatGroupProps = ComponentPropsWithRef<'div'> & { variant?: 'default' | 'ruled' | 'stack' };

export function StatGroup({ variant = 'default', className = '', ...props }: StatGroupProps) {
  return <div {...props} className={`nx-stat-group${variant !== 'default' ? ` nx-stat-group--${variant}` : ''} ${className}`.trim()} />;
}
