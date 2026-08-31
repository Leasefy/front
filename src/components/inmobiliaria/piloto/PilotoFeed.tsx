'use client'

/**
 * PilotoFeed — lo que los agentes vienen haciendo, sin que sea un muro.
 *
 * ── Por qué se rediseñó (medido el 2026-08-30) ─────────────────────────────
 * El feed ocupaba 4.522 px — MÁS que la bandeja de decisiones — con 50
 * entradas planas donde «Laura llamó a Nicolás G. · conversación completa»
 * se repetía treinta veces seguidas. Leerlo era imposible y empujaba el
 * resto de la torre fuera de la pantalla.
 *
 * Dos ideas lo arreglan:
 *
 *   1. **Se agrupa por día** («Hoy», «Ayer», la fecha) — así el feed cuenta
 *      una historia con ritmo en vez de una lista sin cortes.
 *   2. **Las repeticiones se pliegan**: entradas consecutivas del mismo tipo
 *      y el mismo título se muestran una vez con su contador («×12»). Doce
 *      llamadas iguales son UN hecho, no doce.
 *
 * Arranca mostrando los primeros dos días y ofrece «ver más» — nadie audita
 * un mes de actividad de un vistazo, y quien quiera hacerlo tiene el detalle
 * completo en la pantalla de cada agente.
 */

import { useMemo, useState } from 'react'
import {
  ArrowUpRight,
  ChatCircleDots,
  CurrencyCircleDollar,
  Envelope,
  Gavel,
  Handshake,
  Lightning,
  PhoneCall,
  Robot,
  type Icon,
} from '@phosphor-icons/react'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { SinDatos } from '@/components/estado/SinDatos'
import { EsqueletoTarjetas } from '@/components/estado/EsqueletoTabla'
import { useI18n } from '@/lib/i18n'
import { relativeTime, workspaceVocab } from '@/components/inmobiliaria/ai/ColaHumana'
import type { ActivityItem } from '@/lib/api/piloto'

/** Icono por tipo de evento; el orden importa (primero el match más preciso). */
const TIPO_ICONS: Array<{ match: RegExp; icon: Icon }> = [
  { match: /llamada|contacto/i, icon: PhoneCall },
  { match: /whatsapp/i, icon: ChatCircleDots },
  { match: /email|correo/i, icon: Envelope },
  { match: /promesa|acuerdo/i, icon: Handshake },
  { match: /pago/i, icon: CurrencyCircleDollar },
  { match: /escalacion|escalación/i, icon: Gavel },
  { match: /piloto|decision|decisión/i, icon: Robot },
]

function iconoDe(tipo: string): Icon {
  return TIPO_ICONS.find((e) => e.match.test(tipo))?.icon ?? Lightning
}

/** Un hecho del feed: uno o varios eventos idénticos y consecutivos. */
interface Hecho {
  key: string
  item: ActivityItem
  veces: number
}

interface Dia {
  clave: string
  etiqueta: string
  hechos: Hecho[]
}

const DIAS_INICIALES = 2

function etiquetaDeDia(iso: string, hoy: Date): string {
  const d = new Date(iso)
  const dias = Math.round(
    (new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime() -
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) /
      86_400_000,
  )
  if (dias === 0) return 'Hoy'
  if (dias === 1) return 'Ayer'
  return d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
}

/** Agrupa por día y pliega repeticiones consecutivas del mismo hecho. */
function agrupar(items: ActivityItem[]): Dia[] {
  const hoy = new Date()
  const dias: Dia[] = []
  for (const item of items) {
    const fecha = new Date(item.at)
    if (Number.isNaN(fecha.getTime())) continue
    const clave = fecha.toISOString().slice(0, 10)
    let dia = dias.at(-1)
    if (!dia || dia.clave !== clave) {
      dia = { clave, etiqueta: etiquetaDeDia(item.at, hoy), hechos: [] }
      dias.push(dia)
    }
    const ultimo = dia.hechos.at(-1)
    if (ultimo && ultimo.item.titulo === item.titulo && ultimo.item.tipo === item.tipo) {
      ultimo.veces += 1
      continue
    }
    dia.hechos.push({ key: item.id, item, veces: 1 })
  }
  return dias
}

