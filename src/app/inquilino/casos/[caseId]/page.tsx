'use client';

/**
 * casos/[caseId]/page.tsx — v7-03 (CASO-02) case detail + state timeline.
 *
 * A READ-ONLY detail surface for ONE tenant case. It resolves the case by
 * FILTERING the tenant's OWN aggregated `useTenantCases()` list by the route
 * `caseId` (`cases.find(c => c.id === caseId)`) — it NEVER fetches by the
 * tenant-supplied raw id, so own-cases-only / no-IDOR is inherited from the
 * JWT-scoped source hooks (CASO-02, threat T-v7-03-07). A caseId absent from the
 * tenant's own list (unknown OR foreign) renders an honest "Caso no encontrado"
 * empty-state — never a foreign fetch, never a leak.
 *
 * The state timeline renders `caso.events[]` EXACTLY as v7-03-01 derived them
 * (source timestamps only) via the generic `PlanActivityTimeline` — it does NOT
 * import or reuse the legacy client-synthesized application-events path, and it
 * neither invents, reorders, nor pads milestones (threat T-v7-03-08 / PITFALLS 2).
 *
 * Guardrails (PITFALLS 8 / CASO-04, Ley 1480): badge capped at neutral tone
 * (secondary/default/warning) — never `destructive`/alarm, no countdown, no
 * credit-bureau/urgency copy. Only `TenantCase` fields render — `responsable` is a
 * ROLE, the id is opaque; no internal responsible-party id, no agency notes
 * (threat T-v7-03-09). Dates are Colombian (es-CO). Additive — new route only.
 */

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  CreditCard,
  FileText,
  ClipboardText,
  CheckCircle,
  Clock,
  CalendarBlank,
  Warning,
  CaretLeft,
  MagnifyingGlass,
  ArrowUpRight,
  ChatCircle,
  XCircle,
  User,
  type Icon,
} from '@phosphor-icons/react';

import { useTenantCases } from '@/lib/hooks/use-tenant-cases';
import { resolveExpectedResponse } from '@/lib/date/business-days';
import { CostoResponsabilidadCard } from '@/components/tenant/CostoResponsabilidadCard';
import { useI18n } from '@/lib/i18n';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { PlanActivityTimeline, type TimelineItem } from '@/components/ui/plan/PlanActivityTimeline';
import type { BadgeProps } from '@/components/ui/badge';
import type { CaseTone, CaseType, TenantCase } from '@/lib/types/tenant-case';

// ============================================================================
// Neutral mappers (view-only — never recompute a status)
// ============================================================================

/**
 * Case tone → neutral Badge presentation. Capped at `warning` (amber); there is
 * intentionally NO `destructive`/alarm mapping — pair icon + text, never color
 * alone (DESIGN.md §7 A11y). Mirrors the hub (v7-03-02) exactly.
 */
const TONE_BADGE: Record<CaseTone, { variant: NonNullable<BadgeProps['variant']>; icon: Icon }> = {
  neutral: { variant: 'secondary', icon: CheckCircle },
  info: { variant: 'default', icon: Clock },
  attention: { variant: 'warning', icon: Warning },
};

/** Case type → leading icon tile. Only `pago`/`aplicacion` are emitted today. */
const TYPE_ICON: Record<CaseType, Icon> = {
  pago: CreditCard,
  aplicacion: FileText,
  pqrs: ClipboardText,
  mantenimiento: ClipboardText,
  acuerdo: ClipboardText,
  contrato: FileText,
};

/** Human "origen" label for the source out-link. */
function sourceLabel(type: CaseType, locale: string): string {
  if (type === 'pago') return locale === 'es' ? 'pagos' : 'payments';
  if (type === 'aplicacion') return locale === 'es' ? 'la postulación' : 'the application';
  return locale === 'es' ? 'el origen' : 'the source';
}

