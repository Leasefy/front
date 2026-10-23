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
import { motion } from 'framer-motion';
import { StatusBadge } from '@leasefy/cadence';
import { useEntradaTrasCargar, type EntradaTrasCargar } from '@/components/portales/use-entrada-tras-cargar';
import {
  Scroll,
  CheckCircle,
  Clock,
  SealCheck,
  MagnifyingGlass,
  XCircle,
} from '@phosphor-icons/react';

import { useTenantAcuerdos } from '@/lib/hooks/use-tenant-acuerdos';
import { estadoDeLaFirma } from '@/lib/api/tenant-acuerdos.service';
import { tonoDelAcuerdo, etiquetaDelAcuerdo, acuerdoNoSeCobra } from '@/lib/types/tenant-case';
import type { CaseTone } from '@/lib/types/tenant-case';
import type { AcuerdoDetail, AcuerdoInstallment } from '@/lib/api/tenant-acuerdos.types';
import { useI18n } from '@/lib/i18n';
import { CuotaPlanTable } from '@/components/tenant/CuotaPlanTable';
import { AcuerdoAcceptPanel } from '@/components/tenant/AcuerdoAcceptPanel';
import { PagarCuota } from '@/components/tenant/PagarCuota';
import { AvisoDelPagoDelAcuerdo } from '@/components/tenant/AvisoDelPagoDelAcuerdo';
import { transaccionDelRetorno } from '@/lib/payments/verificar-pago-al-volver';
import { EmptyState } from '@/components/ui/empty-state';
import { BackButton } from '@/components/ui/back-button';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { EsqueletoDePagina } from '@/components/estado/EsqueletoDePagina';
import { PlanActivityTimeline, type TimelineItem } from '@/components/ui/plan/PlanActivityTimeline';

// ============================================================================
// Neutral tone → badge (capped at `warning`; no alarm level at all — Ley 1480)
// ============================================================================

// GLOW UP (22-10): el estado con su punto y su palabra (StatusBadge), sin ícono en la pastilla; nunca rojo.
const TONO_DEL_ESTADO: Record<CaseTone, 'neutral' | 'info' | 'warning'> = {
  neutral: 'neutral',
  info: 'info',
  attention: 'warning',
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
    <div className="min-h-screen bg-bg">
      <div className="max-w-3xl p-6 lg:p-8">{children}</div>
    </div>
  );
}

function BackLink({ locale }: { locale: string }) {
  return (
    <div className="mb-6" data-testid="acuerdo-volver">
      <BackButton href="/inquilino/acuerdos" label={locale === 'es' ? 'Volver a Acuerdos' : 'Back to Agreements'} />
    </div>
  );
}

// ============================================================================
// Resolved detail
// ============================================================================

