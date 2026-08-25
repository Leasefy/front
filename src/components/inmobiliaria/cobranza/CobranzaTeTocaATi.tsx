'use client'

/**
 * CobranzaTeTocaATi — lo único de la pantalla que pide que una persona haga
 * algo. Va primero y es la sección con más peso visual; todo lo demás es
 * información.
 *
 * ── Por qué un tablero y no una pila de tarjetas ────────────────────────────
 * La versión anterior apilaba dos banners y hasta seis tarjetas, cada una con
 * su pastilla ALTA. Con 14 pendientes todo gritaba a la vez y nada decía por
 * dónde empezar (medido con la cartera demo: 2 siniestros + 6 tarjetas ALTA
 * idénticas, la misma persona repetida tres veces sin agrupar).
 *
 * Ahora la sección se lee en dos tiempos:
 *   1. El TABLERO: cuatro celdas con el conteo por urgencia. Una mirada dice
 *      cuánto hay y de qué gravedad. La celda seleccionada filtra la lista.
 *   2. La LISTA: solo la urgencia elegida, agrupada por tipo de trámite, sin
 *      repetir la pastilla de prioridad en cada fila (la celda ya lo dijo).
 *
 * ── El orden de las celdas no es estético ───────────────────────────────────
 * 1. Siniestros: los únicos que bloquean plata. La base no deja radicar sin
 *    firma humana; mientras nadie apruebe, la reclamación no se presenta ante
 *    la aseguradora. Por eso tienen celda propia y van primero.
 * 2. Urgente (alta) → 3. Puede esperar (media) → 4. Sin afán (baja).
 *
 * Las alertas de umbral del reporte diario (morosidad sobre el límite, etc.)
 * son información, no trabajo: van compactas en una línea, no en un banner.
 */

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle, Clock, Siren, Warning } from '@phosphor-icons/react'

import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui'
import { usePendientes, type PendienteItem } from '@/lib/hooks/cobranza/use-pendientes'
import { useDailyReport } from '@/lib/hooks/cobranza/use-daily-report'

const NS = 'inmobiliaria.ai.cobranza.pendientes'
const PENDIENTES_HREF = '/panel/inmobiliaria/ai/cobranza/pendientes'
const SINIESTROS_HREF = '/panel/inmobiliaria/ai/cobranza/siniestros'

/** Cuántas filas de la urgencia elegida se muestran acá. El resto, en su pantalla. */
const TOPE = 6

// ── Celdas del tablero ───────────────────────────────────────────────────────

type CeldaId = 'siniestros' | 'alta' | 'media' | 'baja'

const CELDAS: Array<{
  id: CeldaId
  label: string
  /** Clases cuando la celda está seleccionada (fondo suave + anillo). */
  activa: string
  /** Color del punto/valor. */
  tinte: string
}> = [
  { id: 'siniestros', label: 'Bloquean plata', activa: 'bg-danger-soft ring-2 ring-danger', tinte: 'text-danger' },
  { id: 'alta', label: 'Urgente', activa: 'bg-danger-soft ring-2 ring-danger', tinte: 'text-danger' },
  { id: 'media', label: 'Puede esperar', activa: 'bg-warning-soft ring-2 ring-warning', tinte: 'text-warning' },
  { id: 'baja', label: 'Sin afán', activa: 'bg-success-soft ring-2 ring-success', tinte: 'text-success' },
]

/** Encabezados de grupo dentro de la lista (plural: encabezan varias filas). */
const GRUPO_TITULO: Record<string, string> = {
  escalaciones: 'Escalaciones',
  cartas: 'Cartas prejurídicas',
  siniestros: 'Siniestros por firmar',
  planes: 'Planes de pago',
  promesas: 'Promesas de pago',
  conversaciones: 'WhatsApp — el agente te lo pasó',
}

/** Sustantivo corto para el desglose dentro de la celda («2 cartas · 1 escalación»). */
const GRUPO_CORTO: Record<string, [singular: string, plural: string]> = {
  escalaciones: ['escalación', 'escalaciones'],
  cartas: ['carta', 'cartas'],
  siniestros: ['siniestro', 'siniestros'],
  planes: ['plan', 'planes'],
  promesas: ['promesa', 'promesas'],
  conversaciones: ['WhatsApp', 'WhatsApp'],
}

