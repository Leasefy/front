'use client'

import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, CaretDown, Check, WarningCircle } from '@phosphor-icons/react'
import { Collapse } from '@leasefy/cadence'

import { agenteDelDespacho, nombreDelAgente, type IdDeAgente } from '@/lib/agentes/equipo'
import type { Delegacion, LecturaDelTurno, PasoDeRazonamiento } from '@/lib/agentes/agente-que-habla'
import { conNombreDelEquipo } from '@/lib/chat/pensamiento'
import { NOMBRE_DEL_ORQUESTADOR } from '@/lib/agentes/nombre-del-orquestador'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

import { OrbeDeAgente } from './OrbeDeAgente'

/**
 * ══ EL EQUIPO DENTRO DE UNA RESPUESTA DEL CHAT ═══════════════════════════
 *
 * Tres piezas para la burbuja del asistente, todas a partir de
 * `useQuienHabla(mensaje, { pasos, enCurso })`:
 *
 *   <CabeceraDelTurno turno={turno} />        ← el orbe del orquestador + su nombre y estado
 *   <DelegacionesDelTurno turno={turno} />    ← «Ori le pidió a Laura» + la tarea + lo que hizo
 *   <RazonamientoDelTurno turno={turno} />    ← «Cómo lo pensó» (`done.razonamiento`), SÓLO si llegó
 *
 * Sin gradientes de fondo ni tarjetas pesadas: el color lo pone el orbe.
 */

function textoDelEstado(t: (k: string, p?: Record<string, string | number>) => string, estado: string, nombre: string) {
  return t(`agentes.orbe.${estado}`, { nombre })
}

/** El orbe del orquestador, su nombre y lo que está haciendo. Va arriba de cada respuesta. */
export function CabeceraDelTurno({
  turno,
  onAbrirEquipo,
  className,
}: {
  turno: LecturaDelTurno
  /** Abre «El equipo» en el agente tocado. */
  onAbrirEquipo?: (id: IdDeAgente) => void
  className?: string
}) {
  const { t } = useI18n()
  const { agente, estado } = turno.orquestador
  const nombre = nombreDelAgente(agente, t)
  const contenido = (
    <>
      <OrbeDeAgente agente={agente} estado={estado} tamano={30} decorativo />
      <span className="text-body-sm font-semibold text-fg">{nombre}</span>
      {estado !== 'listo' && estado !== 'quieto' && (
        <span className="text-caption text-fg-muted" aria-live="polite">
          {textoDelEstado(t, estado, '').replace(/^\s+/, '')}
        </span>
      )}
    </>
  )
  return onAbrirEquipo ? (
    <button
      type="button"
      onClick={() => onAbrirEquipo(agente.id)}
      className={cn('-ml-1 inline-flex items-center gap-2 rounded-full py-0.5 pl-1 pr-2.5 hover:bg-surface-hover', className)}
      data-testid="turno-cabecera"
    >
      {contenido}
    </button>
  ) : (
    <div className={cn('inline-flex items-center gap-2', className)} data-testid="turno-cabecera">
      {contenido}
    </div>
  )
}

