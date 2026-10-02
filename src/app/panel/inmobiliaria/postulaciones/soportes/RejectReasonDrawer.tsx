'use client';

import { useEffect, useState } from 'react';
import { WarningCircle } from '@phosphor-icons/react';
import { Button } from '@/components/ui';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
} from '@/components/ui/sheet';

interface RejectReasonDrawerProps {
  open: boolean;
  /** Name of the document being rejected — shown for context. */
  documentName?: string;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

/**
 * Cajón para escribir el motivo OBLIGATORIO del rechazo. Es el `Sheet`
 * flotante del producto (DESIGN.md §4): Radix pone el portal, el foco, Esc y
 * el bloqueo del scroll; `SmoothScroll` frena Lenis mientras está abierto.
 */
export function RejectReasonDrawer({
  open,
  documentName,
  isSubmitting,
  onClose,
  onConfirm,
}: RejectReasonDrawerProps) {
  const [reason, setReason] = useState('');

  // El campo arranca vacío cada vez que se abre.
  useEffect(() => {
    if (open) setReason('');
  }, [open]);

  const trimmed = reason.trim();
  const canSubmit = trimmed.length > 0 && !isSubmitting;

  return (
    <Sheet open={open} onOpenChange={(abierto) => !abierto && onClose()}>
      <SheetContent side="right" size="sm" aria-describedby={undefined}>
        <SheetHeader
          leading={
            <div className="w-9 h-9 rounded-md bg-danger-soft flex items-center justify-center flex-shrink-0">
              <WarningCircle className="w-5 h-5 text-danger" />
            </div>
          }
          title="Rechazar documento"
          description={documentName ? <span className="block truncate">{documentName}</span> : undefined}
        />

        <SheetBody className="space-y-2">
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
        </SheetBody>

        <SheetFooter>
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
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
