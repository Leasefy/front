'use client'

/**
 * PedirDetalleDelRechazo — el canal de F-07 para quien no pasó.
 *
 * F-07 (CEO, 18-09-2026): «al rechazado se le da un motivo general y un canal
 * para pedir detalle o corregir datos; nunca el puntaje ni datos de centrales».
 * La inmobiliaria ya tenía su lado (Postulaciones → Reclamos, donde se responde)
 * y el back su ruta pública (`POST /postulaciones/reclamos/:agencyId`), pero el
 * candidato NO tenía por dónde escribir: la pantalla de Reclamos prometía «al
 * candidato que no pasa se le manda el motivo junto con este canal» y la lista
 * nunca podía llenarse (QA-IA-A, 04-10-2026).
 */

import { useCallback, useEffect, useState } from 'react'
import { ChatCircleText, CheckCircle } from '@phosphor-icons/react'
import { Presence } from '@leasefy/cadence'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui'
import { applicationsApi } from '@/lib/api/applications.service'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'

type Tipo = 'DETALLE' | 'CORRECCION'

/** «4 de octubre de 2026», en la hora de Colombia. */
function fechaLegible(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Bogota' })
}

const OPCIONES: Array<{ valor: Tipo; titulo: string; pista: string }> = [
  { valor: 'DETALLE', titulo: 'Quiero saber más del motivo', pista: 'Cuéntale a la inmobiliaria qué quieres entender.' },
  { valor: 'CORRECCION', titulo: 'Un dato mío está mal', pista: 'Di cuál dato está mal y cuál es el correcto.' },
]

export function PedirDetalleDelRechazo({
  agencyId,
  applicationId,
  nombre,
  correo,
}: {
  agencyId: string
  applicationId: string
  nombre: string
  correo: string
}) {
  const [tipo, setTipo] = useState<Tipo>('DETALLE')
  const [mensaje, setMensaje] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [enviado, setEnviado] = useState(false)

  const corto = mensaje.trim().length < 5

  // Lo que ya escribió y lo que le respondieron (la respuesta llega aquí y a
  // sus notificaciones; no por correo).
  type Reclamo = Awaited<ReturnType<typeof applicationsApi.misReclamos>>[number]
  const [reclamos, setReclamos] = useState<Reclamo[]>([])
  const leer = useCallback(() => {
    applicationsApi
      .misReclamos(applicationId)
      .then(setReclamos)
      .catch(() => setReclamos([]))
  }, [applicationId])
  useEffect(() => {
    leer()
  }, [leer])

  async function enviar() {
    if (corto || enviando) return
    setEnviando(true)
    setError(null)
    try {
      await applicationsApi.reclamar(agencyId, {
        applicationId,
        solicitanteNombre: nombre.trim() || correo,
        solicitanteCorreo: correo,
        tipo,
        mensaje: mensaje.trim(),
      })
      setEnviado(true)
      setMensaje('')
      leer()
    } catch (e) {
      setError(mensajeParaLaPersona(e, { accion: 'enviar tu mensaje a la inmobiliaria' }))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section className="rounded-xl bg-surface-muted p-6" data-testid="pedir-detalle-del-rechazo">
      <div className="flex items-start gap-3">
        <ChatCircleText className="mt-0.5 h-5 w-5 flex-shrink-0 text-fg-muted" aria-hidden="true" />
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="text-base font-semibold text-fg">¿Quieres saber más o corregir un dato?</h2>
          <p className="text-sm text-fg-muted">
            Escríbele a la inmobiliaria. Su respuesta aparece aquí y te avisamos en tus notificaciones.
          </p>
        </div>
      </div>

      {reclamos.length > 0 ? (
        <ul className="mt-4 space-y-3" data-testid="mis-reclamos">
          {reclamos.map((r) => (
            <li key={r.id} className="rounded-lg border border-border bg-surface p-3 text-sm">
              <p className="text-fg-muted">
                Escribiste el {fechaLegible(r.createdAt)}: <span className="text-fg">«{r.mensaje}»</span>
              </p>
              {r.respuesta ? (
                <p className="mt-2 border-l-2 border-primary/40 pl-3 text-fg">
                  <span className="block text-sm text-fg-muted">
                    La inmobiliaria respondió{r.respondidoEl ? ` el ${fechaLegible(r.respondidoEl)}` : ''}:
                  </span>
                  {r.respuesta}
                </p>
              ) : (
                <p className="mt-2 text-fg-muted">Todavía sin respuesta.</p>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      <Presence show={enviado} initial={false}>
        <p className="mt-4 flex items-center gap-2 text-sm text-success" role="status" data-testid="reclamo-enviado">
          <CheckCircle className="h-4 w-4" weight="fill" aria-hidden="true" />
          Listo: la inmobiliaria recibió tu mensaje. Su respuesta aparece aquí.
        </p>
      </Presence>

      {!enviado ? (
        <div className="mt-4 space-y-4">
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Qué necesitas">
            {OPCIONES.map((o) => (
              <button
                key={o.valor}
                type="button"
                role="radio"
                aria-checked={tipo === o.valor}
                onClick={() => setTipo(o.valor)}
                className={
                  'rounded-lg border px-4 py-3 text-left text-sm transition-colors ' +
                  (tipo === o.valor ? 'border-primary bg-primary-soft text-fg' : 'border-border bg-surface text-fg-muted hover:text-fg')
                }
              >
                <span className="block font-medium text-fg">{o.titulo}</span>
                <span className="block text-sm text-fg-muted">{o.pista}</span>
              </button>
            ))}
          </div>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-fg">Tu mensaje</span>
            <Textarea
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              rows={4}
              maxLength={4000}
              placeholder={tipo === 'CORRECCION' ? 'Ej.: mi ingreso mensual es $4.200.000, no $2.400.000.' : 'Ej.: ¿qué puedo hacer para volver a postularme?'}
              data-testid="reclamo-mensaje"
            />
          </label>
          {error ? (
            <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end">
            <Button onClick={() => void enviar()} disabled={corto || enviando} isLoading={enviando} data-testid="reclamo-enviar">
              Enviar a la inmobiliaria
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
