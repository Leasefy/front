'use client'

/**
 * CobranzaAnaliticaResumen — el «por qué» detrás de los números, dentro del
 * Resumen de Cobranza.
 *
 * `/cobranza/analitica` traía cinco widgets. Se fusionan los tres que le sirven
 * a la inmobiliaria y se dejan fuera dos, por razones distintas:
 *
 *   ✅ Costo por peso recuperado — cuánto cuesta cobrar. Es LA cifra unitaria
 *      del servicio y cabe en una tarjeta.
 *   ✅ Tasa de recuperación — cuánto se recupera y cómo evoluciona.
 *   ✅ Top objeciones — por qué no pagan. Sale de `debtor_memos`, no de calls.
 *
 *   ❌ Top scripts — MUERTO. El SQL hace `JOIN agent.script_templates`, tabla
 *      que está vacía y que nada llena; además ninguna llamada trae
 *      `script_template_id`. Un INNER JOIN contra una tabla vacía no devuelve
 *      nada nunca. Es la cara analítica del mismo hueco que sacó a Playbooks
 *      del panel.
 *   ❌ Cadencia (mix de canal + mapa 24×7) — sirve para afinar CUÁNDO y POR QUÉ
 *      canal contacta el agente, y eso lo afinamos nosotros, no la
 *      inmobiliaria: mismo criterio que se aplicó a los guiones. Lo que a ella
 *      sí le toca de horarios —si se contactó fuera de la ventana de Ley 2300—
 *      ya vive en Cumplimiento.
 *
 * Compuertas — son DOS, y hay que respetar las dos:
 *
 *   1. La del backend: ≥5 llamadas en 30 días para que la analítica signifique
 *      algo. Antes, no cumplirla era una pantalla entera dedicada a un cartel de
 *      «Sin datos aún» (con el número de fase interna a la vista, además).
 *   2. La de cada widget: `populated`. Cada uno se alimenta de una tabla
 *      distinta —recuperación de `cartera_stage_transitions` + `payments`,
 *      objeciones de `debtor_memos`, costo de `billing_events`—, así que la
 *      primera compuerta puede abrir con las tres vacías. Sembrando solo
 *      llamadas se veía exactamente eso: tres tarjetas diciendo «Sin datos
 *      suficientes todavía» una al lado de la otra.
 *
 * Se monta widget por widget, y si no sobrevive ninguno la sección desaparece:
 * misma regla que `CobranzaResultadosKpis`, lo que no puede decir nada no ocupa
 * lugar.
 *
 * Los títulos los pone cada widget — repetirlos acá los duplicaba en pantalla.
 */

import { Button } from '@/components/ui/button'
import { useCobranzaAnalytics } from '@/lib/hooks/cobranza/use-cobranza-analytics'
import { RecoveryRateChart } from '@/components/inmobiliaria/cobranza/RecoveryRateChart'
import { TopObjectionsTable } from '@/components/inmobiliaria/cobranza/TopObjectionsTable'
import { CostPerPesoKpi } from '@/components/inmobiliaria/cobranza/CostPerPesoKpi'

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
  const hayCosto = Boolean(data?.costPerPeso?.populated)
  const hayObjeciones = Boolean(data?.objections?.populated)

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
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
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

  if (!compuertaAbierta || (!hayRecuperacion && !hayCosto && !hayObjeciones)) {
    return null
  }

  return (
    <section aria-label="Cómo lo está logrando" className="space-y-3">
      <h2 className="text-base font-semibold text-fg">Cómo lo está logrando</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {hayRecuperacion && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-4 md:col-span-2">
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

        {hayCosto && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <CostPerPesoKpi
              data={(data?.costPerPeso ?? null) as never}
              isLoading={isLoading}
            />
          </div>
        )}

        {hayObjeciones && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <TopObjectionsTable
              data={{
                populated: true,
                objections: data?.objections?.objections ?? [],
                reason: data?.objections?.reason,
              }}
            />
          </div>
        )}
      </div>
    </section>
  )
}
