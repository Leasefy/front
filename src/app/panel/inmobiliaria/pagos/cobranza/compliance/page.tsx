'use client'

/**
 * Compliance Overview — Phase 34 plan 34-07 (D-34-03, D-34-07, D-34-RES-A1).
 *
 * 4 sections + page-level red banner + 3 sub-page nav cards.
 *
 * Banner trigger (D-34-RES-A1 + D-34-07): visible when ANY open Habeas Data
 * request has remaining_days <= 15. Since the server only ever returns OPEN
 * requests under a 15-day SLA window, this condition is effectively
 * "any open request exists" — but the explicit `<= 15` check stays for
 * clarity and to defend against future server changes.
 *
 * Refs mvp:docs/DESIGN.md §1 (sobrio + warm), §4 (cards rounded-lg border
 * bg-card), §11 (loading state spinner), mvp:docs/COLOR_SYSTEM.md
 * (rose for warning/error, emerald for ok).
 */

import { formatRelativeTime } from '@/lib/format'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { falloDelTexto } from '@/lib/cobranza/fallo-del-texto'
import { useMemo } from 'react'
import Link from 'next/link'
import { AnimatedNumber, CrossFade, Presence, Stagger, StaggerItem } from '@leasefy/cadence'
import { BarraQueCrece } from '@/components/inmobiliaria/reports/barra-que-crece'
import { Warning, ShieldCheck, ClipboardText, FileText } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { useI18n } from '@/lib/i18n'
import { useComplianceOverview } from '@/lib/hooks/cobranza/use-compliance-overview'
import { HabeasDataSlaCard } from '@/components/inmobiliaria/cobranza/HabeasDataSlaCard'
import { ComplianceSparkline } from '@/components/inmobiliaria/cobranza/ComplianceSparkline'
import { PageSkeleton } from '@/components/skeleton/panel/PageSkeleton'
import { EmptyState } from '@/components/data-display/EmptyState'
import { MonoLabel } from '@leasefy/cadence'
import { useAutoRefresh } from '@/lib/hooks/use-auto-refresh'
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { CifraHeroe } from '@/components/pantalla/CifraHeroe'

