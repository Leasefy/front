'use client'

/**
 * PreguntaSemanal — la pregunta del lunes dentro del briefing: «¿Hubo algo importante esta semana que Naira no te
 * dijo?» (Fase 13, plan 13-03; NOT-05 recall, D13-13, UI-SPEC §7.1, §8.2 y §8.6).
 *
 * La respuesta viaja a `POST …/naira/recall` con `semana` = el lunes del briefing y el largo máximo del contrato (2000,
 * no los 4000 de UI-SPEC: manda el contrato). No se guarda NADA en el navegador (Ley 1581): el texto vive en el estado
 * del componente y se vacía al enviarse.
 *
 * Cada rechazo se dice por su razón y SIN eco del texto: los datos personales (`pii:*`) piden quitarlos; hablar de alguien
 * del equipo (`pending_counsel:…`, B-5) todavía no se puede guardar; una semana cerrada o futura bloquea la pregunta; un
 * 403 bloquea y se dice. Con datos de ejemplo no se escribe (la razón queda a la vista).
 *
 * El ancla (`id`) es el destino del enlace del correo del lunes (E13-1): al montar con ese hash la sección se desplaza a
 * la vista sin mover el foco.
 */

import type { JSX } from 'react'
import { useEffect, useId, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { RAZON_PEDIDO_INVALIDO, responderRecall } from '@/lib/api/naira/cliente'
import { useAuth } from '@/lib/auth'
import { useI18n } from '@/lib/i18n'
import { LARGO_MAXIMO_DE_RECALL } from '@/lib/naira/briefing-y-senal'

import { useOrigenDeNaira } from './OrigenDeNaira'

export interface PreguntaSemanalProps {
  /** El lunes del briefing (YYYY-MM-DD). */
  readonly semana: string
  /** El id de la sección (el ancla del enlace del correo). */
  readonly ancla: string
}

type ClaveDelRechazo = 'pii' | 'equipo' | 'cerrada' | 'invalida' | 'noEnviada' | 'sinPermiso'

type Resultado =
  | { readonly kind: 'abierta' }
  | { readonly kind: 'enviada' }
  | { readonly kind: 'rechazada'; readonly clave: ClaveDelRechazo; readonly bloquea: boolean }

// fuente: src/naira/memory/pii-guard.ts:58-63 (MEMORY_CONTENT_REJECTION_REASONS, EXISTE) + la cadena que nombra 10-06
const RAZONES_DE_DATOS_PERSONALES = ['pii:cedula', 'pii:telefono', 'pii:email', 'rechazada_por_pii'] as const
// fuente: src/naira/memory/pii-guard.ts:58-63 (B-5: finalidad pendiente de counsel)
const RAZON_DEL_EQUIPO = 'pending_counsel:naira_desempeno_empleados'
// fuente: 10-06-PLAN.md (422 de POST /recall)
const RAZONES_DE_SEMANA_CERRADA = ['semana_no_es_lunes', 'semana_futura'] as const

const MENSAJE_DEL_RECHAZO = {
  pii: 'inmobiliaria.ai.naira.recall.pii',
  equipo: 'inmobiliaria.ai.naira.recall.equipo',
  cerrada: 'inmobiliaria.ai.naira.recall.cerrada',
  invalida: 'inmobiliaria.ai.naira.recall.invalida',
  noEnviada: 'inmobiliaria.ai.naira.recall.noEnviada',
  sinPermiso: 'inmobiliaria.ai.naira.recall.sinPermiso',
} as const satisfies Record<ClaveDelRechazo, string>

/** La razón del 422/400 por comparación EXACTA con listas cerradas (nunca por el texto rechazado). */
function claveDelRechazo(razon: string | null): { readonly clave: ClaveDelRechazo; readonly bloquea: boolean } {
  if (RAZONES_DE_DATOS_PERSONALES.some((r) => r === razon)) return { clave: 'pii', bloquea: false }
  if (razon === RAZON_DEL_EQUIPO) return { clave: 'equipo', bloquea: false }
  if (RAZONES_DE_SEMANA_CERRADA.some((r) => r === razon)) return { clave: 'cerrada', bloquea: true }
  if (razon === RAZON_PEDIDO_INVALIDO) return { clave: 'invalida', bloquea: false }
  return { clave: 'noEnviada', bloquea: false }
}

export function PreguntaSemanal({ semana, ancla }: PreguntaSemanalProps): JSX.Element {
  const { t } = useI18n()
  const agencyId = useAuth().agency?.id ?? null
  const idTitulo = useId()
  const idCampo = useId()
  const ref = useRef<HTMLElement>(null)
  // Un envío = un POST aunque lleguen dos antes del siguiente render.
  const viajando = useRef(false)
  const [texto, setTexto] = useState('')
  const [enVuelo, setEnVuelo] = useState(false)
  const [resultado, setResultado] = useState<Resultado>({ kind: 'abierta' })
  const esEjemplo = useOrigenDeNaira() === 'ejemplo'

  useEffect(() => {
    if (window.location.hash === '#' + ancla) ref.current?.scrollIntoView({ block: 'start' })
  }, [ancla])

  const bloqueado = resultado.kind === 'rechazada' && resultado.bloquea

  async function enviar(): Promise<void> {
    if (esEjemplo || enVuelo || viajando.current || bloqueado || resultado.kind === 'enviada' || agencyId === null) return
    viajando.current = true
    setEnVuelo(true)
    setResultado({ kind: 'abierta' })
    const r = await responderRecall(agencyId, { semana, texto })
    viajando.current = false
    setEnVuelo(false)
    switch (r.kind) {
      case 'ok':
        setResultado({ kind: 'enviada' })
        setTexto('')
        return
      case 'rechazado':
        setResultado({ kind: 'rechazada', ...claveDelRechazo(r.razon) })
        return
      case 'sin_permiso':
        setResultado({ kind: 'rechazada', clave: 'sinPermiso', bloquea: true })
        return
      case 'no_disponible':
      case 'apagada':
      case 'no_encontrado':
      case 'conflicto':
      case 'contrato_roto':
        setResultado({ kind: 'rechazada', clave: 'noEnviada', bloquea: false })
        return
      default: {
        const _exhaustivo: never = r
        return _exhaustivo
      }
    }
  }

  const mensaje = esEjemplo
    ? t('inmobiliaria.ai.naira.recall.ejemplo')
    : resultado.kind === 'rechazada'
      ? t(MENSAJE_DEL_RECHAZO[resultado.clave])
      : null

  return (
    <section
      id={ancla}
      ref={ref}
      data-naira-recall=""
      aria-labelledby={idTitulo}
      className="space-y-3 rounded-lg border border-border bg-surface p-4 md:p-6"
    >
      <h2 id={idTitulo} className="text-base font-semibold text-fg">
        {t('inmobiliaria.ai.naira.recall.titulo')}
      </h2>
      {resultado.kind === 'enviada' ? (
        <p role="status" className="text-sm text-fg">
          {t('inmobiliaria.ai.naira.recall.gracias')}
        </p>
      ) : (
        <>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              void enviar()
            }}
          >
            <label htmlFor={idCampo} className="sr-only">
              {t('inmobiliaria.ai.naira.recall.etiqueta')}
            </label>
            <Textarea
              id={idCampo}
              maxLength={LARGO_MAXIMO_DE_RECALL}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              disabled={esEjemplo || bloqueado}
            />
            <Button
              type="submit"
              variant="default"
              isLoading={enVuelo}
              disabled={esEjemplo || bloqueado || enVuelo || texto.trim() === ''}
            >
              {t('inmobiliaria.ai.naira.recall.enviar')}
            </Button>
          </form>
          <p role="status" aria-live="polite" className="text-sm text-fg-muted">
            {mensaje}
          </p>
        </>
      )}
    </section>
  )
}
