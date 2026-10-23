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
import { CrossFade, Stagger, StaggerItem } from '@leasefy/cadence'
import { MasDetalles } from '@/components/pantalla/MasDetalles'
import { useTr } from '@/lib/i18n/use-tr'
import { BarraQueCrece } from '@/components/inmobiliaria/reports/barra-que-crece'
import { ShieldCheck, ClipboardText, FileText } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { useI18n } from '@/lib/i18n'
import { useComplianceOverview } from '@/lib/hooks/cobranza/use-compliance-overview'
import { HabeasDataSlaCard } from '@/components/inmobiliaria/cobranza/HabeasDataSlaCard'
import { ComplianceSparkline } from '@/components/inmobiliaria/cobranza/ComplianceSparkline'
import { PageSkeleton } from '@/components/skeleton/panel/PageSkeleton'
import { EmptyState } from '@/components/data-display/EmptyState'
import { useAutoRefresh } from '@/lib/hooks/use-auto-refresh'
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { CifraHeroe } from '@/components/pantalla/CifraHeroe'

function ComplianceOverviewContent() {
  const { t, locale } = useI18n()
  const tr = useTr()
  const { data, isLoading, error, refetch } = useComplianceOverview()

  useAutoRefresh(refetch)

  // La urgencia de «no contactar» (vencidas o a punto) la dice ahora la cifra:
  // ver `URGENT_DAYS` abajo. Antes era una banda roja aparte.

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
          className="rounded-lg border border-border bg-card p-4 hover:bg-surface-muted transition-colors flex items-center gap-3"
        >
          {/* Un solo azul por pantalla (revisora r25): el ícono y el borde, en tinta. */}
          <Icon className="w-5 h-5 text-fg-muted" aria-hidden="true" />
          <span className="text-body-sm font-medium text-fg">{title}</span>
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
          descripcion={tr('Si la cobranza cumple la Ley 2300 (horarios y contactos), las solicitudes de no contactar y la retención de los datos.')}
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
        descripcion={tr('Si la cobranza cumple la Ley 2300 (horarios y contactos), las solicitudes de no contactar y la retención de los datos.')}
        junto={
          lastUpdated ? (
            <span className="text-caption font-mono tabular-nums text-fg-muted">{lastUpdated}</span>
          ) : null
        }
        data-testid="cumplimiento-encabezado"
      />

      {/* Error state — color+icon+text (a11y: not color-only per XR-06) */}
      {/* C5 (r25): FalloDeCarga con «Intentar de nuevo», nunca el error crudo pegado a la frase. */}
      {error && !data ? (
        <FalloDeCarga error={falloDelTexto(error)} queEs="el cumplimiento" onReintentar={() => refetch()} />
      ) : null}

      {data && (
        <>
          {/* LA RESPUESTA (revisora r25, Cumplimiento #1): «¿estoy cumpliendo la
              ley?» en UNA cifra con sus tres frentes —Ley 2300, no contactar y
              retención—. Antes la cifra sólo contaba los intentos de la Ley 2300
              y lo demás pesaba lo mismo, con una banda roja aparte. */}
          {(() => {
            const intentos = data.ley_2300.weekly_outside_hours_count
            const porAcusar = data.habeas_data.open_requests.length
            const urgen = data.habeas_data.open_requests.filter((r) => r.remaining_days <= URGENT_DAYS).length
            const pct = data.retention.compliance_pct
            const retencionMal = pct !== null && pct < data.retention.target
            const porAtender = (intentos > 0 ? 1 : 0) + (urgen > 0 ? 1 : 0) + (retencionMal ? 1 : 0)
            return (
              <CifraHeroe
                data-testid="cumplimiento-ley-2300"
                // Revisora r27 (Cumplimiento, UI): el rótulo dice el hecho, no repite el título.
                rotulo={tr('Por atender')}
                cifra={porAtender === 0 ? tr('Cumples') : porAtender === 1 ? tr('1 cosa por atender') : tr('{n} cosas por atender', { n: porAtender })}
                contexto={tr('de tres frentes: Ley 2300, no contactar y retención')}
                total={3}
                tramos={[
                  {
                    clave: 'ley-2300',
                    etiqueta: tr('Ley 2300'),
                    monto: 1,
                    tono: intentos > 0 ? 'critico' : 'exito',
                    siempre: true,
                    cifra:
                      intentos === 0
                        ? tr('Sin contactos fuera de horario')
                        : intentos === 1
                          ? tr('1 intento fuera de horario esta semana')
                          : tr('{n} intentos fuera de horario esta semana', { n: intentos }),
                  },
                  {
                    clave: 'no-contactar',
                    etiqueta: tr('No contactar'),
                    monto: 1,
                    tono: urgen > 0 ? 'critico' : porAcusar > 0 ? 'aviso' : 'exito',
                    siempre: true,
                    cifra:
                      porAcusar === 0
                        ? tr('Todas con su acuse')
                        : urgen > 0
                          ? tr('{n} por acusar, {u} vencen ya', { n: porAcusar, u: urgen })
                          : tr('{n} por acusar, en plazo', { n: porAcusar }),
                  },
                  {
                    clave: 'retencion',
                    etiqueta: tr('Retención de los datos'),
                    monto: 1,
                    tono: pct === null ? 'neutro' : retencionMal ? 'aviso' : 'exito',
                    siempre: true,
                    cifra: pct === null ? tr('Sin nada que medir') : `${pct} % / ${data.retention.target} %`,
                  },
                ]}
              />
            )
          })()}

          {/* Section 2: Habeas Data SLA list */}
          {/* Revisora r25 (Cumplimiento #2): estas solicitudes son las de «No
              contactar» y llevan ahí; se llaman igual que su destino (antes
              «Habeas Data», que en el riel abre otra pantalla). */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-body font-normal text-fg">
                {t('inmobiliaria.ai.cobranza.compliance.overview.habeasDataHeading')}
              </h2>
              <Link
                href="/panel/inmobiliaria/pagos/cobranza/compliance/opt-out"
                className="text-caption font-medium text-fg-muted underline underline-offset-2 hover:text-fg"
              >
                {tr('Ver No contactar')}
              </Link>
            </div>
            {data.habeas_data.open_requests.length === 0 ? (
              <p className="text-body-sm text-muted-foreground text-center py-6">
                {tr('Ninguna solicitud de no contactar espera su acuse.')}
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
            <h2 className="text-body font-normal text-fg">
              {t('inmobiliaria.ai.cobranza.compliance.overview.retentionHeading')}
            </h2>
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
                      'text-[24px] font-mono tabular-nums',
                      data.retention.compliance_pct >= data.retention.target
                        ? 'text-success'
                        : 'text-warning',
                    ].join(' ')}
                  >
                    {data.retention.compliance_pct} %
                  </span>
                  <span className="text-body-sm text-fg-muted">
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

          {/* Section 4: 30-day sparkline — de consulta, plegada (revisora r25). */}
          <MasDetalles
            etiqueta={t('inmobiliaria.ai.cobranza.compliance.overview.sparklineHeading')}
            etiquetaAbierto={tr('Ocultar las alertas por día')}
            data-testid="cumplimiento-grafica"
          >
            <section className="rounded-lg border border-border bg-card p-4">
              <ComplianceSparkline buckets={data.sparkline.daily_buckets_30d} />
            </section>
          </MasDetalles>

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
