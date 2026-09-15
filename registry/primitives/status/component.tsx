import type { ComponentPropsWithRef, ReactNode } from 'react';
import './component.css';

export type StatusProps = ComponentPropsWithRef<'span'> & {
  state?: 'idle' | 'working' | 'done' | 'failed';
  meta?: ReactNode;
  children: ReactNode;
};

/** Supply a meaningful text label; the geometric mark is only a secondary cue. */
export function Status({ state = 'idle', meta, className = '', children, ...props }: StatusProps) {
  return (
    <span {...props} className={`nx-status nx-status--${state} ${className}`.trim()}>
      <span className="nx-status__mark" aria-hidden="true" />
      {children}
      {(meta !== undefined && meta !== null) && <span className="nx-status__meta">{meta}</span>}
    </span>
  );
}

export type StatusBlockProps = ComponentPropsWithRef<'div'> & { inline?: boolean };

export function StatusBlock({ inline = false, className = '', ...props }: StatusBlockProps) {
  return <div role="status" {...props} className={`nx-status-block${inline ? ' nx-status-block--inline' : ''} ${className}`.trim()} />;
}
