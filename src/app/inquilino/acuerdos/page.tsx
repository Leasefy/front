'use client';

/**
 * acuerdos/page.tsx — v7-07-04 (ACUE-01) the tenant READ surface for payment
 * agreements (acuerdos de pago).
 *
 * Lists the tenant's OWN agency-approved acuerdos via `useTenantAcuerdos()`
 * (→ `acuerdosApi.listMine()`, which degrades to `[]` when the backend is not live —
 * so an unavailable backend yields an HONEST empty-state, never a fabricated acuerdo
 * or cuota row). Each acuerdo shows its plan total (`totalDueCop`, verbatim), a neutral
 * tone badge, a cuota count, and the cuota plan rendered VERBATIM by `CuotaPlanTable`
 * (no saldo math). Every row DEEP-LINKS to the dedicated `/inquilino/acuerdos/[id]`
 * detail (v7-07-05).
 *
 * This surface is READ-ONLY: there is NO approve button, NO terms editor, NO
 * "solicitar plan" CTA (that arrives in v7-07-07). The tenant only VIEWS here —
 * approval and policy stay entirely agent-side (A5, T-323). Mirrors the agency
 * acuerdos "Próximamente" posture, tenant-scoped.
 *
 * Shell + gates are copied from `casos/page.tsx` (Spinner loading → onboarding
 * `CompleteProfileFirst` → error `EmptyState`; `min-h-screen bg-[#f8f8f8]
 *` + `max-w-7xl`). Neutral tone only (no red, no countdown, no
 * credit-bureau copy). Buttons/labels sentence case (DESIGN §4).
 */

import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useEntradaTrasCargar } from '@/components/portales/use-entrada-tras-cargar';
import { Scroll } from '@phosphor-icons/react';

import { useTenantAcuerdos } from '@/lib/hooks/use-tenant-acuerdos';
import { useArriendaHoyDelPortal } from '@/lib/hooks/use-arrienda-hoy';
import { useOnboardingStatus } from '@/lib/hooks/use-onboarding-status';
import { useI18n } from '@/lib/i18n';
import { CompleteProfileFirst } from '@/components/tenant/CompleteProfileFirst';
import { CuotaPlanTable } from '@/components/tenant/CuotaPlanTable';
import { SolicitarPlanPagoModal } from '@/components/tenant/SolicitarPlanPagoModal';
import { EmptyState } from '@/components/ui/empty-state';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { StatusBadge } from '@leasefy/cadence';
import { Button } from '@/components/ui/button';
import { EsqueletoDePagina } from '@/components/estado/EsqueletoDePagina';
import { tonoDelAcuerdo, etiquetaDelAcuerdo, acuerdoNoSeCobra } from '@/lib/types/tenant-case';
import type { CaseTone } from '@/lib/types/tenant-case';
import type { AcuerdoDetail } from '@/lib/api/tenant-acuerdos.types';

// ============================================================================
// Neutral tone → badge (capped at `warning`; no alarm level at all)
// ============================================================================

// Neutro, informativo o atención — nunca rojo: un acuerdo es la salida, no la falta.
const TONO_DEL_ESTADO: Record<CaseTone, 'neutral' | 'info' | 'warning'> = {
  neutral: 'neutral',
  info: 'info',
  attention: 'warning',
};

// ============================================================================
// Acuerdo row — plan header (link to detail) + verbatim cuota plan
// ============================================================================

