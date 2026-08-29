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
import { propertiesApi } from '@/lib/api/properties.service';
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
  /**
   * contract-addendum-2.md §A.7/§A.8 — OMITTED entirely on a sale mandate.
   * Never `null`-with-a-value, never `0` (C6, R2).
   */
  monthlyRent?: number;
  /** contract-addendum-2.md §A.3/§A.7 rule R3 — REQUIRED on a sale mandate. */
  saleCommissionPercent?: number;
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
  /** contract-addendum-2.md §A.7 rule R3 — required when the row is a sale listing. */
  saleCommissionPercent?: number;
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
  // contract-addendum-2.md §A.1/§A.2 — the owner's ruling on W3-a (ledger §7)
  // reversed the old prohibition: a sale listing DOES carry a mandate, in
  // reduced form (propietario + consignedAt + sale commission, no canon).
  // `inmueble.monthlyRent == null` is the same SALE signal this whole file
  // already used before the ruling — an existing DRAFT property that
  // satisfied the `properties` CHECK constraint has `monthlyRent` set for
  // RENT and `null` for SALE, so this is not a proxy, it is the fact itself.
  const isSaleListing = inmueble.monthlyRent == null;

  const payload: MandatoWirePayload = {
    propietarioId: values.propietarioId,
    propertyId: inmueble.propertyId,
    propertyTitle: inmueble.propertyTitle,
    propertyAddress: inmueble.propertyAddress,
    propertyCity: inmueble.propertyCity,
    // §A.3 — `commissionPercent` stays required by the DTO; `0` on a sale
    // mandate is not a C6 violation because the row carries an explicit
    // `listingType` discriminator (derived server-side from this call).
    commissionPercent: isSaleListing ? 0 : values.commissionPercent,
    contractDate: values.contractDate,
  };

  if (isSaleListing) {
    // §A.7 rule R3 — a sale mandate MUST carry a sale commission.
    payload.saleCommissionPercent = values.saleCommissionPercent ?? 0;
    // monthlyRent stays OMITTED — never null-with-a-value, never 0 (R2, C6).
  } else {
    payload.monthlyRent = inmueble.monthlyRent as number;
  }

  if (inmueble.propertyZone) payload.propertyZone = inmueble.propertyZone;
  // ROOM trap (contract §3.2): no entry in ConsignacionPropertyType — omit
  // it, the column defaults to APARTMENT server-side. Sending "ROOM" 400s
  // (@IsEnum(ConsignacionPropertyType), create-consignacion.dto.ts:52-58).
  if (inmueble.propertyType !== 'room') {
    payload.propertyType = inmueble.propertyType;
  }
  // adminFee has no meaning on a sale mandate (§A.2 — "0 always"); omit it
  // rather than send a value the server will only zero out.
  if (!isSaleListing && inmueble.adminFee > 0) payload.adminFee = inmueble.adminFee;
  if (inmueble.propertyThumbnail) payload.propertyThumbnail = inmueble.propertyThumbnail;
  if (values.agenteUserId) payload.agenteUserId = values.agenteUserId;
  return payload;
}

/**
 * Creates or updates the propietario if the selector produced one, and
 * returns the id to send on the mandate payload. Shared with the batch
 * completion flow (`CompletarMandatosLoteDialog`, T-0030 WU-3) so the
 * temp-id/create-vs-update rule lives in exactly one place.
 */
export async function persistPropietarioIfNeeded(
  propietarioId: string,
  newPropietarioData: PropietarioFormData | undefined,
): Promise<string> {
  const isTempId = propietarioId.startsWith('new-');
  if (isTempId && newPropietarioData) {
    const created = await propietariosApi.create(newPropietarioData);
    return created.id;
  }
  if (newPropietarioData) {
    // An existing propietario, edited again via "Editar" — same id, PUT.
    await propietariosApi.update(propietarioId, newPropietarioData);
  }
  return propietarioId;
}

function extractErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.messages) return error.messages.join(' · ');
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

/**
 * Outcome of completing one property's mandate, and then publishing it.
 * Shared shape between the single-row dialog here and the batch modal
 * (`submitMandatosLote.ts`, T-0030 WU-3/WU-4) so both report the same way.
 */
export interface MandatoOutcome {
  propertyId: string;
  propertyTitle: string;
  status: 'created' | 'alreadyExists' | 'failed';
  /** Whether `PATCH /properties/:id { status: 'AVAILABLE' }` succeeded. */
  published: boolean;
  /** Present only when `status === 'failed'` — the mandate call itself failed. */
  mandateErrorMessage?: string;
  /** Present only when the mandate succeeded but the publish PATCH failed. */
  publishErrorMessage?: string;
}

/**
 * Completes the mandate for one property and, only if that succeeded
 * (including a `409` — the mandate already exists), publishes it.
 * Contract.md T-0030 §3.4, amendment A-1.1 — completing the mandate
 * publishes the property. Binding order, both MUSTs:
 *
 *   1. `POST /inmobiliaria/consignaciones` first.
 *   2. Only if that succeeded, `PATCH /properties/:id { status: 'AVAILABLE' }`.
 *
 * The ordering and the "never roll back a good mandate" rule are the exact
 * pattern `ConsignacionWizard.tsx:360-389` already proved correct — publish
 * LAST, and a publish failure is reported honestly (`published: false`),
 * never silently retried, never used to undo the mandate that already
 * succeeded.
 *
 * Shared by BOTH completion paths — this single-row dialog and the batch
 * modal (`submitMandatosLote.ts`) — so the ordering/rollback rules live in
 * exactly one place and cannot drift between them.
 */
