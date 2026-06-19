'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, WarningCircle, XCircle, PencilSimple, SpinnerGap } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
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
            className="bg-white dark:bg-[#1a1a1c] rounded-xl w-full max-w-lg border border-neutral-200 dark:border-neutral-800"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 p-5 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center',
                  lockToType === 'MODIFICATIONS'
                    ? 'bg-[#F8F0E0] dark:bg-[#B7791F]/15'
                    : 'bg-[#F8EAE7] dark:bg-[#C4503B]/15'
                )}>
                  <WarningCircle className={cn(
                    'w-5 h-5',
                    lockToType === 'MODIFICATIONS'
                      ? 'text-[#B7791F] dark:text-[#D2992F]'
                      : 'text-[#C4503B] dark:text-[#E0664D]'
                  )} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
                    {lockToType === 'MODIFICATIONS'
                      ? 'Pedir cambios al propietario'
                      : lockToType === 'DEFINITIVE'
                        ? 'Rechazar contrato definitivamente'
                        : 'Rechazar contrato'}
                  </h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {lockToType === 'MODIFICATIONS'
                      ? 'El propietario recibirá tu pedido y podrá corregir el contrato.'
                      : lockToType === 'DEFINITIVE'
                        ? 'Esta acción cierra el proceso definitivamente.'
                        : 'Indicá cómo querés continuar el proceso'}
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

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Solo mostramos el selector cuando el caller NO fijó el tipo.
                  Cuando se abre desde un botón específico ("Pedir cambios" / "Rechazar definitivamente"),
                  mostramos solo un banner explicativo en vez del radio. */}
              {!lockToType && (
                <div className="space-y-2">
                  <RejectOption
                    selected={type === 'MODIFICATIONS'}
                    onClick={() => setType('MODIFICATIONS')}
                    icon={PencilSimple}
                    title="Pedir modificaciones"
                    description="El propietario puede editar los términos y volver a enviarlo. El proceso continúa."
                    accent="amber"
                  />
                  <RejectOption
                    selected={type === 'DEFINITIVE'}
                    onClick={() => setType('DEFINITIVE')}
                    icon={XCircle}
                    title="Rechazo definitivo"
                    description="El contrato se cancela y el proceso termina. Para retomarlo habría que crear una nueva aplicación."
                    accent="rose"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-xs font-medium text-foreground">
                  Motivo <span className="text-[#C4503B]">*</span>
                </label>
                <textarea
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
                    'w-full px-3 py-2 rounded-md border bg-background text-sm resize-none',
                    reasonError
                      ? 'border-[#C4503B]/30 dark:border-[#C4503B]/40 focus:ring-[#C4503B]'
                      : 'border-border focus:ring-2 focus:ring-[#1A40FF] dark:focus:ring-[#1A40FF]/40'
                  )}
                />
                <div className="flex items-center justify-between">
                  {reasonError ? (
                    <p className="text-xs text-[#C4503B]">{reasonError}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Mínimo {REASON_MIN} caracteres. El propietario va a verlo.
                    </p>
                  )}
                  <p className={cn(
                    'text-xs tabular-nums',
                    reasonTrimmed.length > REASON_MAX ? 'text-[#C4503B]' : 'text-muted-foreground'
                  )}>
                    {reasonTrimmed.length}/{REASON_MAX}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                  type === 'DEFINITIVE'
                    ? 'bg-[#C4503B] hover:bg-[#C4503B]'
                    : 'bg-[#B7791F] hover:bg-[#B7791F]'
                )}
              >
                {isSubmitting && <SpinnerGap className="w-4 h-4 animate-spin" />}
                {type === 'DEFINITIVE' ? 'Rechazar definitivamente' : 'Enviar cambios solicitados'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Subcomponent ──────────────────────────────────────────────────────────

function RejectOption({
  selected,
  onClick,
  icon: Icon,
  title,
  description,
  accent,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ElementType;
  title: string;
  description: string;
  accent: 'amber' | 'rose';
}) {
  const accentClasses = selected
    ? accent === 'amber'
      ? 'border-[#B7791F]/30 bg-[#F8F0E0] dark:bg-[#B7791F]/15'
      : 'border-[#C4503B]/30 bg-[#F8EAE7] dark:bg-[#C4503B]/15'
    : 'border-border hover:border-neutral-300 dark:hover:border-neutral-600';

  const iconClasses = accent === 'amber'
    ? 'text-[#B7791F] dark:text-[#D2992F]'
    : 'text-[#C4503B] dark:text-[#E0664D]';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left p-3 rounded-xl border transition-colors flex items-start gap-3',
        accentClasses
      )}
    >
      <div className={cn(
        'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
        selected
          ? accent === 'amber' ? 'border-[#B7791F]/30' : 'border-[#C4503B]/30'
          : 'border-neutral-300 dark:border-neutral-600'
      )}>
        {selected && (
          <div className={cn(
            'w-2.5 h-2.5 rounded-full',
            accent === 'amber' ? 'bg-[#B7791F]' : 'bg-[#C4503B]'
          )} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <Icon className={cn('w-4 h-4', iconClasses)} />
          <p className="text-sm font-semibold text-foreground">{title}</p>
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}