/** Orden fijo de los grupos en la lista: primero lo que decide, luego lo que acompaña. */
const GRUPO_ORDEN = ['siniestros', 'escalaciones', 'conversaciones', 'cartas', 'planes', 'promesas']

// ── Utilidades ───────────────────────────────────────────────────────────────

/** Días enteros transcurridos desde una fecha ISO. */
function diasDesde(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000))
}

function haceCuanto(iso: string): string {
  const seg = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
  if (seg < 60) return `hace ${seg}s`
  const min = Math.round(seg / 60)
  if (min < 60) return `hace ${min}m`
  const hr = Math.round(min / 60)
  if (hr < 24) return `hace ${hr}h`
  return `hace ${Math.round(hr / 24)}d`
}

const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

/** «2 cartas · 2 WhatsApp · 1 escalación» — top 3 por tamaño. */
function desglose(items: PendienteItem[]): string {
  const porGrupo = new Map<string, number>()
  for (const i of items) porGrupo.set(i.grupo, (porGrupo.get(i.grupo) ?? 0) + 1)
  return [...porGrupo.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([grupo, n]) => {
      const [sing, plu] = GRUPO_CORTO[grupo] ?? [grupo, grupo]
      return `${n} ${n === 1 ? sing : plu}`
    })
    .join(' · ')
}

// ── Filas de la lista ────────────────────────────────────────────────────────

function Fila({ item }: { item: PendienteItem }) {
  const grupo = GRUPO_TITULO[item.grupo] ?? item.grupo
  // El título es la persona. Cuando el dato no trae nombre —un deudor
  // borrado, una escalación sin masked id— el motivo o el grupo suben al
  // título y no se repiten abajo.
  const titulo = item.titulo || item.reason || grupo
  // Segunda línea: el motivo dinámico (reason de la escalación, último
  // mensaje del deudor). El grupo ya no se repite acá: lo dice el encabezado.
  const subtitulo = item.titulo && item.reason ? item.reason : null

  return (
    <li>
      <Link
        href={item.href}
        data-testid={`te-toca-${item.key}`}
        className="group flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 transition-colors hover:bg-surface-muted"
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-fg truncate">{titulo}</p>
          {subtitulo && <p className="text-xs text-fg-muted truncate">{subtitulo}</p>}
        </div>
        {item.montoCop != null && (
          <span className="hidden sm:inline text-xs font-mono tabular-nums text-fg-muted shrink-0">
            {COP.format(item.montoCop)}
          </span>
        )}
        <span className="hidden sm:inline-flex items-center gap-1 text-xs text-fg-muted tabular-nums shrink-0">
          <Clock className="w-3 h-3" aria-hidden="true" />
          {haceCuanto(item.fecha)}
        </span>
        <ArrowRight
          className="w-4 h-4 text-fg-muted shrink-0 transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </Link>
    </li>
  )
}

// ── Componente ───────────────────────────────────────────────────────────────

export interface CobranzaTeTocaATiProps {
  /** Casos en mora (S1..SX) del overview. */
  enMora: number
  /** Casos que el agente trabajó hoy. */
  gestionados: number
}

