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

import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { VistasDeLaPestana, VISTAS_DE_SOLICITUDES } from '@/components/portales/VistasDeLaPestana';
import { AvisoDeFuentesCaidas } from '@/components/portales/AvisoDeFuentesCaidas';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AnimatedNumber } from '@leasefy/cadence';
import { useEntradaTrasCargar } from '@/components/portales/use-entrada-tras-cargar';
import {
  CreditCard,
  FileText,
  ClipboardText,
  CheckCircle,
  Wrench,
  ChatCircle,
  Handshake,
  XCircle,
  type Icon,
} from '@phosphor-icons/react';

import { useTenantCases } from '@/lib/hooks/use-tenant-cases';
import { useTenantNotifications } from '@/lib/hooks/useNotifications';
import { useOnboardingStatus } from '@/lib/hooks/use-onboarding-status';
import { useI18n } from '@/lib/i18n';
import { CompleteProfileFirst } from '@/components/tenant/CompleteProfileFirst';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge } from '@leasefy/cadence';
import { Button } from '@/components/ui/button';
import { EsqueletoDePagina } from '@/components/estado/EsqueletoDePagina';
import type { CaseTone, CaseType, TenantCase } from '@/lib/types/tenant-case';

// ============================================================================
// Neutral mappers (view-only — never recompute a status)
// ============================================================================

/**
 * Case tone → neutral Badge presentation. Capped at `warning` (amber); there is
 * intentionally NO `destructive`/alarm mapping — pair icon + text, never color
 * alone (DESIGN.md §7).
 */