export interface PilotoFeedProps {
  items: ActivityItem[]
  isLoading: boolean
  error: string | null
  /** El micro no publicó el endpoint (404) o no se pudo consultar. */
  notAvailable?: boolean
  onRefetch?: () => Promise<void>
  /** Abre el cajón con el detalle del hecho. */
  onAbrir?: (itemId: string) => void
}

export function PilotoFeed({
  items,
  isLoading,
  error,
  notAvailable = false,
  onRefetch,
  onAbrir,
}: PilotoFeedProps) {
  const { t } = useI18n()
  const [expandido, setExpandido] = useState(false)

  const dias = useMemo(() => agrupar(items), [items])
  const visibles = expandido ? dias : dias.slice(0, DIAS_INICIALES)
  const ocultos = dias.length - visibles.length

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-fg">{t('inmobiliaria.piloto.feed.titulo')}</h2>

      </div>

      <EstadoDeDatos
        cargando={isLoading}
        error={error ?? undefined}
        vacio={items.length === 0}
        queEs={t('inmobiliaria.piloto.feed.titulo').toLowerCase()}
        {...(onRefetch ? { onReintentar: () => void onRefetch() } : {})}
        esqueleto={
          <div className="p-4">
            <EsqueletoTarjetas cantidad={3} />
          </div>
        }
        cuandoVacio={
          <div className="px-4 py-10">
            {/* Sin fuente no se afirma «no pasó nada»: se dice que no se pudo mirar. */}
            <SinDatos
              queSon={t('inmobiliaria.piloto.feed.actividad')}
              icono={Lightning}
              titulo={t(
                notAvailable ? 'inmobiliaria.piloto.feed.sinFuente' : 'inmobiliaria.piloto.feed.vacio',
              )}
              descripcion={t(
                notAvailable
                  ? 'inmobiliaria.piloto.feed.sinFuenteHint'
                  : 'inmobiliaria.piloto.feed.vacioHint',
              )}
            />
          </div>
        }
      >
        <div className="divide-y divide-border">
          {visibles.map((dia) => (
            <section key={dia.clave}>
              <h3 className="sticky top-0 z-10 bg-surface-muted/80 px-4 py-1.5 font-mono text-[11px] uppercase tracking-widest text-fg-subtle backdrop-blur">
                {dia.etiqueta}
              </h3>
              <ol role="list" className="px-4 py-1">
                {dia.hechos.map((hecho) => {
                  const { item, veces } = hecho
                  const EventoIcon = iconoDe(item.tipo)
                  return (
                    <li key={hecho.key} className="relative flex items-start gap-3 py-2">
                      <span
                        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-muted text-fg-subtle"
                        aria-hidden="true"
                      >
                        <EventoIcon weight="duotone" className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          {/* El hecho entero abre el cajón; el `after:`
                              estira el área clicable a toda la fila. */}
                          <button
                            type="button"
                            onClick={() => onAbrir?.(item.id)}
                            className="min-w-0 truncate rounded text-left text-sm text-fg after:absolute after:inset-0 after:content-[''] hover:underline"
                            data-testid={`piloto-feed-fila-${item.id}`}
                          >
                            {item.titulo}
                            {veces > 1 && (
                              <span className="ml-1.5 rounded-full bg-surface-muted px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-fg-muted">
                                ×{veces}
                              </span>
                            )}
                          </button>
                          <span className="ml-auto shrink-0 font-mono text-[11px] tabular-nums text-fg-subtle">
                            {relativeTime(item.at, t)}
                          </span>
                        </div>
                        <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-fg-muted">
                          {item.detalle && <span className="truncate">{item.detalle}</span>}
                          <span className="shrink-0 text-fg-subtle">
                            {workspaceVocab(t, 'agente', item.agente)}
                          </span>
                          {item.href && (
                            <span
                              className="inline-flex shrink-0 items-center gap-0.5 text-fg-subtle"
                              aria-hidden="true"
                            >
                              {t('inmobiliaria.piloto.feed.ver')}
                              <ArrowUpRight weight="bold" className="h-3 w-3" />
                            </span>
                          )}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </section>
          ))}
        </div>

        {ocultos > 0 && (
          <div className="border-t border-border px-4 py-2">
            <Button
              variant="link"
              size="sm"
              hideArrow
              className="w-full justify-center"
              onClick={() => setExpandido(true)}
            >
              {t('inmobiliaria.piloto.feed.verMas', { dias: String(ocultos) })}
            </Button>
          </div>
        )}
      </EstadoDeDatos>
    </Card>
  )
}
