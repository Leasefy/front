'use client';

import { useEffect, useState } from 'react';
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
import { consignacionesApi, propietariosApi } from '@/lib/api/inmobiliaria.service';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import type {
  InmuebleSinConsignacion,
  Propietario,
  Agente,
  Consignacion,
  PropietarioFormData,
} from '@/lib/types/inmobiliaria';
import { PropietarioSelector } from './PropietarioSelector';
import { AgenteSelector } from './AgenteSelector';

/**
 * The wire body for `POST /inmobiliaria/consignaciones` when completing a
 * mandate for an already-imported property (contract.md T-0030 §3.4).
 *
 * `ConsignacionFormData` (used by the 6-step `ConsignacionWizard`, which
 * always collects every field) types `propertyZone`/`propertyType` as
 * REQUIRED — that wizard is a different flow with a different domain rule.
 * This one MUST omit them when the source data says so (empty zone, ROOM
 * type), so it gets its own, more permissive shape instead of widening the
 * shared type for a case it was never meant to model.
 */
export interface MandatoWirePayload {
  propietarioId: string;
  propertyId: string;
  propertyTitle: string;
  propertyAddress: string;
  propertyCity: string;
  propertyZone?: string;
  propertyType?: Consignacion['propertyType'];
  monthlyRent: number;
  adminFee?: number;
  propertyThumbnail?: string;
  commissionPercent: number;
  contractDate: string;
  agenteUserId?: string;
}

export interface MandatoFormValues {
  propietarioId: string;
  commissionPercent: number;
  contractDate: string;
  agenteUserId?: string;
}

/**
 * Pure mapping, no I/O — the "no second round-trip" promise of contract.md
 * T-0030 §3.2 lives here: every field but `propietarioId` (and the
 * commercial terms the user enters) comes straight off the row the alert was
 * clicked on, already in hand.
 */
export function buildMandatoPayload(
  inmueble: InmuebleSinConsignacion,
  values: MandatoFormValues,
): MandatoWirePayload {
  const payload: MandatoWirePayload = {
    propietarioId: values.propietarioId,
    propertyId: inmueble.propertyId,
    propertyTitle: inmueble.propertyTitle,
    propertyAddress: inmueble.propertyAddress,
    propertyCity: inmueble.propertyCity,
    monthlyRent: inmueble.monthlyRent,
    commissionPercent: values.commissionPercent,
    contractDate: values.contractDate,
  };
  if (inmueble.propertyZone) payload.propertyZone = inmueble.propertyZone;
  // ROOM trap (contract §3.2): no entry in ConsignacionPropertyType — omit
  // it, the column defaults to APARTMENT server-side. Sending "ROOM" 400s
  // (@IsEnum(ConsignacionPropertyType), create-consignacion.dto.ts:52-58).
  if (inmueble.propertyType !== 'room') {
    payload.propertyType = inmueble.propertyType;
  }
  if (inmueble.adminFee > 0) payload.adminFee = inmueble.adminFee;
  if (inmueble.propertyThumbnail) payload.propertyThumbnail = inmueble.propertyThumbnail;
  if (values.agenteUserId) payload.agenteUserId = values.agenteUserId;
  return payload;
}

interface CompletarMandatoDialogProps {
  /** `null` closes the dialog — controlled by the parent's selected row. */
  inmueble: InmuebleSinConsignacion | null;
  onClose: () => void;
  propietarios: Propietario[];
  agentes: Agente[];
  /**
   * Fired after a successful create (or a 409 treated as success-equivalent,
   * contract §3.3) — the caller MUST refetch both portfolio sources or the
   * row appears twice until the next full reload (contract §3.4).
   */
  onCompleted: () => void;
}

const todayISO = () => new Date().toISOString().split('T')[0];

