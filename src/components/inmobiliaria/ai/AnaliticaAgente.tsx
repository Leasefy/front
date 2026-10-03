'use client'

/**
 * AnaliticaAgente — F10 of the Agent Workspace initiative (superficie 6).
 *
 * The generic per-agent Analítica body: resumen KPI strip (reuses
 * `formatKpiValue` from SalaAgente — number / percent-fraction / cop) plus one
 * block per serie rendering the last 30 Bogotá days as a simple daily bar
 * chart.
 *
 * Chart approach: the cotizador insights widgets use recharts per-widget
 * (ResponsiveContainer needs real DOM measurements — renders nothing in unit
 * tests and is heavy for 4 new pages), so this primitive uses pure-CSS bars:
 * a flex row of divs, height = % of the serie max, per-day title tooltip and
 * an accessible role="img" summary per serie.
 *
 * 🔴 El 404 NO es «el agente aún no reporta».
 *
 * `GET …/ai-hub/agentes/{agente}/analitica` NO EXISTE en el microservicio: no
 * hay ninguna ruta `analitica` montada (`agent-integracion/src/server/routes`
 * sólo publica `overview` y `autonomia` bajo `agentes/{agente}`). Así que las
 * cuatro pantallas que usan este componente contestan siempre lo mismo, y lo
 * contestaban con un cartel amable que decía «el agente aún no reporta
 * analítica» — como si el agente estuviera trabajando y todavía no hubiera
 * datos. No: la consulta se cae y nadie se entera. Un fallo permanente
 * disfrazado de estado vacío no se arregla nunca, porque nadie sabe que está
 * roto.
 *
 * Ahora se ve como lo que es, con `FalloDeCarga` (el mismo cartel del resto
 * del panel, con su referencia para soporte).
 */

import { ChartBar } from '@phosphor-icons/react'

import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import type { AgentAnaliticaResponse, AnaliticaSerie } from '@/lib/api/agent-workspace'
import { useI18n } from '@/lib/i18n'
import { formatKpiValue } from './SalaAgente'
import { AnimatedNumber, CrossFade, Stagger, StaggerItem } from '@leasefy/cadence'
import { BarraQueCrece } from '@/components/inmobiliaria/reports/barra-que-crece'
import { useRef } from 'react'

const NS = 'inmobiliaria.ai.workspace.analitica'

/**
 * El 404 que devuelve pedir una ruta que el micro no publica. Se arma acá
 * —con `status`, que es lo que lee `clasificarFallo`— porque el hook se traga
 * la respuesta y sólo deja la bandera `notAvailable`.
 */
const FALLO_SIN_RUTA = Object.assign(
  new Error('GET /ai-hub/agentes/{agente}/analitica no está publicado por el microservicio'),
  { status: 404 },
)

// ── Props ───────────────────────────────────────────────────────────────────

export interface AnaliticaAgenteProps {
  data: AgentAnaliticaResponse | null
  isLoading?: boolean
  error?: string | null
  /** Backend 404 — graceful empty state, NOT an error. */
  notAvailable?: boolean
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const dayFormatter = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  timeZone: 'America/Bogota',
})

/** "2026-06-09" → "09 jun" (parsed as a Bogotá calendar day, not UTC drift). */
function formatDay(date: string): string {
  const parsed = new Date(`${date}T12:00:00-05:00`)
  return Number.isNaN(parsed.getTime()) ? date : dayFormatter.format(parsed)
}

// ── Serie block ─────────────────────────────────────────────────────────────

