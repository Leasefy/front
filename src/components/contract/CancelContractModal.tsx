'use client';

import { useState, useEffect } from 'react';
import { Prohibit } from '@phosphor-icons/react';
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
  /**
   * QA-CONT-95 (D-11): ¿el contrato salió de una postulación? Sin ella (un
   * contrato armado a mano) no hay «aplicación» que cerrar.
   */
  conPostulacion?: boolean;
}

export function CancelContractModal({
  open,
  onClose,
  onConfirm,
  isSubmitting = false,
  actor = 'landlord',
  conPostulacion = true,
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
      {/* Destructiva: el medallón rojo reemplaza al chip hecho a mano, y lo que
          se pierde va en la descripción (antes, repetido en un recuadro rojo). */}
      <DialogContent
        variant="destructive"
        icon={<Prohibit weight="bold" />}
        data-testid="cancelar-contrato-dialog"
      >
        <DialogHeader>
          <DialogTitle>Cancelar contrato</DialogTitle>
          <DialogDescription>
            {/* QA-CONT-95 (D-11): «postulación», no «aplicación»; y lo que
                pasa con el inmueble, que es lo que importa al cancelar. */}
            {conPostulacion
              ? `El contrato se cancela, el inmueble vuelve a quedar disponible y la postulación queda cerrada; no se puede deshacer. Si quieres volver a intentar con el mismo ${otherParty}, vas a tener que crear una postulación nueva.`
              : 'El contrato se cancela y el inmueble vuelve a quedar disponible; no se puede deshacer.'}
          </DialogDescription>
        </DialogHeader>

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
            variant="outline"
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
          >
            Cancelar contrato
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
