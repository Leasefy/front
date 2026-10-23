'use client'

// Permissions gate: cobranza:view enforced by layout.tsx via NavItemWithModule module='cobranza'.
// Page does not re-check.

import { PhoneCall } from '@phosphor-icons/react'

import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui'
import { NoDataYetBadge } from '@/components/data-display/no-data-yet-badge'
import { EmptyState } from '@/components/data-display/EmptyState'
// SampleDataWatermark is used inside widget components (37-08, 37-09, 37-10).
import { useCobranzaAnalytics } from '@/lib/hooks/cobranza/use-cobranza-analytics'
import { RecoveryRateChart }      from '@/components/inmobiliaria/cobranza/RecoveryRateChart'
import { TopObjectionsTable }     from '@/components/inmobiliaria/cobranza/TopObjectionsTable'
import { CostPerPesoKpi }         from '@/components/inmobiliaria/cobranza/CostPerPesoKpi'
import { FalloDeCarga }           from '@/components/estado/FalloDeCarga'
import { CrossFade } from '@leasefy/cadence'
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { MasDetalles } from '@/components/pantalla/MasDetalles'
import { CifraHeroe } from '@/components/pantalla/CifraHeroe'
import { fechaCorta } from '@/lib/fechas/fecha-de-la-casa'

