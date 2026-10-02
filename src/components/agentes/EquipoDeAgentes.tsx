'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, MagnifyingGlass, Prohibit, X } from '@phosphor-icons/react'

import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  EQUIPO,
  FRENTES,
  agentePorId,
  agentesDelFrente,
  loLlamaElChat,
  nombreDelAgente,
  type AgenteDelEquipo,
  type IdDeAgente,
} from '@/lib/agentes/equipo'
import { agenteDeLaEjecucion, type EstadoDelOrbe } from '@/lib/agentes/agente-que-habla'
import { NOMBRE_DEL_ORQUESTADOR } from '@/lib/agentes/nombre-del-orquestador'
import {
  estadoDeUnAgente,
  trabajoDelAgente,
  useEstadoDelEquipo,
  type EstadoDeUnAgente,
} from '@/lib/agentes/use-estado-del-equipo'
import type { ActivityItem, PilotoFlotaResponse } from '@/lib/api/piloto'
import type { AgentExecution } from '@/lib/types/beta-chat'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

import { OrbeDeAgente } from './OrbeDeAgente'

/**
 * ══ «EL EQUIPO» — QUIÉN ES QUIÉN, EN UN MODAL ════════════════════════════
 *
 * Nico (02-10-2026): «que cada uno pueda contar su historia de lo que hace»,
 * con el orquestador como el más importante. Se abre desde el chat (la fila
 * «Según lo que pidas, el chat llama a su especialista…» de la llegada o la
 * cabecera de la conversación) con `useEquipoDeAgentes().abrir(id?)`.
 *
 * - Izquierda: agentes por frente, con su orbe chico, rol y un punto verde si
 *   está ACTIVO para esta inmobiliaria (dato real de la flota; sin dato no
 *   hay punto). Buscador por nombre o tarea.
 * - Derecha: el orbe grande, la historia, «Hace» / «No hace» (con «→ eso lo
 *   hace X»), herramientas, reporta a / trabaja con, y su trabajo reciente
 *   SÓLO con datos reales o un vacío honesto.
 * - Celular: lista → detalle, con «← El equipo».
 *
 * Usa el `Dialog` del producto tal cual (cabecera fija con la ✕): no lo
 * modifica. El cuerpo es un `DialogBody` propio SIN scroll y de alto fijo:
 * scrollean la lista y el detalle, cada uno por su lado, y el modal no salta
 * de alto al cambiar de agente.
 */

/** En el celular el foco NO va al buscador (abriría el teclado tapando la lista). */
function sinTecladoEnElCelular(e: Event) {
  if (typeof window === 'undefined' || !window.matchMedia('(max-width: 767px)').matches) return
  e.preventDefault()
  ;(e.currentTarget as HTMLElement | null)?.focus()
}

export interface EquipoDeAgentesProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** El agente que se muestra al abrir (por defecto, el orquestador). */
  agenteInicial?: IdDeAgente
  /**
   * Lo que el chat ya sabe de esta conversación: las ejecuciones de sus
   * mensajes (`mensaje.agentActivity.agents`). Real y local; se muestra como
   * «En esta conversación».
   */
  ejecucionesDeLaConversacion?: readonly AgentExecution[]
  /** Para pruebas y la vista previa: datos ya leídos (no se pide nada). */
  datos?: { flota: PilotoFlotaResponse | null; actividad: ActivityItem[]; actividadNoDisponible?: boolean }
}

const LABEL = 'font-mono text-[11px] uppercase tracking-[0.08em] text-fg-subtle'