export function CobranzaTeTocaATi({ enMora, gestionados }: CobranzaTeTocaATiProps) {
  const { t } = useI18n()
  const { items, isLoading, error } = usePendientes()
  const { data: reporte } = useDailyReport()

  const alertas = reporte?.alerts ?? []

  // Los siniestros salen de `usePendientes`, NO de un `useInsuranceClaims`
  // propio. Con dos llamadas al mismo endpoint las respuestas llegaban
  // distintas: el tablero decía una cifra y la lista otra. Una pantalla, una
  // fuente.
  const porCelda = useMemo<Record<CeldaId, PendienteItem[]>>(() => {
    const c: Record<CeldaId, PendienteItem[]> = { siniestros: [], alta: [], media: [], baja: [] }
    for (const i of items) {
      if (i.grupo === 'siniestros') c.siniestros.push(i)
      else c[i.prioridad].push(i)
    }
    return c
  }, [items])

  const totalQueEspera = items.length

  // La celda elegida. `null` = automática: la primera con contenido, en el
  // orden del tablero (siniestros primero porque bloquean plata). Si lo que
  // el usuario eligió se queda vacío tras un refetch, vuelve a la automática
  // en vez de mostrar una lista vacía con celdas llenas al lado.
  const [elegida, setElegida] = useState<CeldaId | null>(null)
  const celdaActiva: CeldaId | null =
    elegida && porCelda[elegida].length > 0
      ? elegida
      : (CELDAS.find((c) => porCelda[c.id].length > 0)?.id ?? null)

  const filasDeCelda = celdaActiva ? porCelda[celdaActiva] : []

  // Agrupar por tipo de trámite, en orden fijo; el tope corta por grupos
  // enteros ya empezados (nunca más de TOPE filas).
  const grupos = useMemo(() => {
    const out: Array<{ grupo: string; filas: PendienteItem[] }> = []
    let usadas = 0
    for (const g of GRUPO_ORDEN) {
      if (usadas >= TOPE) break
      const filas = filasDeCelda.filter((i) => i.grupo === g).slice(0, TOPE - usadas)
      if (filas.length === 0) continue
      usadas += filas.length
      out.push({ grupo: g, filas })
    }
    return out
  }, [filasDeCelda])

  const ocultas = Math.max(0, filasDeCelda.length - grupos.reduce((n, g) => n + g.filas.length, 0))

  // Mientras todavía se está contando NO se afirma nada. «Nada espera tu
  // aprobación» sobre una lista que aún no llegó es una afirmación falsa
  // durante los segundos que tarda —y en frío tarda varios—: quien la lee
  // cierra la pantalla creyendo que está al día.
  const contando = isLoading && items.length === 0 && !error
  const frase = contando
    ? 'Contando lo que espera tu aprobación…'
    : totalQueEspera === 0
      ? 'Nada espera tu aprobación.'
      : `${totalQueEspera} ${totalQueEspera === 1 ? 'decisión espera' : 'decisiones esperan'} tu aprobación.`

  const diasSiniestroMasViejo = porCelda.siniestros.reduce(
    (m, c) => Math.max(m, diasDesde(c.fecha)),
    0,
  )

  return (
    <section className="space-y-3" data-testid="cobranza-te-toca">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-fg">Te toca a ti</h2>
        <p className="text-sm text-fg-muted max-w-2xl">
          <span className="text-fg font-medium">{frase}</span>{' '}
          El agente gestionó{' '}
          <span className="font-mono tabular-nums text-fg">{gestionados}</span> de tus{' '}
          <span className="font-mono tabular-nums text-fg">{enMora}</span> casos en mora hoy.
        </p>
      </div>

      {/* El tablero: una celda por urgencia. La seleccionada filtra la lista. */}
      {totalQueEspera > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" data-testid="te-toca-tablero">
          {CELDAS.map((celda) => {
            const filas = porCelda[celda.id]
            const vacia = filas.length === 0
            const seleccionada = celdaActiva === celda.id
            return (
              <button
                key={celda.id}
                type="button"
                disabled={vacia}
                aria-pressed={seleccionada}
                onClick={() => setElegida(celda.id)}
                data-testid={`te-toca-celda-${celda.id}`}
                className={[
                  'rounded-xl border p-3 text-left transition-colors',
                  seleccionada
                    ? `border-transparent ${celda.activa}`
                    : 'border-border bg-card hover:bg-surface-muted',
                  vacia ? 'opacity-50 cursor-default hover:bg-card' : '',
                ].join(' ')}
              >
                <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-fg-muted">
                  {celda.id === 'siniestros' && (
                    <Siren className={`w-3.5 h-3.5 ${vacia ? '' : celda.tinte}`} weight="fill" aria-hidden="true" />
                  )}
                  {celda.label}
                </p>
                <p className={`text-2xl font-semibold tabular-nums ${vacia ? 'text-fg-muted' : celda.tinte}`}>
                  {filas.length}
                </p>
                <p className="text-xs text-fg-muted truncate">
                  {vacia
                    ? 'Nada'
                    : celda.id === 'siniestros'
                      ? diasSiniestroMasViejo > 0
                        ? `el más viejo lleva ${diasSiniestroMasViejo} ${diasSiniestroMasViejo === 1 ? 'día' : 'días'}`
                        : 'esperan tu firma'
                      : desglose(filas)}
                </p>
              </button>
            )
          })}
        </div>
      )}

      {/* Alertas de umbral del reporte diario: información, no trabajo — una
          línea compacta cada una, no un banner. `message_es` viene redactado
          del agente. */}
      {alertas.map((a, i) => (
        <p
          key={`${a.code}-${i}`}
          role="alert"
          className={[
            'flex items-center gap-2 text-xs px-1',
            a.level === 'CRITICAL' ? 'text-danger' : 'text-warning',
          ].join(' ')}
        >
          <Warning className="w-3.5 h-3.5 shrink-0" weight="fill" aria-hidden="true" />
          {a.message_es}
        </p>
      ))}

      {/* Cargando, falló y «no hay» son tres cosas distintas. */}
      {contando && (
        <div className="space-y-2" aria-hidden="true">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-xl border border-border bg-card animate-pulse" />
            ))}
          </div>
          {[0, 1].map((i) => (
            <div key={i} className="h-12 rounded-lg border border-border bg-card animate-pulse" />
          ))}
        </div>
      )}

      {/* Un fallo PARCIAL no es un fallo total: `usePendientes` junta seis
          fuentes y sigue rindiendo las que sí respondieron. Decir «no pudimos
          cargar tus pendientes» encima de un tablero con cifras es falso de
          las dos maneras — ni cargó todo, ni falló todo. */}
      {error && !isLoading && (
        <div
          role="alert"
          className={[
            'rounded-xl border p-3 text-sm',
            totalQueEspera > 0
              ? 'border-warning/30 bg-warning-soft text-warning'
              : 'border-danger/30 bg-danger-soft text-danger',
          ].join(' ')}
        >
          {totalQueEspera > 0
            ? 'Puede que falte algo en este tablero: una de las fuentes no respondió.'
            : 'No pudimos cargar tus pendientes.'}{' '}
          <span className="opacity-80">{error}</span>
        </div>
      )}

      {!isLoading && !error && totalQueEspera === 0 && (
        <div className="rounded-xl border border-border bg-card px-4 py-8 text-center space-y-1">
          <CheckCircle
            className="w-6 h-6 text-success mx-auto"
            weight="duotone"
            aria-hidden="true"
          />
          <p className="text-sm font-medium text-fg">{t(`${NS}.vacio`)}</p>
          <p className="text-xs text-fg-muted">{t(`${NS}.vacioHint`)}</p>
        </div>
      )}

      {/* La lista de la celda elegida, agrupada por tipo de trámite. */}
      {grupos.length > 0 && (
        <div className="space-y-3">
          {celdaActiva === 'siniestros' && (
            <p className="text-xs text-fg-muted px-1">
              Hasta que los apruebes no se radican ante la aseguradora.
            </p>
          )}
          {grupos.map(({ grupo, filas }) => (
            <div key={grupo} className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-fg-muted px-1">
                {GRUPO_TITULO[grupo] ?? grupo}
                <span className="ml-1.5 font-mono tabular-nums normal-case">({filas.length})</span>
              </p>
              <ul className="space-y-1.5">
                {filas.map((item) => (
                  <Fila key={item.key} item={item} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {(ocultas > 0 || totalQueEspera > TOPE) && (
        <Button asChild variant="outline" size="sm" hideArrow className="w-full sm:w-auto">
          <Link href={celdaActiva === 'siniestros' ? SINIESTROS_HREF : PENDIENTES_HREF}>
            {ocultas > 0
              ? `Ver ${ocultas} ${ocultas === 1 ? 'pendiente más' : 'pendientes más'} de esta urgencia`
              : `Ver los ${totalQueEspera} pendientes`}
          </Link>
        </Button>
      )}
    </section>
  )
}