function ComplianceOverviewContent() {
  const { t, locale } = useI18n()
  const { data, isLoading, error, refetch } = useComplianceOverview()

  useAutoRefresh(refetch)

  // El disparador era `remaining_days <= 15`, que con un término de 15 días es
  // cierto SIEMPRE que haya una solicitud abierta: la banda roja salía aunque
  // faltaran dos semanas. Una alerta que está siempre encendida deja de leerse.
  // Ahora avisa por lo que de verdad urge: vencidas o a punto de vencer.
  const showBanner = useMemo(() => {
    if (!data) return false
    return data.habeas_data.open_requests.some((r) => r.remaining_days <= URGENT_DAYS)
  }, [data])

  const lastUpdated = useMemo(() => {
    if (!data?.generated_at) return null
    const sec = Math.max(
      0,
      Math.round((Date.now() - new Date(data.generated_at).getTime()) / 1000),
    )
    // C7 (r25): «hace 3 minutos», no «hace 30s».
    void sec
    return formatRelativeTime(data.generated_at, locale.startsWith('en') ? 'en' : 'es')
  }, [data?.generated_at, locale])

  // Phase 38-05a: page-level skeleton during first load. Movimiento: cada
  // salida en un `CrossFade` con su clave (esqueleto → panel, → «todo en
  // regla»); lo que ya estaba al montarse no se anima.
  if (isLoading && !data) {
    return (
      <CrossFade swapKey="esqueleto">
        <PageSkeleton variant="dashboard" />
      </CrossFade>
    )
  }

  const subPages = [
    {
      href: '/panel/inmobiliaria/pagos/cobranza/compliance/ley-2300',
      title: t('inmobiliaria.ai.cobranza.compliance.subPages.ley2300Title'),
      Icon: ClipboardText,
    },
    {
      href: '/panel/inmobiliaria/pagos/cobranza/compliance/opt-out',
      title: t('inmobiliaria.ai.cobranza.compliance.subPages.optOutTitle'),
      Icon: ShieldCheck,
    },
    {
      href: '/panel/inmobiliaria/pagos/cobranza/compliance/audit',
      title: t('inmobiliaria.ai.cobranza.compliance.subPages.auditTitle'),
      Icon: FileText,
    },
  ]

  /**
   * Las tres páginas de Cumplimiento. MORI-25 (QA-AGENTES 16-10): sin
   * alertas la pantalla era SÓLO el vacío, y la Auditoría (pausas, cambios de
   * etapa, cartas…), los intentos de la Ley 2300 y el Opt-out quedaban sin
   * camino: no son pestaña. Van también debajo del vacío.
   */
  const tarjetasDeSubpaginas = (
    <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {subPages.map(({ href, title, Icon }) => (
        <Link
          key={href}
          href={href}
          className="rounded-lg border border-border bg-card p-4 hover:border-primary hover:bg-accent/30 transition-colors flex items-center gap-3"
        >
          <Icon className="w-5 h-5 text-primary" aria-hidden="true" />
          <span className="text-sm font-medium text-foreground">{title}</span>
        </Link>
      ))}
    </section>
  )

  // Phase 38-05a: page-level EmptyState when no compliance issues at all
  // ("truly empty" = no open Habeas Data + no outside-hours violations)
  const hasAnyIssues =
    !!data &&
    (data.habeas_data.open_requests.length > 0 ||
      data.ley_2300.weekly_outside_hours_count > 0)
  if (!isLoading && data && !error && !hasAnyIssues) {
    return (
      <CrossFade swapKey="vacio">
      <div className="p-6 lg:p-8 space-y-6">
        <EncabezadoDePantalla
          seccion="Cobranza"
          titulo={t('inmobiliaria.ai.cobranza.compliance.pageTitle')}
        />
        <EmptyState
          icon={ShieldCheck}
          title={t('inmobiliaria.ai.cobranza.compliance.empty.title')}
          description={t('inmobiliaria.ai.cobranza.compliance.empty.description')}
        />
        {tarjetasDeSubpaginas}
      </div>
      </CrossFade>
    )
  }

  return (
    <CrossFade swapKey="panel">
    <div className="p-6 lg:p-8 space-y-6">
      <EncabezadoDePantalla
        seccion="Cobranza"
        titulo={t('inmobiliaria.ai.cobranza.compliance.pageTitle')}
        descripcion={
          locale.startsWith('es')
            ? 'Si la cobranza cumple la Ley 2300 (horarios y contactos), Habeas Data y la retención de los datos.'
            : 'Whether collections complies with Law 2300 (hours and contacts), Habeas Data and data retention.'
        }
        junto={
          lastUpdated ? (
            <span className="text-caption font-mono tabular-nums text-fg-muted">{lastUpdated}</span>
          ) : null
        }
        data-testid="cumplimiento-encabezado"
      />

      {/* Page-level red banner — D-34-RES-A1 trigger remaining_days <= 15.
          Entra y sale con `Presence` (baja 8px desde arriba, como antes). */}
      <Presence
          show={showBanner}
          direction="down"
          className="rounded-lg border border-danger/30 bg-danger-soft p-4 flex items-start gap-3"
          role="alert"
        >
          <Warning
            className="w-5 h-5 text-danger flex-shrink-0 mt-0.5"
            weight="fill"
            aria-hidden="true"
          />
          <p className="text-body-sm text-danger">
            {t('inmobiliaria.ai.cobranza.compliance.habeasData.banner')}
          </p>
      </Presence>

      {/* Error state — color+icon+text (a11y: not color-only per XR-06) */}
      {/* C5 (r25): FalloDeCarga con «Intentar de nuevo», nunca el error crudo pegado a la frase. */}
      {error && !data ? (
        <FalloDeCarga error={falloDelTexto(error)} queEs="el cumplimiento" onReintentar={() => refetch()} />
      ) : null}

      {data && (
        <>
          {/* LA RESPUESTA: los contactos fuera de horario de la semana (Ley 2300).
              Es un CONTEO contra un objetivo que sólo puede ser cero: se dice con
              palabras, nunca «4 / 0». */}
          <CifraHeroe
            data-testid="cumplimiento-ley-2300"
            rotulo={t('inmobiliaria.ai.cobranza.compliance.overview.ley2300Heading')}
            cifra={
              <span className={data.ley_2300.weekly_outside_hours_count === 0 ? 'text-success' : 'text-danger'}>
                <AnimatedNumber
                  value={data.ley_2300.weekly_outside_hours_count}
                  format={(n) => String(Math.round(n))}
                />
              </span>
            }
            contexto={`${data.ley_2300.weekly_outside_hours_count === 1 ? 'intento' : 'intentos'} · el objetivo es ${data.ley_2300.target}`}
          />

          {/* Section 2: Habeas Data SLA list */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <MonoLabel>
                {t('inmobiliaria.ai.cobranza.compliance.overview.habeasDataHeading')}
              </MonoLabel>
              <Link
                href="/panel/inmobiliaria/pagos/cobranza/compliance/opt-out"
                className="text-caption text-primary hover:underline font-medium"
              >
                {locale.startsWith('es') ? 'Ver todos' : 'View all'}
              </Link>
            </div>
            {data.habeas_data.open_requests.length === 0 ? (
              <p className="text-body-sm text-muted-foreground text-center py-6">
                {locale.startsWith('es')
                  ? 'Sin solicitudes Habeas Data abiertas'
                  : 'No open Habeas Data requests'}
              </p>
            ) : (
              <Stagger className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.habeas_data.open_requests.map((req) => (
                  <StaggerItem key={req.id}>
                    <HabeasDataSlaCard request={req} />
                  </StaggerItem>
                ))}
              </Stagger>
            )}
          </section>

          {/* Section 3: Retention gauge */}
          <section className="rounded-lg border border-border bg-card p-4">
            <MonoLabel>
              {t('inmobiliaria.ai.cobranza.compliance.overview.retentionHeading')}
            </MonoLabel>
            {/* `compliance_pct: null` = no hay filas que medir. Antes el back
                devolvía 100 fijo con un TODO y esto pintaba un 100% verde que
                no medía nada — en la pantalla cuyo trabajo es avisar cuando
                algo va mal. «No hay nada» y «está todo bien» no son lo mismo. */}
            {data.retention.compliance_pct === null ? (
              <p className="mt-3 text-body-sm text-fg-muted">
                {t('inmobiliaria.ai.cobranza.compliance.overview.retentionUnmeasured')}
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                <div className="flex items-baseline gap-2">
                  <span
                    className={[
                      'text-3xl font-mono tabular-nums',
                      data.retention.compliance_pct >= data.retention.target
                        ? 'text-success'
                        : 'text-warning',
                    ].join(' ')}
                  >
                    {data.retention.compliance_pct} %
                  </span>
                  <span className="text-sm text-muted-foreground">
                    / {data.retention.target} %
                  </span>
                </div>
                <div
                  className="h-2 w-full rounded-full bg-muted overflow-hidden"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={data.retention.compliance_pct}
                >
                  {/* Crece desde la izquierda (sólo `scaleX`); el ancho es el
                      dato y ya no se anima (era `transition-all`). */}
                  <BarraQueCrece
                    eje="x"
                    className={[
                      'h-full',
                      data.retention.compliance_pct >= data.retention.target
                        ? 'bg-success'
                        : 'bg-warning',
                    ].join(' ')}
                    style={{
                      width: `${Math.min(100, Math.max(0, data.retention.compliance_pct))}%`,
                    }}
                  />
                </div>
                <p className="text-caption text-fg-subtle">
                  {t(
                    `inmobiliaria.ai.cobranza.compliance.overview.retentionCaption${
                      data.retention.measured_rows === 1 ? 'One' : ''
                    }`,
                  )
                    .replace('{rows}', String(data.retention.measured_rows))
                    .replace('{overdue}', String(data.retention.overdue_rows))}
                </p>
              </div>
            )}
          </section>

          {/* Section 4: 30-day sparkline */}
          <section className="rounded-lg border border-border bg-card p-4">
            <MonoLabel className="mb-3">
              {t('inmobiliaria.ai.cobranza.compliance.overview.sparklineHeading')}
            </MonoLabel>
            <ComplianceSparkline buckets={data.sparkline.daily_buckets_30d} />
          </section>

          {/* Section 5: Sub-page nav cards */}
          {tarjetasDeSubpaginas}
        </>
      )}
    </div>
    </CrossFade>
  )
}

/**
 * Umbral de la banda roja, en días hábiles. Mismo criterio que la bandeja de
 * Habeas Data (`ARCO_URGENT_THRESHOLD_DAYS`): una alerta que está siempre
 * encendida deja de leerse.
 */
const URGENT_DAYS = 3

export default function CompliancePage() {
  return (
    <PageGuard module="cobranza" action="view">
      <ComplianceOverviewContent />
    </PageGuard>
  )
}