function sinTildes(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

function estadoDelOrbeParaElEquipo(e: EstadoDeUnAgente): EstadoDelOrbe {
  return e.tipo === 'apagado' ? 'apagado' : 'quieto'
}

export function EquipoDeAgentes({
  open,
  onOpenChange,
  agenteInicial = 'orquestador',
  ejecucionesDeLaConversacion = [],
  datos,
}: EquipoDeAgentesProps) {
  const { t, formatRelativeDate } = useI18n()
  const reducir = useReducedMotion()
  const enVivo = useEstadoDelEquipo(open && !datos)
  const flota = datos ? datos.flota : enVivo.flota
  const actividad = datos ? datos.actividad : enVivo.actividad
  const actividadNoDisponible = datos ? Boolean(datos.actividadNoDisponible) : enVivo.actividadNoDisponible
  const flotaLeida = datos ? datos.flota !== null : enVivo.flota !== null

  const [seleccion, setSeleccion] = useState<IdDeAgente>(agenteInicial)
  const [busqueda, setBusqueda] = useState('')
  const [vista, setVista] = useState<'lista' | 'detalle'>(agenteInicial === 'orquestador' ? 'lista' : 'detalle')

  // Cada vez que se abre, arranca en el agente pedido.
  useEffect(() => {
    if (!open) return
    setSeleccion(agenteInicial)
    setBusqueda('')
    setVista(agenteInicial === 'orquestador' ? 'lista' : 'detalle')
  }, [open, agenteInicial])

  const estados = useMemo(
    () => new Map(EQUIPO.map((a) => [a.id, estadoDeUnAgente(a, flota)] as const)),
    [flota],
  )
  const activos = EQUIPO.filter((a) => estados.get(a.id)?.tipo === 'activo').length

  // Lo que se busca: nombre, rol, frente, lo que hace y sus herramientas — sin tildes.
  const indice = useMemo(
    () =>
      new Map(
        EQUIPO.map((a) => [
          a.id,
          sinTildes(
            [
              nombreDelAgente(a, t),
              t(`agentes.${a.id}.rol`),
              t(`agentes.frentes.${a.frente}`),
              ...a.hace.map((k) => t(`agentes.${a.id}.hace.${k}`)),
              ...a.herramientas.map((k) => t(`agentes.herramientas.${k}`)),
            ].join(' '),
          ),
        ]),
      ),
    [t],
  )
  const q = sinTildes(busqueda.trim())
  const visibles = q ? EQUIPO.filter((a) => indice.get(a.id)?.includes(q)) : EQUIPO

  const elegido = agentePorId(seleccion)

  const elegir = (id: IdDeAgente) => {
    setSeleccion(id)
    setVista('detalle')
  }

  const resumen = [
    t('agentes.equipo.resumen', { agentes: EQUIPO.length, frentes: FRENTES.length }),
    flotaLeida ? t('agentes.equipo.activosHoy', { n: activos }) : null,
    t('agentes.equipo.losLlama', { orquestador: NOMBRE_DEL_ORQUESTADOR }),
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[1040px]"
        onOpenAutoFocus={sinTecladoEnElCelular}
        data-testid="equipo-de-agentes"
      >
        <DialogHeader>
          <DialogTitle>{t('agentes.equipo.titulo')}</DialogTitle>
          <DialogDescription className="text-body-sm text-fg-muted">{resumen}</DialogDescription>
        </DialogHeader>

        <DialogBody className="grid h-[min(640px,calc(100dvh-190px))] grid-cols-[minmax(0,1fr)] overflow-hidden border-t border-border-faint p-0 sm:px-0 md:grid-cols-[minmax(0,344px)_minmax(0,1fr)]">
          {/* ── Lista ───────────────────────────────────────────────────── */}
          <div
            className={cn(
              'min-h-0 flex-col border-border md:flex md:border-r',
              vista === 'detalle' ? 'hidden' : 'flex',
            )}
          >
            <div className="shrink-0 px-4 pb-2 pt-4">
              <label className="relative block">
                <span className="sr-only">{t('agentes.equipo.buscarAria')}</span>
                <MagnifyingGlass
                  size={16}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle"
                />
                <input
                  type="search"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder={t('agentes.equipo.buscar')}
                  className="h-10 w-full rounded-full border border-border bg-surface pl-10 pr-9 text-body-sm text-fg placeholder:text-fg-placeholder focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-search-cancel-button]:hidden"
                  data-testid="equipo-buscar"
                />
                {busqueda && (
                  <button
                    type="button"
                    onClick={() => setBusqueda('')}
                    aria-label={t('agentes.equipo.limpiar')}
                    className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-fg-subtle hover:bg-surface-hover hover:text-fg"
                  >
                    <X size={12} weight="bold" aria-hidden="true" />
                  </button>
                )}
              </label>
            </div>

            <nav
              aria-label={t('agentes.equipo.titulo')}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-4"
              data-lenis-prevent
            >
              {visibles.length === 0 && (
                <p className="px-3 py-6 text-body-sm text-fg-muted">
                  {t('agentes.equipo.sinResultados', { q: busqueda.trim() })}
                </p>
              )}
              {FRENTES.map((frente) => {
                const delFrente = agentesDelFrente(frente).filter((a) => visibles.includes(a))
                if (delFrente.length === 0) return null
                const n = delFrente.filter((a) => estados.get(a.id)?.tipo === 'activo').length
                return (
                  <section key={frente} className="mt-3 first:mt-1" aria-labelledby={`frente-${frente}`}>
                    <h3 id={`frente-${frente}`} className={cn(LABEL, 'px-3 pb-1.5')}>
                      {t(`agentes.frentes.${frente}`)}
                      {flotaLeida && (
                        <>
                          {' · '}
                          {n === 1
                            ? t('agentes.equipo.frenteActivo')
                            : n === 0
                              ? t('agentes.equipo.frenteSinActivos')
                              : t('agentes.equipo.frenteActivos', { n })}
                        </>
                      )}
                    </h3>
                    <ul className="m-0 list-none space-y-0.5 p-0">
                      {delFrente.map((a, i) => (
                        <FilaDelAgente
                          key={a.id}
                          agente={a}
                          estado={estados.get(a.id) as EstadoDeUnAgente}
                          seleccionado={a.id === seleccion}
                          onElegir={() => elegir(a.id)}
                          retraso={reducir ? 0 : Math.min(i, 6) * 0.03}
                        />
                      ))}
                    </ul>
                  </section>
                )
              })}
            </nav>
          </div>

          {/* ── Detalle ─────────────────────────────────────────────────── */}
          <div
            className={cn('min-h-0 overflow-y-auto overscroll-contain md:block', vista === 'lista' ? 'hidden' : 'block')}
            data-lenis-prevent
          >
            <button
              type="button"
              onClick={() => setVista('lista')}
              className="ml-4 mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-body-sm font-medium text-fg-muted hover:bg-surface-hover hover:text-fg md:hidden"
              data-testid="equipo-volver"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              {t('agentes.equipo.volver')}
            </button>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={elegido.id}
                initial={reducir ? { opacity: 0 } : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reducir ? { opacity: 0 } : { opacity: 0, y: -6 }}
                transition={{ duration: reducir ? 0.12 : 0.24, ease: [0.32, 0.72, 0, 1] }}
              >
                <DetalleDelAgente
                  agente={elegido}
                  estado={estados.get(elegido.id) as EstadoDeUnAgente}
                  trabajo={trabajoDelAgente(elegido, actividad)}
                  trabajoNoDisponible={actividadNoDisponible}
                  enLaConversacion={ejecucionesDeLaConversacion.filter(
                    (e) => agenteDeLaEjecucion(e)?.id === elegido.id,
                  )}
                  onElegir={elegir}
                  cuando={(iso) => formatRelativeDate(iso)}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

// ── Una fila de la lista ─────────────────────────────────────────────────────

function FilaDelAgente({
  agente,
  estado,
  seleccionado,
  onElegir,
  retraso,
}: {
  agente: AgenteDelEquipo
  estado: EstadoDeUnAgente
  seleccionado: boolean
  onElegir: () => void
  retraso: number
}) {
  const { t } = useI18n()
  const reducir = useReducedMotion()
  const nombre = nombreDelAgente(agente, t)
  const activo = estado.tipo === 'activo'
  return (
    <motion.li
      initial={reducir ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: retraso, ease: 'easeOut' }}
      className="relative"
    >
      {seleccionado && (
        <motion.span
          layoutId={reducir ? undefined : 'equipo-seleccion'}
          className="absolute inset-0 rounded-md bg-surface-selected"
          transition={{ type: 'spring', stiffness: 520, damping: 42 }}
          aria-hidden="true"
        />
      )}
      <button
        type="button"
        onClick={onElegir}
        aria-current={seleccionado ? 'true' : undefined}
        className="relative flex w-full items-center gap-3 rounded-md px-3 py-2 text-left outline-none transition-colors hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-ring"
        data-testid={`equipo-fila-${agente.id}`}
      >
        <span className="flex size-9 shrink-0 items-center justify-center">
          {/*
            Todas las filas respiran (Nico, 02-10: «no les veo mucho
            movimiento»). Con Cadence v1.2.0 cuesta poco: un solo contexto
            WebGL para todos, 30 cuadros por segundo en los chicos y sólo los
            visibles. Con `prefers-reduced-motion` quedan en un cuadro fijo.
          */}
          <OrbeDeAgente
            agente={agente}
            tamano={agente.orbe.variante === 'orchestrator' ? 34 : 28}
            estado={estadoDelOrbeParaElEquipo(estado)}
            decorativo
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-body-sm font-medium text-fg">{nombre}</span>
          <span className="block truncate text-caption text-fg-muted">{t(`agentes.${agente.id}.rol`)}</span>
        </span>
        {activo && (
          <span
            className="size-2 shrink-0 rounded-full bg-success shadow-[0_0_0_3px_var(--success-soft)]"
            title={t('agentes.equipo.estado.activo')}
            aria-label={t('agentes.equipo.estado.activo')}
            role="img"
          />
        )}
      </button>
    </motion.li>
  )
}

// ── La pastilla del estado ──────────────────────────────────────────────────

function PastillaDeEstado({ estado }: { estado: EstadoDeUnAgente }) {
  const { t } = useI18n()
  const activo = estado.tipo === 'activo'
  const texto = t(`agentes.equipo.estado.${estado.tipo}`)
  const modo = estado.modo ? t(`agentes.equipo.modo.${estado.modo}`) : null
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.06em]',
        activo ? 'bg-success-soft text-success' : 'bg-surface-muted text-fg-muted',
      )}
      data-testid="equipo-estado"
      data-tipo={estado.tipo}
    >
      <span
        aria-hidden="true"
        className={cn(
          'size-1.5 shrink-0 rounded-full',
          activo ? 'bg-success' : estado.tipo === 'apagado' ? 'border border-fg-subtle' : 'bg-fg-subtle',
        )}
      />
      <span className="truncate">
        {texto}
        {activo && modo ? ` · ${modo}` : ''}
      </span>
    </span>
  )
}