function FilaDeDelegacion({
  d,
  onAbrirEquipo,
}: {
  d: Delegacion
  onAbrirEquipo?: (id: IdDeAgente) => void
}) {
  const { t } = useI18n()
  const reducir = useReducedMotion()
  const [abierta, setAbierta] = useState(false)
  const agente = d.agente
  const nombre = agente ? nombreDelAgente(agente, t) : d.clave
  const tienePasos = d.pasos.length > 0
  return (
    <motion.li
      initial={reducir ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="rounded-md border border-border-faint bg-surface px-3 py-2.5"
      data-testid="turno-delegacion"
      data-agente={agente?.id ?? d.clave}
      data-estado={d.estado}
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex shrink-0 items-center gap-1" aria-hidden="true">
          <OrbeDeAgente agente="orquestador" tamano="xs" quieto decorativo />
          <ArrowRight size={10} className="text-fg-subtle" />
          {agente ? (
            <OrbeDeAgente agente={agente} estado={d.estado} tamano={22} decorativo />
          ) : (
            <span className="size-[22px] rounded-full bg-surface-muted" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-caption text-fg-muted">
            {agente && onAbrirEquipo ? (
              <>
                {NOMBRE_DEL_ORQUESTADOR}{' → '}
                <button
                  type="button"
                  onClick={() => onAbrirEquipo(agente.id)}
                  className="font-medium text-fg underline-offset-2 hover:underline"
                >
                  {nombre}
                </button>
              </>
            ) : (
              t('agentes.turno.llamoA', { orquestador: NOMBRE_DEL_ORQUESTADOR, nombre })
            )}
            {d.estado !== 'listo' && (
              <span className="ml-1.5" aria-live="polite">
                · {textoDelEstado(t, d.estado, nombre)}
              </span>
            )}
          </p>
          {d.tarea && <p className="mt-0.5 line-clamp-2 text-body-sm text-fg">{d.tarea}</p>}
          {d.resumen && <p className="mt-1 text-body-sm text-fg-muted">{d.resumen}</p>}
          {d.estado === 'fallo' && d.error && (
            <p className="mt-1 flex items-start gap-1.5 text-body-sm text-fg-muted">
              <WarningCircle size={14} aria-hidden="true" className="mt-0.5 shrink-0 text-fg-subtle" />
              {d.error}
            </p>
          )}
          {tienePasos && (
            <button
              type="button"
              onClick={() => setAbierta((v) => !v)}
              aria-expanded={abierta}
              className="mt-1.5 inline-flex items-center gap-1 text-caption font-medium text-fg-muted hover:text-fg"
            >
              {t('agentes.turno.loQueHizo')} · {d.pasos.length}
              <CaretDown size={11} aria-hidden="true" className={cn('transition-transform', abierta && 'rotate-180')} />
            </button>
          )}
          <AnimatePresence initial={false}>
            {abierta && tienePasos && (
              <motion.ul
                initial={reducir ? { opacity: 0 } : { opacity: 0, height: 0 }}
                animate={reducir ? { opacity: 1 } : { opacity: 1, height: 'auto' }}
                exit={reducir ? { opacity: 0 } : { opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="m-0 mt-1.5 list-none space-y-1 overflow-hidden p-0"
              >
                {d.pasos.map((p, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-caption text-fg-muted">
                    <Check size={12} weight="bold" aria-hidden="true" className="mt-0.5 shrink-0 text-success" />
                    <span>
                      {p.texto}
                      {p.repeticiones && p.repeticiones > 1 ? ` ×${p.repeticiones}` : ''}
                    </span>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.li>
  )
}

/** A quién le pasó el trabajo el orquestador y qué hizo cada uno. No pinta nada si no delegó. */
export function DelegacionesDelTurno({
  turno,
  onAbrirEquipo,
  className,
}: {
  turno: LecturaDelTurno
  onAbrirEquipo?: (id: IdDeAgente) => void
  className?: string
}) {
  if (turno.delegaciones.length === 0) return null
  return (
    <ul className={cn('m-0 list-none space-y-2 p-0', className)} data-testid="turno-delegaciones">
      {turno.delegaciones.map((d, i) => (
        <FilaDeDelegacion key={`${d.clave}-${i}`} d={d} onAbrirEquipo={onAbrirEquipo} />
      ))}
    </ul>
  )
}

/**
 * Las frases de «Cómo lo pensó», en orden. Las que hablan de un especialista
 * (`agente`) llevan su orbe y su nombre del equipo (`equipo.ts`): el micro
 * escribe «el especialista de pagos» y acá se lee «Cobri».
 */
export function PasosDelRazonamiento({ pasos, className }: { pasos: readonly PasoDeRazonamiento[]; className?: string }) {
  const { t } = useI18n()
  return (
    <ol className={cn('m-0 list-none space-y-2 p-0', className)} data-testid="pasos-del-razonamiento">
      {pasos.map((p, i) => {
        const agente = agenteDelDespacho(p.agente)
        return (
          <li
            key={`${i}-${p.texto.slice(0, 24)}`}
            className="flex items-start gap-2.5 font-body text-[13.5px] leading-[1.55] text-fg-muted"
            data-agente={agente?.id}
          >
            <span aria-hidden="true" className="mt-[3px] flex size-4 shrink-0 items-center justify-center">
              {agente ? (
                <OrbeDeAgente agente={agente} tamano={16} quieto decorativo />
              ) : (
                <span className="size-1 rounded-full bg-fg-subtle/70" />
              )}
            </span>
            <span className="min-w-0">{conNombreDelEquipo(p.texto, p.agente, t)}</span>
          </li>
        )
      })}
    </ol>
  )
}

/**
 * «Cómo lo pensó»: SÓLO con el razonamiento que mandó el micro en el `done`
 * (frases que arma con lo que decidió, sin modelo). Un micro viejo no lo manda:
 * entonces no pinta nada y no se rellena con los pasos. En el chat, desde el
 * 02-10, vive plegado ARRIBA de la respuesta (`PensamientoDelTurno`, que lo
 * usa con `PasosDelRazonamiento`); esto queda para quien lo pinte suelto.
 */
export function RazonamientoDelTurno({ turno, className }: { turno: LecturaDelTurno; className?: string }) {
  const { t } = useI18n()
  const [abierto, setAbierto] = useState(false)
  if (!turno.razonamiento) return null
  return (
    <div className={cn('text-body-sm', className)} data-testid="turno-razonamiento">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="inline-flex items-center gap-1 text-caption font-medium text-fg-muted hover:text-fg"
      >
        {t('agentes.turno.comoLoPenso')}
        <CaretDown size={11} aria-hidden="true" className={cn('transition-transform', abierto && 'rotate-180')} />
      </button>
      {/* Se abre con su animación (`Collapse`, el sistema de movimiento), como
          el resto de lo que se pliega en el chat (02-10). */}
      <Collapse open={abierto}>
        <PasosDelRazonamiento pasos={turno.razonamiento} className="mt-2" />
      </Collapse>
    </div>
  )
}
