'use client';

import { useState, useEffect } from 'react';
import { XCircle, PencilSimple } from '@phosphor-icons/react';
import { RadioCardGroup, RadioCard } from '@leasefy/cadence';
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

  // La clase del modal sigue al tipo elegido: pedir cambios no borra nada (el
  // proceso sigue); el rechazo definitivo cierra el proceso.
  const definitivo = type === 'DEFINITIVE';

  return (
    <Dialog
      open={open}
      onOpenChange={(abierto) => {
        // Mientras se envía no se sale (ni con Esc, ni con el velo, ni con la ✕).
        if (!abierto && !isSubmitting) onClose();
      }}
    >
      <DialogContent
        size="md"
        variant={definitivo ? 'destructive' : 'confirm'}
        icon={definitivo ? <XCircle weight="bold" /> : <PencilSimple weight="bold" />}
      >
        <DialogHeader>
          <DialogTitle>
            {lockToType === 'MODIFICATIONS'
              ? 'Pedir cambios al propietario'
              : lockToType === 'DEFINITIVE'
                ? 'Rechazar contrato definitivamente'
                : 'Rechazar contrato'}
          </DialogTitle>
          <DialogDescription>
            {lockToType === 'MODIFICATIONS'
              ? 'El propietario recibirá tu pedido y podrá corregir el contrato.'
              : lockToType === 'DEFINITIVE'
                ? 'El contrato se cancela y el proceso termina. Para retomarlo habría que crear una nueva aplicación.'
                : 'Indica cómo quieres continuar el proceso'}
          </DialogDescription>
        </DialogHeader>

        {/* Solo mostramos el selector cuando el caller NO fijó el tipo.
            Cuando se abre desde un botón específico ("Pedir cambios" / "Rechazar definitivamente"),
            el título y la descripción ya dicen qué pasa. */}
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
          <label htmlFor="motivo-del-rechazo" className="block text-xs font-medium text-fg">
            Motivo <span className="text-danger">*</span>
          </label>
          <Textarea
            id="motivo-del-rechazo"
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
              'text-xs font-mono tabular-nums',
              reasonTrimmed.length > REASON_MAX ? 'text-danger' : 'text-fg-muted'
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
            Cancelar
          </Button>
          <Button
            type="button"
            variant={definitivo ? 'destructive' : 'default'}
            hideArrow
            onClick={handleSubmit}
            disabled={!canSubmit}
            isLoading={isSubmitting}
          >
            {definitivo ? 'Rechazar definitivamente' : 'Enviar cambios solicitados'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