function AcuerdoDetailView({
  plan,
  locale,
  onAccepted,
  entrada,
}: {
  plan: AcuerdoDetail;
  locale: string;
  onAccepted: () => void;
  /** Carga → contenido: la entrada de 4 px si se vio el esqueleto (si no, quieto). */
  entrada: EntradaTrasCargar;
}) {
  const { formatCurrency } = useI18n();
  const es = locale === 'es';
  const tono = TONO_DEL_ESTADO[tonoDelAcuerdo(plan)];

  // Qué se hace con la firma (03-10-2026): sólo se firma lo que la inmobiliaria aprobó.
  const firma = estadoDeLaFirma(plan);

  // Pay a cuota only once the acuerdo is accepted (active) and one is still owed.
  // QA-INQ-95: y nunca la de un acuerdo cerrado (completado, cancelado o incumplido) ni la de
  // uno cuya deuda ya se saldó por fuera (`deudaSaldada` del back).
  const cerrado = acuerdoNoSeCobra(plan);
  const saldado = plan.deudaSaldada === true;
  const nextCuota =
    plan.acceptedAt !== null && !cerrado ? nextPayableCuota(plan.installments) : undefined;

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

  // GLOW UP (21-10-2026): en el orden del trabajo. Vienes a firmar el acuerdo
  // o a pagar la cuota que sigue: eso va arriba, debajo del encabezado; el plan
  // de cuotas se consulta después y el historial va al final.
  const aceptado = !saldado && firma === 'aceptado';

  return (
    <motion.div {...entrada} className="space-y-6">
      <EncabezadoDePantalla
        seccion={es ? 'Mi arriendo' : 'My rental'}
        titulo={es ? 'Acuerdo de pago' : 'Payment agreement'}
        junto={
          <StatusBadge tone={tono} data-testid="acuerdo-estado">
            {etiquetaDelAcuerdo(plan)}
          </StatusBadge>
        }
        descripcion={
          /* Total — rendered VERBATIM from the record (no saldo/total math) */
          <span data-testid="acuerdo-total">
            {es ? 'Total del acuerdo: ' : 'Agreement total: '}
            <span className="font-mono tabular-nums text-fg">{formatCurrency(plan.totalDueCop)}</span>
            {plan.installments.length > 0 ? (
              <>
                {' · '}
                {plan.installments.length === 1
                  ? es
                    ? '1 cuota'
                    : '1 installment'
                  : es
                    ? `${plan.installments.length} cuotas`
                    : `${plan.installments.length} installments`}
              </>
            ) : null}
          </span>
        }
      />

      {/* Accept-by-signing (ACUE-02) — only while OFFERED, APPROVED and unaccepted; else a factual state.
          Un acuerdo cancelado (la inmobiliaria lo rechazó) o roto ya no se acepta: el back
          respondería 409 `ACUERDO_NO_ACEPTABLE`, así que ni se ofrece firmar (02-10-2026).
          Uno ofrecido que la inmobiliaria todavía no aprobó tampoco (03-10-2026). */}
      {saldado ? (
        <section
          data-testid="acuerdo-saldado"
          className="rounded-lg border border-border bg-surface p-5 sm:p-6"
        >
          <div className="flex items-start gap-3">
            <SealCheck className="w-5 h-5 text-success flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-medium text-fg">
                {es ? 'Hoy no debes nada vencido' : 'You owe nothing overdue today'}
              </p>
              <p className="mt-1 text-sm text-fg-muted">
                {es
                  ? 'Lo que financiaba este acuerdo ya está pagado, así que sus cuotas pendientes no se cobran. Si crees que es un error, escríbele a tu inmobiliaria.'
                  : 'What this agreement financed is already paid, so its pending installments are not charged. If you think this is a mistake, write to your agency.'}
              </p>
            </div>
          </div>
        </section>
      ) : firma === 'firmar' ? (
        <section
          data-testid="acuerdo-firmar"
          className="rounded-lg border border-border bg-surface p-5 sm:p-6"
        >
          <AcuerdoAcceptPanel planId={plan.planId} onAccepted={onAccepted} />
        </section>
      ) : firma === 'por-aprobar' ? (
        <section
          data-testid="acuerdo-por-aprobar"
          className="rounded-lg border border-border bg-surface p-5 sm:p-6"
        >
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-fg-muted flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-medium text-fg">
                {es ? 'Tu inmobiliaria lo está revisando' : 'Your agency is reviewing it'}
              </p>
              <p className="mt-1 text-sm text-fg-muted">
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
          className="rounded-lg border border-border bg-surface p-5 sm:p-6"
        >
          <p className="text-sm text-fg-muted">
            {es
              ? 'Este acuerdo ya no se puede aceptar. Si quieres un acuerdo de pago, pídelo a tu inmobiliaria desde Acuerdos.'
              : 'This agreement can no longer be accepted. If you want a payment agreement, request one from your agency in Agreements.'}
          </p>
        </section>
      ) : null}

      {/* Pagar cuota (ACUE-03) — por la sesión de pago de la ruta; sólo con el plan aceptado */}
      {nextCuota && (
        <div data-testid="acuerdo-pagar">
          <PagarCuota
            planId={plan.planId}
            cuota={nextCuota}
            locale={locale}
            pagoPendienteDeRevision={plan.pagoPendienteDeRevision === true}
          />
        </div>
      )}

      {/* Cuota plan — verbatim installments (CuotaPlanTable) */}
      <section
        data-testid="acuerdo-plan"
        className="rounded-lg border border-border bg-surface p-5 sm:p-6"
      >
        <h2 className="text-h3 text-fg mb-4">
          {es ? 'Plan de cuotas' : 'Installment plan'}
        </h2>
        <CuotaPlanTable installments={plan.installments} locale={locale} acuerdoCerrado={cerrado} />
      </section>

      {/* Aceptado: un hecho que se consulta, no algo por hacer — va con el historial. */}
      {aceptado ? (
        <section
          data-testid="acuerdo-aceptado"
          className="rounded-lg border border-border bg-surface p-5 sm:p-6"
        >
          {/* Un hecho en una línea, con el ícono suelto (antes, una caja verde con el ícono en otra caja verde). */}
          <p className="flex items-start gap-2 text-sm text-fg">
            <SealCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            <span>
              <span className="font-medium">{es ? 'Acuerdo aceptado. ' : 'Agreement accepted. '}</span>
              {es
                ? `Aceptaste este acuerdo el ${formatLongDate(plan.acceptedAt ?? '', locale)}.`
                : `You accepted this agreement on ${formatLongDate(plan.acceptedAt ?? '', locale)}.`}
            </span>
          </p>
        </section>
      ) : null}

      {/* State timeline — source-timestamp-only events */}
      <section
        data-testid="acuerdo-historial"
        className="rounded-lg border border-border bg-surface p-5 sm:p-6"
      >
        <h2 className="text-h3 text-fg mb-4">
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

  // Carga → contenido: el acuerdo entra con 4 px sólo si se vio el esqueleto.
  const entrada = useEntradaTrasCargar(isLoading);

  // Loading gate — never flash a fake not-found while the source is in flight.
  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg">
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
          title={locale === 'es' ? 'No pudimos cargar el acuerdo' : "We couldn't load the agreement"}
          description={error}
          /* «Volver» ya está arriba: aquí, volver a pedir (antes, el mismo «Volver a Acuerdos» dos veces). */
          action={{ label: locale === 'es' ? 'Reintentar' : 'Retry', onClick: () => void refetch() }}
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
      <AcuerdoDetailView plan={plan} locale={locale} onAccepted={refetch} entrada={entrada} />
    </PageShell>
  );
}
