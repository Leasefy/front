'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, WarningCircle } from '@phosphor-icons/react';
import { IconButton } from '@leasefy/cadence';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={isSubmitting ? undefined : onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-surface rounded-lg w-full max-w-lg border border-border"
          >
            <div className="flex items-start justify-between gap-4 p-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-danger-soft flex items-center justify-center">
                  <WarningCircle className="w-5 h-5 text-danger" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-fg">
                    Cancelar contrato
                  </h2>
                  <p className="text-xs text-fg-muted mt-0.5">
                    Esta acción es terminal y no se puede deshacer
                  </p>
                </div>
              </div>
              <IconButton
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                disabled={isSubmitting}
                aria-label="Cerrar"
                icon={<X className="w-5 h-5" />}
              />
            </div>

            <div className="p-5 space-y-4">
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
            </div>

            <div className="p-5 border-t border-border flex items-center justify-end gap-2">
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
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
