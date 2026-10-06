'use client'

/**
 * CobranzaResultadosKpis — «Cómo va el agente» dentro del Resumen de Cobranza.
 *
 * Reemplaza a `CobranzaExecKpiGrid`, que montaba ocho tarjetas de las cuales
 * CINCO tenían el guión escrito a mano (`value: DASH`, sin fuente detrás):
 * cartera vencida total, recuperado este mes, promesas activas, promesas
 * incumplidas y tasa de recuperación. No eran métricas sin datos todavía —
 * eran métricas que no podían existir, dijera lo que dijera la base.
 *
 * Las de verdad estaban en `/cobranza/resultados`, que salía del agregado
 * `GET /cobranza/recovery`. Esa pantalla se fusionó acá (decisión de Nico,
 * 2026-08-08): hacía el mismo trabajo que el Resumen y hasta tenía una tarjeta
 * al pie explicando que ella no era la analítica ni el reporte.
 *
 * Regla de la casa: **una tarjeta que no puede decir nada no se monta.** Cada
 * métrica se calcula como `número | null` y las nulas se filtran; si no
 * sobrevive ninguna, la sección entera no se renderiza. Nada de rejillas de
 * ceros y guiones ocupando el lugar de lo útil.
 *
 * Fuentes, en orden de preferencia:
 *   useRecovery        → el agregado; cada campo es null cuando no hay señal.
 *   useDailyReport     → respaldo de recaudo y tasa de respuesta.
 *   overview (por prop)→ respaldo de gestionados/escalados y casos activos.
 *
 * `overview` llega por prop porque el Resumen ya lo tiene cargado: pedirlo otra
 * vez sería una llamada de más por la misma data.
 */

