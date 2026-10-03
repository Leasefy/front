'use client';

/**
 * acuerdos/[id]/page.tsx — v7-07-05 (ACUE-01 read + ACUE-02 accept) the acuerdo
 * detail surface for ONE agency-approved payment agreement.
 *
 * It resolves the plan by FILTERING the tenant's OWN `useTenantAcuerdos()` list by
 * the route id (`items.find(p => p.planId === id)`) — it NEVER fetches by the
 * tenant-supplied raw id, so own-only / no-IDOR is inherited from the JWT-scoped
 * source hook (threat T-v7-07-14). An id absent from the tenant's own list (unknown
 * OR foreign) renders an honest "Acuerdo no encontrado" empty-state — never a foreign
 * fetch, never a leak.
 *
 * Renders the plan total (`totalDueCop`, verbatim) + the cuota plan (`CuotaPlanTable`,
 * rendered VERBATIM — no saldo/total math) + a state timeline built from SOURCE
 * timestamps only (`offeredAt` → `acceptedAt` when present; nothing synthesized). The
 * `AcuerdoAcceptPanel` (sign-to-accept) appears ONLY when `acceptedAt === null`; an
 * already-accepted plan shows a factual accepted state instead. «Pagar cuota» (ACUE-03,
 * `PagarCuota`) va con el plan aceptado y una cuota por pagar.
 *
 * Guardrails: neutral tone (badge capped at `warning`, Ley 1480); accept-only (the
 * panel never approves/sets terms, T-323/A5); es-CO dates; additive route only.
 *
 * 03-10-2026 (Nico): se firma SÓLO lo que la inmobiliaria ya aprobó
 * (`operatorApprovedAt`, `estadoDeLaFirma`). Un acuerdo ofrecido sin aprobar dice
 * que la inmobiliaria lo está revisando — nunca «ya fue aprobado» — y no ofrece
 * firmar; el back y el micro también lo exigen (409 `ACUERDO_SIN_APROBAR`).
 */

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Scroll,
  CaretLeft,
  CheckCircle,
  Clock,
  Warning,
  SealCheck,
  MagnifyingGlass,
  XCircle,
  type Icon,
} from '@phosphor-icons/react';

import { useTenantAcuerdos } from '@/lib/hooks/use-tenant-acuerdos';
import { estadoDeLaFirma } from '@/lib/api/tenant-acuerdos.service';
import { acuerdoStatusToTone, acuerdoStatusToLabel } from '@/lib/types/tenant-case';
import type { CaseTone } from '@/lib/types/tenant-case';
import type { AcuerdoDetail, AcuerdoInstallment } from '@/lib/api/tenant-acuerdos.types';
import { useI18n } from '@/lib/i18n';
import { CuotaPlanTable } from '@/components/tenant/CuotaPlanTable';
import { AcuerdoAcceptPanel } from '@/components/tenant/AcuerdoAcceptPanel';
import { PagarCuota } from '@/components/tenant/PagarCuota';
import { AvisoDelPagoDelAcuerdo } from '@/components/tenant/AvisoDelPagoDelAcuerdo';
import { transaccionDelRetorno } from '@/lib/payments/verificar-pago-al-volver';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import type { BadgeProps } from '@/components/ui/badge';
import { EsqueletoDePagina } from '@/components/estado/EsqueletoDePagina';
import { PlanActivityTimeline, type TimelineItem } from '@/components/ui/plan/PlanActivityTimeline';

// ============================================================================
// Neutral tone → badge (capped at `warning`; no alarm level at all — Ley 1480)
// ============================================================================

const TONE_BADGE: Record<CaseTone, { variant: NonNullable<BadgeProps['variant']>; icon: Icon }> = {
  neutral: { variant: 'secondary', icon: CheckCircle },
  info: { variant: 'default', icon: Clock },
  attention: { variant: 'warning', icon: Warning },
};

/** Long es-CO / en-US date, or empty when the timestamp is invalid. */
function formatLongDate(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(locale === 'es' ? 'es-CO' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

// ============================================================================
// Pagar cuota (ACUE-03) — `PagarCuota` (Nico, 02-10-2026, noche: conectado YA
// por `/api/inquilino/acuerdos/wompi-session`; antes preguntaba a
// `getCuotaPaymentUrl`, una ruta que nunca existió —se borró el 02-10-2026— y
// quedaba en «Próximamente»). El plan lo sirve el back de puente hacia el micro.
// ============================================================================

// A cuota that is settled/closed is not payable. Neutral string compare only —
// the amount is NEVER computed here; the server resolves it from the agent record.
const SETTLED_CUOTA_STATUSES = new Set(['paid', 'pagada', 'cancelled', 'cancelada']);

/** First cuota that still owes money (source order preserved). */
function nextPayableCuota(installments: AcuerdoInstallment[]): AcuerdoInstallment | undefined {
  return installments.find((c) => !SETTLED_CUOTA_STATUSES.has(c.status));
}

// ============================================================================
// Page shell
// ============================================================================

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f8f8f8] dark:bg-bg">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">{children}</div>
    </div>
  );
}