export function CompletarMandatoDialog({
  inmueble,
  onClose,
  propietarios,
  agentes,
  onCompleted,
}: CompletarMandatoDialogProps) {
  const { t } = useI18n();
  const { user } = useAuth();

  const [propietarioId, setPropietarioId] = useState<string | null>(null);
  const [newPropietarioData, setNewPropietarioData] = useState<PropietarioFormData | undefined>();
  const [commissionPercent, setCommissionPercent] = useState(10);
  const [contractDate, setContractDate] = useState(todayISO());
  const [agenteId, setAgenteId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Reset the form every time a NEW row is opened — otherwise the second
  // "Completar mandato" of the session reopens with the first one's answers.
  useEffect(() => {
    if (!inmueble) return;
    setPropietarioId(null);
    setNewPropietarioData(undefined);
    setCommissionPercent(10);
    setContractDate(todayISO());
    setAgenteId(null);
    setFormError(null);
  }, [inmueble]);

  if (!inmueble) return null;

  const isValid = Boolean(propietarioId) && commissionPercent >= 0 && Boolean(contractDate);

  const handleSubmit = async () => {
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);
    setFormError(null);

    try {
      let finalPropietarioId = propietarioId!;
      const isTempId = finalPropietarioId.startsWith('new-');
      if (isTempId && newPropietarioData) {
        const created = await propietariosApi.create(newPropietarioData);
        finalPropietarioId = created.id;
      } else if (newPropietarioData) {
        // An existing propietario, edited again via "Editar" — same id, PUT.
        await propietariosApi.update(finalPropietarioId, newPropietarioData);
      }

      const selectedAgente = agentes.find((a) => a.id === agenteId);
      const payload = buildMandatoPayload(inmueble, {
        propietarioId: finalPropietarioId,
        commissionPercent,
        contractDate,
        agenteUserId: selectedAgente?.userId ?? (agenteId ? undefined : user?.id),
      });

      // `consignacionesApi.create` types `propertyZone`/`propertyType` as
      // required (the 6-step wizard always collects them). This flow
      // legitimately omits them (empty zone, ROOM type — see
      // `buildMandatoPayload` above). Runtime is unaffected:
      // `toConsignacionPayload` just spreads whatever keys are present.
      await consignacionesApi.create(
        payload as unknown as Parameters<typeof consignacionesApi.create>[0],
      );

      toast.success(t('inmobiliaria.consignaciones.mandateDialog.toasts.successTitle'), {
        description: t('inmobiliaria.consignaciones.mandateDialog.toasts.successDesc', {
          title: inmueble.propertyTitle,
        }),
      });
      onCompleted();
      onClose();
    } catch (error) {
      // contract.md T-0030 §3.3 — a duplicate mandate is success-equivalent:
      // the mandate exists, which is what the user wanted. MUST NOT show a
      // red failure, MUST still refetch both sources and close.
      if (error instanceof ApiError && error.status === 409) {
        toast.info(t('inmobiliaria.consignaciones.mandateDialog.toasts.alreadyExistsTitle'));
        onCompleted();
        onClose();
        return;
      }
      const description =
        error instanceof ApiError && error.messages
          ? error.messages.join(' · ')
          : error instanceof Error && error.message
            ? error.message
            : t('inmobiliaria.consignaciones.mandateDialog.toasts.errorDesc');
      setFormError(description);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('inmobiliaria.consignaciones.mandateDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('inmobiliaria.consignaciones.mandateDialog.subtitle', { title: inmueble.propertyTitle })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Read-only summary of the already-imported property — nothing
              here is user input, it all comes off the row (contract §3.2). */}
          <div className="rounded-lg border border-border bg-surface-muted p-4 space-y-1">
            <p className="font-medium text-fg">{inmueble.propertyTitle}</p>
            <p className="text-sm text-fg-muted">{inmueble.propertyAddress}, {inmueble.propertyCity}</p>
            <p className="text-sm font-mono tabular-nums text-fg">
              {formatCurrency(inmueble.monthlyRent)}
              <span className="text-fg-muted">/mes</span>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-fg-muted mb-2">
              {t('inmobiliaria.consignaciones.mandateDialog.propietarioLabel')}
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
              {t('inmobiliaria.consignaciones.mandateDialog.commissionLabel')}
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
              {t('inmobiliaria.consignaciones.mandateDialog.contractDateLabel')}
            </label>
            <Input
              type="date"
              value={contractDate}
              onChange={(e) => setContractDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-fg-muted mb-2">
              {t('inmobiliaria.consignaciones.mandateDialog.agenteLabel')}
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
            {t('inmobiliaria.consignaciones.mandateDialog.cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
            isLoading={isSubmitting}
          >
            {t('inmobiliaria.consignaciones.mandateDialog.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CompletarMandatoDialog;
