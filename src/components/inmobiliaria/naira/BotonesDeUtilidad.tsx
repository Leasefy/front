'use client'

/**
 * BotonesDeUtilidad — «¿Te sirvió?»: Útil / No útil / Ya lo sabía sobre una señal de Naira (Fase 13, plan 13-02;
 * D13-15, UI-SPEC §7.3.2).
 *
 * El voto es del EQUIPO y no tiene actor (D11-10: gana el último, no se guarda quién votó). Por eso el estado es solo de
 * la SESIÓN (U20): no hay «mi voto» que leer, y al recargar los tres vuelven a neutro. Nada se guarda en el navegador.
 *
 * Solo votan los ítems de las secciones votables del briefing (espejo de 11-07) y los loops de la pestaña Seguimiento
 * (D13-12): «nunca en seguimiento» de D13-15 es la SECCIÓN `seguimiento` del briefing, no la pestaña (P12). Con datos de
 * ejemplo los tres quedan deshabilitados con la razón a la vista y no se llama a la red (UI-SPEC §8.6).
 *
 * Regla que dejó el ANTI viejo de `useBetaChat` (agradecía sin haber guardado nada; hoy useBetaChat.ts:1968-1985 ya manda
 * el voto): no se dice «registrado» sin la respuesta del servidor. Cada razón del servidor se dice por su nombre; solo el
 * fallo de red va por toast. Un clic es un POST: mientras viaja, los tres quedan deshabilitados.
 */

import type { JSX } from 'react'
import { useRef, useState } from 'react'
import { Check, ThumbsDown, ThumbsUp, type Icon } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { votarSenal } from '@/lib/api/naira/cliente'
import { VALORES_DE_FEEDBACK, type SECCIONES_DEL_BRIEFING } from '@/lib/api/naira/contrato'
import { useAuth } from '@/lib/auth'
import { useI18n } from '@/lib/i18n'

import { useOrigenDeNaira } from './OrigenDeNaira'

// fuente: 11-07-PLAN.md:357
export const SECCIONES_VOTABLES = ['atencion', 'informativo'] as const

export type OrigenDelVoto =
  | { readonly kind: 'item_del_briefing'; readonly seccion: (typeof SECCIONES_DEL_BRIEFING)[number] }
  | { readonly kind: 'loop_abierto' }

export interface BotonesDeUtilidadProps {
  readonly promocionId: string
  readonly origenDelVoto: OrigenDelVoto
}

type ValorDelVoto = (typeof VALORES_DE_FEEDBACK)[number]

const ICONO_DEL_VALOR = {
  util: ThumbsUp,
  no_util: ThumbsDown,
  ya_lo_sabia: Check,
} as const satisfies Record<ValorDelVoto, Icon>

const ETIQUETA_DEL_VALOR = {
  util: 'inmobiliaria.ai.naira.utilidad.util',
  no_util: 'inmobiliaria.ai.naira.utilidad.no_util',
  ya_lo_sabia: 'inmobiliaria.ai.naira.utilidad.ya_lo_sabia',
} as const satisfies Record<ValorDelVoto, string>

const VALOR_EN_MENSAJE = {
  util: 'inmobiliaria.ai.naira.utilidad.valorEnMensaje.util',
  no_util: 'inmobiliaria.ai.naira.utilidad.valorEnMensaje.no_util',
  ya_lo_sabia: 'inmobiliaria.ai.naira.utilidad.valorEnMensaje.ya_lo_sabia',
} as const satisfies Record<ValorDelVoto, string>

export function BotonesDeUtilidad({ promocionId, origenDelVoto }: BotonesDeUtilidadProps): JSX.Element | null {
  const { t } = useI18n()
  const agencyId = useAuth().agency?.id ?? null
  const [elegido, setElegido] = useState<ValorDelVoto | null>(null)
  const [enVuelo, setEnVuelo] = useState<ValorDelVoto | null>(null)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [bloqueado, setBloqueado] = useState(false)
  // Un clic = un POST aunque lleguen dos clics antes del siguiente render.
  const viajando = useRef(false)
  const esEjemplo = useOrigenDeNaira() === 'ejemplo'

  const seccionDelVoto = origenDelVoto.kind === 'item_del_briefing' ? origenDelVoto.seccion : null
  if (seccionDelVoto !== null && !SECCIONES_VOTABLES.some((s) => s === seccionDelVoto)) return null

  async function votar(valor: ValorDelVoto): Promise<void> {
    if (esEjemplo || bloqueado || agencyId === null || viajando.current) return
    viajando.current = true
    setEnVuelo(valor)
    setMensaje(null)
    const r = await votarSenal(agencyId, promocionId, valor)
    viajando.current = false
    setEnVuelo(null)
    switch (r.kind) {
      case 'ok':
        setElegido(r.data.valor)
        setMensaje(t('inmobiliaria.ai.naira.utilidad.registrado', { valor: t(VALOR_EN_MENSAJE[r.data.valor]) }))
        return
      case 'sin_permiso':
        setBloqueado(true)
        setMensaje(t('inmobiliaria.ai.naira.utilidad.sinPermiso'))
        return
      case 'no_encontrado':
        setMensaje(t('inmobiliaria.ai.naira.utilidad.soloQuienLaRecibio'))
        return
      case 'conflicto':
        if (r.razon === 'ventana_vencida') setMensaje(t('inmobiliaria.ai.naira.utilidad.ventanaVencida'))
        else if (r.razon === 'voto_antes_de_la_entrega') setMensaje(t('inmobiliaria.ai.naira.utilidad.antesDeLaEntrega'))
        // B-5 §8.4 (P3): la señal le llegó a muy pocas personas; sin su autorización, el voto la delataría.
        else if (r.razon === 'sin_autorizacion') setMensaje(t('inmobiliaria.ai.naira.utilidad.sinAutorizacion'))
        else setMensaje(t('inmobiliaria.ai.naira.utilidad.noRegistrado'))
        return
      case 'no_disponible':
        toast.error(t('inmobiliaria.ai.naira.utilidad.noRegistrado'))
        return
      case 'rechazado':
      case 'apagada':
      case 'contrato_roto':
        setMensaje(t('inmobiliaria.ai.naira.utilidad.noRegistrado'))
        return
      default: {
        const _exhaustivo: never = r
        return _exhaustivo
      }
    }
  }

  const deshabilitados = esEjemplo || bloqueado || enVuelo !== null || agencyId === null
  return (
    <div data-naira-voto="" className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-fg-muted">{t('inmobiliaria.ai.naira.utilidad.pregunta')}</span>
      <div role="group" aria-label={t('inmobiliaria.ai.naira.utilidad.grupo')} className="flex flex-wrap gap-2">
        {VALORES_DE_FEEDBACK.map((valor) => {
          const Icono = ICONO_DEL_VALOR[valor]
          return (
            <Button
              key={valor}
              type="button"
              variant="outline"
              size="sm"
              aria-pressed={elegido === valor}
              disabled={deshabilitados}
              isLoading={enVuelo === valor}
              onClick={() => void votar(valor)}
              className="gap-1"
            >
              <Icono weight={elegido === valor ? 'fill' : 'regular'} className="h-4 w-4" aria-hidden="true" />
              {t(ETIQUETA_DEL_VALOR[valor])}
            </Button>
          )
        })}
      </div>
      <p role="status" aria-live="polite" className="text-sm text-fg-muted">
        {esEjemplo ? t('inmobiliaria.ai.naira.utilidad.ejemplo') : mensaje}
      </p>
    </div>
  )
}