export async function completeMandatoAndPublish(
  inmueble: InmuebleSinConsignacion,
  values: MandatoFormValues,
): Promise<MandatoOutcome> {
  const base = { propertyId: inmueble.propertyId, propertyTitle: inmueble.propertyTitle };

  let status: 'created' | 'alreadyExists';
  try {
    const payload = buildMandatoPayload(inmueble, values);
    // Same documented, contract-safe assertion the dialog's own submit uses
    // for this exact payload shape (propertyZone/propertyType optional
    // here, required on ConsignacionFormData — toConsignacionPayload just
    // spreads whatever keys are present).
    await consignacionesApi.create(
      payload as unknown as Parameters<typeof consignacionesApi.create>[0],
    );
    status = 'created';
  } catch (error) {
    // contract.md T-0030 §3.3 — a duplicate mandate is success-equivalent:
    // the mandate exists, which is what the user wanted, so it still
    // publishes below.
    if (error instanceof ApiError && error.status === 409) {
      status = 'alreadyExists';
    } else {
      // A genuine mandate failure. Never publish a property whose mandate
      // call failed — that is the exact failure this whole task exists to
      // prevent.
      return {
        ...base,
        status: 'failed',
        published: false,
        mandateErrorMessage: extractErrorMessage(error, 'Error desconocido'),
      };
    }
  }

  try {
    await propertiesApi.update(inmueble.propertyId, { status: 'AVAILABLE' });
    return { ...base, status, published: true };
  } catch (error) {
    // The mandate is the durable outcome; the publish is a follow-on. A
    // failed PATCH does NOT invalidate a good mandate — report the partial
    // state honestly instead of rolling back or claiming a publish that
    // did not happen.
    return {
      ...base,
      status,
      published: false,
      publishErrorMessage: extractErrorMessage(error, 'Error desconocido'),
    };
  }
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
  const [saleCommissionPercent, setSaleCommissionPercent] = useState(3);
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
    setSaleCommissionPercent(3);
    setContractDate(todayISO());
    setAgenteId(null);
    setFormError(null);
  }, [inmueble]);

  if (!inmueble) return null;

  // contract-addendum-2.md §A.1/§A.2 — a SALE listing (`monthlyRent === null`)
  // now carries a REDUCED mandate: propietario + consignedAt + sale
  // commission. No canon, no minimum term, no acta.
  const isSaleListing = inmueble.monthlyRent == null;
  const isValid =
    Boolean(propietarioId) &&
    Boolean(contractDate) &&
    (isSaleListing ? saleCommissionPercent > 0 : commissionPercent >= 0);

  const handleSubmit = async () => {
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);
    setFormError(null);

    try {
      const finalPropietarioId = await persistPropietarioIfNeeded(propietarioId!, newPropietarioData);
      const selectedAgente = agentes.find((a) => a.id === agenteId);

      const outcome = await completeMandatoAndPublish(inmueble, {
        propietarioId: finalPropietarioId,
        commissionPercent,
        contractDate,
        agenteUserId: selectedAgente?.userId ?? (agenteId ? undefined : user?.id),
        ...(isSaleListing ? { saleCommissionPercent } : {}),
      });

      if (outcome.status === 'failed') {
        setFormError(
          outcome.mandateErrorMessage ?? t('inmobiliaria.consignaciones.mandateDialog.toasts.errorDesc'),
        );
        return;
      }

      // contract.md T-0030 §3.3 — a duplicate mandate is success-equivalent:
      // the mandate exists, which is what the user wanted. MUST NOT show a
      // red failure.
      if (outcome.status === 'alreadyExists') {
        toast.info(t('inmobiliaria.consignaciones.mandateDialog.toasts.alreadyExistsTitle'));
      } else if (outcome.published) {
        toast.success(t('inmobiliaria.consignaciones.mandateDialog.toasts.successTitle'), {
          description: t('inmobiliaria.consignaciones.mandateDialog.toasts.successDesc', {
            title: inmueble.propertyTitle,
          }),
        });
      }

      // contract.md T-0030 §3.4, amendment A-1.1 — a failed PATCH does NOT
      // invalidate the mandate. Report the partial state honestly instead
      // of rolling back or claiming a publish that did not happen.
      if (!outcome.published) {
        toast.error(t('inmobiliaria.consignaciones.mandateDialog.toasts.publishErrorTitle'), {
          description: t('inmobiliaria.consignaciones.mandateDialog.toasts.publishErrorDesc', {
            reason:
              outcome.publishErrorMessage ??
              t('inmobiliaria.consignaciones.mandateDialog.toasts.publishErrorFallbackReason'),
          }),
        });
      }

      // The mandate exists either way (created or alreadyExists) — the row
      // moves out of the mandate-less list regardless of publish outcome,
      // so both sources MUST refetch here (contract §3.4).
      onCompleted();
      onClose();
    } catch (error) {
      // The propietario create/update step itself failed — nothing was
      // submitted yet.
      setFormError(extractErrorMessage(error, t('inmobiliaria.consignaciones.mandateDialog.toasts.errorDesc')));
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
            {inmueble.monthlyRent != null && (
              <p className="text-sm font-mono tabular-nums text-fg">
                {formatCurrency(inmueble.monthlyRent)}
                <span className="text-fg-muted">/mes</span>
              </p>
            )}
          </div>

          {isSaleListing && (
            <p role="status" className="rounded-lg border border-info/30 bg-info-soft px-3 py-2 text-sm text-info">
              {t('inmobiliaria.consignaciones.mandateDialog.saleListingNotice')}
            </p>
          )}

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
              {isSaleListing
                ? t('inmobiliaria.consignaciones.mandateDialog.saleCommissionLabel')
                : t('inmobiliaria.consignaciones.mandateDialog.commissionLabel')}
            </label>
            {isSaleListing ? (
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={saleCommissionPercent}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value) && value >= 0 && value <= 100) setSaleCommissionPercent(value);
                  }}
                  className="pr-10"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-fg-muted">%</span>
              </div>
            ) : (
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
            )}
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
