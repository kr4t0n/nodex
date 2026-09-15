import type { ComponentPropsWithRef } from 'react';
import './component.css';

export type TableProps = ComponentPropsWithRef<'table'> & { interactive?: boolean };

/** interactive styles rows; put real links or buttons in cells for keyboard interaction. */
export function Table({ interactive = false, className = '', ...props }: TableProps) {
  return <table {...props} className={`nx-table${interactive ? ' nx-table--interactive' : ''} ${className}`.trim()} />;
}

export function TableCaption(props: ComponentPropsWithRef<'caption'>) {
  return <caption {...props} />;
}

export function TableHeader(props: ComponentPropsWithRef<'thead'>) {
  return <thead {...props} />;
}

export function TableBody(props: ComponentPropsWithRef<'tbody'>) {
  return <tbody {...props} />;
}

export type TableRowProps = ComponentPropsWithRef<'tr'> & { strong?: boolean };

export function TableRow({ strong = false, className = '', ...props }: TableRowProps) {
  return <tr {...props} className={`${strong ? 'nx-row--strong' : ''} ${className}`.trim() || undefined} />;
}

export type TableHeadProps = ComponentPropsWithRef<'th'> & { numeric?: boolean };

export function TableHead({ numeric = false, scope = 'col', className = '', ...props }: TableHeadProps) {
  return <th {...props} scope={scope} className={`${numeric ? 'nx-num' : ''} ${className}`.trim() || undefined} />;
}

export type TableCellProps = ComponentPropsWithRef<'td'> & { numeric?: boolean; quiet?: boolean };

export function TableCell({ numeric = false, quiet = false, className = '', ...props }: TableCellProps) {
  return <td {...props} className={[numeric && 'nx-num', quiet && 'nx-cell--quiet', className].filter(Boolean).join(' ') || undefined} />;
}