export default function CobranzaAnaliticaPage() {
  const { t, formatCurrency } = useI18n()
  const { isLoading, error, data, refetch } = useCobranzaAnalytics()

  // ── Loading skeleton (first load, no data yet) ─────────────────────────────
  // Movimiento: cada salida en un `CrossFade` con su clave (esqueleto →
  // analítica, → fallo, → vacío, → «aún sin datos»); lo que ya estaba al
  // montarse no se anima. Las gráficas (recharts) animan solas.
  if (isLoading && !data) {
    return (
      <CrossFade swapKey="esqueleto">
      <div className="p-6 lg:p-8 space-y-6">
        <EncabezadoDePantalla
          seccion="Cobranza"
          titulo={t('inmobiliaria.ai.cobranza.analitica.title')}
          descripcion={t('inmobiliaria.ai.cobranza.analitica.subtitle')}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={[
                'rounded-lg border border-border bg-card p-6',
                i === 0 || i === 3 ? 'md:col-span-2' : '',
              ].join(' ')}
              style={{ height: i === 0 || i === 3 ? 340 : 300 }}
            />
          ))}
        </div>
      </div>
      </CrossFade>
    )
  }

  // ── Error banner (non-loading error) ──────────────────────────────────────
  if (error && !isLoading) {
    return (
      <CrossFade swapKey="fallo">
      <div className="p-6 lg:p-8 space-y-6">
        <EncabezadoDePantalla
          seccion="Cobranza"
          titulo={t('inmobiliaria.ai.cobranza.analitica.title')}
        />
        {/* El mensaje crudo del backend —en inglés, con nombres de endpoint—
            no le sirve a nadie que esté mirando esta pantalla. `FalloDeCarga`
            lo deja en el DOM para diagnóstico y en pantalla dice qué pasó. */}
        <FalloDeCarga
          error={error}
          queEs="la analítica de cobranza"
          onReintentar={refetch}
        />
      </div>
      </CrossFade>
    )
  }

  // ── Two-tier gate (D-37-05): full-page NoDataYetBadge when agency has <5 calls ──
  // Gate fires when: agencyGate.populated===false OR calls_30d<5
  // When gate fires: ONLY NoDataYetBadge is rendered — no widget grid (mutually exclusive)
  const agencyGate = data?.agencyGate
  const isAgencyGateClosed =
    !isLoading &&
    (!agencyGate?.populated || (agencyGate?.calls_30d ?? 0) < 5)

  // Phase 38-05a (D-38-04): when the agency IS populated but has zero calls in 30d,
  // surface the "truly empty" EmptyState (vs NoDataYetBadge "below threshold" branch).
  if (!isLoading && agencyGate?.populated && agencyGate?.calls_30d === 0) {
    return (
      <CrossFade swapKey="vacio">
      <div className="p-6 lg:p-8 space-y-6">
        <EncabezadoDePantalla
          seccion="Cobranza"
          titulo={t('inmobiliaria.ai.cobranza.analitica.title')}
        />
        <EmptyState
          icon={PhoneCall}
          title={t('inmobiliaria.ai.cobranza.analitica.empty.title')}
          description={t('inmobiliaria.ai.cobranza.analitica.empty.description')}
          primaryCta={{ label: t('inmobiliaria.ai.cobranza.analitica.empty.cta.label'), href: '/panel/inmobiliaria/pagos/cobranza/deudores' }}
        />
      </div>
      </CrossFade>
    )
  }

  if (isAgencyGateClosed) {
    return (
      <CrossFade swapKey="sin-datos">
      <div className="p-6 lg:p-8">
        <EncabezadoDePantalla
          seccion="Cobranza"
          titulo={t('inmobiliaria.ai.cobranza.analitica.title')}
          className="mb-6"
        />
        <NoDataYetBadge
          phase={37}
          reason={t('inmobiliaria.ai.cobranza.analitica.agencyGate.reason')}
          cta={t('inmobiliaria.ai.cobranza.analitica.agencyGate.ctaLabel')}
          ctaHref="/panel/inmobiliaria/pagos/cobranza"
        />
      </div>
      </CrossFade>
    )
  }

  // ── Widget grid (agencyGate passed) ───────────────────────────────────────
  // LA RESPUESTA: cuánto se recuperó de la cartera en el último corte (la
  // suma de todas las etapas de ese día; las mismas filas que pinta la gráfica).
  const filasDeRecuperacion = data?.recovery?.populated ? data.recovery.rows : []
  const ultimoCorte = filasDeRecuperacion.reduce<string | null>(
    (max, r) => (max === null || r.bucket_date > max ? r.bucket_date : max),
    null,
  )
  const delCorte = filasDeRecuperacion.filter((r) => r.bucket_date === ultimoCorte)
  const recuperado = delCorte.reduce((s, r) => s + (Number(r.recovered_cop) || 0), 0)
  const enCartera = delCorte.reduce((s, r) => s + (Number(r.total_cop_in_stage) || 0), 0)


  return (
    <CrossFade swapKey="analitica">
    <div className="p-6 lg:p-8 space-y-6">
      {/* Page header */}
      <EncabezadoDePantalla
        seccion="Cobranza"
        titulo={t('inmobiliaria.ai.cobranza.analitica.title')}
        descripcion={t('inmobiliaria.ai.cobranza.analitica.subtitle')}
      />

      {ultimoCorte && enCartera > 0 ? (
        <CifraHeroe
          data-testid="analitica-recuperado"
          rotulo="Recuperado"
          cifra={formatCurrency(recuperado)}
          contexto={`de ${formatCurrency(enCartera)} en cartera · corte del ${fechaCorta(ultimoCorte)}`}
          total={enCartera}
          tramos={[
            { clave: 'recuperado', etiqueta: 'Recuperado', monto: recuperado, tono: 'exito', cifra: formatCurrency(recuperado) },
            {
              clave: 'falta',
              etiqueta: 'Sin recuperar',
              monto: Math.max(0, enCartera - recuperado),
              tono: 'neutro',
              cifra: formatCurrency(Math.max(0, enCartera - recuperado)),
            },
          ]}
        />
      ) : null}

      {/* Revisora r25 (Analítica #2 y #3): la recuperación por etapa abierta —es
          la pregunta de la pantalla—; objeciones y costo, plegados. Fuera
          «Guiones con mayor conversión» (una consulta contra una tabla vacía) y
          «Ritmo de contacto» (lo afina Leasefy, no la inmobiliaria), como dice la
          nota de la navegación. Cada cuadro dice su título UNA vez: el del
          componente (antes también un h2 de la página encima). */}
      <section className="rounded-lg border border-border bg-card p-6" data-testid="analitica-recuperacion">
        <RecoveryRateChart
          data={{
            populated: data?.recovery?.populated ?? false,
            rows: data?.recovery?.rows ?? [],
            reason: data?.recovery?.reason as 'agency-gate' | 'insufficient-buckets' | undefined,
          }}
        />
      </section>

      <MasDetalles
        etiqueta="Las objeciones y el costo de la cobranza"
        etiquetaAbierto="Ocultar las objeciones y el costo"
        data-testid="analitica-plegado"
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <section className="rounded-lg border border-border bg-card p-6">
            <TopObjectionsTable
              data={{
                populated: data?.objections?.populated ?? false,
                objections: data?.objections?.objections ?? [],
                reason: data?.objections?.reason,
              }}
            />
          </section>
          <section className="space-y-4 rounded-lg border border-border bg-card p-6">
            <h2 className="text-body font-normal text-fg">
              {t('inmobiliaria.ai.cobranza.analitica.widgets.costPerPeso.title')}
            </h2>
            <CostPerPesoKpi
              data={(data?.costPerPeso ?? null) as any}
              isLoading={isLoading}
            />
          </section>
        </div>
      </MasDetalles>
    </div>
    </CrossFade>
  )
}