function AcuerdoRow({ p, locale }: { p: AcuerdoDetail; locale: string }) {
  const { formatCurrency } = useI18n();
  // La inicial viaja como la «cuota 0» (ARREGLOS-3): el conteo dice las cuotas
  // del plan (1, 2, 3…); la tabla las muestra todas, la inicial primero.
  const nCuotas = p.installments.filter((c) => c.number >= 1).length;

  return (
    <div>
      <Link href={`/inquilino/acuerdos/${encodeURIComponent(p.planId)}`} className="group block">
        <div className="rounded-lg border border-border bg-surface p-4 sm:p-5 hover:bg-surface-muted/40 transition-colors">
          <div className="flex items-center gap-4">
            <Scroll className="w-5 h-5 text-fg-muted shrink-0" aria-hidden="true" />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-medium text-fg group-hover:text-primary transition-colors truncate">
                  {locale === 'es' ? 'Acuerdo de pago' : 'Payment agreement'}
                </h3>
                {/* Glow up 22-10: el estado con su punto y su palabra (StatusBadge), sin ícono en la pastilla. */}
                <StatusBadge tone={TONO_DEL_ESTADO[tonoDelAcuerdo(p)]}>{etiquetaDelAcuerdo(p)}</StatusBadge>
              </div>
              <p className="text-caption text-fg-muted mt-1">
                <span className="font-mono tabular-nums text-fg">
                  {formatCurrency(p.totalDueCop)}
                </span>
                {' · '}
                {/* Sin cuotas es un pago único (el compromiso de pagar todo), no «0 cuotas». */}
                {nCuotas === 0
                  ? locale === 'es'
                    ? 'pago único'
                    : 'single payment'
                  : locale === 'es'
                    ? `${nCuotas} ${nCuotas === 1 ? 'cuota' : 'cuotas'}`
                    : `${nCuotas} ${nCuotas === 1 ? 'installment' : 'installments'}`}
              </p>
            </div>

          </div>

          {/* Cuota plan — rendered VERBATIM from the record (no saldo math) */}
          {p.installments.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <CuotaPlanTable installments={p.installments} locale={locale} acuerdoCerrado={acuerdoNoSeCobra(p)} />
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}

// ============================================================================
// Page
// ============================================================================

export default function AcuerdosPage() {
  const { locale } = useI18n();
  const { isComplete: isOnboardingComplete, isLoading: isOnboardingLoading } = useOnboardingStatus();
  const { items, isLoading, error, refetch } = useTenantAcuerdos();
  const arrienda = useArriendaHoyDelPortal();

  // The only mutation entry point on this read surface: propose a payment plan.
  const [requestOpen, setRequestOpen] = useState(false);

  // Carga → contenido: entra con 4 px sólo si se vio el esqueleto.
  const entrada = useEntradaTrasCargar(isOnboardingLoading || isLoading);

  // Loading gate — never flash a fake-empty while a source is in flight.
  if (isOnboardingLoading || isLoading) {
    return (
      <div className="min-h-screen bg-bg">
        {/* Dentro del panel va el esqueleto, no el logo (Nico, 01-10: «el logo sólo en cargas de pantalla completa»). */}
        <EsqueletoDePagina variante="list" className="mx-auto max-w-7xl" />
      </div>
    );
  }

  // Onboarding gate.
  if (!isOnboardingComplete) {
    return (
      <div className="min-h-screen bg-bg">
        <div className="p-6 lg:p-8">
          <CompleteProfileFirst context="rental" />
        </div>
      </div>
    );
  }

  // Error gate — a not-live source already degraded to [] upstream, so this only
  // fires on a genuine (non-404/403/0) failure.
  if (error) {
    return (
      <div className="min-h-screen bg-bg">
        <div className="p-6 lg:p-8">
          {/* GLOW UP (21-10-2026, QA): el encabezado se queda también con el error,
              para que se sepa dónde se está; sin la acción, que va al mismo servicio caído. */}
          <EncabezadoDePantalla
            className="mb-8"
            seccion={locale === 'es' ? 'Mi arriendo' : 'My rental'}
            titulo={locale === 'es' ? 'Acuerdos de pago' : 'Payment agreements'}
          />
          <FalloDeCarga error={error} queEs="tus acuerdos de pago" onReintentar={() => void refetch()} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <motion.div {...entrada} className="space-y-6 p-6 lg:p-8">

        {/* Header */}
        <EncabezadoDePantalla
          className="mb-8"
          seccion={locale === 'es' ? 'Mi arriendo' : 'My rental'}
          titulo={locale === 'es' ? 'Acuerdos de pago' : 'Payment agreements'}
          descripcion={
            locale === 'es'
              ? 'Los acuerdos que te aprobó tu inmobiliaria, con su plan de cuotas.'
              : 'Review the payment agreements approved by your agency and their installment plan.'
          }
          accionPrincipal={
            items.length > 0 ? (
              <Button type="button" size="sm" onClick={() => setRequestOpen(true)} hideArrow>
                {locale === 'es' ? 'Solicitar un plan de pago' : 'Request a payment plan'}
              </Button>
            ) : undefined
          }
        />

        {/* List — real own-acuerdos, or an honest empty-state (incl. not-live []) */}
        <section>
          {items.length > 0 ? (
            <div className="space-y-3">
              {items.map((p) => (
                <AcuerdoRow key={p.planId} p={p} locale={locale} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-surface">
              {/* Revisora r25: sin arriendo no se ofrece pedir un plan de pago (abría un modal sobre nada). */}
              {arrienda === false ? (
                <EmptyState
                  icon={Scroll}
                  title={locale === 'es' ? 'Aún no tienes acuerdos de pago' : 'No payment agreements yet'}
                  description={
                    locale === 'es'
                      ? 'Cuando tengas un arriendo, aquí ves tus acuerdos de pago con su plan de cuotas.'
                      : 'When you have a rental, your payment agreements show up here with their installment plan.'
                  }
                />
              ) : (
                <EmptyState
                  icon={Scroll}
                  title={locale === 'es' ? 'Aún no tienes acuerdos de pago' : 'No payment agreements yet'}
                  description={
                    locale === 'es'
                      ? 'Cuando tu inmobiliaria te apruebe un acuerdo, aparecerá aquí con su plan de cuotas.'
                      : 'When your agency approves an agreement, it will show up here with its installment plan.'
                  }
                  action={{
                    label: locale === 'es' ? 'Solicitar un plan de pago' : 'Request a payment plan',
                    onClick: () => setRequestOpen(true),
                  }}
                />
              )}
            </div>
          )}
        </section>
      </motion.div>

      {/* Propose-a-plan modal — intent only; the agency defines and approves terms. */}
      <SolicitarPlanPagoModal
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        onRequested={refetch}
      />
    </div>
  );
}
