'use client';

/**
 * casos/page.tsx — v7-03 (CASO-01 + CASO-03) "Mis casos" hub.
 *
 * A READ-ONLY hub that lets the tenant OPERATE the relationship in one place. It
 * consumes `useTenantCases()` (v7-03-01) — a projection of the tenant's existing
 * `/…/mine`-scoped sources — and renders each real case (pago + aplicación) as a
 * neutral status-badged row linking to its existing detail surface. It adds NO new
 * fetch and NO new authz.
 *
 * Guardrails (PITFALLS 8 / CASO-04, Ley 1480):
 *   - Badges are capped at NEUTRAL tone (secondary/default/warning) — never
 *     `destructive`/alarm, no countdown, no credit-bureau/urgency copy. The
 *     `CaseTone` type itself cannot express an alarm level.
 *   - "al día"/none → an honest neutral "Todo al día" empty-state, never a
 *     fabricated count or padded list.
 *   - "Más en tu portal" surfaces one REAL entry point per adjacent surface:
 *     Solicitudes (PQRS / mantenimiento → /inquilino/solicitudes) and Acuerdos
 *     (→ /inquilino/acuerdos). Those pages own their own honest empty/"Próximamente"
 *     state when their backend is not yet live — this hub never fabricates a count.
 *
 * CASO-03: in-app notifications are ALREADY real (`useTenantNotifications` →
 * `/notifications`, polling, `actionUrl` deep-links). The hub only SURFACES this
 * honestly (a strip linking to `/inquilino/notificaciones`) and labels
 * push/WhatsApp as a disabled "Próximamente" — no "push activado" state, no new
 * poller for cases here.
 */

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  CreditCard,
  FileText,
  ClipboardText,
  CaretRight,
  CheckCircle,
  Clock,
  Warning,
  Wrench,
  ChatCircle,
  Handshake,
  Bell,
  ArrowUpRight,
  XCircle,
  Lifebuoy,
  type Icon,
} from '@phosphor-icons/react';

import { useTenantCases } from '@/lib/hooks/use-tenant-cases';
import { useTenantNotifications } from '@/lib/hooks/useNotifications';
import { useOnboardingStatus } from '@/lib/hooks/use-onboarding-status';
import { useI18n } from '@/lib/i18n';
import { CompleteProfileFirst } from '@/components/tenant/CompleteProfileFirst';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import type { BadgeProps } from '@/components/ui/badge';
import type { CaseTone, CaseType, TenantCase } from '@/lib/types/tenant-case';

// ============================================================================
// Neutral mappers (view-only — never recompute a status)
// ============================================================================

