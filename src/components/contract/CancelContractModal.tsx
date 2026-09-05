'use client';

import { useState, useEffect } from 'react';
import { WarningCircle } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

const REASON_MAX = 2000;

interface CancelContractModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string | undefined) => void | Promise<void>;
  isSubmitting?: boolean;
  /** Rol del usuario actual — cambia el copy ("tu" vs "el propietario"). */
  actor?: 'landlord' | 'tenant';
}

export function CancelContractModal({
  open,
  onClose,
  onConfirm,
  isSubmitting = false,
  actor = 'landlord',
}: CancelContractModalProps) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!open) setReason('');
  }, [open]);

  const reasonTrimmed = reason.trim();
  const tooLong = reasonTrimmed.length > REASON_MAX;
  const canSubmit = !tooLong && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await onConfirm(reasonTrimmed.length > 0 ? reasonTrimmed : undefined);
  };

  const otherParty = actor === 'landlord' ? 'inquilino' : 'propietario';

  return (
    <Dialog
      open={open}
      onOpenChange={(abierto) => {
        if (!abierto && !isSubmitting) onClose();
      }}
    >
      <DialogContent data-testid="cancelar-contrato-dialog">
        <DialogHeader>
          {/* Chip + título + descripción como UN hijo de la cabecera: el header
              del DS apila sus hijos en columna y pone la ✕ a la derecha solo. */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-danger-soft flex items-center justify-center shrink-0">
              <WarningCircle className="w-5 h-5 text-danger" />
            </div>
            <div className="min-w-0">
              <DialogTitle>Cancelar contrato</DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                Esta acción es terminal y no se puede deshacer
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="rounded-lg border border-danger/30 bg-danger-soft p-3">
          <p className="text-sm text-danger">
            Al cancelar, el contrato termina y la aplicación asociada queda cerrada.
            Si querés volver a intentar con el mismo {otherParty}, vas a tener que crear una aplicación nueva.
          </p>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-fg">
            Motivo <span className="text-fg-muted font-normal">(opcional)</span>
          </label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={`El ${otherParty} va a recibir una notificación con este mensaje.`}
            rows={3}
            maxLength={REASON_MAX}
            disabled={isSubmitting}
            className={cn(
              'resize-none',
              tooLong && 'border-danger focus-visible:ring-danger/30'
            )}
          />
          <div className="flex items-center justify-end">
            <p className={cn(
              'text-xs tabular-nums',
              tooLong ? 'text-danger' : 'text-fg-muted'
            )}>
              {reasonTrimmed.length}/{REASON_MAX}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            hideArrow
            onClick={onClose}
            disabled={isSubmitting}
          >
            Volver
          </Button>
          <Button
            type="button"
            variant="destructive"
            hideArrow
            onClick={handleSubmit}
            disabled={!canSubmit}
            isLoading={isSubmitting}
            className="gap-2"
          >
            Cancelar contrato
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