/** Relative "hace N …" label from a real source timestamp (es-CO / en-US). */
function formatRelative(iso: string, locale: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const rtf = new Intl.RelativeTimeFormat(locale === 'es' ? 'es-CO' : 'en-US', { numeric: 'auto' });
  const sec = Math.round((then - Date.now()) / 1000);
  const min = Math.round(sec / 60);
  const hr = Math.round(min / 60);
  const day = Math.round(hr / 24);
  if (Math.abs(sec) < 60) return rtf.format(sec, 'second');
  if (Math.abs(min) < 60) return rtf.format(min, 'minute');
  if (Math.abs(hr) < 24) return rtf.format(hr, 'hour');
  if (Math.abs(day) < 30) return rtf.format(day, 'day');
  const month = Math.round(day / 30);
  if (Math.abs(month) < 12) return rtf.format(month, 'month');
  return rtf.format(Math.round(month / 12), 'year');
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
      href="/inquilino/casos"
      className="inline-flex items-center gap-1.5 text-sm text-fg-muted dark:text-fg-subtle hover:text-fg dark:hover:text-white transition-colors mb-6"
    >
      <CaretLeft className="w-4 h-4" aria-hidden="true" />
      {locale === 'es' ? 'Volver a Mis casos' : 'Back to My cases'}
    </Link>
  );
}

// ============================================================================
// Resolved detail
// ============================================================================

function CaseDetail({ caso, locale }: { caso: TenantCase; locale: string }) {
  const badge = TONE_BADGE[caso.tone];
  const ToneIcon = badge.icon;
  const TypeIcon = TYPE_ICON[caso.type] ?? ClipboardText;

  // Timeline from SOURCE TIMESTAMPS only — map CaseEvent[] → TimelineItem[]
  // as-is; never synthesize, reorder-invent, or pad (T-v7-03-08 / PITFALLS 2).
  const timelineItems: TimelineItem[] = caso.events.map((e) => ({
    id: e.id,
    title: e.label,
    timestamp: e.timestamp,
    icon: TypeIcon,
  }));

  // "Respuesta esperada" (SOLI-03) — computed ONLY for PQRS/mantenimiento cases
  // that carry `caso.solicitud` metadata. Two-tier: the authoritative server
  // `slaVenceAt` wins; otherwise a soft, weekday-only estimate labeled "estimado".
  // Never blank, neutral tone — no countdown, no red styling, no "vence el".
  const sla = caso.solicitud
    ? resolveExpectedResponse(caso.solicitud.createdAt, caso.solicitud.slaVenceAt)
    : null;
  const slaDate = sla
    ? new Intl.DateTimeFormat(locale === 'es' ? 'es-CO' : 'en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(sla.date)
    : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header — title + neutral status badge */}
      <header className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-surface-muted dark:bg-[#2a2a2c] flex items-center justify-center flex-shrink-0">
          <TypeIcon className="w-6 h-6 text-fg-muted dark:text-fg-subtle" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-medium text-fg dark:text-white tracking-tight">
            {caso.titulo}
          </h1>
          <div className="mt-2">
            <Badge variant={badge.variant} className="inline-flex items-center gap-1">
              <ToneIcon className="w-3 h-3" aria-hidden="true" />
              {caso.estadoLabel}
            </Badge>
          </div>
        </div>
      </header>

      {/* Summary card — role responsable + relative updatedAt + source out-link */}
      <section className="rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-[#1a1a1c] p-5 sm:p-6 space-y-4">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-2.5">
            <User className="w-4 h-4 text-fg-subtle flex-shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <dt className="text-xs text-fg-subtle dark:text-fg-muted">
                {locale === 'es' ? 'Responsable' : 'Owner'}
              </dt>
              <dd className="text-sm font-medium text-fg dark:text-white truncate">
                {caso.responsable}
              </dd>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-fg-subtle flex-shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <dt className="text-xs text-fg-subtle dark:text-fg-muted">
                {locale === 'es' ? 'Actualizado' : 'Updated'}
              </dt>
              <dd className="text-sm font-medium text-fg dark:text-white">
                {formatRelative(caso.updatedAt, locale)}
              </dd>
            </div>
          </div>

          {/* Respuesta esperada (SOLI-03) — gated on solicitud metadata; never blank. */}
          {sla && (
            <div className="flex items-center gap-2.5">
              <CalendarBlank className="w-4 h-4 text-fg-subtle flex-shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <dt className="text-xs text-fg-subtle dark:text-fg-muted">
                  {locale === 'es' ? 'Respuesta esperada' : 'Expected response'}
                </dt>
                <dd className="text-sm font-medium text-fg dark:text-white">
                  {sla.estimated
                    ? locale === 'es'
                      ? `Respuesta estimada hacia el ${slaDate}`
                      : `Estimated response around ${slaDate}`
                    : locale === 'es'
                      ? `Respuesta a más tardar el ${slaDate}`
                      : `Response by ${slaDate}`}
                  {sla.estimated && (
                    <span
                      className="ml-1.5 font-normal text-fg-subtle dark:text-fg-muted"
                      title={
                        locale === 'es'
                          ? 'Fecha estimada; tu inmobiliaria confirma la definitiva.'
                          : 'Estimated date; your agency confirms the final one.'
                      }
                    >
                      · {locale === 'es' ? 'estimado' : 'estimate'}
                    </span>
                  )}
                </dd>
              </div>
            </div>
          )}
        </dl>

        <div className="pt-1 flex flex-wrap items-center gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link href={caso.sourceLink} className="inline-flex items-center gap-1.5">
              {locale === 'es'
                ? `Ver en ${sourceLabel(caso.type, locale)}`
                : `View in ${sourceLabel(caso.type, locale)}`}
              <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </Button>
          {/*
            Real "contactar" affordance for the case → the messages INBOX only.
            TenantCase carries no applicationId/leaseId, so we deep-link to the
            inbox and NEVER fabricate a preselected thread (no fabricated query param).
          */}
          <Button asChild variant="secondary" size="sm">
            <Link href="/inquilino/mensajes" className="inline-flex items-center gap-1.5">
              <ChatCircle className="w-4 h-4" aria-hidden="true" />
              {locale === 'es' ? 'Escribir a la inmobiliaria' : 'Message the agency'}
            </Link>
          </Button>
        </div>
      </section>

      {/* Ley 820 cost responsibility + approve-only quote affordance (SOLI-04) —
          shown only for PQRS cases with a backend-set cost determination. */}
      {caso.solicitud && caso.solicitud.costoResponsable && (
        <CostoResponsabilidadCard caseId={caso.id} solicitud={caso.solicitud} />
      )}

      {/* State timeline (CASO-02 core) — source-timestamp-only events */}
      <section className="rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-[#1a1a1c] p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-fg dark:text-white mb-4">
          {locale === 'es' ? 'Historial' : 'Timeline'}
        </h2>
        <PlanActivityTimeline
          items={timelineItems}
          emptyMessage={locale === 'es' ? 'Sin actividad registrada' : 'No activity recorded'}
        />
      </section>
    </motion.div>
  );
}

