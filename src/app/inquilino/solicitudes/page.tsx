'use client';

/**
 * solicitudes/page.tsx — v7-06-03 (SOLI-03) the tenant CREATE + LIST surface.
 *
 * Hosts the "Nueva solicitud" Dialog (`NuevaSolicitudModal`) and lists the tenant's
 * OWN requests via `useTenantPqrs` (→ `pqrsApi.listMine()`, which degrades to `[]`
 * when the backend is not live — so an unavailable backend yields an HONEST
 * empty-state, never a fabricated row).
 *
 * Per-row expected-response (SOLI-03): `resolveExpectedResponse(createdAt, slaVenceAt)`
 * — the authoritative `slaVenceAt` when present, else the interim weekday-only estimate
 * labeled "estimado". NEVER blank, NEVER a red ticking-timer badge; neutral tone only
 * (Ley 1480 / PITFALLS 8). Each row DEEP-LINKS to the unified `/inquilino/casos/[id]`
 * detail — the timeline is NOT duplicated here.
 *
 * Shell + gates are copied from `casos/page.tsx` (Spinner loading → onboarding
 * `CompleteProfileFirst` → error `EmptyState`; `min-h-screen bg-[#f8f8f8]
 * dark:bg-bg` + `max-w-7xl`). Buttons sentence case (DESIGN §4).
 */

import { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { CrossFade, StaggerItem } from '@leasefy/cadence';
import { useEntradaTrasCargar } from '@/components/portales/use-entrada-tras-cargar';
import {
  Lifebuoy,
  Wrench,
  ChatCircle,
  CaretRight,
  CheckCircle,
  Clock,
  Warning,
  XCircle,
  Plus,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';

import { useTenantPqrs } from '@/lib/hooks/use-tenant-pqrs';
import { useOnboardingStatus } from '@/lib/hooks/use-onboarding-status';
import { useI18n } from '@/lib/i18n';
import { CompleteProfileFirst } from '@/components/tenant/CompleteProfileFirst';
import { NuevaSolicitudModal } from '@/components/tenant/NuevaSolicitudModal';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import type { BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EsqueletoDePagina } from '@/components/estado/EsqueletoDePagina';
import { resolveExpectedResponse } from '@/lib/date/business-days';
import { pqrsStatusToTone, pqrsStatusToLabel } from '@/lib/types/tenant-case';
import type { CaseTone } from '@/lib/types/tenant-case';
import type { SolicitudPqrs } from '@/lib/api/pqrs.types';

// ============================================================================
// Neutral tone → badge (capped at `warning`; no alarm level at all)
// ============================================================================

const TONE_BADGE: Record<CaseTone, { variant: NonNullable<BadgeProps['variant']>; icon: Icon }> = {
  neutral: { variant: 'secondary', icon: CheckCircle },
  info: { variant: 'default', icon: Clock },
  attention: { variant: 'warning', icon: Warning },
};

/**
 * Per-row expected-response line — NEVER blank. Authoritative `slaVenceAt` renders
 * a firm date; the interim estimate is soft-framed ("hacia el …") + a `· estimado`
 * chip with a clarifying tooltip. Neutral styling only (no red, no ticking timer).
 */
function ExpectedResponseLine({ s, locale }: { s: SolicitudPqrs; locale: string }) {
  const { date, estimated } = resolveExpectedResponse(s.createdAt, s.slaVenceAt);
  const dateStr = new Intl.DateTimeFormat(locale === 'es' ? 'es-CO' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);

  if (estimated) {
    return (
      <span
        className="inline-flex items-center gap-1.5"
        title={
          locale === 'es'
            ? 'Fecha estimada; tu inmobiliaria confirma la definitiva.'
            : 'Estimated date; your agency confirms the final one.'
        }
      >
        {locale === 'es'
          ? `Respuesta estimada hacia el ${dateStr}`
          : `Estimated response around ${dateStr}`}
        <span className="rounded-full bg-surface-muted px-1.5 py-0.5 text-[10px] font-medium text-fg-subtle">
          {locale === 'es' ? 'estimado' : 'estimate'}
        </span>
      </span>
    );
  }

  return (
    <span>
      {locale === 'es'
        ? `Respuesta a más tardar el ${dateStr}`
        : `Response no later than ${dateStr}`}
    </span>
  );
}

// ============================================================================
// Solicitud row — deep-links to the UNIFIED caso detail (no duplicated timeline)
// ============================================================================

function SolicitudRow({ s, locale }: { s: SolicitudPqrs; locale: string }) {
  const TypeIcon = s.tipo === 'reparacion' ? Wrench : ChatCircle;
  const badge = TONE_BADGE[pqrsStatusToTone(s.estado)];
  const ToneIcon = badge.icon;

  return (
    <StaggerItem>
      <Link href={`/inquilino/casos/${encodeURIComponent(s.id)}`} className="group block">
        <div className="rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-surface-muted p-4 sm:p-5 flex items-center gap-4 hover:border-border dark:hover:border-border-strong transition-colors">
          <div className="w-11 h-11 rounded-xl bg-surface-muted dark:bg-border flex items-center justify-center flex-shrink-0">
            <TypeIcon className="w-5 h-5 text-fg-muted dark:text-fg-subtle" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-semibold text-fg dark:text-white group-hover:text-primary transition-colors truncate">
                {s.asunto}
              </h3>
              <Badge variant={badge.variant} className="inline-flex items-center gap-1">
                <ToneIcon className="w-3 h-3" aria-hidden="true" />
                {pqrsStatusToLabel(s.estado)}
              </Badge>
            </div>
            <p className="text-xs text-fg-muted dark:text-fg-subtle mt-1">
              <ExpectedResponseLine s={s} locale={locale} />
            </p>
          </div>

          <CaretRight className="w-5 h-5 text-fg-subtle group-hover:text-primary transition-colors flex-shrink-0" />
        </div>
      </Link>
    </StaggerItem>
  );
}

// ============================================================================
// Page
// ============================================================================

export default function SolicitudesPage() {
  const { locale } = useI18n();
  const { isComplete: isOnboardingComplete, isLoading: isOnboardingLoading } = useOnboardingStatus();
  const { items, isLoading, error, disponible, contratos, refetch } = useTenantPqrs();
  // Sin un contrato vigente (o sin la ruta del back), el botón se apaga ANTES de
  // que la persona escriba (QA 22-09: se enteraba al enviar, con las fotos ya
  // adjuntas). Desde ARREGLOS-2 (03-10-2026) se radica de verdad (`POST /pqrs`).
  const sinRadicar = disponible === false;
  const motivoSinRadicar =
    locale === 'es'
      ? 'Para radicar desde acá necesitas un contrato vigente con tu inmobiliaria: escríbele a tu inmobiliaria.'
      : 'To submit a request here you need an active lease with your property manager: write to them.';
  const [modalOpen, setModalOpen] = useState(false);

  // Carga → contenido: entra con 4 px sólo si se vio el esqueleto.
  const entrada = useEntradaTrasCargar(isOnboardingLoading || isLoading);

  // Loading gate — never flash a fake-empty while a source is in flight.
  if (isOnboardingLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#f8f8f8] dark:bg-bg">
        {/* Dentro del panel va el esqueleto, no el logo (Nico, 01-10: «el logo sólo en cargas de pantalla completa»). */}
        <EsqueletoDePagina variante="list" className="mx-auto max-w-7xl" />
      </div>
    );
  }

  // Onboarding gate.
  if (!isOnboardingComplete) {
    return (
      <div className="min-h-screen bg-[#f8f8f8] dark:bg-bg">
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
      <div className="min-h-screen bg-[#f8f8f8] dark:bg-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <EmptyState
            icon={XCircle}
            title={locale === 'es' ? 'Error al cargar tus solicitudes' : 'Error loading your requests'}
            description={error}
            action={{ label: locale === 'es' ? 'Reintentar' : 'Retry', href: '/inquilino/solicitudes' }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f8f8] dark:bg-bg">
      <motion.div {...entrada} className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">

        {/* Header */}
        <header className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-medium text-fg dark:text-white tracking-tight">
              {locale === 'es' ? 'Solicitudes' : 'Requests'}
            </h1>
            <p className="mt-1 text-fg-muted dark:text-fg-subtle">
              {locale === 'es'
                ? 'Abre y sigue tus solicitudes de mantenimiento y PQRS, en un solo lugar.'
                : 'Open and track your maintenance requests and PQRS, all in one place.'}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <Button
              type="button"
              onClick={() => setModalOpen(true)}
              disabled={sinRadicar}
              title={sinRadicar ? motivoSinRadicar : undefined}
              hideArrow
              className="inline-flex items-center gap-2"
              data-testid="nueva-solicitud"
            >
              <Plus className="w-4 h-4" />
              {locale === 'es' ? 'Nueva solicitud' : 'New request'}
            </Button>
            {sinRadicar && (
              <p className="max-w-xs text-right text-sm text-fg-muted" data-testid="nueva-solicitud-motivo">
                {motivoSinRadicar}
              </p>
            )}
          </div>
        </header>

        {/* List — real own-requests, or an honest empty-state (incl. not-live []).
            Vacío → primera solicitud se cruzan. Lo que ya estaba al llegar no se
            anima; una solicitud nueva entra y las demás se corren. */}
        <section>
          <CrossFade swapKey={items.length > 0 ? 'lista' : 'vacio'}>
          {items.length > 0 ? (
            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {items.map((s) => (
                  <SolicitudRow key={s.id} s={s} locale={locale} />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="space-y-4">
              <EmptyState
                icon={Lifebuoy}
                title={locale === 'es' ? 'Aún no tienes solicitudes' : 'No requests yet'}
                description={
                  locale === 'es'
                    ? 'Abre una solicitud de mantenimiento o una PQRS y hazle seguimiento aquí.'
                    : 'Open a maintenance request or a PQRS and track it here.'
                }
              />
              <div className="flex justify-center">
                <Button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  disabled={sinRadicar}
                  title={sinRadicar ? motivoSinRadicar : undefined}
                  hideArrow
                  className="inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  {locale === 'es' ? 'Nueva solicitud' : 'New request'}
                </Button>
              </div>
            </div>
          )}
          </CrossFade>
        </section>
      </motion.div>

      <NuevaSolicitudModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={refetch}
        contratos={contratos}
      />
    </div>
  );
}
