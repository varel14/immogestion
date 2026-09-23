import { AlertTriangle } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './Button.js';
import { Modal } from './Modal.js';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** Champ facultatif affiché sous le message (ex. : motif d'annulation). */
  children?: ReactNode;
}

/** Demande de confirmation avant une action sensible. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className={`mt-0.5 h-5 w-5 shrink-0 ${danger ? 'text-red-500' : 'text-amber-500'}`} />
        <p>{message}</p>
      </div>
      {children && <div className="mt-4">{children}</div>}
    </Modal>
  );
}
