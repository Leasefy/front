'use client';

/**
 * CostoResponsabilidadCard — Ley 820 cost-responsibility transparency + an
 * approve-only quote affordance for the tenant (SOLI-04).
 *
 * TRUST BOUNDARY: `costoResponsable` and `cotizacionMonto` are BACKEND-sourced —
 * the frontend RENDERS the Ley 820 outcome (who pays) and the amount, it never
 * derives, edits, or decides either. The single tenant-initiated action is the
 * approval, which goes through `pqrsApi.approveCotizacion`; the server persists and
 * authorizes it. The tenant only approves — it never designates a proveedor, never
 * fixes the amount, and never gives the request for terminated on its own.
 *
 * HONEST DEGRADE: while the approval route is not live, `approveCotizacion` throws
 * `PqrsUnavailableError` and we show a soft "Próximamente" toast — the card NEVER
 * optimistically flips to "aprobado". The approved state reflects ONLY a server
 * `cotizacionAprobadaAt` timestamp.
 */

import { useState } from 'react';
import { toast } from '@/components/ui/toast';
import { Scales } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { pqrsApi, PqrsUnavailableError } from '@/lib/api/pqrs.service';
import type { CostoResponsable } from '@/lib/api/pqrs.types';
import type { TenantCase } from '@/lib/types/tenant-case';

type Solicitud = NonNullable<TenantCase['solicitud']>;

/**
 * Factual es-CO / en copy for each Ley 820 responsibility outcome. Neutral,
 * non-alarmist wording (Ley 1480) — a plain statement of who bears the cost.
 */
const RESPONSABLE_COPY: Record<CostoResponsable, { es: string; en: string }> = {
  dueno: {
    es: 'A cargo del propietario (reparación necesaria — Ley 820).',
    en: 'Covered by the owner (necessary repair — Law 820).',
  },
  inquilino: {
    es: 'A cargo tuyo (reparación locativa por uso — Ley 820).',
    en: 'Covered by you (wear-and-tear repair — Law 820).',
  },
  compartido: {
    es: 'Costo compartido. Tu inmobiliaria confirma la distribución.',
    en: 'Shared responsibility. Your agency confirms the split.',
  },
};

/** Long es-CO / en date for the read-only "Aprobada el {date}" state. */
function formatLongDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'es' ? 'es-CO' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso));
}

export function CostoResponsabilidadCard({
  caseId,
  solicitud,
}: {
  caseId: string;
  solicitud: Solicitud;
}) {
  const { locale, formatCurrency } = useI18n();
  const [isApproving, setIsApproving] = useState(false);

  // Rendered ONLY when the backend has determined the responsibility. The
  // frontend never decides who pays — a missing value means "not determined yet".
  const responsable = solicitud.costoResponsable;
  if (!responsable) return null;

  const copy = RESPONSABLE_COPY[responsable];

  // The approve affordance appears only when the tenant bears the cost AND the
  // request is awaiting a quote decision. Approve-before-execute (SOLI-04).
  const isTenantCost = responsable === 'inquilino';
  const awaitingQuote = solicitud.estado === 'en_cotizacion';
  const alreadyApproved = Boolean(solicitud.cotizacionAprobadaAt);

  async function onApprove() {
    setIsApproving(true);
    try {
      await pqrsApi.approveCotizacion(caseId);
      toast.success(
        locale === 'es'
          ? 'Aprobación registrada. Tu inmobiliaria continúa con la gestión.'
          : 'Approval recorded. Your agency will continue the process.',
      );
    } catch (e) {
      if (e instanceof PqrsUnavailableError) {
        // Not live yet → honest "Próximamente"; never a fabricated approval.
        toast.info(
          locale === 'es'
            ? 'La aprobación de cotizaciones se habilitará pronto.'
            : 'Quote approval will be enabled soon.',
        );
      } else {
        toast.error(
          locale === 'es'
            ? 'No pudimos registrar tu aprobación. Intenta de nuevo.'
            : 'We could not record your approval. Please try again.',
        );
      }
    } finally {
      setIsApproving(false);
    }
  }

  return (
    <section className="rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-[#1a1a1c] p-5 sm:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Scales className="w-4 h-4 text-fg-subtle flex-shrink-0" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-fg dark:text-white">
          {locale === 'es' ? 'Responsabilidad del costo' : 'Cost responsibility'}
        </h2>
      </div>

      {/* Ley 820 outcome — backend-sourced factual label (primary-soft idiom). */}
      <div className="rounded-xl bg-primary-soft border border-primary/30 p-3">
        <p className="text-sm text-primary/90">{locale === 'es' ? copy.es : copy.en}</p>
      </div>

      {/* Quote block — only when the cost is the tenant's AND a quote is pending. */}
      {isTenantCost && awaitingQuote && (
        <div className="space-y-3">
          {typeof solicitud.cotizacionMonto === 'number' && (
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-xs text-fg-subtle dark:text-fg-muted">
                {locale === 'es' ? 'Valor de la cotización' : 'Quote amount'}
              </span>
              <span className="text-base font-semibold text-fg dark:text-white tabular-nums">
                {formatCurrency(solicitud.cotizacionMonto)}
              </span>
            </div>
          )}

          {alreadyApproved ? (
            <p className="text-sm text-fg-muted dark:text-fg-subtle">
              {locale === 'es'
                ? `Aprobada el ${formatLongDate(solicitud.cotizacionAprobadaAt!, locale)}`
                : `Approved on ${formatLongDate(solicitud.cotizacionAprobadaAt!, locale)}`}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <Button
                onClick={onApprove}
                isLoading={isApproving}
                hideArrow
                className="self-start"
              >
                {locale === 'es' ? 'Aprobar cotización' : 'Approve quote'}
              </Button>
              <p className="text-xs text-fg-subtle dark:text-fg-muted">
                {locale === 'es'
                  ? 'Tu aprobación autoriza la ejecución. Solo tú apruebas; no fijas el monto ni cambias el estado.'
                  : 'Your approval authorizes the work. You only approve; you do not set the amount or change the status.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Read-only confirmation once approved but no longer awaiting a quote. */}
      {isTenantCost && !awaitingQuote && alreadyApproved && (
        <p className="text-sm text-fg-muted dark:text-fg-subtle">
          {locale === 'es'
            ? `Cotización aprobada el ${formatLongDate(solicitud.cotizacionAprobadaAt!, locale)}`
            : `Quote approved on ${formatLongDate(solicitud.cotizacionAprobadaAt!, locale)}`}
        </p>
      )}
    </section>
  );
}