function BackLink({ locale }: { locale: string }) {
  return (
    <Link
      href="/inquilino/acuerdos"
      className="inline-flex items-center gap-1.5 text-sm text-fg-muted dark:text-fg-subtle hover:text-fg dark:hover:text-white transition-colors mb-6"
    >
      <CaretLeft className="w-4 h-4" aria-hidden="true" />
      {locale === 'es' ? 'Volver a Acuerdos' : 'Back to Agreements'}
    </Link>
  );
}

// ============================================================================
// Resolved detail
// ============================================================================

function AcuerdoDetailView({
  plan,
  locale,
  onAccepted,
}: {
  plan: AcuerdoDetail;
  locale: string;
  onAccepted: () => void;
}) {
  const { formatCurrency } = useI18n();
  const es = locale === 'es';
  const badge = TONE_BADGE[acuerdoStatusToTone(plan.status)];
  const ToneIcon = badge.icon;

  // Qué se hace con la firma (03-10-2026): sólo se firma lo que la inmobiliaria aprobó.
  const firma = estadoDeLaFirma(plan);

  // Pay a cuota only once the acuerdo is accepted (active) and one is still owed.
  const nextCuota =
    plan.acceptedAt !== null ? nextPayableCuota(plan.installments) : undefined;

  // Timeline from SOURCE TIMESTAMPS only — offered, then accepted when present.
  // Nothing synthesized, reordered, or padded (T-v7-07 / PITFALLS 2).
  const timelineItems: TimelineItem[] = [
    {
      id: `${plan.planId}:offered`,
      title: es ? 'Propuesto por tu inmobiliaria' : 'Offered by your agency',
      timestamp: plan.offeredAt,
      icon: Scroll,
    },
  ];
  // La aprobación de la inmobiliaria, cuando la hay (03-10-2026): es la que deja firmar.
  if (plan.operatorApprovedAt) {
    timelineItems.push({
      id: `${plan.planId}:approved`,
      title: es ? 'Aprobado por tu inmobiliaria' : 'Approved by your agency',
      timestamp: plan.operatorApprovedAt,
      icon: SealCheck,
    });
  }
  if (plan.acceptedAt) {
    timelineItems.push({
      id: `${plan.planId}:accepted`,
      title: es ? 'Aceptado' : 'Accepted',
      timestamp: plan.acceptedAt,
      icon: CheckCircle,
    });
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header — title + neutral status badge */}
      <header className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-surface-muted dark:bg-border flex items-center justify-center flex-shrink-0">
          <Scroll className="w-6 h-6 text-fg-muted dark:text-fg-subtle" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-medium text-fg dark:text-white tracking-tight">
            {es ? 'Acuerdo de pago' : 'Payment agreement'}
          </h1>
          <div className="mt-2">
            <Badge variant={badge.variant} className="inline-flex items-center gap-1">
              <ToneIcon className="w-3 h-3" aria-hidden="true" />
              {acuerdoStatusToLabel(plan.status)}
            </Badge>
          </div>
        </div>
      </header>

      {/* Total — rendered VERBATIM from the record (no saldo/total math) */}
      <section className="rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-surface-muted p-5 sm:p-6">
        <p className="text-xs text-fg-subtle dark:text-fg-muted">
          {es ? 'Total del acuerdo' : 'Agreement total'}
        </p>
        <p className="mt-1 text-2xl font-mono tabular-nums font-semibold text-fg dark:text-white">
          {formatCurrency(plan.totalDueCop)}
        </p>
      </section>

      {/* Cuota plan — verbatim installments (CuotaPlanTable) */}
      <section className="rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-surface-muted p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-fg dark:text-white mb-4">
          {es ? 'Plan de cuotas' : 'Installment plan'}
        </h2>
        <CuotaPlanTable installments={plan.installments} locale={locale} />
      </section>

      {/* Accept-by-signing (ACUE-02) — only while OFFERED, APPROVED and unaccepted; else a factual state.
          Un acuerdo cancelado (la inmobiliaria lo rechazó) o roto ya no se acepta: el back
          respondería 409 `ACUERDO_NO_ACEPTABLE`, así que ni se ofrece firmar (02-10-2026).
          Uno ofrecido que la inmobiliaria todavía no aprobó tampoco (03-10-2026). */}
      {firma === 'firmar' ? (
        <section className="rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-surface-muted p-5 sm:p-6">
          <AcuerdoAcceptPanel planId={plan.planId} onAccepted={onAccepted} />
        </section>
      ) : firma === 'por-aprobar' ? (
        <section
          data-testid="acuerdo-por-aprobar"
          className="rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-surface-muted p-5 sm:p-6"
        >
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-fg-muted dark:text-fg-subtle flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-semibold text-fg dark:text-white">
                {es ? 'Tu inmobiliaria lo está revisando' : 'Your agency is reviewing it'}
              </p>
              <p className="mt-1 text-sm text-fg-muted dark:text-fg-subtle">
                {es
                  ? 'Este acuerdo todavía no está aprobado. Cuando tu inmobiliaria lo apruebe, aquí mismo lo podrás firmar para aceptarlo.'
                  : 'This agreement is not approved yet. Once your agency approves it, you can sign it here to accept it.'}
              </p>
            </div>
          </div>
        </section>
      ) : firma === 'no-aceptable' ? (
        <section
          data-testid="acuerdo-no-aceptable"
          className="rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-surface-muted p-5 sm:p-6"
        >
          <p className="text-sm text-fg-muted dark:text-fg-subtle">
            {es
              ? 'Este acuerdo ya no se puede aceptar. Si quieres un acuerdo de pago, pídelo a tu inmobiliaria desde Acuerdos.'
              : 'This agreement can no longer be accepted. If you want a payment agreement, request one from your agency in Agreements.'}
          </p>
        </section>
      ) : (
        <section className="rounded-xl border border-success/30 bg-success-soft p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-success flex items-center justify-center flex-shrink-0">
              <SealCheck className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
            <div>
              <p className="font-semibold text-success">
                {es ? 'Acuerdo aceptado' : 'Agreement accepted'}
              </p>
              <p className="text-sm text-success">
                {es
                  ? `Aceptaste este acuerdo el ${formatLongDate(plan.acceptedAt ?? '', locale)}.`
                  : `You accepted this agreement on ${formatLongDate(plan.acceptedAt ?? '', locale)}.`}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Pagar cuota (ACUE-03) — por la sesión de pago de la ruta; sólo con el plan aceptado */}
      {nextCuota && <PagarCuota planId={plan.planId} cuota={nextCuota} locale={locale} />}

      {/* State timeline — source-timestamp-only events */}
      <section className="rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-surface-muted p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-fg dark:text-white mb-4">
          {es ? 'Historial' : 'Timeline'}
        </h2>
        <PlanActivityTimeline
          items={timelineItems}
          emptyMessage={es ? 'Sin actividad registrada' : 'No activity recorded'}
        />
      </section>
    </motion.div>
  );
}

