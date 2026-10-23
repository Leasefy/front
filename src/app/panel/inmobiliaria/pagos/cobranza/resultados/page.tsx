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

import { EsqueletoIndicadores } from '@/components/estado/EsqueletoTabla'
import { useMemo } from 'react'
import Link from 'next/link'
import { ChartLineUp, Warning } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth'
import { useAutoRefresh } from '@/lib/hooks/use-auto-refresh'
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { CifraHeroe } from '@/components/pantalla/CifraHeroe'
import { MasDetalles } from '@/components/pantalla/MasDetalles'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui'
import { Cifra, CrossFade, FranjaDeCifras, Presence } from '@leasefy/cadence'
import { useCarteraOverview } from '@/lib/hooks/cobranza/use-cartera-overview'
import { useDailyReport } from '@/lib/hooks/cobranza/use-daily-report'
import { useRecovery } from '@/lib/hooks/cobranza/use-recovery'

const BASE = '/panel/inmobiliaria/pagos/cobranza'
const ANALITICA_HREF = `${BASE}/analitica`
const REPORTE_HREF = `${BASE}/reporte`
const ESCALACIONES_HREF = `${BASE}/escalaciones`

const EM_DASH = '—'

// ── Tipo de fila de KPI ───────────────────────────────────────────────────────

