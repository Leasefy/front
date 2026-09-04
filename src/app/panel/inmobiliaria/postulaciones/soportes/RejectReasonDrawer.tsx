'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, WarningCircle } from '@phosphor-icons/react';
import { Button } from '@/components/ui';
import { Textarea } from '@/components/ui/textarea';
import { useLenis } from '@/components/providers/SmoothScroll';

interface RejectReasonDrawerProps {
  open: boolean;
  /** Name of the document being rejected — shown for context. */
  documentName?: string;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

/**
 * Canonical side drawer (DESIGN.md §4) for capturing the REQUIRED rejection
 * reason. Follows the Lenis contract: `lenis.stop()` on open + `data-lenis-prevent`
 * on the scrollable body, rendered via `createPortal` to `document.body`.
 */
export function RejectReasonDrawer({
  open,
  documentName,
  isSubmitting,
  onClose,
  onConfirm,
}: RejectReasonDrawerProps) {
  const [reason, setReason] = useState('');
  const [mounted, setMounted] = useState(false);

  const lenis = useLenis();

  // 1. Pause Lenis smooth scroll while open.
  useEffect(() => {
    if (open) lenis.stop();
    else lenis.start();
    return () => lenis.start();
  }, [open, lenis]);

  // 2. Reset the field each time the drawer opens.
  useEffect(() => {
    if (open) setReason('');
  }, [open]);

  // 3. Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // 4. Wait for mount before portalling.
  useEffect(() => setMounted(true), []);

  if (!open || !mounted) return null;

  const trimmed = reason.trim();
  const canSubmit = trimmed.length > 0 && !isSubmitting;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-50 bg-[#14130F]/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-surface shadow-lg flex flex-col animate-in slide-in-from-right duration-300"
        role="dialog"
        aria-modal="true"
        aria-label="Rechazar documento"
      >
        {/* Header */}
        <div className="flex-none flex items-start justify-between gap-4 border-b border-border p-6">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-md bg-danger-soft flex items-center justify-center flex-shrink-0">
              <WarningCircle className="w-5 h-5 text-danger" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-fg">Rechazar documento</h2>
              {documentName && (
                <p className="text-sm text-fg-muted truncate">{documentName}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="p-1.5 rounded-full text-fg-muted hover:text-fg hover:bg-surface-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div
          className="flex-1 overflow-y-auto p-6 space-y-4"
          data-lenis-prevent
          style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
        >
          <div className="space-y-2">
            <label htmlFor="reject-reason" className="text-sm font-medium text-fg">
              Motivo del rechazo
            </label>
            <p className="text-sm text-fg-muted">
              El inquilino verá este mensaje para saber qué corregir.
            </p>
            <Textarea
              id="reject-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: El documento está ilegible o vencido."
              rows={5}
              autoFocus
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex-none flex items-center justify-end gap-2 border-t border-border p-6">
          <Button variant="outline" hideArrow onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            hideArrow
            disabled={!canSubmit}
            isLoading={isSubmitting}
            onClick={() => onConfirm(trimmed)}
          >
            Rechazar documento
          </Button>
        </div>
      </div>
    </>,
    document.body,
  );
}