// Glow up 22-10: el estado con su punto y su palabra (StatusBadge). Tope en ámbar: nunca rojo.
const TONO_DEL_CASO: Record<CaseTone, 'neutral' | 'info' | 'warning'> = {
  neutral: 'neutral',
  info: 'info',
  attention: 'warning',
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

function CaseRow({ c, locale }: { c: TenantCase; locale: string }) {
  const TypeIcon = TYPE_ICON[c.type] ?? ClipboardText;

  return (
    <div>
      <Link href={c.detailLink} className="group block">
        <div className="rounded-lg border border-border bg-surface p-4 sm:p-5 flex items-center gap-4 hover:bg-surface-muted/40 transition-colors">
          <TypeIcon className="w-5 h-5 text-fg-muted shrink-0" aria-hidden="true" />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-medium text-fg group-hover:text-primary transition-colors truncate">
                {c.titulo}
              </h3>
              {/* SO-20: el número de radicado también en la lista. */}
              {c.solicitud?.radicado && (
                <span className="font-mono text-caption text-fg-muted" data-testid="caso-radicado-lista">
                  {c.solicitud.radicado}
                </span>
              )}
              <StatusBadge tone={TONO_DEL_CASO[c.tone]}>{c.estadoLabel}</StatusBadge>
            </div>
            <p className="text-caption text-fg-muted mt-1">
              {locale === 'es' ? 'Responsable' : 'Owner'}: {c.responsable}
              {' · '}
              {locale === 'es' ? 'Actualizado' : 'Updated'} {formatRelative(c.updatedAt, locale)}
            </p>
          </div>

        </div>
      </Link>
    </div>
  );
}

// ============================================================================
// Page
// ============================================================================

export default function CasosPage() {
  const { locale } = useI18n();
  const { isComplete: isOnboardingComplete, isLoading: isOnboardingLoading } = useOnboardingStatus();
  const { cases, isLoading: isCasesLoading, error, fuentesQueFallaron, todasFallaron, puedeRadicar, refetch } = useTenantCases();
  // CASO-03: in-app notifications are already real; surface the unread count as a
  // subtle badge. This hook owns its own existing poll — no new poller is added here.
  const { unreadCount } = useTenantNotifications();

  // Carga → contenido: entra con 4 px sólo si se vio el esqueleto.
  const entrada = useEntradaTrasCargar(isOnboardingLoading || isCasesLoading);

  // Loading gate — never flash a fake-empty while any source is in flight.
  if (isOnboardingLoading || isCasesLoading) {
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

  // Error gate — GLOW UP (21-10-2026): sólo si NO llegó ninguna fuente. Si
  // falló una (el asistente caído deja sin acuerdos), se muestra lo que llegó
  // y el aviso dice qué faltó (`AvisoDeFuentesCaidas`, abajo del encabezado).
  if (error && todasFallaron) {
    return (
      <div className="min-h-screen bg-bg">
        <div className="p-6 lg:p-8">
          {/* Glow up 22-10: el encabezado se queda con el error (se sabe dónde se está) y «Reintentar» vuelve a
              pedir los casos (antes recargaba la ruta). */}
          <EncabezadoDePantalla
            className="mb-8"
            seccion={locale === 'es' ? 'Mi arriendo' : 'My rental'}
            titulo={locale === 'es' ? 'Solicitudes' : 'Requests'}
          />
          <VistasDeLaPestana
            className="mb-8"
            etiqueta={locale === 'es' ? 'En curso o radicadas' : 'In progress or filed'}
            actual="/inquilino/casos"
            vistas={VISTAS_DE_SOLICITUDES(locale === 'es')}
          />
          <EmptyState
            icon={XCircle}
            title={locale === 'es' ? 'Error al cargar tus casos' : 'Error loading your cases'}
            description={error}
            action={{ label: locale === 'es' ? 'Reintentar' : 'Retry', onClick: () => void refetch() }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <motion.div {...entrada} className="space-y-6 p-6 lg:p-8">

        {/* C3 (revisora r25): el título es el de la pestaña («Solicitudes»), y debajo se pasa de lo que está en curso
            a lo radicado (antes «Mis casos» con «Ver mis solicitudes» como botón). «Nueva solicitud» sólo si se puede
            radicar: sin contrato vigente llevaba a un botón apagado. */}
        <EncabezadoDePantalla
          className="mb-6"
          seccion={locale === 'es' ? 'Mi arriendo' : 'My rental'}
          titulo={locale === 'es' ? 'Solicitudes' : 'Requests'}
          descripcion={
            locale === 'es'
              ? 'Lo que tienes en curso con tu inmobiliaria: solicitudes, pagos y postulaciones, con su estado.'
              : 'What you have in progress with your property manager: requests, payments and applications, with their status.'
          }
          accionPrincipal={
            puedeRadicar ? (
              <Button asChild size="sm" hideArrow className="max-lg:flex-1">
                <Link href="/inquilino/solicitudes?nueva=1">{locale === 'es' ? 'Nueva solicitud' : 'New request'}</Link>
              </Button>
            ) : undefined
          }
        />
        <VistasDeLaPestana
          className="mb-6"
          etiqueta={locale === 'es' ? 'En curso o radicadas' : 'In progress or filed'}
          actual="/inquilino/casos"
          vistas={VISTAS_DE_SOLICITUDES(locale === 'es')}
        />

        <AvisoDeFuentesCaidas fuentes={fuentesQueFallaron} locale={locale} onReintentar={refetch} className="mb-6" />

        {/* CASO-03 — el aviso dentro del portal (real); sin promesas de push ni WhatsApp (QA-INQ-95). Glow up 22-10:
            una línea bajo el encabezado, no una tarjeta con su campana del mismo peso que los casos. */}
        {/* Revisora r25: una línea corta (antes ≈110 caracteres que repetían la campana). Sólo con avisos sin leer. */}
        {unreadCount > 0 && (
          <p className="mb-6 text-sm text-fg-muted" data-testid="aviso-de-notificaciones">
            {/* El conteo llega por sondeo: cuando cambia, cuenta. */}
            <span className="font-mono tabular-nums text-fg"><AnimatedNumber value={unreadCount} /></span>{' '}
            {locale === 'es' ? (unreadCount === 1 ? 'aviso sin leer' : 'avisos sin leer') : unreadCount === 1 ? 'unread notice' : 'unread notices'}
            {' · '}
            <Link href="/inquilino/notificaciones" className="font-medium text-fg underline underline-offset-4 hover:text-primary">
              {locale === 'es' ? 'Ver' : 'View'}
            </Link>
          </p>
        )}

        {/* Case list (CASO-01) — real rows, or an honest neutral "todo al día" empty */}
        <section className="mb-10">
          {cases.length > 0 ? (
            <div className="space-y-3">
              {cases.map((c) => (
                <CaseRow key={c.id} c={c} locale={locale} />
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
        </section>

        {/* Glow up 22-10: aquí iba «Más en tu portal» con dos tarjetas: Acuerdos (ya es una pestaña de «Mi arriendo»)
            y Solicitudes (mantenimiento y PQRS), que pasa al encabezado: «Nueva solicitud» y «Ver mis solicitudes». */}
      </motion.div>
    </div>
  );
}
