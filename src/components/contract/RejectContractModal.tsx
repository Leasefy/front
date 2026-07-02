'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, WarningCircle, XCircle, PencilSimple } from '@phosphor-icons/react';
import { IconButton, RadioCardGroup, RadioCard } from '@leasefy/cadence';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { RejectionType } from '@/lib/types/contract';

const REASON_MIN = 5;
const REASON_MAX = 2000;

interface RejectContractModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (type: RejectionType, reason: string) => void | Promise<void>;
  isSubmitting?: boolean;
  /**
   * Si viene definido, el modal queda fijado a ese tipo y NO muestra el selector.
   * Útil cuando se abre desde un botón específico "Pedir cambios" o "Rechazar definitivamente".
   */
  lockToType?: RejectionType;
}

export function RejectContractModal({
  open,
  onClose,
  onConfirm,
  isSubmitting = false,
  lockToType,
}: RejectContractModalProps) {
  const [type, setType] = useState<RejectionType>(lockToType ?? 'MODIFICATIONS');
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) {
      setType(lockToType ?? 'MODIFICATIONS');
      setReason('');
      setTouched(false);
    }
  }, [open, lockToType]);

  const reasonTrimmed = reason.trim();
  const reasonError = touched && reasonTrimmed.length < REASON_MIN
    ? `El motivo debe tener al menos ${REASON_MIN} caracteres.`
    : touched && reasonTrimmed.length > REASON_MAX
      ? `El motivo no puede superar ${REASON_MAX} caracteres.`
      : null;

  const canSubmit = reasonTrimmed.length >= REASON_MIN && reasonTrimmed.length <= REASON_MAX && !isSubmitting;

  const handleSubmit = async () => {
    setTouched(true);
    if (!canSubmit) return;
    await onConfirm(type, reasonTrimmed);
  };

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
            className="bg-surface rounded-xl w-full max-w-lg border border-border"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 p-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center',
                  lockToType === 'MODIFICATIONS'
                    ? 'bg-warning-soft'
                    : 'bg-danger-soft'
                )}>
                  <WarningCircle className={cn(
                    'w-5 h-5',
                    lockToType === 'MODIFICATIONS'
                      ? 'text-warning'
                      : 'text-danger'
                  )} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-fg">
                    {lockToType === 'MODIFICATIONS'
                      ? 'Pedir cambios al propietario'
                      : lockToType === 'DEFINITIVE'
                        ? 'Rechazar contrato definitivamente'
                        : 'Rechazar contrato'}
                  </h2>
                  <p className="text-xs text-fg-muted mt-0.5">
                    {lockToType === 'MODIFICATIONS'
                      ? 'El propietario recibirá tu pedido y podrá corregir el contrato.'
                      : lockToType === 'DEFINITIVE'
                        ? 'Esta acción cierra el proceso definitivamente.'
                        : 'Indicá cómo querés continuar el proceso'}
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

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Solo mostramos el selector cuando el caller NO fijó el tipo.
                  Cuando se abre desde un botón específico ("Pedir cambios" / "Rechazar definitivamente"),
                  mostramos solo un banner explicativo en vez del radio. */}
              {!lockToType && (
                <RadioCardGroup
                  className="space-y-2"
                  value={type}
                  onValueChange={(v) => setType(v as RejectionType)}
                >
                  <RadioCard
                    value="MODIFICATIONS"
                    label={
                      <span className="flex items-center gap-1.5">
                        <PencilSimple className="w-4 h-4 text-warning" />
                        Pedir modificaciones
                      </span>
                    }
                    description="El propietario puede editar los términos y volver a enviarlo. El proceso continúa."
                  />
                  <RadioCard
                    value="DEFINITIVE"
                    label={
                      <span className="flex items-center gap-1.5">
                        <XCircle className="w-4 h-4 text-danger" />
                        Rechazo definitivo
                      </span>
                    }
                    description="El contrato se cancela y el proceso termina. Para retomarlo habría que crear una nueva aplicación."
                  />
                </RadioCardGroup>
              )}

              <div className="space-y-1">
                <label className="block text-xs font-medium text-fg">
                  Motivo <span className="text-danger">*</span>
                </label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  onBlur={() => setTouched(true)}
                  placeholder={
                    type === 'MODIFICATIONS'
                      ? 'Ej: El depósito es muy alto, propongo reducirlo a 1 mes de renta.'
                      : 'Ej: Decidí no continuar con esta propiedad.'
                  }
                  rows={4}
                  maxLength={REASON_MAX}
                  disabled={isSubmitting}
                  className={cn(
                    'resize-none',
                    reasonError && 'border-danger focus-visible:ring-danger/30'
                  )}
                />
                <div className="flex items-center justify-between">
                  {reasonError ? (
                    <p className="text-xs text-danger">{reasonError}</p>
                  ) : (
                    <p className="text-xs text-fg-muted">
                      Mínimo {REASON_MIN} caracteres. El propietario va a verlo.
                    </p>
                  )}
                  <p className={cn(
                    'text-xs tabular-nums',
                    reasonTrimmed.length > REASON_MAX ? 'text-danger' : 'text-fg-muted'
                  )}>
                    {reasonTrimmed.length}/{REASON_MAX}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-border flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                hideArrow
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                hideArrow
                onClick={handleSubmit}
                disabled={!canSubmit}
                isLoading={isSubmitting}
                className={cn(
                  'gap-2 text-white',
                  type === 'DEFINITIVE'
                    ? 'bg-danger hover:bg-danger/90'
                    : 'bg-warning hover:bg-warning/90'
                )}
              >
                {type === 'DEFINITIVE' ? 'Rechazar definitivamente' : 'Enviar cambios solicitados'}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