// ============================================================================
// Page
// ============================================================================

export default function AcuerdoDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const { locale } = useI18n();
  const { items, isLoading, error, refetch } = useTenantAcuerdos();

  // Al volver de Wompi (`?id=<transacción>`, «Pagar cuota»): el aviso de que el
  // pago se está confirmando y qué pasa con un pago que no es de una cuota (Nico,
  // 02-10-2026). Se lee la URL una vez y se limpia, para que recargar no lo repita.
  const [volvioDeWompi, setVolvioDeWompi] = useState(false);
  useEffect(() => {
    if (transaccionDelRetorno(new URLSearchParams(window.location.search))) {
      setVolvioDeWompi(true);
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  // Own-only resolution (anti-IDOR, T-v7-07-14): filter the tenant's OWN list —
  // NO API call with the raw route id, NO fetch-by-id hook.
  const plan = items.find((p) => p.planId === params.id);

  // Loading gate — never flash a fake not-found while the source is in flight.
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8f8f8] dark:bg-bg">
        {/* Dentro del panel va el esqueleto, no el logo (Nico, 01-10: «el logo sólo en cargas de pantalla completa»). */}
        <EsqueletoDePagina variante="detail" className="mx-auto max-w-3xl" />
      </div>
    );
  }

  // Hard failure (a not-live source already degraded to [] upstream, so this only
  // fires on a genuine non-404/403/0 error).
  if (error) {
    return (
      <PageShell>
        <BackLink locale={locale} />
        <EmptyState
          icon={XCircle}
          title={locale === 'es' ? 'Error al cargar el acuerdo' : 'Error loading agreement'}
          description={error}
          action={{ label: locale === 'es' ? 'Volver a Acuerdos' : 'Back to Agreements', href: '/inquilino/acuerdos' }}
        />
      </PageShell>
    );
  }

  // Honest not-found — covers an unknown id AND a foreign id (never fetched).
  if (!plan) {
    return (
      <PageShell>
        <BackLink locale={locale} />
        <EmptyState
          icon={MagnifyingGlass}
          title={locale === 'es' ? 'Acuerdo no encontrado' : 'Agreement not found'}
          description={
            locale === 'es'
              ? 'Este acuerdo no está en tu lista. Puede que ya no esté disponible o que el enlace no sea válido.'
              : 'This agreement is not in your list. It may no longer be available, or the link may be invalid.'
          }
          action={{ label: locale === 'es' ? 'Volver a Acuerdos' : 'Back to Agreements', href: '/inquilino/acuerdos' }}
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <BackLink locale={locale} />
      <AvisoDelPagoDelAcuerdo show={volvioDeWompi} locale={locale} className="mb-6" />
      <AcuerdoDetailView plan={plan} locale={locale} onAccepted={refetch} />
    </PageShell>
  );
}
