'use client';

import { useEffect, useId, useRef } from 'react';
import type { ComponentPropsWithRef, ReactNode } from 'react';
import './component.css';

export type DialogProps = Omit<ComponentPropsWithRef<'dialog'>, 'title'> & {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  onOpenChange?: (open: boolean) => void;
  modal?: boolean;
  inline?: boolean;
  wide?: boolean;
};

/**
 * Control open with onOpenChange, or omit open and use the native dialog ref.
 * Modal dialogs use the browser's top layer, focus management, and Escape handling.
 * inline is for a visible, nonmodal specimen in documentation.
 */
export function Dialog({ title, description, actions, open, onOpenChange, modal = true, inline = false, wide = false, className = '', children, ref, onClose, onCancel, ...props }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || inline || open === undefined) return;
    if (open && !dialog.open) {
      if (modal) dialog.showModal();
      else dialog.show();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, modal, inline]);

  return (
    <dialog
      {...props}
      ref={(element) => {
        dialogRef.current = element;
        if (typeof ref === 'function') return ref(element);
        if (ref) ref.current = element;
      }}
      open={inline ? open : undefined}
      className={`nx-dialog${inline ? ' nx-dialog--inline' : ''}${wide ? ' nx-dialog--wide' : ''} ${className}`.trim()}
      aria-labelledby={props['aria-labelledby'] ?? titleId}
      aria-describedby={props['aria-describedby'] ?? ((description !== undefined && description !== null) ? descriptionId : undefined)}
      onClose={(event) => {
        onClose?.(event);
        if (open !== false) onOpenChange?.(false);
      }}
      onCancel={(event) => {
        onCancel?.(event);
        if (!event.defaultPrevented && open !== undefined && onOpenChange) {
          event.preventDefault();
          onOpenChange(false);
        }
      }}
    >
      <div className="nx-dialog__body">
        <h2 className="nx-dialog__title" id={titleId}>{title}</h2>
        {(description !== undefined && description !== null) && <p className="nx-dialog__sub" id={descriptionId}>{description}</p>}
        {children}
      </div>
      {(actions !== undefined && actions !== null) && <div className="nx-dialog__actions">{actions}</div>}
    </dialog>
  );
}

export type DialogActionProps = ComponentPropsWithRef<'button'> & { confirm?: boolean };

export function DialogAction({ confirm = false, type = 'button', className = '', ...props }: DialogActionProps) {
  return <button {...props} type={type} className={`nx-dialog__action${confirm ? ' nx-dialog__action--confirm' : ''} ${className}`.trim()} />;
}
