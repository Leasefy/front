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

import { use } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useEntradaTrasCargar, type EntradaTrasCargar } from '@/components/portales/use-entrada-tras-cargar';
import {
  CreditCard,
  FileText,
  ClipboardText,
  CheckCircle,
  Clock,
  CalendarBlank,
  Warning,
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
import { BackButton } from '@/components/ui/back-button';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { AvisoDeFuentesCaidas } from '@/components/portales/AvisoDeFuentesCaidas';
import { EsqueletoDePagina } from '@/components/estado/EsqueletoDePagina';
import { PlanActivityTimeline, type TimelineItem } from '@/components/ui/plan/PlanActivityTimeline';
import type { BadgeProps } from '@/components/ui/badge';
import type { CaseTone, CaseType, TenantCase } from '@/lib/types/tenant-case';
import { RespuestaYArchivosDelCaso } from '@/components/tenant/RespuestaYArchivosDelCaso';

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
    <div className="min-h-screen bg-bg">
      <div className="max-w-3xl p-6 lg:p-8">{children}</div>
    </div>
  );
}

/**
 * GLOW UP (21-10-2026): la vuelta lleva a la lista de donde se viene. Una
 * solicitud (PQRS o mantenimiento) se abre desde «Solicitudes»; lo demás
 * (pagos, postulaciones) desde «Mis casos».
 */
function volverA(caso: TenantCase | undefined, locale: string): { href: string; label: string } {
  const esSolicitud = caso?.type === 'pqrs' || caso?.type === 'mantenimiento';
  if (esSolicitud) {
    return { href: '/inquilino/solicitudes', label: locale === 'es' ? 'Volver a Solicitudes' : 'Back to Requests' };
  }
  return { href: '/inquilino/casos', label: locale === 'es' ? 'Volver a Mis casos' : 'Back to My cases' };
}

function BackLink({ locale, caso }: { locale: string; caso?: TenantCase }) {
  const v = volverA(caso, locale);
  return (
    <div className="mb-6" data-testid="caso-volver">
      <BackButton href={v.href} label={v.label} />
    </div>
  );
}

// ============================================================================
// Resolved detail
// ============================================================================