// ── El detalle ───────────────────────────────────────────────────────────────

function Bloque({ titulo, children, className }: { titulo: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('space-y-3', className)}>
      <h4 className={LABEL}>{titulo}</h4>
      {children}
    </section>
  )
}

function ChipDeAgente({ id, onElegir }: { id: IdDeAgente; onElegir: (id: IdDeAgente) => void }) {
  const { t } = useI18n()
  const a = agentePorId(id)
  return (
    <button
      type="button"
      onClick={() => onElegir(id)}
      className="inline-flex items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1.5 pr-3 text-caption text-fg transition-colors hover:border-border-strong hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      data-testid={`equipo-chip-${id}`}
    >
      <OrbeDeAgente agente={a} tamano="xs" quieto decorativo />
      {nombreDelAgente(a, t)}
    </button>
  )
}

function DetalleDelAgente({
  agente,
  estado,
  trabajo,
  trabajoNoDisponible,
  enLaConversacion,
  onElegir,
  cuando,
}: {
  agente: AgenteDelEquipo
  estado: EstadoDeUnAgente
  trabajo: ActivityItem[]
  trabajoNoDisponible: boolean
  enLaConversacion: readonly AgentExecution[]
  onElegir: (id: IdDeAgente) => void
  cuando: (iso: string) => string
}) {
  const { t } = useI18n()
  const nombre = nombreDelAgente(agente, t)
  const orq = agente.orbe.variante === 'orchestrator'
  const base = `agentes.${agente.id}`
  const nota = orq
    ? t('agentes.equipo.notaOrquestador')
    : agente.id === 'inspeccion'
      ? t('agentes.equipo.notaInspeccion')
      : loLlamaElChat(agente)
        ? t('agentes.equipo.notaChat', { orquestador: NOMBRE_DEL_ORQUESTADOR })
        : t('agentes.equipo.notaNoChat')

  return (
    <article className="space-y-8 px-6 pb-8 pt-6 sm:pt-9 md:px-8" data-testid="equipo-detalle" data-agente={agente.id}>
      <header className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        {/* En el celular el orbe baja a 80 px: el detalle empieza en la historia, no en el orbe. */}
        <span
          className={cn(
            'flex shrink-0 items-center justify-center',
            orq ? 'size-[96px] sm:size-[136px]' : 'size-[84px] sm:size-[112px]',
          )}
        >
          <OrbeDeAgente
            agente={agente}
            tamano={orq ? 132 : 104}
            estado={estadoDelOrbeParaElEquipo(estado)}
            className={orq ? 'max-sm:!size-[92px]' : 'max-sm:!size-[80px]'}
          />
        </span>
        <div className="min-w-0 space-y-2">
          <h3 className="text-h2 font-semibold tracking-[-0.015em] text-fg">{nombre}</h3>
          <p className="text-body-sm text-fg-muted">
            {t(`${base}.rol`)} · {t(`agentes.frentes.${agente.frente}`)}
          </p>
          <PastillaDeEstado estado={estado} />
          {estado.tipo === 'apagado' && estado.porQueNoCorre && (
            <p className="text-caption text-fg-muted">{estado.porQueNoCorre}</p>
          )}
        </div>
      </header>

      <p className="max-w-[60ch] text-body-lg text-fg">{t(`${base}.historia`)}</p>

      {estado.efectoReal && estado.modo && (
        <div className="rounded-md bg-surface-muted px-4 py-3" data-testid="equipo-hoy">
          <p className={LABEL}>{t('agentes.equipo.hoy', { modo: t(`agentes.equipo.modo.${estado.modo}`) })}</p>
          <p className="mt-1 text-body-sm text-fg">{estado.efectoReal}</p>
        </div>
      )}

      <div className="grid gap-8 sm:grid-cols-2">
        <Bloque titulo={t('agentes.equipo.hace')}>
          <ul className="m-0 list-none space-y-2.5 p-0">
            {agente.hace.map((k) => (
              <li key={k} className="flex items-start gap-2.5 text-body-sm text-fg">
                <Check size={16} weight="bold" aria-hidden="true" className="mt-0.5 shrink-0 text-success" />
                <span>{t(`${base}.hace.${k}`)}</span>
              </li>
            ))}
          </ul>
        </Bloque>
        <Bloque titulo={t('agentes.equipo.noHace')}>
          <ul className="m-0 list-none space-y-2.5 p-0">
            {agente.noHace.map((item) => (
              <li key={item.clave} className="flex items-start gap-2.5 text-body-sm text-fg-muted">
                <Prohibit size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-fg-subtle" />
                <span>
                  {t(`${base}.noHace.${item.clave}`)}
                  {item.loHace && (
                    <button
                      type="button"
                      onClick={() => onElegir(item.loHace as IdDeAgente)}
                      className="mt-1 flex items-center gap-1 text-caption font-medium text-primary hover:underline"
                      data-testid={`equipo-lo-hace-${item.loHace}`}
                    >
                      <ArrowRight size={12} aria-hidden="true" />
                      {t('agentes.equipo.esoLoHace', { nombre: nombreDelAgente(agentePorId(item.loHace), t) })}
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Bloque>
      </div>

      <Bloque titulo={t('agentes.equipo.herramientas')}>
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {agente.herramientas.map((k) => (
            <li
              key={k}
              className="rounded-full border border-border bg-surface px-3 py-1 text-caption text-fg-muted"
            >
              {t(`agentes.herramientas.${k}`)}
            </li>
          ))}
        </ul>
      </Bloque>

      <Bloque
        titulo={
          <>
            {t('agentes.equipo.reportaA')} · {t('agentes.equipo.trabajaCon')}
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          {agente.reportaA === 'equipo' ? (
            <span className="inline-flex items-center rounded-full bg-surface-muted px-3 py-1 text-caption font-medium text-fg">
              {t('agentes.equipo.tuEquipo')}
            </span>
          ) : (
            <ChipDeAgente id={agente.reportaA} onElegir={onElegir} />
          )}
          <span aria-hidden="true" className="mx-1 h-4 w-px bg-border" />
          {agente.trabajaCon
            .filter((id) => id !== agente.reportaA)
            .map((id) => (
              <ChipDeAgente key={id} id={id} onElegir={onElegir} />
            ))}
        </div>
      </Bloque>

      {enLaConversacion.length > 0 && (
        <Bloque titulo={t('agentes.equipo.enEstaConversacion')}>
          <ul className="m-0 list-none space-y-2 p-0">
            {enLaConversacion.slice(-5).map((e) => (
              <li key={e.id} className="rounded-md border border-border-faint px-4 py-3 text-body-sm text-fg">
                <span className="line-clamp-2">{e.taskDescription}</span>
              </li>
            ))}
          </ul>
        </Bloque>
      )}

      <Bloque titulo={t('agentes.equipo.trabajoReciente')}>
        {trabajo.length > 0 ? (
          <ul className="m-0 list-none divide-y divide-border-faint rounded-md border border-border-faint p-0" data-testid="equipo-trabajo">
            {trabajo.map((i) => (
              <li key={i.id} className="flex items-start justify-between gap-4 px-4 py-3">
                <span className="min-w-0">
                  <span className="block text-body-sm text-fg">{i.titulo}</span>
                  {i.detalle && <span className="mt-0.5 block text-caption text-fg-muted">{i.detalle}</span>}
                </span>
                <time dateTime={i.at} className="shrink-0 font-mono text-[11px] tabular-nums text-fg-subtle">
                  {cuando(i.at)}
                </time>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-md bg-surface-muted px-4 py-3 text-body-sm text-fg-muted" data-testid="equipo-sin-trabajo">
            {trabajoNoDisponible ? t('agentes.equipo.trabajoNoDisponible') : t('agentes.equipo.sinTrabajo')}
          </p>
        )}
      </Bloque>

      <p className="border-t border-border-faint pt-4 text-caption text-fg-subtle">{nota}</p>
    </article>
  )
}
