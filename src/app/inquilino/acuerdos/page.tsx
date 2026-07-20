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
 * dark:bg-[#0e0e10]` + `max-w-7xl`). Neutral tone only (no red, no countdown, no
 * credit-bureau copy). Buttons/labels sentence case (DESIGN §4).
 */

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Scroll,
  CaretRight,
  CheckCircle,
  Clock,
  Warning,
  XCircle,
  type Icon,
} from '@phosphor-icons/react';

import { useTenantAcuerdos } from '@/lib/hooks/use-tenant-acuerdos';
import { useOnboardingStatus } from '@/lib/hooks/use-onboarding-status';
import { useI18n } from '@/lib/i18n';
import { CompleteProfileFirst } from '@/components/tenant/CompleteProfileFirst';
import { CuotaPlanTable } from '@/components/tenant/CuotaPlanTable';
import { SolicitarPlanPagoModal } from '@/components/tenant/SolicitarPlanPagoModal';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { BadgeProps } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { acuerdoStatusToTone, acuerdoStatusToLabel } from '@/lib/types/tenant-case';
import type { CaseTone } from '@/lib/types/tenant-case';
import type { AcuerdoDetail } from '@/lib/api/tenant-acuerdos.types';

// ============================================================================
// Neutral tone → badge (capped at `warning`; no alarm level at all)
// ============================================================================

const TONE_BADGE: Record<CaseTone, { variant: NonNullable<BadgeProps['variant']>; icon: Icon }> = {
  neutral: { variant: 'secondary', icon: CheckCircle },
  info: { variant: 'default', icon: Clock },
  attention: { variant: 'warning', icon: Warning },
};

// ============================================================================
// Acuerdo row — plan header (link to detail) + verbatim cuota plan
// ============================================================================

function AcuerdoRow({ p, index, locale }: { p: AcuerdoDetail; index: number; locale: string }) {
  const { formatCurrency } = useI18n();
  const badge = TONE_BADGE[acuerdoStatusToTone(p.status)];
  const ToneIcon = badge.icon;
  const nCuotas = p.installments.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link href={`/inquilino/acuerdos/${encodeURIComponent(p.planId)}`} className="group block">
        <div className="rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-[#1a1a1c] p-4 sm:p-5 hover:border-primary/40 transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-surface-muted dark:bg-[#2a2a2c] flex items-center justify-center flex-shrink-0">
              <Scroll className="w-5 h-5 text-fg-muted dark:text-fg-subtle" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-semibold text-fg dark:text-white group-hover:text-primary transition-colors truncate">
                  {locale === 'es' ? 'Acuerdo de pago' : 'Payment agreement'}
                </h3>
                <Badge variant={badge.variant} className="inline-flex items-center gap-1">
                  <ToneIcon className="w-3 h-3" aria-hidden="true" />
                  {acuerdoStatusToLabel(p.status)}
                </Badge>
              </div>
              <p className="text-xs text-fg-muted dark:text-fg-subtle mt-1">
                <span className="font-mono tabular-nums text-fg dark:text-white">
                  {formatCurrency(p.totalDueCop)}
                </span>
                {' · '}
                {locale === 'es'
                  ? `${nCuotas} ${nCuotas === 1 ? 'cuota' : 'cuotas'}`
                  : `${nCuotas} ${nCuotas === 1 ? 'installment' : 'installments'}`}
              </p>
            </div>

            <CaretRight className="w-5 h-5 text-fg-subtle group-hover:text-primary transition-colors flex-shrink-0" />
          </div>

          {/* Cuota plan — rendered VERBATIM from the record (no saldo math) */}
          {nCuotas > 0 && (
            <div className="mt-4 pt-4 border-t border-border dark:border-border-strong">
              <CuotaPlanTable installments={p.installments} locale={locale} />
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

// ============================================================================
// Page
// ============================================================================

export default function AcuerdosPage() {
  const { locale } = useI18n();
  const { isComplete: isOnboardingComplete, isLoading: isOnboardingLoading } = useOnboardingStatus();
  const { items, isLoading, error, refetch } = useTenantAcuerdos();

  // The only mutation entry point on this read surface: propose a payment plan.
  const [requestOpen, setRequestOpen] = useState(false);

  // Loading gate — never flash a fake-empty while a source is in flight.
  if (isOnboardingLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#f8f8f8] dark:bg-[#0e0e10] flex items-center justify-center">
        <Spinner size="lg" variant="current" className="text-primary" />
      </div>
    );
  }

  // Onboarding gate.
  if (!isOnboardingComplete) {
    return (
      <div className="min-h-screen bg-[#f8f8f8] dark:bg-[#0e0e10]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <CompleteProfileFirst context="rental" />
        </div>
      </div>
    );
  }

  // Error gate — a not-live source already degraded to [] upstream, so this only
  // fires on a genuine (non-404/403/0) failure.
  if (error) {
    return (
      <div className="min-h-screen bg-[#f8f8f8] dark:bg-[#0e0e10]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <EmptyState
            icon={XCircle}
            title={locale === 'es' ? 'Error al cargar tus acuerdos' : 'Error loading your agreements'}
            description={error}
            action={{ label: locale === 'es' ? 'Reintentar' : 'Retry', href: '/inquilino/acuerdos' }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f8f8] dark:bg-[#0e0e10]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">

        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
        >
          <div>
            <h1 className="text-3xl font-medium text-fg dark:text-white tracking-tight">
              {locale === 'es' ? 'Acuerdos de pago' : 'Payment agreements'}
            </h1>
            <p className="mt-1 text-fg-muted dark:text-fg-subtle">
              {locale === 'es'
                ? 'Consulta los acuerdos de pago aprobados por tu inmobiliaria y su plan de cuotas.'
                : 'Review the payment agreements approved by your agency and their installment plan.'}
            </p>
          </div>
          <Button
            type="button"
            onClick={() => setRequestOpen(true)}
            hideArrow
            className="flex-shrink-0"
          >
            {locale === 'es' ? 'Solicitar un plan de pago' : 'Request a payment plan'}
          </Button>
        </motion.header>

        {/* List — real own-acuerdos, or an honest empty-state (incl. not-live []) */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {items.length > 0 ? (
            <div className="space-y-3">
              {items.map((p, index) => (
                <AcuerdoRow key={p.planId} p={p} index={index} locale={locale} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-5">
              <EmptyState
                icon={Scroll}
                title={locale === 'es' ? 'Aún no tienes acuerdos de pago' : 'No payment agreements yet'}
                description={
                  locale === 'es'
                    ? 'Cuando tu inmobiliaria te apruebe un acuerdo, aparecerá aquí con su plan de cuotas.'
                    : 'When your agency approves an agreement, it will show up here with its installment plan.'
                }
              />
              <Button type="button" onClick={() => setRequestOpen(true)} hideArrow>
                {locale === 'es' ? 'Solicitar un plan de pago' : 'Request a payment plan'}
              </Button>
            </div>
          )}
        </motion.section>
      </div>

      {/* Propose-a-plan modal — intent only; the agency defines and approves terms. */}
      <SolicitarPlanPagoModal
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        onRequested={refetch}
      />
    </div>
  );
}
