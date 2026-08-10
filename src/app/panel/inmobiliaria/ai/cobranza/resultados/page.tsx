'use client'

/**
 * /ai/cobranza/resultados — "Resultados del agente" (visión #21).
 *
 * Evalúa al agente de Cobranza como evaluarías a un equipo humano: qué recuperó,
 * cuántos casos gestionó/escaló, qué tan rápido respondió. Es DISTINTO de
 * /analitica (que es el panel técnico de tendencias por etapa, objeciones,
 * cadencia, costo) — acá la lectura es ejecutiva y narrativa.
 *
 * Datos — fuente PRINCIPAL: useRecovery (GET /cobranza/recovery), el agregado de
 * resultados del backend. Cae a hooks existentes cuando el endpoint nuevo no
 * está desplegado todavía (404/empty → fail-soft):
 *   - useRecovery        → valor recuperado, casos cerrados/gestionados, tiempo
 *     promedio, tasa de respuesta, promesas/acuerdos cumplidos, escalados, mora
 *     reducida. Cada métrica es null cuando su señal no existe.
 *   - useCarteraOverview → fallback de gestionados (llamadas hoy), escalados
 *     (escalaciones pendientes) y recuperado (pagado hoy).
 *   - useDailyReport     → fallback de recuperado (payments_today_total_cop) y
 *     tasa de respuesta (connect_rate_pct).
 *
 * Las métricas SIN fuente real muestran "—" (T-323: no inventar números).
 * El detalle vive en /analitica y /reporte — esta vista solo cross-linkea.
 */

