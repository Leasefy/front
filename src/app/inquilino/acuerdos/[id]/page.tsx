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
 * already-accepted plan shows a factual accepted state instead. No "pagar cuota"
 * affordance here (that is v7-07-06).
 *
 * Guardrails: neutral tone (badge capped at `warning`, Ley 1480); accept-only (the
 * panel never approves/sets terms, T-323/A5); es-CO dates; additive route only.
 */

import { useState, useEffect, useCallback } from 'react';
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
  CreditCard,
  type Icon,
} from '@phosphor-icons/react';

import { useTenantAcuerdos } from '@/lib/hooks/use-tenant-acuerdos';
import { acuerdoStatusToTone, acuerdoStatusToLabel } from '@/lib/types/tenant-case';
import type { CaseTone } from '@/lib/types/tenant-case';
import { acuerdosApi } from '@/lib/api/tenant-acuerdos.service';
import type { AcuerdoDetail, AcuerdoInstallment } from '@/lib/api/tenant-acuerdos.types';
import { useI18n } from '@/lib/i18n';
import { CuotaPlanTable } from '@/components/tenant/CuotaPlanTable';
import { AcuerdoAcceptPanel } from '@/components/tenant/AcuerdoAcceptPanel';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import type { BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
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
// Pagar cuota (ACUE-03) — GATED on the read-side contract, no premature success
// ============================================================================

// A cuota that is settled/closed is not payable. Neutral string compare only —
// the amount is NEVER computed here; the server resolves it from the agent record.
const SETTLED_CUOTA_STATUSES = new Set(['paid', 'pagada', 'cancelled', 'cancelada']);

/** First cuota that still owes money (source order preserved). */
function nextPayableCuota(installments: AcuerdoInstallment[]): AcuerdoInstallment | undefined {
  return installments.find((c) => !SETTLED_CUOTA_STATUSES.has(c.status));
}

type PagoState =
  | { kind: 'checking' }
  | { kind: 'unavailable' } // getCuotaPaymentUrl → null (not-live) or a soft error
  | { kind: 'ready'; url: string }
  | { kind: 'redirecting' };

/**
 * "Pagar cuota" affordance for the next owed cuota. It asks the read-side contract
 * `acuerdosApi.getCuotaPaymentUrl(planId, cuotaNumber)` for a SERVER-provided hosted
 * checkout URL: `null` (today, the agent route is not live) → the button is DISABLED
 * with a "Próximamente" title and never a fabricated URL; a URL → the tenant redirects
 * to the agent's Wompi hosted checkout. On return, settlement is webhook-only — the
 * cuota keeps its recorded status and the copy says it stays "confirmando" until
 * verified. No client amount, no optimistic success, no invoice ("comprobante interno").
 */
function CuotaPagoSection({
  planId,
  cuota,
  locale,
}: {
  planId: string;
  cuota: AcuerdoInstallment;
  locale: string;
}) {
  const es = locale === 'es';
  const [state, setState] = useState<PagoState>({ kind: 'checking' });

  // Resolve the gate up-front so the button reflects availability immediately.
  useEffect(() => {
    let cancelled = false;
    setState({ kind: 'checking' });
    acuerdosApi
      .getCuotaPaymentUrl(planId, cuota.number)
      .then((url) => {
        if (cancelled) return;
        setState(url ? { kind: 'ready', url } : { kind: 'unavailable' });
      })
      .catch(() => {
        // Any non-not-live error still keeps the affordance honestly gated —
        // never an enabled button that would fail or fabricate a checkout URL.
        if (!cancelled) setState({ kind: 'unavailable' });
      });
    return () => {
      cancelled = true;
    };
  }, [planId, cuota.number]);

  const handlePay = useCallback(() => {
    setState((prev) => {
      if (prev.kind !== 'ready') return prev;
      // Redirect to the agent-provided hosted checkout. The browser leaves this page;
      // there is no in-page success — settlement flips only via the backend webhook.
      window.location.href = prev.url;
      return { kind: 'redirecting' };
    });
  }, []);

  const isReady = state.kind === 'ready';
  const isRedirecting = state.kind === 'redirecting';
  const label = isRedirecting
    ? es
      ? 'Confirmando…'
      : 'Confirming…'
    : es
      ? `Pagar cuota ${cuota.number}`
      : `Pay installment ${cuota.number}`;

  return (
    <section className="rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-[#1a1a1c] p-5 sm:p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-surface-muted dark:bg-[#2a2a2c] flex items-center justify-center flex-shrink-0">
          <CreditCard className="w-5 h-5 text-fg-muted dark:text-fg-subtle" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-fg dark:text-white">
            {es ? 'Pago de cuota' : 'Installment payment'}
          </h2>
          <p className="text-xs text-fg-muted dark:text-fg-subtle mt-0.5">
            {es
              ? `Próxima cuota por pagar: cuota ${cuota.number}`
              : `Next installment due: installment ${cuota.number}`}
          </p>
        </div>
      </div>

      <Button
        type="button"
        onClick={handlePay}
        disabled={!isReady}
        isLoading={isRedirecting}
        hideArrow
        title={
          state.kind === 'unavailable'
            ? es
              ? 'Próximamente'
              : 'Coming soon'
            : undefined
        }
      >
        {label}
      </Button>

      {state.kind === 'unavailable' && (
        <p className="mt-3 text-xs text-fg-muted dark:text-fg-subtle">
          {es
            ? 'El pago de cuotas estará disponible pronto.'
            : 'Installment payments will be available soon.'}
        </p>
      )}

      <p className="mt-3 text-xs text-fg-subtle dark:text-fg-muted">
        {es
          ? 'Cuando pagues, el estado de la cuota queda en confirmando hasta que se verifique; se confirma en tu historial una vez validado. Cualquier recibo es un comprobante interno.'
          : 'After you pay, the installment stays confirming until verified; it is confirmed in your history once validated. Any receipt is an internal voucher.'}
      </p>
    </section>
  );
}

// ============================================================================
// Page shell
// ============================================================================

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f8f8f8] dark:bg-[#0e0e10]">
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
        <div className="w-12 h-12 rounded-xl bg-surface-muted dark:bg-[#2a2a2c] flex items-center justify-center flex-shrink-0">
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
      <section className="rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-[#1a1a1c] p-5 sm:p-6">
        <p className="text-xs text-fg-subtle dark:text-fg-muted">
          {es ? 'Total del acuerdo' : 'Agreement total'}
        </p>
        <p className="mt-1 text-2xl font-mono tabular-nums font-semibold text-fg dark:text-white">
          {formatCurrency(plan.totalDueCop)}
        </p>
      </section>

      {/* Cuota plan — verbatim installments (CuotaPlanTable) */}
      <section className="rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-[#1a1a1c] p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-fg dark:text-white mb-4">
          {es ? 'Plan de cuotas' : 'Installment plan'}
        </h2>
        <CuotaPlanTable installments={plan.installments} locale={locale} />
      </section>

      {/* Accept-by-signing (ACUE-02) — only while unaccepted; else a factual state */}
      {plan.acceptedAt === null ? (
        <section className="rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-[#1a1a1c] p-5 sm:p-6">
          <AcuerdoAcceptPanel planId={plan.planId} onAccepted={onAccepted} />
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
                  ? `Aceptaste este acuerdo el ${formatLongDate(plan.acceptedAt, locale)}.`
                  : `You accepted this agreement on ${formatLongDate(plan.acceptedAt, locale)}.`}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Pagar cuota (ACUE-03) — gated on getCuotaPaymentUrl; only for an accepted plan */}
      {nextCuota && (
        <CuotaPagoSection planId={plan.planId} cuota={nextCuota} locale={locale} />
      )}

      {/* State timeline — source-timestamp-only events */}
      <section className="rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-[#1a1a1c] p-5 sm:p-6">
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

export default function AcuerdoDetailPage({ params }: { params: { id: string } }) {
  const { locale } = useI18n();
  const { items, isLoading, error, refetch } = useTenantAcuerdos();

  // Own-only resolution (anti-IDOR, T-v7-07-14): filter the tenant's OWN list —
  // NO API call with the raw route id, NO fetch-by-id hook.
  const plan = items.find((p) => p.planId === params.id);

  // Loading gate — never flash a fake not-found while the source is in flight.
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8f8f8] dark:bg-[#0e0e10] flex items-center justify-center">
        <Spinner size="lg" variant="current" className="text-primary" />
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
      <AcuerdoDetailView plan={plan} locale={locale} onAccepted={refetch} />
    </PageShell>
  );
}
