'use client'

/**
 * Paso 10 del recorrido: elegir a uno **y avisarle a los demás**.
 *
 * El hueco que cierra: al aprobar un candidato, los otros quedaban en «En
 * revisión» para siempre. Nadie les decía nada, y sí se les había prometido
 * una respuesta. Desde su lado eso no se distingue de que nos olvidamos.
 *
 * Tres cosas que este modal NO hace, a propósito:
 *
 * 1. No avisa sin que se lo pidan. Aparece marcado, pero es una casilla real:
 *    puede haber una razón para dejar a alguien esperando (que el elegido
 *    todavía no firme, por ejemplo) y la pantalla no puede decidir eso.
 * 2. No dice «listo» si algo falló. Si a dos de tres les llegó el aviso, dice
 *    exactamente eso y deja reintentar SÓLO con los que fallaron.
 * 3. No inventa el texto. El mensaje se puede editar antes de mandarlo,
 *    porque quien responde después el teléfono es la inmobiliaria.
 */

import { useEffect, useState } from 'react'
import { CheckCircle, WarningCircle, X } from '@phosphor-icons/react'
import { toast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { landlordApplicationsApi } from '@/lib/api/applications.service'
import { clasificarFallo } from '@/lib/errores/clasificar'
import { useLenis } from '@/components/providers/SmoothScroll'
import type { LandlordCandidate } from '@/lib/api/applications.types'

const MENSAJE_POR_DEFECTO =
  'Gracias por postularte. En esta oportunidad el inmueble se asignó a otra ' +
  'persona. Tu postulación queda registrada y te escribimos si aparece algo ' +
  'que encaje con lo que buscás.'

type Resultado = 'pendiente' | 'enviando' | 'listo' | 'falló'

export interface ModalAvisarNoElegidosProps {
  elegido: LandlordCandidate
  otros: LandlordCandidate[]
  onCerrar: () => void
  onListo: () => void
}

export function ModalAvisarNoElegidos({
  elegido,
  otros,
  onCerrar,
  onListo,
}: ModalAvisarNoElegidosProps) {
  // Sólo tiene sentido avisarle a quien sigue esperando respuesta.
  const esperando = otros.filter(
    (c) => c.status !== 'REJECTED' && c.status !== 'WITHDRAWN',
  )

  const [aAvisar, setAAvisar] = useState<Set<string>>(() => new Set(esperando.map((c) => c.id)))
  const [mensaje, setMensaje] = useState(MENSAJE_POR_DEFECTO)
  const [enCurso, setEnCurso] = useState(false)
  const [resultados, setResultados] = useState<Record<string, Resultado>>({})
  const [errorDelElegido, setErrorDelElegido] = useState<unknown>(null)
  // Aprobar dos veces al mismo puede dar 409 o duplicar el evento. Un
  // reintento tiene que reintentar SÓLO lo que falló.
  const [elegidoYaAprobado, setElegidoYaAprobado] = useState(false)

  /*
   * Lenis toma el scroll de toda la página. Sin pararlo, la rueda dentro del
   * modal mueve el fondo (`docs/DESIGN.md` §8). El `data-lenis-prevent` de
   * abajo protege al contenedor que scrollea; esto protege al resto.
   */
  const lenis = useLenis()
  useEffect(() => {
    lenis.stop()
    return () => lenis.start()
  }, [lenis])

  /*
   * Escape cierra. Un overlay a mano no lo trae gratis, y este se abre sobre
   * una decisión que aprueba a una persona y rechaza a las otras: quien se
   * arrepiente tiene que poder salir sin buscar el botón.
   *
   * No cierra mientras la operación está en curso: irse a mitad dejaría al
   * elegido aprobado y a los demás sin aviso, sin nadie mirando.
   */
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !enCurso) onCerrar()
    }
    document.addEventListener('keydown', alTeclear)
    return () => document.removeEventListener('keydown', alTeclear)
  }, [enCurso, onCerrar])

  const alternar = (id: string) => {
    setAAvisar((prev) => {
      const siguiente = new Set(prev)
      if (siguiente.has(id)) siguiente.delete(id)
      else siguiente.add(id)
      return siguiente
    })
  }

  const confirmar = async () => {
    setEnCurso(true)
    setErrorDelElegido(null)

    // 1. Primero el elegido. Si esto falla no se avisa a nadie: rechazar a los
    //    demás sin haber aprobado al ganador dejaría el inmueble sin nadie.
    if (!elegidoYaAprobado) {
      try {
        await landlordApplicationsApi.approve(elegido.id)
        setElegidoYaAprobado(true)
      } catch (err) {
        setErrorDelElegido(err)
        setEnCurso(false)
        return
      }
    }

    // 2. Después los demás, uno por uno, guardando qué pasó con cada uno.
    //    A quien ya recibió el aviso no se le manda de nuevo.
    const destinatarios = esperando.filter(
      (c) => aAvisar.has(c.id) && resultados[c.id] !== 'listo',
    )
    // Se parte de lo ya conseguido: un reintento no puede "olvidar" a quien
    // sí recibió el aviso en la vuelta anterior.
    const nuevos: Record<string, Resultado> = { ...resultados }
    for (const c of destinatarios) {
      nuevos[c.id] = 'enviando'
      setResultados({ ...nuevos })
      try {
        await landlordApplicationsApi.reject(c.id, mensaje.trim())
        nuevos[c.id] = 'listo'
      } catch {
        nuevos[c.id] = 'falló'
      }
      setResultados({ ...nuevos })
    }

    setEnCurso(false)

    const fallaron = destinatarios.filter((c) => nuevos[c.id] === 'falló')
    const avisados = esperando.filter((c) => nuevos[c.id] === 'listo').length
    if (fallaron.length === 0) {
      toast.success(
        avisados > 0
          ? `${elegido.tenantName} quedó seleccionado y le avisamos a ${avisados === 1 ? 'la otra persona' : `las otras ${avisados} personas`}.`
          : `${elegido.tenantName} quedó seleccionado.`,
      )
      onListo()
      return
    }

    // Nada de «listo» genérico: se nombra a quién NO le llegó.
    toast.error(
      `${elegido.tenantName} quedó seleccionado, pero no pudimos avisarle a ${fallaron
        .map((c) => c.tenantName)
        .join(', ')}.`,
    )
  }

  const fallaron = esperando.filter((c) => resultados[c.id] === 'falló')
  const yaSeIntentó = Object.keys(resultados).length > 0
  const cantidad = aAvisar.size

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      {/* `role="dialog"` + `aria-modal`: sin esto un lector de pantalla lo lee
          como una sección más de la página, con el panel entero todavía
          navegable detrás. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="avisar-titulo"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-card"
        data-lenis-prevent
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div>
            <h2 id="avisar-titulo" className="text-base font-semibold text-fg">
              Eliges a {elegido.tenantName}
            </h2>
            <p className="mt-0.5 text-sm text-fg-muted">
              Queda aprobado y puedes armarle el contrato.
            </p>
          </div>
          <Button variant="ghost" size="icon" hideArrow onClick={onCerrar} aria-label="Cerrar">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-5 p-6">
          {errorDelElegido !== null && (
            <div className="rounded-md border border-danger bg-danger-soft px-4 py-3">
              <p className="text-sm font-medium text-danger">
                No pudimos aprobar a {elegido.tenantName}
              </p>
              <p className="mt-1 text-sm text-fg-muted">
                {clasificarFallo(errorDelElegido).descripcion} No le avisamos a nadie más.
              </p>
            </div>
          )}

          {esperando.length === 0 ? (
            <p className="text-sm text-fg-muted">
              No hay nadie más esperando respuesta para este inmueble.
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium text-fg">
                  Avisarle a quienes no quedaron
                </p>
                <p className="text-sm text-fg-muted">
                  Se postularon y esperan una respuesta. Si no les avisas, quedan
                  en revisión sin saberlo.
                </p>
              </div>

              <ul className="space-y-1">
                {esperando.map((c) => {
                  const estado = resultados[c.id]
                  return (
                    <li
                      key={c.id}
                      className="flex items-center gap-3 rounded-md border border-border px-3 py-2.5"
                    >
                      <Checkbox
                        id={`avisar-${c.id}`}
                        checked={aAvisar.has(c.id)}
                        onCheckedChange={() => alternar(c.id)}
                        disabled={enCurso || estado === 'listo'}
                        data-testid={`avisar-${c.id}`}
                      />
                      <label
                        htmlFor={`avisar-${c.id}`}
                        className="min-w-0 flex-1 cursor-pointer"
                      >
                        <span className="block truncate text-sm text-fg">{c.tenantName}</span>
                        <span className="block truncate text-xs text-fg-muted">
                          {c.tenantEmail}
                        </span>
                      </label>
                      {estado === 'listo' && (
                        <span className="flex items-center gap-1 text-xs text-success">
                          <CheckCircle className="h-4 w-4" weight="fill" aria-hidden="true" />
                          Avisado
                        </span>
                      )}
                      {estado === 'falló' && (
                        <span className="flex items-center gap-1 text-xs text-danger">
                          <WarningCircle className="h-4 w-4" weight="fill" aria-hidden="true" />
                          No salió
                        </span>
                      )}
                      {estado === 'enviando' && (
                        <span className="text-xs text-fg-muted">Enviando…</span>
                      )}
                    </li>
                  )
                })}
              </ul>

              {cantidad > 0 && (
                <div className="space-y-1.5">
                  <label htmlFor="mensaje-no-elegidos" className="text-sm font-medium text-fg">
                    Lo que van a leer
                  </label>
                  <Textarea
                    id="mensaje-no-elegidos"
                    value={mensaje}
                    onChange={(e) => setMensaje(e.target.value)}
                    rows={4}
                    disabled={enCurso}
                    className="resize-none"
                  />
                  <p className="text-xs text-fg-muted">
                    Lo firma tu inmobiliaria, así que revísalo antes de mandarlo.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-border px-6 py-4">
          <Button variant="secondary" hideArrow onClick={onCerrar} disabled={enCurso} className="flex-1">
            Cancelar
          </Button>
          <Button
            hideArrow
            onClick={() => void confirmar()}
            isLoading={enCurso}
            disabled={enCurso || (cantidad > 0 && !mensaje.trim())}
            className="flex-1"
            data-testid="confirmar-eleccion"
          >
            {yaSeIntentó && fallaron.length > 0
              ? `Reintentar con ${fallaron.length}`
              : cantidad > 0
                ? `Elegir y avisar a ${cantidad}`
                : 'Elegir'}
          </Button>
        </div>

        {yaSeIntentó && fallaron.length > 0 && (
          <p className={cn('px-6 pb-4 text-sm text-danger')}>
            A {fallaron.map((c) => c.tenantName).join(', ')} no le llegó el aviso.
            Volvé a intentarlo — {elegido.tenantName} ya quedó aprobado, eso no
            se repite.
          </p>
        )}
      </div>
    </div>
  )
}
