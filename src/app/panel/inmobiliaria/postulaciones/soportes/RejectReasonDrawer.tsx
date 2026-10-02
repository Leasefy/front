'use client';

import { useEffect, useState } from 'react';
import { WarningCircle } from '@phosphor-icons/react';
import { Button } from '@/components/ui';
import { Textarea } from '@/components/ui/textarea';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';

/** El tope del motivo: `ReviewDocumentDto.rejectionReason`, `@MaxLength(1000)`. */
export const MAX_LARGO_DEL_MOTIVO_DE_RECHAZO = 1000;
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
  /** Lo que el back dijo del motivo (02-10-2026): va debajo del campo. */
  error?: string | null;
  /** Al escribir de nuevo, el error del back ya no aplica. */
  onCambio?: () => void;
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
  error,
  onCambio,
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
            onChange={(e) => {
              setReason(e.target.value);
              onCambio?.();
            }}
            placeholder="Ej: El documento está ilegible o vencido."
            rows={5}
            autoFocus
            maxLength={MAX_LARGO_DEL_MOTIVO_DE_RECHAZO}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'reject-reason-error' : undefined}
          />
          <ErrorDelCampo id="reject-reason-error" mensaje={error} className="mt-0" />
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