interface ResultadoKpi {
  key: string
  label: string
  /** Lo que recuperó (el resultado) o cómo trabajó (el esfuerzo). */
  grupo: 'recupero' | 'trabajo'
  /** Punto de estado junto a la etiqueta (la mora que sube, en rojo). */
  tono?: 'exito' | 'peligro'
  /** Valor formateado, o null → «—» y su detalle dice que aún no hay dato. */
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
    // Revisora r25 (Resultados #3): sin el agregado, lo que se muestra es lo
    // pagado HOY; se dice así y no «Valor recuperado» (mezclaba periodos).
    const recuperadoEsDeHoy = rec?.recoveredValueCop == null && recuperadoCop != null

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
        grupo: 'recupero',
        label: recuperadoEsDeHoy ? 'Pagado hoy' : 'Valor recuperado',
        value: recuperadoCop != null ? formatCurrency(recuperadoCop) : null,
        // Sin renglón de relleno (revisora r25, #4): sólo se dice algo cuando falta el dato.
        sublabel: recuperadoCop != null ? '' : 'Aún sin recaudo confirmado',
      },
      {
        key: 'casos-cerrados',
        grupo: 'recupero',
        label: 'Casos cerrados',
        value: casosCerrados != null ? formatNumber(casosCerrados) : null,
        sublabel: casosCerrados != null ? '' : 'Aún sin casos cerrados',
      },
      {
        key: 'gestionados',
        grupo: 'trabajo',
        label: 'Casos gestionados',
        value: gestionados != null ? formatNumber(gestionados) : null,
        sublabel: '',
      },
      {
        key: 'tiempo-recuperacion',
        grupo: 'recupero',
        label: 'Tiempo promedio de recuperación',
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
        grupo: 'trabajo',
        label: 'Tasa de respuesta',
        value: tasaRespuesta != null ? `${formatNumber(tasaRespuesta)} %` : null,
        sublabel:
          tasaRespuesta != null
            ? 'Contactos que respondieron'
            : 'Aún sin tasa de respuesta',
      },
      {
        key: 'promesas-cumplidas',
        grupo: 'trabajo',
        label: 'Promesas cumplidas',
        value:
          promesasKept != null
            ? promesasTotal != null
              ? `${formatNumber(promesasKept)} / ${formatNumber(promesasTotal)}`
              : formatNumber(promesasKept)
            : null,
        sublabel:
          promesasKept != null
            ? 'De las promesas de pago'
            : 'Aún sin promesas cumplidas',
      },
      {
        key: 'acuerdos-cumplidos',
        grupo: 'trabajo',
        label: 'Acuerdos cumplidos',
        value:
          acuerdosKept != null
            ? acuerdosTotal != null
              ? `${formatNumber(acuerdosKept)} / ${formatNumber(acuerdosTotal)}`
              : formatNumber(acuerdosKept)
            : null,
        sublabel:
          acuerdosKept != null
            ? 'De los planes de pago'
            : 'Aún sin acuerdos cumplidos',
      },
      {
        key: 'escalados',
        grupo: 'trabajo',
        label: 'Casos escalados',
        value: escalados != null ? formatNumber(escalados) : null,
        sublabel: '',
      },
      {
        // El agregado define `moraReducedPct` positivo = la mora BAJÓ. La
        // tarjeta decía «Mora reducida · Caída del índice de morosidad» con
        // flecha hacia abajo pasara lo que pasara: con −62,2 estaba anunciando
        // como buena noticia una subida de 62 puntos de mora. Ahora el signo
        // manda sobre el título, el ícono y el texto, y el número va en
        // magnitud para que no se lea dos veces la dirección.
        key: 'mora-reducida',
        grupo: 'recupero',
        label:
          moraReducida == null || moraReducida === 0
            ? 'Variación de mora'
            : moraReducida > 0
              ? 'Mora reducida'
              : 'Mora aumentada',
        tono: moraReducida == null || moraReducida === 0 ? undefined : moraReducida > 0 ? 'exito' : 'peligro',
        value:
          moraReducida != null
            ? `${formatNumber(Math.abs(moraReducida))} puntos`
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

  /*
   * GLOW UP 21-10 · el trabajo de esta pantalla es saber si el agente rinde y
   * qué espera de ti. Antes: diez tarjetas iguales (una, «Ahorro operativo»,
   * siempre en «—») y una tarjeta de enlaces al final. Ahora: el encabezado con
   * lo que se hace (revisar lo escalado, si hay; la analítica y el reporte del
   * día como apoyo), la frase del agente y dos franjas — lo que recuperó y
   * cómo trabajó.
   *
   * 🔴 «Revisar N escalados» usa las escalaciones PENDIENTES del overview, no
   * `casesEscalated` del agregado (ese cuenta todas las de la ventana, también
   * las ya resueltas).
   */
  const pendientes = overview.data?.kpis.escalacionesPendientes ?? 0
  const recuperadoKpi = kpis.find((k) => k.key === 'recuperado') ?? null
  /*
   * Revisora r27 (Resultados, UI): la analítica y el reporte del día son de CONSULTA. Con resultados van en gris
   * dentro de «Cómo trabajó» (antes dos botones de contorno junto al azul); sin resultados, en el encabezado
   * como enlaces, porque es lo único que se puede mirar.
   */
  const deConsulta = (
    <>
      <Button asChild variant="link" size="sm" hideArrow className="px-0 text-fg-muted">
        <Link href={ANALITICA_HREF} data-testid="resultados-ver-analitica">
          Ver analítica
        </Link>
      </Button>
      <Button asChild variant="link" size="sm" hideArrow className="px-0 text-fg-muted">
        <Link href={REPORTE_HREF} data-testid="resultados-ver-reporte">
          Reporte del día
        </Link>
      </Button>
    </>
  )
  const header = (
    <EncabezadoDePantalla
      seccion="Cobranza"
      titulo="Resultados del agente"
      descripcion="Lo que recuperó tu agente de cobranza y cómo trabajó, leído como evaluarías a un equipo."
      acciones={hasAnyData ? undefined : deConsulta}
      accionPrincipal={
        pendientes > 0 ? (
          <Button asChild size="sm" hideArrow>
            <Link href={ESCALACIONES_HREF} data-testid="resultados-revisar-escalados">
              {pendientes === 1 ? 'Revisar 1 escalado' : `Revisar ${formatNumber(pendientes)} escalados`}
            </Link>
          </Button>
        ) : undefined
      }
      data-testid="resultados-encabezado"
    />
  )

  const franja = (grupo: ResultadoKpi['grupo'], titulo: string, explicacion: string) => {
    // Lo recuperado va aparte, como LA RESPUESTA: aquí no se repite.
    const deEste = kpis.filter((k) => k.grupo === grupo && k.key !== 'recuperado')
    const id = `resultados-${grupo}`
    return (
      <section className="space-y-3" aria-labelledby={id}>
        <div className="space-y-0.5">
          <h2 id={id} className="text-body font-medium text-fg">
            {titulo}
          </h2>
          <p className="text-caption text-fg-muted">{explicacion}</p>
        </div>
        <FranjaDeCifras fila={deEste.length > 4 ? 'lg' : 'md'} aria-label={titulo} data-testid={`franja-${grupo}`}>
          {deEste.map((kpi) => (
            <Cifra
              key={kpi.key}
              etiqueta={kpi.label}
              valor={kpi.value ?? EM_DASH}
              detalle={kpi.sublabel || undefined}
              tono={kpi.value != null ? kpi.tono : undefined}
              data-testid={`resultado-kpi-${kpi.key}`}
            />
          ))}
        </FranjaDeCifras>
      </section>
    )
  }

  // ── Primer load ────────────────────────────────────────────────────────────
  // Movimiento: cada salida en un `CrossFade` con su clave (cargando →
  // resultados, → vacío); lo que ya estaba al montarse no se anima.
  if (isLoading && !hasAnyData) {
    return (
      <CrossFade swapKey="cargando">
        <div className="p-6 lg:p-8 space-y-6">
          {header}
          {/* C6 (r25): esqueleto con la forma de las cifras, no una rueda. */}
          <EsqueletoIndicadores cantidad={4} />
        </div>
      </CrossFade>
    )
  }

  // ── Sin ninguna fuente con datos (ni error explícito) ──────────────────────
  if (!isLoading && !hasAnyData) {
    return (
      <CrossFade swapKey="vacio">
        <div className="p-6 lg:p-8 space-y-6">
          {header}
          <section className="rounded-lg border border-border bg-surface" data-testid="resultados-vacio">
            <EmptyState
              icon={ChartLineUp}
              ilustracion="monedas"
              title="Aún no hay resultados para mostrar"
              description="Cuando el agente empiece a gestionar tu cartera, aquí ves lo que recuperó, los casos que cerró y escaló, y su tasa de respuesta."
            />
          </section>
        </div>
      </CrossFade>
    )
  }

  return (
    <CrossFade swapKey="resultados">
      <div className="p-6 lg:p-8 space-y-8">
        <div className="space-y-4">
          {header}

          {/* Error parcial — alguna fuente falló pero la otra rindió datos */}
          <Presence
            show={Boolean((recovery.error || overview.error || daily.error) && hasAnyData)}
            role="alert"
            className="rounded-lg bg-warning-soft border border-warning/30 p-3 text-body-sm text-warning flex items-center gap-2 max-w-2xl"
          >
            <Warning className="w-4 h-4 shrink-0" weight="fill" aria-hidden="true" />
            <span>Algunas métricas no se pudieron cargar; mostramos lo disponible.</span>
          </Presence>

        </div>

        {/* LA RESPUESTA: lo que recuperó. Debajo, cómo lo logró (3 cifras) y,
            plegado, cómo trabajó (5 más). Antes eran nueve cifras del mismo peso. */}
        {recuperadoKpi ? (
          <CifraHeroe
            data-testid="resultado-kpi-recuperado"
            rotulo={recuperadoKpi.label}
            cifra={recuperadoKpi.value ?? EM_DASH}
            contexto={recuperadoKpi.sublabel || undefined}
            // Revisora r25 (Resultados #2): lo primero es la cifra; la frase de
            // lo que hizo el agente queda como su pie (antes un párrafo encima).
            pie={narrativa ? <span data-testid="resultados-narrativa">{narrativa}</span> : undefined}
          />
        ) : null}
        {franja('recupero', 'Lo que recuperó', 'La plata y los casos que el agente llevó hasta el pago.')}
        <MasDetalles etiqueta="Cómo trabajó" etiquetaAbierto="Ocultar cómo trabajó" montadoSiempre>
          {franja('trabajo', 'Cómo trabajó', 'Los casos que tocó, quiénes respondieron, lo que se cumplió y lo que subió a revisión humana.')}
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1">{deConsulta}</div>
        </MasDetalles>
      </div>
    </CrossFade>
  )
}

export default function ResultadosPage() {
  return (
    <PageGuard module="cobranza">
      <ResultadosContent />
    </PageGuard>
  )
}
