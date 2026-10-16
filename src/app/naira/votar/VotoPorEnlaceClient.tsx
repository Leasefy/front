'use client'

/**
 * VotoPorEnlaceClient — el voto de una señal de Naira desde el correo, con un clic (P12, 16-10-2026).
 *
 * El enlace del correo trae en el FRAGMENTO `#t=<sobre>&v=<valor>`: el fragmento no viaja al servidor del panel ni en
 * el Referer. Al cargar, la página lee el sobre, lo saca de la barra de direcciones y manda el voto al micro
 * (`POST /api/naira/votos/por-enlace`). La página sola (un GET) no vota: los revisores de enlaces de los correos no
 * corren esto. Después, la persona puede cambiar su respuesta con los mismos tres botones.
 *
 * Como en el panel (`BotonesDeUtilidad`): no se dice «registrado» sin la respuesta del servidor, y cada razón del
 * servidor se dice por su nombre.
 */

import type { JSX } from 'react'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Check, ThumbsDown, ThumbsUp, type Icon } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { VALORES_DE_FEEDBACK } from '@/lib/api/naira/contrato'
import { useI18n } from '@/lib/i18n'

type ValorDelVoto = (typeof VALORES_DE_FEEDBACK)[number]

const ICONO_DEL_VALOR = { util: ThumbsUp, no_util: ThumbsDown, ya_lo_sabia: Check } as const satisfies Record<ValorDelVoto, Icon>

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

/** Lo que el servidor dice por su nombre; `bloquea` = con este enlace ya no se puede votar. */
const MENSAJE_DE_LA_RAZON: Readonly<Record<string, { readonly clave: string; readonly bloquea: boolean }>> = {
  enlace_invalido: { clave: 'inmobiliaria.ai.naira.votoPorEnlace.enlaceInvalido', bloquea: true },
  ventana_vencida: { clave: 'inmobiliaria.ai.naira.utilidad.ventanaVencida', bloquea: true },
  voto_antes_de_la_entrega: { clave: 'inmobiliaria.ai.naira.utilidad.antesDeLaEntrega', bloquea: true },
  no_entregado: { clave: 'inmobiliaria.ai.naira.utilidad.soloQuienLaRecibio', bloquea: true },
  sin_permiso: { clave: 'inmobiliaria.ai.naira.utilidad.sinPermiso', bloquea: true },
  sin_miembro: { clave: 'inmobiliaria.ai.naira.votoPorEnlace.sinMiembro', bloquea: true },
  naira_apagada: { clave: 'inmobiliaria.ai.naira.votoPorEnlace.apagada', bloquea: true },
  sin_autorizacion: { clave: 'inmobiliaria.ai.naira.utilidad.sinAutorizacion', bloquea: true },
  no_disponible: { clave: 'inmobiliaria.ai.naira.votoPorEnlace.noDisponible', bloquea: true },
  demasiados_votos: { clave: 'inmobiliaria.ai.naira.votoPorEnlace.demasiados', bloquea: false },
}

/** Lee `#t=…&v=…`: el sobre (solo base64url) y el valor si es uno de los tres. */
export function leerElEnlace(hash: string): { readonly t: string | null; readonly v: ValorDelVoto | null } {
  const p = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash)
  const t = p.get('t')
  const v = p.get('v')
  return {
    t: t !== null && /^[A-Za-z0-9_-]{1,2000}$/.test(t) ? t : null,
    v: VALORES_DE_FEEDBACK.find((x) => x === v) ?? null,
  }
}

export function VotoPorEnlaceClient(): JSX.Element {
  const { t } = useI18n()
  const sobre = useRef<string | null>(null)
  const leido = useRef(false)
  const viajando = useRef(false)
  const [sinEnlace, setSinEnlace] = useState(false)
  const [elegido, setElegido] = useState<ValorDelVoto | null>(null)
  const [enVuelo, setEnVuelo] = useState<ValorDelVoto | null>(null)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [bloqueado, setBloqueado] = useState(false)

  async function votar(valor: ValorDelVoto): Promise<void> {
    const token = sobre.current
    if (token === null || viajando.current) return
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl) {
      setMensaje(t('inmobiliaria.ai.naira.votoPorEnlace.noDisponible'))
      setBloqueado(true)
      return
    }
    viajando.current = true
    setEnVuelo(valor)
    setMensaje(null)
    try {
      const res = await fetch(`${agentUrl}/api/naira/votos/por-enlace`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ t: token, valor }),
      })
      if (res.status === 201) {
        setElegido(valor)
        setMensaje(t('inmobiliaria.ai.naira.utilidad.registrado', { valor: t(VALOR_EN_MENSAJE[valor]) }))
        return
      }
      const cuerpo = (await res.json().catch(() => null)) as { reason?: unknown } | null
      const razon = typeof cuerpo?.reason === 'string' ? MENSAJE_DE_LA_RAZON[cuerpo.reason] : undefined
      if (razon === undefined) {
        setMensaje(t('inmobiliaria.ai.naira.utilidad.noRegistrado'))
        return
      }
      setMensaje(t(razon.clave))
      if (razon.bloquea) setBloqueado(true)
    } catch {
      setMensaje(t('inmobiliaria.ai.naira.utilidad.noRegistrado'))
    } finally {
      viajando.current = false
      setEnVuelo(null)
    }
  }

  useEffect(() => {
    // Una sola lectura aunque el efecto corra dos veces (modo estricto): la segunda ya no ve el fragmento.
    if (leido.current) return
    leido.current = true
    const { t: token, v } = leerElEnlace(window.location.hash)
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname)
    if (token === null) {
      setSinEnlace(true)
      return
    }
    sobre.current = token
    if (v !== null) void votar(v)
    // `votar` solo usa refs y setters estables: correr una vez al montar es lo buscado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const deshabilitados = sinEnlace || bloqueado || enVuelo !== null
  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>{t('inmobiliaria.ai.naira.votoPorEnlace.titulo')}</CardTitle>
        <CardDescription>{t('inmobiliaria.ai.naira.votoPorEnlace.queEs')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {sinEnlace ? (
          <p role="status" className="text-sm text-fg-muted">
            {t('inmobiliaria.ai.naira.votoPorEnlace.sinEnlace')}
          </p>
        ) : (
          <div data-naira-voto="" className="flex flex-col gap-3">
            <span className="text-sm text-fg-muted">{t('inmobiliaria.ai.naira.utilidad.grupo')}</span>
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
            <p role="status" aria-live="polite" className="min-h-5 text-sm text-fg-muted">
              {enVuelo !== null && mensaje === null ? t('inmobiliaria.ai.naira.votoPorEnlace.guardando') : mensaje}
            </p>
          </div>
        )}
        <Link href="/panel/inmobiliaria/reportes/naira" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
          {t('inmobiliaria.ai.naira.votoPorEnlace.irAlPanel')}
        </Link>
      </CardContent>
    </Card>
  )
}