/**
 * Case tone → neutral Badge presentation. Capped at `warning` (amber); there is
 * intentionally NO `destructive`/alarm mapping — pair icon + text, never color
 * alone (DESIGN.md §7).
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
  pqrs: ChatCircle,
  mantenimiento: Wrench,
  acuerdo: Handshake,
  contrato: FileText,
};

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
// Case row
// ============================================================================

function CaseRow({ c, index, locale }: { c: TenantCase; index: number; locale: string }) {
  const TypeIcon = TYPE_ICON[c.type] ?? ClipboardText;
  const badge = TONE_BADGE[c.tone];
  const ToneIcon = badge.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link href={c.detailLink} className="group block">
        <div className="rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-[#1a1a1c] p-4 sm:p-5 flex items-center gap-4 hover:border-border dark:hover:border-border-strong transition-colors">
          <div className="w-11 h-11 rounded-xl bg-surface-muted dark:bg-[#2a2a2c] flex items-center justify-center flex-shrink-0">
            <TypeIcon className="w-5 h-5 text-fg-muted dark:text-fg-subtle" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-semibold text-fg dark:text-white group-hover:text-primary transition-colors truncate">
                {c.titulo}
              </h3>
              <Badge variant={badge.variant} className="inline-flex items-center gap-1">
                <ToneIcon className="w-3 h-3" aria-hidden="true" />
                {c.estadoLabel}
              </Badge>
            </div>
            <p className="text-xs text-fg-muted dark:text-fg-subtle mt-1">
              {locale === 'es' ? 'Responsable' : 'Owner'}: {c.responsable}
              {' · '}
              {locale === 'es' ? 'Actualizado' : 'Updated'} {formatRelative(c.updatedAt, locale)}
            </p>
          </div>

          <CaretRight className="w-5 h-5 text-fg-subtle group-hover:text-primary transition-colors flex-shrink-0" />
        </div>
      </Link>
    </motion.div>
  );
}

// ============================================================================
// Page
// ============================================================================

export default function CasosPage() {
  const { locale } = useI18n();
  const { isComplete: isOnboardingComplete, isLoading: isOnboardingLoading } = useOnboardingStatus();
  const { cases, isLoading: isCasesLoading, error } = useTenantCases();
  // CASO-03: in-app notifications are already real; surface the unread count as a
  // subtle badge. This hook owns its own existing poll — no new poller is added here.
  const { unreadCount } = useTenantNotifications();

  // Loading gate — never flash a fake-empty while any source is in flight.
  if (isOnboardingLoading || isCasesLoading) {
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

  // Error gate — a single failed source has already degraded to [] upstream, so
  // this only fires on a hard aggregate failure.
  if (error) {
    return (
      <div className="min-h-screen bg-[#f8f8f8] dark:bg-[#0e0e10]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <EmptyState
            icon={XCircle}
            title={locale === 'es' ? 'Error al cargar tus casos' : 'Error loading your cases'}
            description={error}
            action={{ label: locale === 'es' ? 'Reintentar' : 'Retry', href: '/inquilino/casos' }}
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
          className="mb-8"
        >
          <h1 className="text-3xl font-medium text-fg dark:text-white tracking-tight">
            {locale === 'es' ? 'Mis casos' : 'My cases'}
          </h1>
          <p className="mt-1 text-fg-muted dark:text-fg-subtle">
            {locale === 'es'
              ? 'Tus pagos y postulaciones en curso, en un solo lugar.'
              : 'Your ongoing payments and applications, all in one place.'}
          </p>
        </motion.header>

        {/* CASO-03 — in-app notification strip (real) + push/WhatsApp Próximamente (honest) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-8 rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-[#161618] p-5 flex flex-col sm:flex-row sm:items-center gap-4"
        >
          <div className="w-10 h-10 rounded-xl bg-surface-muted dark:bg-[#2a2a2c] flex items-center justify-center flex-shrink-0">
            <Bell className="w-5 h-5 text-fg-muted dark:text-fg-subtle" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-fg dark:text-white">
              {locale === 'es'
                ? 'Te avisamos in-app cuando cambia el estado de un caso'
                : 'We notify you in-app when a case status changes'}
            </p>
            <p className="text-xs text-fg-muted dark:text-fg-subtle mt-0.5">
              {locale === 'es'
                ? 'Push y WhatsApp llegarán próximamente.'
                : 'Push and WhatsApp are coming soon.'}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Push / WhatsApp — disabled affordance, never an "activado" state */}
            <span
              className="inline-flex items-center gap-1.5 text-xs text-fg-subtle dark:text-fg-muted select-none"
              aria-disabled="true"
              title={locale === 'es' ? 'Aún no disponible' : 'Not available yet'}
            >
              <ChatCircle className="w-4 h-4" aria-hidden="true" />
              {locale === 'es' ? 'Push · WhatsApp — Próximamente' : 'Push · WhatsApp — Coming soon'}
            </span>
            <Link
              href="/inquilino/notificaciones"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:opacity-80 transition-opacity"
            >
              {locale === 'es' ? 'Ver notificaciones' : 'View notifications'}
              {unreadCount > 0 && (
                <Badge variant="default" className="ml-0.5 h-auto px-2 py-0.5 font-mono tabular-nums">
                  {unreadCount}
                </Badge>
              )}
              <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
        </motion.div>

        {/* Case list (CASO-01) — real rows, or an honest neutral "todo al día" empty */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-10"
        >
          {cases.length > 0 ? (
            <div className="space-y-3">
              {cases.map((c, index) => (
                <CaseRow key={c.id} c={c} index={index} locale={locale} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={CheckCircle}
              title={locale === 'es' ? 'Todo al día' : 'All caught up'}
              description={locale === 'es'
                ? 'No tienes casos abiertos por ahora.'
                : 'You have no open cases right now.'}
            />
          )}
        </motion.section>

        {/* More in the portal — one REAL entry point (Solicitudes) + honest Próximamente (Acuerdos) */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h2 className="text-sm font-mono uppercase tracking-wide text-fg-subtle dark:text-fg-muted mb-4">
            {locale === 'es' ? 'Más en tu portal' : 'More in your portal'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Real entry point — PQRS + mantenimiento now flow through /inquilino/solicitudes */}
            <Link
              href="/inquilino/solicitudes"
              className="group rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-[#1a1a1c] p-6 space-y-4 block hover:border-primary/40 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center flex-shrink-0">
                  <Lifebuoy className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-fg dark:text-white group-hover:text-primary transition-colors">
                    {locale === 'es' ? 'Solicitudes' : 'Requests'}
                  </h2>
                  <p className="text-sm text-fg-muted dark:text-fg-subtle">
                    {locale === 'es'
                      ? 'Abre y sigue tus solicitudes de mantenimiento y PQRS.'
                      : 'Open and track your maintenance requests and PQRS.'}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                {locale === 'es' ? 'Nueva solicitud' : 'New request'}
                <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
              </span>
            </Link>

            {/* Real entry point — approved acuerdos now flow through /inquilino/acuerdos */}
            <Link
              href="/inquilino/acuerdos"
              className="group rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-[#1a1a1c] p-6 space-y-4 block hover:border-primary/40 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center flex-shrink-0">
                  <Handshake className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-fg dark:text-white group-hover:text-primary transition-colors">
                    {locale === 'es' ? 'Acuerdos de pago' : 'Payment agreements'}
                  </h2>
                  <p className="text-sm text-fg-muted dark:text-fg-subtle">
                    {locale === 'es'
                      ? 'Consulta y gestiona tus acuerdos de pago.'
                      : 'Review and manage your payment agreements.'}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                {locale === 'es' ? 'Ver acuerdos' : 'View agreements'}
                <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
              </span>
            </Link>
          </div>
        </motion.section>

      </div>
    </div>
  );
}