function CaseDetail({
  caso,
  locale,
  entrada,
}: {
  caso: TenantCase;
  locale: string;
  /** Carga → contenido: la entrada de 4 px si se vio el esqueleto (si no, quieto). */
  entrada: EntradaTrasCargar;
}) {
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
  // Never blank, neutral tone — no live countdown, no red styling, no hard
  // deadline framing on the estimate (soft "hacia el …", not a due-date claim).
  // SO-06: ya respondida, resuelta o cerrada, «Respuesta esperada» ya no aplica.
  const yaRespondida =
    !!caso.solicitud?.respuesta ||
    caso.solicitud?.estado === 'resuelta' ||
    caso.solicitud?.estado === 'cerrada';
  const sla = caso.solicitud && !yaRespondida
    ? resolveExpectedResponse(caso.solicitud.createdAt, caso.solicitud.slaVenceAt)
    : null;
  const slaDate = sla
    ? new Intl.DateTimeFormat(locale === 'es' ? 'es-CO' : 'en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(sla.date)
    : '';

  // GLOW UP (21-10-2026): la pantalla en el orden del trabajo — «¿en qué va mi
  // solicitud y qué me toca?». Lo que le toca hacer al inquilino (aprobar la
  // cotización) va primero; después en qué va y la respuesta; el historial al final.
  const teTocaAprobar =
    caso.solicitud?.costoResponsable === 'inquilino' &&
    caso.solicitud?.estado === 'en_cotizacion' &&
    !caso.solicitud?.cotizacionAprobadaAt;
  const tarjetaDelCosto =
    caso.solicitud && caso.solicitud.costoResponsable ? (
      <div data-testid={teTocaAprobar ? 'caso-te-toca-aprobar' : 'caso-costo'}>
        <CostoResponsabilidadCard caseId={caso.id} solicitud={caso.solicitud} />
      </div>
    ) : null;
  // «Ver en …» sólo cuando lleva a otra parte (no a la misma lista de la vuelta).
  const verEnElOrigen =
    caso.sourceLink !== '/inquilino/solicitudes' && caso.sourceLink !== '/inquilino/casos';

  return (
    <motion.div {...entrada} className="space-y-6">
      <EncabezadoDePantalla
        seccion={locale === 'es' ? 'Mi arriendo' : 'My rental'}
        titulo={caso.titulo}
        junto={
          <Badge variant={badge.variant} className="inline-flex items-center gap-1" data-testid="caso-estado">
            <ToneIcon className="w-3 h-3" aria-hidden="true" />
            {caso.estadoLabel}
          </Badge>
        }
        descripcion={
          caso.solicitud?.radicado ? (
            <span className="font-mono" data-testid="caso-radicado">
              {caso.solicitud.radicado}
            </span>
          ) : undefined
        }
        acciones={
          <>
            {verEnElOrigen ? (
              <Button asChild variant="outline" size="sm" hideArrow>
                <Link href={caso.sourceLink} className="inline-flex items-center gap-1.5" data-testid="caso-ver-en-origen">
                  {locale === 'es'
                    ? `Ver en ${sourceLabel(caso.type, locale)}`
                    : `View in ${sourceLabel(caso.type, locale)}`}
                </Link>
              </Button>
            ) : null}
            {/*
              Real "contactar" affordance for the case → the messages INBOX only.
              TenantCase carries no applicationId/leaseId, so we deep-link to the
              inbox and NEVER fabricate a preselected thread (no fabricated query param).
            */}
            <Button asChild variant="outline" size="sm" hideArrow>
              <Link href="/inquilino/mensajes" className="inline-flex items-center gap-1.5" data-testid="caso-escribir">
                <ChatCircle className="w-4 h-4" aria-hidden="true" />
                {locale === 'es' ? 'Escribir a la inmobiliaria' : 'Message the agency'}
              </Link>
            </Button>
          </>
        }
      />

      {/* Lo que te toca: aprobar la cotización (SOLI-04), antes que todo lo demás. */}
      {teTocaAprobar ? tarjetaDelCosto : null}

      {/* En qué va — quién la atiende, cuándo se movió y cuándo se espera respuesta. */}
      <section
        className="rounded-lg border border-border bg-surface p-5 sm:p-6"
        aria-label={locale === 'es' ? 'En qué va' : 'Status'}
        data-testid="caso-en-que-va"
      >
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-2.5">
            <User className="w-4 h-4 text-fg-subtle flex-shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <dt className="text-caption text-fg-subtle">
                {locale === 'es' ? 'Responsable' : 'Owner'}
              </dt>
              <dd className="text-sm font-medium text-fg truncate">
                {caso.responsable}
              </dd>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-fg-subtle flex-shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <dt className="text-caption text-fg-subtle">
                {locale === 'es' ? 'Actualizado' : 'Updated'}
              </dt>
              <dd className="text-sm font-medium text-fg">
                {formatRelative(caso.updatedAt, locale)}
              </dd>
            </div>
          </div>

          {/* Respuesta esperada (SOLI-03) — gated on solicitud metadata; never blank. */}
          {sla && (
            <div className="flex items-center gap-2.5">
              <CalendarBlank className="w-4 h-4 text-fg-subtle flex-shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <dt className="text-caption text-fg-subtle">
                  {locale === 'es' ? 'Respuesta esperada' : 'Expected response'}
                </dt>
                <dd className="text-sm font-medium text-fg">
                  {sla.estimated
                    ? locale === 'es'
                      ? `Respuesta estimada hacia el ${slaDate}`
                      : `Estimated response around ${slaDate}`
                    : locale === 'es'
                      ? `Respuesta a más tardar el ${slaDate}`
                      : `Response by ${slaDate}`}
                  {sla.estimated && (
                    <span
                      className="ml-1.5 font-normal text-fg-subtle"
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
      </section>

      {/* SO-06/SO-18 (PQRS-FIX): la respuesta de la inmobiliaria y los archivos. */}
      {caso.solicitud && (caso.solicitud.respuesta || caso.solicitud.adjuntos !== undefined) && (
        <RespuestaYArchivosDelCaso caseId={caso.id} solicitud={caso.solicitud} />
      )}

      {/* Ley 820: quién paga — informativo cuando no hay nada que aprobar. */}
      {teTocaAprobar ? null : tarjetaDelCosto}

      {/* State timeline (CASO-02 core) — source-timestamp-only events */}
      <section
        className="rounded-lg border border-border bg-surface p-5 sm:p-6"
        data-testid="caso-historial"
      >
        <h2 className="text-sm font-medium text-fg mb-4">
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

export default function CaseDetailPage(props: { params: Promise<{ caseId: string }> }) {
  const params = use(props.params);
  const { locale } = useI18n();
  const { cases, isLoading, error, fuentesQueFallaron, refetch } = useTenantCases();

  // Own-cases-only resolution (CASO-02 / T-v7-03-07): filter the tenant's OWN
  // aggregated list — NO API call with the raw route id, NO fetch-by-id hook.
  const caso = cases.find((c) => c.id === params.caseId);

  // Carga → contenido: el caso entra con 4 px sólo si se vio el esqueleto.
  const entrada = useEntradaTrasCargar(isLoading);

  // Loading gate — never flash a fake not-found while any source is in flight.
  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg">
        {/* Dentro del panel va el esqueleto, no el logo (Nico, 01-10: «el logo sólo en cargas de pantalla completa»). */}
        <EsqueletoDePagina variante="detail" className="mx-auto max-w-3xl" />
      </div>
    );
  }

  // GLOW UP (21-10-2026): si el caso llegó, se muestra aunque otra fuente haya
  // fallado; el error de pantalla completa es sólo cuando NO está y algo falló.
  if (error && !caso) {
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
      <BackLink locale={locale} caso={caso} />
      <AvisoDeFuentesCaidas fuentes={fuentesQueFallaron} locale={locale} onReintentar={refetch} className="mb-6" />
      <CaseDetail caso={caso} locale={locale} entrada={entrada} />
    </PageShell>
  );
}