import { useMemo } from 'react'
import Link from 'next/link'
import {
  ChartLineUp,
  ChatCircleText,
  CheckCircle,
  Clock,
  CurrencyDollar,
  FileText,
  Handshake,
  PhoneCall,
  Scales,
  TrendDown,
  TrendUp,
  Wallet,
  Warning,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth'
import { useAutoRefresh } from '@/lib/hooks/use-auto-refresh'
import { EmptyState } from '@/components/data-display/EmptyState'
import { Button, Spinner } from '@/components/ui'
import { KpiCard } from '@leasefy/cadence'
import { useCarteraOverview } from '@/lib/hooks/cobranza/use-cartera-overview'
import { useDailyReport } from '@/lib/hooks/cobranza/use-daily-report'
import { useRecovery } from '@/lib/hooks/cobranza/use-recovery'

const BASE = '/panel/inmobiliaria/ai/cobranza'
const ANALITICA_HREF = `${BASE}/analitica`
const REPORTE_HREF = `${BASE}/reporte`

const EM_DASH = '—'

// ── Tipo de fila de KPI ───────────────────────────────────────────────────────

interface ResultadoKpi {
  key: string
  label: string
  icon: Icon
  /** Valor formateado, o null → renderiza em-dash + sublabel "Sin dato aún". */
  value: string | null
  /** Pie de la card (siempre presente; describe la fuente o el estado). */
  sublabel: string
}

// ── Página ───────────────────────────────────────────────────────────────────

function ResultadosContent() {
  const { formatCurrency, formatNumber } = useI18n()
  const { agency } = useAuth()

  const recovery = useRecovery()
  const overview = useCarteraOverview()
  const daily = useDailyReport()

  const isLoading =
    (recovery.isLoading && !recovery.data) ||
    (overview.isLoading && !overview.data) ||
    (daily.isLoading && !daily.data)

  const hasAnyData =
    Boolean(recovery.data) || Boolean(overview.data) || Boolean(daily.data)

  // ── Derivar valores reales (los que SÍ tienen fuente) ──────────────────────
  const kpis = useMemo<ResultadoKpi[]>(() => {
    const rec = recovery.data
    const ov = overview.data
    const summary = daily.data?.summary

    // Valor recuperado: prioriza el agregado de recovery; cae al daily-report
    // (recaudo de hoy) y luego al pagado hoy del overview. Todo es recaudo real.
    const recuperadoCop =
      rec?.recoveredValueCop ??
      summary?.payments_today_total_cop ??
      ov?.kpis.pagadoHoyCop ??
      null

    // Casos cerrados — solo del agregado de recovery.
    const casosCerrados = rec?.casesClosed ?? null

    // Gestionados: casos del agregado de recovery; cae a llamadas hoy del overview.
    const gestionados = rec?.casesManaged ?? ov?.kpis.llamadasHoy ?? null

    // Tiempo promedio de recuperación (días) — del agregado de recovery.
    const tiempoRecuperacion = rec?.avgRecoveryDays ?? null

    // Tasa de respuesta: del agregado de recovery; cae a connect_rate_pct.
    const tasaRespuesta =
      rec?.responseRatePct ??
      (typeof summary?.connect_rate_pct === 'number'
        ? summary.connect_rate_pct
        : null)

    // Promesas / acuerdos cumplidos — del agregado de recovery (con su total).
    const promesasKept = rec?.promisesKept ?? null
    const promesasTotal = rec?.promisesTotal ?? null
    const acuerdosKept = rec?.agreementsKept ?? null
    const acuerdosTotal = rec?.agreementsTotal ?? null

    // Escalados: del agregado de recovery; cae a escalaciones pendientes.
    const escalados =
      rec?.casesEscalated ?? ov?.kpis.escalacionesPendientes ?? null

    // Mora reducida (puntos %, positivo = la mora bajó) — del agregado de recovery.
    const moraReducida = rec?.moraReducedPct ?? null
    const moraVentanaDias = rec?.moraWindowDays ?? 90

    return [
      {
        key: 'recuperado',
        label: 'Valor recuperado',
        icon: CurrencyDollar,
        value: recuperadoCop != null ? formatCurrency(recuperadoCop) : null,
        sublabel:
          recuperadoCop != null
            ? 'Recaudo confirmado'
            : 'Aún sin recaudo confirmado',
      },
      {
        key: 'casos-cerrados',
        label: 'Casos cerrados',
        icon: CheckCircle,
        value: casosCerrados != null ? formatNumber(casosCerrados) : null,
        sublabel:
          casosCerrados != null
            ? 'Casos con desenlace'
            : 'Aún sin casos cerrados',
      },
      {
        key: 'gestionados',
        label: 'Casos gestionados',
        icon: PhoneCall,
        value: gestionados != null ? formatNumber(gestionados) : null,
        sublabel: 'Casos trabajados por el agente',
      },
      {
        key: 'tiempo-recuperacion',
        label: 'Tiempo prom. de recuperación',
        icon: Clock,
        value:
          tiempoRecuperacion != null
            ? `${formatNumber(tiempoRecuperacion)} ${tiempoRecuperacion === 1 ? 'día' : 'días'}`
            : null,
        sublabel:
          tiempoRecuperacion != null
            ? 'Desde la gestión hasta el pago'
            : 'Aún sin tiempo de recuperación',
      },
      {
        key: 'tasa-respuesta',
        label: 'Tasa de respuesta',
        icon: ChatCircleText,
        value: tasaRespuesta != null ? `${formatNumber(tasaRespuesta)}%` : null,
        sublabel:
          tasaRespuesta != null
            ? 'Contactos que respondieron'
            : 'Aún sin tasa de respuesta',
      },
      {
        key: 'promesas-cumplidas',
        label: 'Promesas cumplidas',
        icon: Handshake,
        value:
          promesasKept != null
            ? promesasTotal != null
              ? `${formatNumber(promesasKept)} / ${formatNumber(promesasTotal)}`
              : formatNumber(promesasKept)
            : null,
        sublabel:
          promesasKept != null
            ? 'Promesas de pago que se cumplieron'
            : 'Aún sin promesas cumplidas',
      },
      {
        key: 'acuerdos-cumplidos',
        label: 'Acuerdos cumplidos',
        icon: FileText,
        value:
          acuerdosKept != null
            ? acuerdosTotal != null
              ? `${formatNumber(acuerdosKept)} / ${formatNumber(acuerdosTotal)}`
              : formatNumber(acuerdosKept)
            : null,
        sublabel:
          acuerdosKept != null
            ? 'Planes de pago que se cumplieron'
            : 'Aún sin acuerdos cumplidos',
      },
      {
        key: 'escalados',
        label: 'Casos escalados',
        icon: Warning,
        value: escalados != null ? formatNumber(escalados) : null,
        sublabel: 'Subidos a revisión humana',
      },
      {
        // El agregado define `moraReducedPct` positivo = la mora BAJÓ. La
        // tarjeta decía «Mora reducida · Caída del índice de morosidad» con
        // flecha hacia abajo pasara lo que pasara: con −62,2 estaba anunciando
        // como buena noticia una subida de 62 puntos de mora. Ahora el signo
        // manda sobre el título, el ícono y el texto, y el número va en
        // magnitud para que no se lea dos veces la dirección.
        key: 'mora-reducida',
        label:
          moraReducida == null || moraReducida === 0
            ? 'Variación de mora'
            : moraReducida > 0
              ? 'Mora reducida'
              : 'Mora aumentada',
        icon: moraReducida != null && moraReducida < 0 ? TrendUp : TrendDown,
        value:
          moraReducida != null
            ? `${formatNumber(Math.abs(moraReducida))} pts`
            : null,
        sublabel:
          moraReducida == null
            ? 'Aún sin variación de mora'
            : moraReducida === 0
              ? `Sin cambio en ${moraVentanaDias} días`
              : moraReducida > 0
                ? `Bajó en ${moraVentanaDias} días`
                : `Subió en ${moraVentanaDias} días`,
      },
      {
        key: 'ahorro-operativo',
        label: 'Ahorro operativo',
        icon: Wallet,
        // Sin fuente de ahorro operativo en estos hooks → em-dash honesto.
        value: null,
        sublabel: 'Disponible en analítica',
      },
    ]
  }, [recovery.data, overview.data, daily.data, formatCurrency, formatNumber])

  // ── Narrativa resumen — solo con datos reales, frase adaptativa ────────────
  const narrativa = useMemo(() => {
    const rec = recovery.data
    const ov = overview.data
    const summary = daily.data?.summary
    const sujeto = `El agente de Cobranza de ${agency?.name ?? 'tu inmobiliaria'}`

    const recuperadoCop =
      rec?.recoveredValueCop ??
      summary?.payments_today_total_cop ??
      ov?.kpis.pagadoHoyCop ??
      null
    const gestionados = rec?.casesManaged ?? ov?.kpis.llamadasHoy ?? null
    const casosCerrados = rec?.casesClosed ?? null
    const escalados =
      rec?.casesEscalated ?? ov?.kpis.escalacionesPendientes ?? null

    const frases: string[] = []

    if (gestionados != null && gestionados > 0) {
      frases.push(
        `gestionó ${formatNumber(gestionados)} ${gestionados === 1 ? 'caso' : 'casos'}`,
      )
    }
    if (casosCerrados != null && casosCerrados > 0) {
      frases.push(
        `cerró ${formatNumber(casosCerrados)} ${casosCerrados === 1 ? 'caso' : 'casos'}`,
      )
    }
    if (recuperadoCop != null && recuperadoCop > 0) {
      frases.push(`recuperó ${formatCurrency(recuperadoCop)}`)
    }
    if (escalados != null && escalados > 0) {
      frases.push(
        `escaló ${formatNumber(escalados)} a revisión humana para tu aprobación`,
      )
    }

    if (frases.length === 0) return null

    // Une con comas y "y" antes del último fragmento.
    const cuerpo =
      frases.length === 1
        ? frases[0]
        : `${frases.slice(0, -1).join(', ')} y ${frases[frases.length - 1]}`

    return `${sujeto} ${cuerpo}.`
  }, [recovery.data, overview.data, daily.data, agency?.name, formatCurrency, formatNumber])

  const handleRefetch = () => {
    void recovery.refetch()
    void overview.refetch()
    void daily.refetch()
  }

  useAutoRefresh(handleRefetch)

  // ── Header reutilizado en todos los estados ────────────────────────────────
  const header = (
    <header className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">
          Resultados del agente
        </h1>
        <p className="text-sm text-fg-muted max-w-2xl mt-0.5">
          Cómo rinde tu agente de cobranza, leído como evaluarías a un equipo:
          qué recuperó, cuántos casos gestionó y escaló, y qué tan rápido
          respondió. Para el detalle por etapa, objeciones y costo, abre la
          analítica.
        </p>
      </div>
    </header>
  )

  // ── Cross-links a las superficies de detalle (siempre visibles) ────────────
  const crossLinks = (
    <section
      aria-label="Ver el detalle"
      className="rounded-xl border border-border bg-card p-5 space-y-3 max-w-2xl"
    >
      <h2 className="text-base font-semibold text-fg">¿Querés el detalle?</h2>
      <p className="text-sm text-fg-muted">
        Esta vista es el resumen ejecutivo. El detalle por etapa, objeciones,
        cadencia y costo vive en la analítica; el corte operativo del día, en el
        reporte.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="secondary" size="sm" hideArrow>
          <Link href={ANALITICA_HREF}>
            <ChartLineUp className="w-4 h-4" aria-hidden="true" />
            Ver analítica
          </Link>
        </Button>
        <Button asChild variant="secondary" size="sm" hideArrow>
          <Link href={REPORTE_HREF}>
            <Scales className="w-4 h-4" aria-hidden="true" />
            Ver reporte diario
          </Link>
        </Button>
      </div>
    </section>
  )

  // ── Primer load ────────────────────────────────────────────────────────────
  if (isLoading && !hasAnyData) {
    return (
      <main className="p-6 lg:p-8 space-y-6">
        {header}
        <div className="flex items-center justify-center py-12">
          <Spinner size="md" />
        </div>
      </main>
    )
  }

  // ── Sin ninguna fuente con datos (ni error explícito) ──────────────────────
  if (!isLoading && !hasAnyData) {
    return (
      <main className="p-6 lg:p-8 space-y-6">
        {header}
        <EmptyState
          icon={ChartLineUp}
          title="Aún no hay resultados para mostrar"
          description="Cuando el agente empiece a gestionar tu cartera, acá vas a ver lo que recuperó, los casos que cerró y escaló, y su tasa de respuesta."
        />
        {crossLinks}
      </main>
    )
  }

  return (
    <main className="p-6 lg:p-8 space-y-6">
      {header}

      {/* Error parcial — alguna fuente falló pero la otra rindió datos */}
      {(recovery.error || overview.error || daily.error) && hasAnyData && (
        <div
          role="alert"
          className="rounded-xl bg-warning-soft border border-warning/30 p-3 text-sm text-warning flex items-center gap-2 max-w-2xl"
        >
          <Warning className="w-4 h-4 shrink-0" weight="fill" aria-hidden="true" />
          <span>
            Algunas métricas no se pudieron cargar; mostramos lo disponible.
          </span>
        </div>
      )}

      {/* Narrativa resumen del agente */}
      {narrativa && (
        <section className="rounded-xl border border-border bg-surface p-5 max-w-2xl">
          <p className="text-sm leading-relaxed text-fg">{narrativa}</p>
        </section>
      )}

      {/* Fila de métricas — KpiCard del DS; "—" donde no hay dato real */}
      <section
        aria-label="Métricas de resultados"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3"
      >
        {kpis.map((kpi) => {
          const KpiIcon = kpi.icon
          return (
            <KpiCard
              key={kpi.key}
              label={kpi.label}
              value={kpi.value ?? EM_DASH}
              sublabel={kpi.sublabel}
              icon={<KpiIcon weight="duotone" aria-hidden="true" />}
              data-testid={`resultado-kpi-${kpi.key}`}
            />
          )
        })}
      </section>

      {crossLinks}
    </main>
  )
}

export default function ResultadosPage() {
  return (
    <PageGuard module="cobranza">
      <ResultadosContent />
    </PageGuard>
  )
}
