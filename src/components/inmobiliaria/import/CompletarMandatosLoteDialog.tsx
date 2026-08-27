'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/i18n';
import { toast } from '@/components/ui/toast';
import { useAuth } from '@/lib/auth/use-auth';
import { ApiError } from '@/lib/api/client';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import type { InmuebleSinConsignacion, Propietario, Agente, PropietarioFormData } from '@/lib/types/inmobiliaria';
import { PropietarioSelector } from '@/components/inmobiliaria/PropietarioSelector';
import { AgenteSelector } from '@/components/inmobiliaria/AgenteSelector';
import { persistPropietarioIfNeeded } from '@/components/inmobiliaria/CompletarMandatoDialog';
import { submitMandatosLote, type MandatoLoteResult } from './lib/submitMandatosLote';

/**
 * The end-of-import mandate modal — T-0030 WU-3, Slice A (R1), extended by
 * WU-4 for auto-publish.
 *
 * One shared form (propietario, commission, contract date, agent) applies to
 * EVERY property just imported ("apply to all", per the owner's ruling in
 * the brief — a 30-property import must not face 30 dialogs). Skippable:
 * closing it creates nothing further, matching R2 — the properties stay
 * DRAFT with no mandate, already surfaced by WU-2's portfolio alert.
 *
 * Completing a mandate publishes the property (contract.md T-0030 §3.4,
 * amendment A-1.1) — mandate first, publish second, and only for
 * properties whose mandate actually succeeded. `submitMandatosLote`
 * (via `completeMandatoAndPublish`) does the mandate+publish call per
 * property; this dialog only summarizes the outcomes.
 */
export interface CompletarMandatosLoteDialogProps {
  inmuebles: InmuebleSinConsignacion[];
  propietarios: Propietario[];
  agentes: Agente[];
  /** Skip — closes with no call made. */
  onClose: () => void;
  /** Fired after a submit attempt (any outcome) so the caller can advance. */
  onDone: (result: MandatoLoteResult) => void;
}

const todayISO = () => new Date().toISOString().split('T')[0];

export function CompletarMandatosLoteDialog({
  inmuebles,
  propietarios,
  agentes,
  onClose,
  onDone,
}: CompletarMandatosLoteDialogProps) {
  const { t } = useI18n();
  const { user } = useAuth();

  const [propietarioId, setPropietarioId] = useState<string | null>(null);
  const [newPropietarioData, setNewPropietarioData] = useState<PropietarioFormData | undefined>();
  const [commissionPercent, setCommissionPercent] = useState(10);
  const [contractDate, setContractDate] = useState(todayISO());
  const [agenteId, setAgenteId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (inmuebles.length === 0) return null;

  const isValid = Boolean(propietarioId) && commissionPercent >= 0 && Boolean(contractDate);

  const handleSubmit = async () => {
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);
    setFormError(null);

    try {
      const finalPropietarioId = await persistPropietarioIfNeeded(propietarioId!, newPropietarioData);
      const selectedAgente = agentes.find((a) => a.id === agenteId);

      const result = await submitMandatosLote(inmuebles, {
        propietarioId: finalPropietarioId,
        commissionPercent,
        contractDate,
        agenteUserId: selectedAgente?.userId ?? (agenteId ? undefined : user?.id),
      });

      if (result.failedCount === 0 && result.publishFailedCount === 0) {
        toast.success(t('inmobiliaria.import.confirm.mandateBatch.toasts.allSucceededTitle'), {
          description: t('inmobiliaria.import.confirm.mandateBatch.toasts.allSucceededDesc', {
            count: result.succeededCount,
          }),
        });
      } else if (result.succeededCount === 0) {
        toast.error(t('inmobiliaria.import.confirm.mandateBatch.toasts.allFailedTitle'), {
          description: t('inmobiliaria.import.confirm.mandateBatch.toasts.allFailedDesc'),
        });
      } else if (result.failedCount === 0) {
        // contract.md §3.4, amendment A-1.1 — every mandate is kept; only
        // the publish step failed for some. Report honestly, don't imply a
        // full failure — the mandate is the durable outcome.
        toast.warning(t('inmobiliaria.import.confirm.mandateBatch.toasts.publishPartialTitle'), {
          description: t('inmobiliaria.import.confirm.mandateBatch.toasts.publishPartialDesc', {
            count: result.publishFailedCount,
          }),
        });
      } else {
        toast.warning(t('inmobiliaria.import.confirm.mandateBatch.toasts.partialTitle'), {
          description: t('inmobiliaria.import.confirm.mandateBatch.toasts.partialDesc', {
            succeeded: result.succeededCount,
            failed: result.failedCount,
          }),
        });
      }
      onDone(result);
    } catch (error) {
      // The propietario create/update step itself failed — nothing was
      // submitted yet, so the user can fix the owner and retry.
      const description =
        error instanceof ApiError && error.messages
          ? error.messages.join(' · ')
          : error instanceof Error && error.message
            ? error.message
            : t('inmobiliaria.import.confirm.mandateBatch.toasts.errorDesc');
      setFormError(description);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('inmobiliaria.import.confirm.mandateBatch.title')}</DialogTitle>
          <DialogDescription>
            {t('inmobiliaria.import.confirm.mandateBatch.subtitle', { count: inmuebles.length })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-fg-muted mb-2">
              {t('inmobiliaria.import.confirm.mandateBatch.propertiesListLabel')}
            </label>
            <div
              className="rounded-lg border border-border bg-surface-muted p-3 max-h-40 overflow-y-auto space-y-2"
              data-lenis-prevent
              style={{ overscrollBehavior: 'contain' }}
            >
              {inmuebles.map((row) => (
                <div key={row.propertyId} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-fg truncate">{row.propertyTitle}</span>
                  <span className="text-fg-muted font-mono tabular-nums whitespace-nowrap">
                    {formatCurrency(row.monthlyRent)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-fg-muted mb-2">
              {t('inmobiliaria.import.confirm.mandateBatch.propietarioLabel')}
            </label>
            <PropietarioSelector
              propietarios={propietarios}
              value={propietarioId}
              onChange={(id, data) => {
                setPropietarioId(id);
                setNewPropietarioData(data);
              }}
              newPropietarioData={newPropietarioData}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-fg-muted mb-2">
              {t('inmobiliaria.import.confirm.mandateBatch.commissionLabel')}
            </label>
            <div className="relative">
              <Input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={commissionPercent}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value) && value >= 0 && value <= 100) setCommissionPercent(value);
                }}
                className="pr-10"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-fg-muted">%</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-fg-muted mb-2">
              {t('inmobiliaria.import.confirm.mandateBatch.contractDateLabel')}
            </label>
            <Input
              type="date"
              value={contractDate}
              onChange={(e) => setContractDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-fg-muted mb-2">
              {t('inmobiliaria.import.confirm.mandateBatch.agenteLabel')}
            </label>
            <AgenteSelector
              agentes={agentes}
              value={agenteId}
              onChange={setAgenteId}
              allowNoAgent
            />
          </div>

          {formError && (
            <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
              {formError}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            {t('inmobiliaria.import.confirm.mandateBatch.skip')}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
            isLoading={isSubmitting}
          >
            {t('inmobiliaria.import.confirm.mandateBatch.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CompletarMandatosLoteDialog;
