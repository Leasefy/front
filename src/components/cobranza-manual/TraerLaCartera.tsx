'use client'

/**
 * De dónde salen los deudores de Cobranza y «Traer la cartera ahora»
 * (COBRANZA-MANUAL, 04-10-2026).
 *
 * Nico: «Cobranza se llena con la cartera de los contratos». Cada noche el
 * sistema le pasa a Cobranza a quien pasó el plazo sin pagar; este botón lo
 * hace YA para la inmobiliaria. No contacta a nadie.
 *
 * Si la cobranza está en Automático (el agente contacta solo), Cobranza recibe
 * sólo los cobros emitidos: así el agente no sale a llamar sola a toda la
 * cartera. Se dice con las palabras de la persona y dónde se cambia.
 */
import * as React from 'react'
import { useEffect, useState } from 'react'
import { ArrowsClockwise } from '@phosphor-icons/react'
import { Presence } from '@leasefy/cadence'

import { Button } from '@/components/ui/button'
import { usePermissionsContextSafe } from '@/lib/context/PermissionsContext'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import { cobranzaManualApi } from '@/lib/api/cobranza-manual.service'
import type { DeDondeSaleLaCobranza, ResultadoDeTraerLaCartera } from '@/lib/api/cobranza-manual.types'

/** La frase del resultado de «Traer la cartera ahora». */
export function fraseDeLaCarteraTraida(r: ResultadoDeTraerLaCartera): string {
  if (r.estado === 'en-curso') return 'Ya estamos trayendo la cartera; en un momento aparece aquí.'
  if (r.estado === 'variable-invalida') {
    return 'No pudimos traer la cartera: hay un problema de configuración de nuestro lado. Avísale al equipo de Leasefy.'
  }
  if (r.plazoSinFijar) {
    return 'Tu inmobiliaria no ha fijado sus días de plazo: no hay cuotas en mora para pasar a Cobranza.'
  }
  const { deudores, obligaciones } = r.resumen
  if (obligaciones === 0) return 'Listo: no hay cuotas en mora que pasar a Cobranza.'
  return `Listo: ${deudores} ${deudores === 1 ? 'deudor' : 'deudores'} y ${obligaciones} ${
    obligaciones === 1 ? 'cuota' : 'cuotas'
  } en Cobranza.`
}

export function TraerLaCartera({
  onTraida,
  compacto = false,
}: {
  /** Se trajo: la lista se vuelve a leer. */
  onTraida?: () => void
  /** En la cabecera de la lista: sólo el botón y la frase del resultado. */
  compacto?: boolean
}) {
  const perms = usePermissionsContextSafe()
  const puede = perms ? perms.isAdmin || perms.canAccess('cobros', 'create') : false
  const [origen, setOrigen] = useState<DeDondeSaleLaCobranza | null>(null)
  const [trayendo, setTrayendo] = useState(false)
  const [frase, setFrase] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    cobranzaManualApi
      .deDondeSale()
      .then((o) => {
        if (vivo) setOrigen(o)
      })
      .catch(() => {
        // Sin la respuesta no se dice nada de más: queda el botón.
      })
    return () => {
      vivo = false
    }
  }, [])

  async function traer() {
    setTrayendo(true)
    setFrase(null)
    setError(null)
    try {
      const r = await cobranzaManualApi.traerLaCartera()
      setFrase(fraseDeLaCarteraTraida(r))
      if (r.estado === 'hecha') onTraida?.()
    } catch (err) {
      setError(mensajeParaLaPersona(err, { porDefecto: 'No pudimos traer la cartera.', accion: 'traer la cartera' }))
    } finally {
      setTrayendo(false)
    }
  }

  const boton = puede ? (
    <Button
      size="sm"
      variant={compacto ? 'outline' : 'default'}
      hideArrow
      isLoading={trayendo}
      onClick={() => void traer()}
      data-testid="traer-la-cartera"
    >
      <ArrowsClockwise className="h-4 w-4" aria-hidden="true" />
      Traer la cartera ahora
    </Button>
  ) : null

  const resultado = (
    <>
      <Presence show={Boolean(frase)} initial={false}>
        <p className="text-sm text-fg" role="status" data-testid="traer-la-cartera-resultado">
          {frase}
        </p>
      </Presence>
      <Presence show={Boolean(error)} initial={false}>
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      </Presence>
    </>
  )

  if (compacto) {
    return (
      <div className="flex flex-col items-end gap-1">
        {boton}
        {resultado}
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4" data-testid="de-donde-salen-los-deudores">
      <p className="text-sm text-fg">
        Los deudores de Cobranza salen solos de la cartera de los contratos: quien pasa sus días de plazo sin pagar
        aparece aquí cada noche. Cobranza no le escribe ni le llama a nadie por traerlos.
      </p>
      {origen?.contactaSola === true && origen.camino === 'cobros' ? (
        <p className="text-sm text-warning" data-testid="cobranza-en-automatico">
          Tu cobranza está en Automático (el agente contacta solo): por eso aquí entran sólo los cobros que ya
          emitiste, no toda la cartera. Con Copiloto o Manual, cada contacto espera tu clic y aquí entra la cartera
          de los contratos. Lo cambias en el Piloto.
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        {boton}
        {!puede ? (
          <span className="text-caption text-fg-muted">
            Traer la cartera lo hacen el administrador, el contador y el auxiliar de cartera.
          </span>
        ) : null}
      </div>
      {resultado}
    </div>
  )
}

void React