function SerieBlock({ serie }: { serie: AnaliticaSerie }) {
  const { t } = useI18n()
  const max = serie.points.reduce((acc, p) => Math.max(acc, p.value), 0)

  return (
    <section
      className="rounded-lg border border-border bg-card p-4 space-y-3"
      data-testid={`analitica-serie-${serie.id}`}
    >
      <h2 className="text-sm font-semibold text-foreground">{serie.label}</h2>

      {max === 0 ? (
        <p className="text-xs text-muted-foreground" data-testid="analitica-serie-empty">
          {t(`${NS}.serieEmpty`)}
        </p>
      ) : (
        // Las barras crecen desde abajo al aparecer (una sola capa con
        // `scaleY`, como las de recharts); el alto de cada día es el dato.
        <BarraQueCrece
          className="flex items-end gap-[2px] h-24 w-full"
          role="img"
          aria-label={t(`${NS}.serieAria`, {
            label: serie.label,
            dias: serie.points.length,
            max: formatKpiValue(max, serie.format),
          })}
        >
          {serie.points.map((point) => (
            <div
              key={point.date}
              data-testid="analitica-bar"
              className="flex-1 min-w-0 rounded-t-sm bg-primary/80 hover:bg-primary transition-colors"
              style={{
                // 0 keeps a 2px floor so the day remains hover-discoverable.
                height: point.value === 0 ? '2px' : `${Math.max((point.value / max) * 100, 4)}%`,
              }}
              title={`${formatDay(point.date)} · ${formatKpiValue(point.value, serie.format)}`}
            />
          ))}
        </BarraQueCrece>
      )}

      {max > 0 && (
        <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
          <span>{formatDay(serie.points[0]?.date ?? '')}</span>
          <span>{formatDay(serie.points[serie.points.length - 1]?.date ?? '')}</span>
        </div>
      )}
    </section>
  )
}

// ── Component ───────────────────────────────────────────────────────────────

export function AnaliticaAgente({ data, isLoading, error, notAvailable }: AnaliticaAgenteProps) {
  const { t } = useI18n()
  // ¿Se vio la carga? Entonces las cifras del resumen cuentan desde 0.
  const huboCarga = useRef(false)
  if (isLoading) huboCarga.current = true

  // Movimiento: cada estado en un `CrossFade` con su clave (esqueleto →
  // analítica, → fallo); lo que ya estaba al montarse no se anima.
  if (isLoading) {
    return (
      <CrossFade swapKey="esqueleto">
      <div className="space-y-4" data-testid="analitica-loading">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-lg border border-border bg-muted/40 animate-pulse" />
          ))}
        </div>
        <div className="h-40 rounded-lg border border-border bg-muted/40 animate-pulse" />
        <div className="h-40 rounded-lg border border-border bg-muted/40 animate-pulse" />
      </div>
      </CrossFade>
    )
  }

  if (error) {
    // El mensaje crudo del backend no se muestra: `FalloDeCarga` lo clasifica
    // y lo deja en el nodo de diagnóstico.
    return (
      <CrossFade swapKey="fallo">
      <div data-testid="analitica-error">
        <FalloDeCarga error={new Error(error)} queEs="la analítica de este agente" enmarcado={false} />
      </div>
      </CrossFade>
    )
  }

  if (notAvailable || !data) {
    /*
     * Sin datos y sin excepción: o el micro contestó 404 (la ruta no está
     * montada) o ni siquiera se pudo preguntar. En los dos casos es un fallo,
     * no un vacío — ver el encabezado del archivo.
     */
    return (
      <CrossFade swapKey="no-disponible">
      <div data-testid="analitica-no-disponible">
        <FalloDeCarga
          error={FALLO_SIN_RUTA}
          queEs="la analítica de este agente"
          enmarcado={false}
        />
      </div>
      </CrossFade>
    )
  }

  return (
    <CrossFade swapKey="analitica">
    <div className="space-y-6" data-testid="analitica-agente">
      {/* Resumen KPI strip: entran escalonadas y cada cifra cuenta. */}
      {data.resumen.length > 0 && (
        <Stagger className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="analitica-resumen">
          {data.resumen.map((kpi) => (
            <StaggerItem
              key={kpi.id}
              className="rounded-lg border border-border bg-card p-4"
              data-testid={`analitica-kpi-${kpi.id}`}
            >
              <p className="text-xs text-muted-foreground leading-tight">{kpi.label}</p>
              <p className="text-xl font-semibold text-foreground mt-1 tabular-nums">
                <AnimatedNumber
                  value={kpi.value}
                  from={huboCarga.current ? 0 : undefined}
                  format={(n) => formatKpiValue(n, kpi.format)}
                />
              </p>
            </StaggerItem>
          ))}
        </Stagger>
      )}

      {/* One bar-chart block per serie */}
      {data.series.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
          <ChartBar className="w-8 h-8 mx-auto text-muted-foreground mb-2" weight="duotone" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">{t(`${NS}.sinSeries`)}</p>
        </div>
      ) : (
        data.series.map((serie) => <SerieBlock key={serie.id} serie={serie} />)
      )}
    </div>
    </CrossFade>
  )
}
