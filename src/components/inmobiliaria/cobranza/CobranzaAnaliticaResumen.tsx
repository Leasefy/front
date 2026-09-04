'use client'

/**
 * CobranzaAnaliticaResumen — el «por qué» detrás de los números, dentro del
 * Resumen de Cobranza.
 *
 * `/cobranza/analitica` trae cinco widgets. Se montan CUATRO:
 *
 *   ✅ Tasa de recuperación — cuánto se recupera y cómo evoluciona.
 *   ✅ Top objeciones — por qué no pagan. Sale de `debtor_memos`, no de calls.
 *   ✅ Mix de canal — por qué canal responde tu cartera y con qué desenlace.
 *   ✅ Mapa 24×7 — a qué horas contesta la gente y cuándo sale bien.
 *
 *   Los dos de cadencia estuvieron FUERA por decisión de diseño («eso lo
 *   afinamos nosotros, no la inmobiliaria») hasta que Nico la reversó el
 *   2026-08-25: con solo objeciones la sección «no dice mucho» y dejaba media
 *   pantalla vacía. Verificado antes de montarlos que la fuente es real: 630
 *   llamadas en 30 días, 3 canales, 20 horas distintas en la base dev.
 *
 *   ❌ Top scripts — MUERTO. El SQL hace `JOIN agent.script_templates`, tabla
 *      que está vacía y que nada llena; un INNER JOIN contra una tabla vacía
 *      no devuelve nada nunca.
 *   ❌ Costo por peso recuperado — regla de Nico (2026-08-24): los costos del
 *      servicio NO se muestran a los usuarios. Misma razón por la que el
 *      detalle de llamada perdió su panel de costos.
 *
 * Compuertas — son DOS, y hay que respetar las dos:
 *
 *   1. La del backend: ≥5 llamadas en 30 días para que la analítica signifique
 *      algo.
 *   2. La de cada widget: `populated`. Cada uno se alimenta de una tabla
 *      distinta, así que la primera compuerta puede abrir con todas vacías.
 *
 * Se monta widget por widget, y si no sobrevive ninguno la sección desaparece.
 * Cuando sobrevive UNO solo, ocupa el ancho completo (`only-child`): una
 * tarjeta a media pantalla con la otra mitad vacía se lee como una sección
 * rota, no como una sección honesta.
 *
 * Los títulos los pone cada widget — repetirlos acá los duplicaba en pantalla.
 */

import { useMemo } from 'react'

import { Button } from '@/components/ui/button'
import { useCobranzaAnalytics } from '@/lib/hooks/cobranza/use-cobranza-analytics'
import { RecoveryRateChart } from '@/components/inmobiliaria/cobranza/RecoveryRateChart'
import { TopObjectionsTable } from '@/components/inmobiliaria/cobranza/TopObjectionsTable'
import { CadenceChannelMixChart } from '@/components/inmobiliaria/cobranza/CadenceChannelMixChart'
import { HeatmapGrid24x7 } from '@/components/inmobiliaria/cobranza/HeatmapGrid24x7'

/** Mínimo de llamadas en 30 días que el backend exige para que haya analítica. */
const MIN_LLAMADAS_30D = 5

export function CobranzaAnaliticaResumen() {
  const { isLoading, error, data, refetch } = useCobranzaAnalytics()

  const gate = data?.agencyGate
  const compuertaAbierta =
    !isLoading &&
    Boolean(gate?.populated) &&
    (gate?.calls_30d ?? 0) >= MIN_LLAMADAS_30D

  const hayRecuperacion = Boolean(data?.recovery?.populated)
  const hayObjeciones = Boolean(data?.objections?.populated)
  const hayMixDeCanal = Boolean(
    data?.cadence?.populated && data.cadence.channelMix?.populated,
  )
  const hayMapa = Boolean(data?.cadence?.populated && data.cadence.heatmap?.populated)

  // El componente del mapa pide `maxCount` para escalar el color; el hook no
  // lo trae, así que se deriva de las celdas una sola vez.
  const celdasMapa = data?.cadence?.heatmap?.cells ?? []
  const maxCount = useMemo(
    () => celdasMapa.reduce((m, c) => Math.max(m, c.call_count), 0),
    [celdasMapa],
  )

  /*
   * Desaparecer y fallar son cosas distintas.
   *
   * Con la consulta caída, `data` queda en null → la compuerta no abre → la
   * sección se iba entera, sin dejar rastro. Visto desde afuera es idéntico a
   * «todavía no llegaste a 5 llamadas»: dos motivos opuestos, cero señal para
   * distinguirlos, y ninguna forma de reintentar.
   *
   * Desaparecer sigue siendo correcto cuando NO HAY datos —lo que no puede
   * decir nada no ocupa lugar—. Fallar no: eso se avisa. En una línea, porque
   * esto es una sección secundaria y no debe tapar la página.
   */
  if (error && !isLoading) {
    return (
      <section aria-label="Cómo lo está logrando" className="space-y-3">
        <h2 className="text-base font-semibold text-fg">Cómo lo está logrando</h2>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-sm text-fg-muted">
            No pudimos traer la analítica del agente.
          </p>
          <Button variant="outline" size="sm" hideArrow onClick={() => void refetch()}>
            Intentar de nuevo
          </Button>
        </div>
      </section>
    )
  }

  if (
    !compuertaAbierta ||
    (!hayRecuperacion && !hayObjeciones && !hayMixDeCanal && !hayMapa)
  ) {
    return null
  }

  return (
    <section aria-label="Cómo lo está logrando" className="space-y-3">
      <h2 className="text-base font-semibold text-fg">Cómo lo está logrando</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 [&>*:only-child]:md:col-span-2">
        {hayRecuperacion && (
          <div className="rounded-lg border border-border bg-card p-6 space-y-4 md:col-span-2">
            <RecoveryRateChart
              data={{
                populated: true,
                rows: data?.recovery?.rows ?? [],
                reason: data?.recovery?.reason as
                  | 'agency-gate'
                  | 'insufficient-buckets'
                  | undefined,
              }}
            />
          </div>
        )}

        {hayObjeciones && (
          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            <TopObjectionsTable
              data={{
                populated: true,
                objections: data?.objections?.objections ?? [],
                reason: data?.objections?.reason,
              }}
            />
          </div>
        )}

        {hayMixDeCanal && (
          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            <CadenceChannelMixChart
              data={{ populated: true, rows: data?.cadence?.channelMix?.rows ?? [] }}
            />
          </div>
        )}

        {hayMapa && (
          <div className="rounded-lg border border-border bg-card p-6 space-y-4 md:col-span-2">
            <HeatmapGrid24x7 data={{ populated: true, cells: celdasMapa, maxCount }} />
          </div>
        )}
      </div>
    </section>
  )
}
