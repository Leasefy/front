'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, WarningCircle, SpinnerGap } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

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
            className="bg-white dark:bg-[#1a1a1c] rounded-2xl shadow-xl w-full max-w-lg border border-neutral-200 dark:border-neutral-800"
          >
            <div className="flex items-start justify-between gap-4 p-5 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                  <WarningCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
                    Cancelar contrato
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Esta acción es terminal y no se puede deshacer
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors disabled:opacity-40"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="rounded-xl border border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/20 p-3">
                <p className="text-sm text-rose-800 dark:text-rose-200">
                  Al cancelar, el contrato termina y la aplicación asociada queda cerrada.
                  Si querés volver a intentar con el mismo {otherParty}, vas a tener que crear una aplicación nueva.
                </p>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-foreground">
                  Motivo <span className="text-muted-foreground font-normal">(opcional)</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={`El ${otherParty} va a recibir una notificación con este mensaje.`}
                  rows={3}
                  maxLength={REASON_MAX}
                  disabled={isSubmitting}
                  className={cn(
                    'w-full px-3 py-2 rounded-lg border bg-background text-sm resize-none',
                    tooLong
                      ? 'border-rose-300 dark:border-rose-700'
                      : 'border-border focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/40'
                  )}
                />
                <div className="flex items-center justify-end">
                  <p className={cn(
                    'text-xs tabular-nums',
                    tooLong ? 'text-rose-600' : 'text-muted-foreground'
                  )}>
                    {reasonTrimmed.length}/{REASON_MAX}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting && <SpinnerGap className="w-4 h-4 animate-spin" />}
                Cancelar contrato
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