import { useMemo } from 'react'
import {
  Briefcase,
  ChatCircleText,
  CheckCircle,
  Clock,
  CurrencyDollar,
  FileText,
  Handshake,
  PhoneCall,
  TrendDown,
  TrendUp,
  Warning,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

import { useI18n } from '@/lib/i18n'
import { KpiCard, Stagger, StaggerItem } from '@leasefy/cadence'
import { useDailyReport } from '@/lib/hooks/cobranza/use-daily-report'
import { useRecovery } from '@/lib/hooks/cobranza/use-recovery'
import { fechaLarga } from '@/lib/fechas/fecha-de-la-casa'
import type { CarteraOverviewResponse } from '@/lib/hooks/cobranza/use-cartera-overview'

interface Metrica {
  key: string
  label: string
  icon: Icon
  /** null = sin fuente. La tarjeta no se monta. */
  value: string | null
  sublabel: string
}

export interface CobranzaResultadosKpisProps {
  overview: CarteraOverviewResponse | null
}

export function CobranzaResultadosKpis({ overview }: CobranzaResultadosKpisProps) {
  const { formatCurrency, formatNumber } = useI18n()
  const recovery = useRecovery()
  const daily = useDailyReport()

  const metricas = useMemo<Metrica[]>(() => {
    const rec = recovery.data
    const ov = overview
    const summary = daily.data?.summary

    const recuperadoCop =
      rec?.recoveredValueCop ??
      summary?.payments_today_total_cop ??
      ov?.kpis.pagadoHoyCop ??
      null

    const casosCerrados = rec?.casesClosed ?? null
    const gestionados = rec?.casesManaged ?? ov?.kpis.llamadasHoy ?? null
    const tiempoRecuperacion = rec?.avgRecoveryDays ?? null
    const tasaRespuesta =
      rec?.responseRatePct ??
      (typeof summary?.connect_rate_pct === 'number' ? summary.connect_rate_pct : null)
    const promesasKept = rec?.promisesKept ?? null
    const promesasTotal = rec?.promisesTotal ?? null
    const acuerdosKept = rec?.agreementsKept ?? null
    const acuerdosTotal = rec?.agreementsTotal ?? null
    const escalados = rec?.casesEscalated ?? ov?.kpis.escalacionesPendientes ?? null
    const casosActivos = ov?.kpis.deudoresActivos ?? null

    // `moraReducedPct` positivo = la mora BAJÓ (así lo define el agregado). El
    // signo manda sobre título, ícono y texto; el número va en magnitud para no
    // leer la dirección dos veces.
    const mora = rec?.moraReducedPct ?? null
    const moraDias = rec?.moraWindowDays ?? 90
    // N-10 (QA-PAGOS-95 r2): de cuánto a cuánto y desde qué día; sin cartera hoy
    // no hay «recuperación» (el índice en cero no es mora que bajó).
    const sinCarteraHoy = rec?.moraSinCarteraHoy === true
    const deCuantoACuanto =
      rec?.moraDesdePct != null && rec?.moraHastaPct != null && rec?.moraDesdeDia
        ? `De ${formatNumber(rec.moraDesdePct)} % a ${formatNumber(rec.moraHastaPct)} % desde el ${fechaLarga(rec.moraDesdeDia)}`
        : null

    return [
      {
        key: 'recuperado',
        label: 'Valor recuperado',
        icon: CurrencyDollar,
        value: recuperadoCop != null ? formatCurrency(recuperadoCop) : null,
        sublabel: 'Recaudo confirmado',
      },
      {
        key: 'promesas-cumplidas',
        label: 'Promesas cumplidas',
        icon: Handshake,
        // «0 / 0» no es una métrica: es la tarjeta diciendo que no tiene nada
        // que decir. Con total 0 no se monta (regla de la casa, ver docblock).
        value:
          promesasKept != null && promesasTotal !== 0
            ? promesasTotal != null
              ? `${formatNumber(promesasKept)} / ${formatNumber(promesasTotal)}`
              : formatNumber(promesasKept)
            : null,
        sublabel: 'Promesas de pago que se cumplieron',
      },
      {
        key: 'tasa-respuesta',
        label: 'Tasa de respuesta',
        icon: ChatCircleText,
        value: tasaRespuesta != null ? `${formatNumber(tasaRespuesta)}%` : null,
        sublabel: 'Contactos que respondieron',
      },
      {
        key: 'escalados',
        label: 'Casos escalados',
        icon: Warning,
        value: escalados != null ? formatNumber(escalados) : null,
        sublabel: 'Subidos a revisión humana',
      },
      {
        key: 'mora',
        label:
          sinCarteraHoy || mora == null || mora === 0
            ? 'Variación de mora'
            : mora > 0
              ? 'Mora reducida'
              : 'Mora aumentada',
        icon: mora != null && mora < 0 ? TrendUp : TrendDown,
        value: sinCarteraHoy ? '—' : mora != null ? `${formatNumber(Math.abs(mora))} pts` : null,
        sublabel: sinCarteraHoy
          ? 'Hoy no hay cartera en mora: no hay recuperación que medir.'
          : mora == null
            ? ''
            : deCuantoACuanto
              ? `${deCuantoACuanto}.`
              : mora === 0
                ? `Sin cambio en ${moraDias} días`
                : mora > 0
                  ? `Bajó en ${moraDias} días`
                  : `Subió en ${moraDias} días`,
      },
      {
        key: 'casos-activos',
        label: 'Casos activos',
        icon: Briefcase,
        value: casosActivos != null ? formatNumber(casosActivos) : null,
        sublabel: 'En gestión de cobranza',
      },
      {
        key: 'gestionados',
        label: 'Casos gestionados',
        icon: PhoneCall,
        value: gestionados != null ? formatNumber(gestionados) : null,
        sublabel: 'Casos trabajados por el agente',
      },
      {
        key: 'casos-cerrados',
        label: 'Casos cerrados',
        icon: CheckCircle,
        value: casosCerrados != null ? formatNumber(casosCerrados) : null,
        sublabel: 'Casos con desenlace',
      },
      {
        key: 'acuerdos-cumplidos',
        label: 'Acuerdos cumplidos',
        icon: FileText,
        // Misma regla que promesas: sin planes de pago no hay razón que mostrar.
        value:
          acuerdosKept != null && acuerdosTotal !== 0
            ? acuerdosTotal != null
              ? `${formatNumber(acuerdosKept)} / ${formatNumber(acuerdosTotal)}`
              : formatNumber(acuerdosKept)
            : null,
        sublabel: 'Planes de pago que se cumplieron',
      },
      {
        key: 'tiempo-recuperacion',
        label: 'Tiempo prom. de recuperación',
        icon: Clock,
        value:
          tiempoRecuperacion != null
            ? `${formatNumber(tiempoRecuperacion)} ${tiempoRecuperacion === 1 ? 'día' : 'días'}`
            : null,
        sublabel: 'Desde la gestión hasta el pago',
      },
    ].filter((m): m is Metrica => m.value != null)
  }, [recovery.data, overview, daily.data, formatCurrency, formatNumber])

  if (metricas.length === 0) return null

  return (
    <section aria-label="Cómo va el agente" className="space-y-3">
      {/* Sin título ni botón propios: la sección que lo contiene ya se llama
          «Lo que hizo el agente» y ella carga el enlace al reporte diario en
          la fila del título. Cuando esta rejilla vivía con una fila propia
          `justify-end` para el botón, quedaba una franja casi vacía entre el
          título y las tarjetas. */}
      {/* Las tarjetas se montan a medida que cada fuente responde (recaudo,
          reporte diario): entran escalonadas y las demás se corren a su lugar
          (`layout`), en vez de saltar de golpe. */}
      {/* QA-IA-95 (IA-B-09): en cinco columnas a 1440 px los rótulos se cortaban («TASA DE RESPUES…»,
          «VARIACIÓN DE MO…»): las cinco en fila sólo con pantalla ancha. */}
      <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 min-[1680px]:grid-cols-5 gap-3">
        {metricas.map((m) => {
          const MetricaIcon = m.icon
          return (
            <StaggerItem key={m.key} className="min-w-0 [&>*]:h-full">
              <KpiCard
                label={m.label}
                value={m.value as string}
                sublabel={m.sublabel}
                icon={<MetricaIcon weight="duotone" aria-hidden="true" />}
                data-testid={`cobranza-kpi-${m.key}`}
              />
            </StaggerItem>
          )
        })}
      </Stagger>
    </section>
  )
}
