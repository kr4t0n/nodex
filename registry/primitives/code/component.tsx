import type { ComponentPropsWithRef } from 'react';
import './component.css';

export function Code({ className = '', ...props }: ComponentPropsWithRef<'code'>) {
  return <code {...props} className={`nx-code ${className}`.trim()} />;
}

export function Kbd({ className = '', ...props }: ComponentPropsWithRef<'kbd'>) {
  return <kbd {...props} className={`nx-kbd ${className}`.trim()} />;
}

/** Whitespace in children is preserved exactly. */
export function CodeBlock({ className = '', children, ...props }: ComponentPropsWithRef<'pre'>) {
  return <pre {...props} className={`nx-pre ${className}`.trim()}><Code>{children}</Code></pre>;
}

/** A command display. Copy or execution actions must be supplied explicitly as children. */
export function Command({ className = '', ...props }: ComponentPropsWithRef<'div'>) {
  return <div {...props} className={`nx-command ${className}`.trim()} />;
}