// ============================================================================
// Page
// ============================================================================

export default function CaseDetailPage({ params }: { params: { caseId: string } }) {
  const { locale } = useI18n();
  const { cases, isLoading, error } = useTenantCases();

  // Own-cases-only resolution (CASO-02 / T-v7-03-07): filter the tenant's OWN
  // aggregated list — NO API call with the raw route id, NO fetch-by-id hook.
  const caso = cases.find((c) => c.id === params.caseId);

  // Loading gate — never flash a fake not-found while any source is in flight.
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8f8f8] dark:bg-[#0e0e10] flex items-center justify-center">
        <Spinner size="lg" variant="current" className="text-primary" />
      </div>
    );
  }

  // Hard aggregate failure (a single failed source already degraded to [] upstream).
  if (error) {
    return (
      <PageShell>
        <BackLink locale={locale} />
        <EmptyState
          icon={XCircle}
          title={locale === 'es' ? 'Error al cargar el caso' : 'Error loading case'}
          description={error}
          action={{ label: locale === 'es' ? 'Volver a Mis casos' : 'Back to My cases', href: '/inquilino/casos' }}
        />
      </PageShell>
    );
  }

  // Honest not-found — covers an unknown id AND a foreign id (never fetched).
  if (!caso) {
    return (
      <PageShell>
        <BackLink locale={locale} />
        <EmptyState
          icon={MagnifyingGlass}
          title={locale === 'es' ? 'Caso no encontrado' : 'Case not found'}
          description={
            locale === 'es'
              ? 'Este caso no está en tu lista. Puede que ya no esté abierto o que el enlace no sea válido.'
              : 'This case is not in your list. It may no longer be open, or the link may be invalid.'
          }
          action={{ label: locale === 'es' ? 'Volver a Mis casos' : 'Back to My cases', href: '/inquilino/casos' }}
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <BackLink locale={locale} />
      <CaseDetail caso={caso} locale={locale} />
    </PageShell>
  );
}
