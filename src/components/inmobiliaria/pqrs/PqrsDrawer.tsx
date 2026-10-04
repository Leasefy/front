'use client'

/**
 * Detalle de una PQRS: qué es, quién la presentó, para cuándo vence, y las
 * dos cosas que se pueden hacer desde acá — moverla de estado y asignarla.
 *
 * Cada acción pega a `PATCH /inmobiliaria/pqrs/:id` y devuelve la fila
 * actualizada; la pantalla la reemplaza en la lista con `onActualizado`.
 * `estadosSiguientes` (en `./pqrs-reglas`) dice a dónde se puede ir desde
 * cada estado; acá sólo se ofrecen esas opciones.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Paperclip, FilePdf, Image as Imagen } from '@phosphor-icons/react'
import { toast } from '@/components/ui/toast'

import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'
import { Label } from '@/components/ui/label'
import { Combobox } from '@/components/ui/combobox'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Cajon, CajonCuerpo } from '@/components/ui/cajon'
import { SheetHeader } from '@/components/ui/sheet'
import { useUltimoPresente } from '@/lib/hooks/use-ultimo-presente'
import { ApiError } from '@/lib/api/client'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import { pqrsApi } from '@/lib/api/pqrs-agencia.service'
import type {
  ActualizarPqrsInput,
  Pqrs,
  PqrsConHistorial,
  PqrsEstado,
  ResponsableDePqrs,
} from '@/lib/api/pqrs-agencia.types'
import { MEDIOS_SIN_PORTAL } from '@/lib/api/pqrs-agencia.types'
import { ACCEPT_DE_ADJUNTOS, problemaDelAdjunto } from '@/lib/api/pqrs-adjuntos'
import {
  ESTADO_BADGE,
  ESTADO_LABEL,
  EVENTO_LABEL,
  MEDIO_LABEL,
  SOLICITANTE_LABEL,
  estadosSiguientes,
  inmuebleSinRepetir,
  nombreDelTipo,
  textoSla,
} from './pqrs-reglas'

export { estadosSiguientes } from './pqrs-reglas'

interface Props {
  pqrs: Pqrs | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** La fila que devolvió el back tras mover de estado o reasignar. */
  onActualizado: (pqrs: Pqrs) => void
}

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-fg-muted">{etiqueta}</dt>
      <dd className="text-sm text-fg">{children}</dd>
    </div>
  )
}

export function PqrsDrawer({ pqrs: entrante, open, onOpenChange, onActualizado }: Props) {
  // La pantalla cierra con `setSeleccionada(null)`, así que `open` y `pqrs` se
  // apagan en el MISMO render: el cajón salía deslizándose en blanco. Conservar
  // la última solicitud es lo que lo hace salir mostrando lo que mostraba.
  const pqrs = useUltimoPresente(entrante)
  const { formatDate } = useI18n()
  const [guardando, setGuardando] = useState(false)
  /*
   * PQRS-FIX (04-10-2026): el detalle (historial, respuesta, adjuntos) y los
   * responsables (SO-22: cualquier miembro activo que vea las PQRS, no sólo los
   * asesores) se piden al abrir.
   */
  const [responsables, setResponsables] = useState<ResponsableDePqrs[]>([])
  const [detalle, setDetalle] = useState<PqrsConHistorial | null>(null)
  const [respondiendo, setRespondiendo] = useState(false)
  const [respuesta, setRespuesta] = useState('')
  const [medio, setMedio] = useState<string>('')
  const [errorRespuesta, setErrorRespuesta] = useState<string | null>(null)
  const [subiendo, setSubiendo] = useState(false)
  const inputArchivo = useRef<HTMLInputElement>(null)
  const pqrsId = pqrs?.id

  const cargarDetalle = useCallback(() => {
    if (!pqrsId) return
    pqrsApi.detalle(pqrsId).then(setDetalle).catch(() => setDetalle(null))
  }, [pqrsId])

  useEffect(() => {
    if (!open) return
    pqrsApi.responsables().then(setResponsables).catch(() => setResponsables([]))
  }, [open])
  useEffect(() => {
    setDetalle(null)
    setRespondiendo(false)
    setRespuesta('')
    setMedio('')
    setErrorRespuesta(null)
    if (open) cargarDetalle()
  }, [open, cargarDetalle])
  const agentes = useMemo(
    () => responsables.map((r) => ({ userId: r.userId, name: r.nombre })),
    [responsables],
  )

  /*
   * 🔴 19-09-2026 · Quien YA responde entra siempre en la lista, aunque no
   * esté entre los agentes activos.
   *
   * Visto en una captura de Nico: arriba el cajón decía «RESPONSABLE · victor
   * ortiz» y tres renglones más abajo, en el control del MISMO campo, decía
   * «Sin agentes activos». El `Combobox` recibía un `value` que no existía
   * entre sus opciones, no encontraba cómo rotularlo y caía al placeholder.
   * Dos afirmaciones contrarias sobre el mismo dato, en la misma pantalla, a
   * treinta píxeles de distancia — y la que gana es la que parece un control,
   * o sea la falsa.
   *
   * Pasa siempre que quien responde dejó de estar activo en la inmobiliaria:
   * la PQRS no se reasigna sola, así que el caso es normal, no un borde raro.
   */
  const opcionesAgente = useMemo(() => {
    const activos = agentes
      .filter((a): a is typeof a & { userId: string } => Boolean(a.userId))
      .map((a) => ({ value: a.userId, label: a.name }))
    const actual = pqrs?.asignadoAUserId
    if (!actual || activos.some((o) => o.value === actual)) return activos
    return [
      { value: actual, label: pqrs?.asignadoANombre ?? 'Responsable actual' },
      ...activos,
    ]
  }, [agentes, pqrs?.asignadoAUserId, pqrs?.asignadoANombre])

  const siguientes = pqrs ? estadosSiguientes(pqrs.estado, pqrs.tipo) : []
  const sla = pqrs ? textoSla(pqrs.slaVenceAt, pqrs.estado) : null
  const fecha = (iso: string) => formatDate(iso, { day: 'numeric', month: 'short', year: 'numeric' })

  async function actualizar(input: ActualizarPqrsInput, mensaje: string) {
    if (!pqrs || guardando) return
    setGuardando(true)
    try {
      const actualizado = await pqrsApi.actualizar(pqrs.id, input)
      toast.success(mensaje)
      onActualizado(actualizado)
      setRespondiendo(false)
      cargarDetalle()
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return
      // Por el traductor (02-10-2026): el motivo del back entero —antes uno de
      // más de 160 caracteres se perdía—, un 5xx con su referencia y «conexión»
      // sólo cuando no hubo respuesta.
      toast.error('No se pudo actualizar la solicitud', {
        description: mensajeParaLaPersona(err, {
          porDefecto: 'Prueba de nuevo en un momento.',
          accion: 'actualizar la solicitud',
        }),
      })
    } finally {
      setGuardando(false)
    }
  }

  /** SO-18: una foto o un PDF a la PQRS; el back decide por los bytes. */
  async function adjuntar(archivo: File) {
    if (!pqrs) return
    const problema = problemaDelAdjunto(archivo)
    if (problema) {
      toast.error('No se pudo adjuntar', { description: problema })
      return
    }
    setSubiendo(true)
    try {
      await pqrsApi.subirAdjunto(pqrs.id, archivo)
      toast.success(`«${archivo.name}» quedó adjunto`)
      cargarDetalle()
    } catch (err) {
      toast.error('No se pudo adjuntar', {
        description: mensajeParaLaPersona(err, { porDefecto: 'Prueba de nuevo en un momento.', accion: 'adjuntar el archivo' }),
      })
    } finally {
      setSubiendo(false)
    }
  }

  async function abrirAdjunto(adjuntoId: string) {
    if (!pqrs) return
    try {
      const { url } = await pqrsApi.abrirAdjunto(pqrs.id, adjuntoId)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      toast.error('No se pudo abrir el archivo', {
        description: mensajeParaLaPersona(err, { porDefecto: 'Prueba de nuevo en un momento.', accion: 'abrir el archivo' }),
      })
    }
  }

  return (
    <Cajon abierto={open} onOpenChange={onOpenChange} ancho="sm:max-w-xl">
      {pqrs && (
        <>
          {/* Cabecera fija: el radicado y el estado se quedan a la vista
              mientras el cuerpo hace scroll. */}
          <SheetHeader
            title={pqrs.radicado}
            description={`${nombreDelTipo(pqrs)} · radicada el ${fecha(pqrs.createdAt)}`}
            actions={
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2 py-0.5 text-caption font-medium',
                  ESTADO_BADGE[pqrs.estado],
                )}
                data-testid="pqrs-estado-badge"
              >
                {ESTADO_LABEL[pqrs.estado]}
              </span>
            }
          />

          <CajonCuerpo className="space-y-6">
            <section className="space-y-2">
              <h3 className="text-base font-medium text-fg">{pqrs.asunto}</h3>
              {pqrs.descripcion ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-fg-muted">{pqrs.descripcion}</p>
              ) : (
                <p className="text-sm text-fg-subtle">Sin descripción.</p>
              )}
            </section>

            <dl className="grid grid-cols-1 gap-4 rounded-lg border border-border bg-surface-muted/40 p-4 sm:grid-cols-2">
              <Dato etiqueta="Solicitante">
                <span className="font-medium">{pqrs.solicitanteNombre}</span>
                <span className="text-fg-muted"> · {SOLICITANTE_LABEL[pqrs.solicitanteTipo]}</span>
                {pqrs.solicitanteContacto && (
                  <span className="block text-fg-muted">{pqrs.solicitanteContacto}</span>
                )}
              </Dato>
              <Dato etiqueta="Inmueble">
                {inmuebleSinRepetir(pqrs.inmuebleLabel) ?? <span className="text-fg-subtle">Sin inmueble</span>}
              </Dato>
              {/* Quién responde y DESDE CUÁNDO (Nico, 2026-09-15: una PQRS no
                  puede quedar sin responsable). «Sin asignar» sólo se ve en
                  solicitudes viejas: las nuevas nacen con responsable. La
                  fecha falta en las anteriores a la migración y no se inventa. */}
              <Dato etiqueta="Responsable">
                {pqrs.asignadoANombre ? (
                  <>
                    <span className="font-medium">{pqrs.asignadoANombre}</span>
                    {pqrs.asignadoDesde ? (
                      <span className="block text-fg-muted" data-testid="pqrs-responsable-desde">
                        responde desde el {fecha(pqrs.asignadoDesde)}
                      </span>
                    ) : null}
                  </>
                ) : (
                  <span className="text-fg-subtle">Sin asignar</span>
                )}
              </Dato>
              <Dato etiqueta="Radicada el">{fecha(pqrs.createdAt)}</Dato>
              <Dato etiqueta="Plazo de respuesta">
                {sla && (
                  <span className={cn('tabular-nums', sla.vencido && 'text-danger font-medium')} data-testid="pqrs-sla">
                    {sla.texto}
                  </span>
                )}
                <span className="block text-fg-muted">
                  vence el {fecha(pqrs.slaVenceAt)}
                  {pqrs.slaHoras == null ? ' (15 días hábiles)' : ''}
                </span>
              </Dato>
              {pqrs.resueltaAt && <Dato etiqueta="Resuelta el">{fecha(pqrs.resueltaAt)}</Dato>}
              {pqrs.cerradaAt && <Dato etiqueta="Cerrada el">{fecha(pqrs.cerradaAt)}</Dato>}
            </dl>

            {detalle?.respuesta ? (
              <section className="space-y-2 rounded-lg border border-success/30 bg-success/5 p-4" data-testid="pqrs-respuesta">
                <h4 className="text-sm font-medium text-fg">Respuesta al solicitante</h4>
                <p className="whitespace-pre-wrap text-sm text-fg">{detalle.respuesta.texto}</p>
                <p className="text-caption text-fg-muted">
                  {MEDIO_LABEL[detalle.respuesta.medio]} · {fecha(detalle.respuesta.at)}
                  {detalle.respuesta.porNombre ? ` · ${detalle.respuesta.porNombre}` : ''}
                </p>
              </section>
            ) : null}

            <section className="space-y-2" data-testid="pqrs-adjuntos">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-medium text-fg">Archivos</h4>
                {pqrs.estado !== 'CERRADA' && (
                  <>
                    <input
                      ref={inputArchivo}
                      type="file"
                      accept={ACCEPT_DE_ADJUNTOS}
                      className="sr-only"
                      data-testid="pqrs-adjuntar-input"
                      onChange={(e) => {
                        const archivo = e.target.files?.[0]
                        e.target.value = ''
                        if (archivo) void adjuntar(archivo)
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      hideArrow
                      disabled={subiendo || detalle?.historialDisponible === false}
                      onClick={() => inputArchivo.current?.click()}
                      data-testid="pqrs-adjuntar"
                    >
                      <Paperclip className="h-4 w-4" />
                      {subiendo ? 'Subiendo…' : 'Adjuntar foto o PDF'}
                    </Button>
                  </>
                )}
              </div>
              {detalle && detalle.adjuntos.length > 0 ? (
                <ul className="space-y-1.5">
                  {detalle.adjuntos.map((a) => (
                    <li key={a.id}>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-left text-sm hover:bg-surface-muted"
                        onClick={() => void abrirAdjunto(a.id)}
                        data-testid="pqrs-adjunto"
                      >
                        {a.tipo === 'application/pdf' ? (
                          <FilePdf className="h-4 w-4 shrink-0 text-fg-muted" />
                        ) : (
                          <Imagen className="h-4 w-4 shrink-0 text-fg-muted" />
                        )}
                        <span className="min-w-0 flex-1 truncate text-fg">{a.nombre}</span>
                        <span className="shrink-0 text-caption text-fg-muted">{fecha(a.subidoAt)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-fg-subtle">{detalle ? 'Sin archivos.' : 'Cargando…'}</p>
              )}
            </section>

            <section className="space-y-4 border-t border-border pt-5">
              <div className="space-y-1.5">
                <Label htmlFor="pqrs-mover">Estado</Label>
                {/* Sin responsable no se avanza: el back lo rechaza con un 400
                    y ofrecer el selector sería mandar a la gente contra un muro. */}
                {!pqrs.asignadoAUserId && siguientes.length > 0 ? (
                  <p className="text-sm text-fg-muted" data-testid="pqrs-falta-responsable">
                    Asigna un responsable abajo para poder moverla: el plazo de ley corre
                    para alguien.
                  </p>
                ) : siguientes.length > 0 ? (
                  <Combobox
                    data-testid="pqrs-mover"
                    options={siguientes.map((e) => ({ value: e, label: ESTADO_LABEL[e] }))}
                    value={undefined}
                    onChange={(v) => {
                      if (!v) return
                      // SO-04: «Resuelta» exige escribir la respuesta al solicitante.
                      if (v === 'RESUELTA') {
                        setRespondiendo(true)
                        return
                      }
                      void actualizar({ estado: v as PqrsEstado }, `Movida a ${ESTADO_LABEL[v as PqrsEstado]}`)
                    }}
                    placeholder={`${ESTADO_LABEL[pqrs.estado]} · mover a…`}
                    searchPlaceholder="Estado"
                    disabled={guardando}
                    contentClassName="z-[400]"
                  />
                ) : (
                  <p className="text-sm text-fg-muted">Cerrada. Ya no admite cambios.</p>
                )}
              </div>
              {respondiendo && (
                <div className="space-y-3 rounded-lg border border-border p-4" data-testid="pqrs-responder">
                  <div className="space-y-1.5">
                    <Label htmlFor="pqrs-respuesta-texto">Respuesta al solicitante</Label>
                    <p className="text-caption text-fg-muted">
                      {detalle?.tienePortal
                        ? `${pqrs.solicitanteNombre} la verá en su portal y le llegará un aviso.`
                        : `${pqrs.solicitanteNombre} no tiene portal: queda registrada y dices por dónde se la diste.`}
                    </p>
                    <Textarea
                      id="pqrs-respuesta-texto"
                      value={respuesta}
                      onChange={(e) => {
                        setRespuesta(e.target.value)
                        setErrorRespuesta(null)
                      }}
                      rows={5}
                      maxLength={4000}
                      placeholder="Qué se revisó, qué se decidió y qué sigue."
                      data-testid="pqrs-respuesta-texto"
                    />
                  </div>
                  {detalle && !detalle.tienePortal && (
                    <div className="space-y-1.5">
                      <Label htmlFor="pqrs-respuesta-medio">¿Por dónde se la entregaste?</Label>
                      <select
                        id="pqrs-respuesta-medio"
                        value={medio}
                        onChange={(e) => {
                          setMedio(e.target.value)
                          setErrorRespuesta(null)
                        }}
                        className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-fg"
                        data-testid="pqrs-respuesta-medio"
                      >
                        <option value="">Elige el medio</option>
                        {MEDIOS_SIN_PORTAL.map((m) => (
                          <option key={m} value={m}>
                            {MEDIO_LABEL[m]}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {detalle?.historialDisponible === false && (
                    <p className="text-sm text-danger">
                      Todavía no se puede guardar la respuesta: falta una actualización de la base. Avísale a soporte.
                    </p>
                  )}
                  {errorRespuesta && (
                    <p className="text-sm text-danger" role="alert" data-testid="pqrs-respuesta-error">
                      {errorRespuesta}
                    </p>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" hideArrow onClick={() => setRespondiendo(false)} disabled={guardando}>
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      hideArrow
                      disabled={guardando || detalle?.historialDisponible === false}
                      onClick={() => {
                        const texto = respuesta.trim()
                        if (texto.length < 10) {
                          setErrorRespuesta('Escribe la respuesta (al menos 10 caracteres): qué se resolvió y cómo.')
                          return
                        }
                        if (detalle && !detalle.tienePortal && !medio) {
                          setErrorRespuesta('Elige por dónde le entregaste la respuesta.')
                          return
                        }
                        void actualizar(
                          {
                            estado: 'RESUELTA',
                            respuesta: texto,
                            ...(detalle && !detalle.tienePortal
                              ? { medioRespuesta: medio as (typeof MEDIOS_SIN_PORTAL)[number] }
                              : {}),
                          },
                          'Respuesta registrada: la solicitud quedó resuelta',
                        )
                      }}
                      data-testid="pqrs-responder-enviar"
                    >
                      Responder y resolver
                    </Button>
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="pqrs-asignar">Responsable</Label>
                <Combobox
                  data-testid="pqrs-asignar"
                  options={opcionesAgente}
                  value={pqrs.asignadoAUserId ?? undefined}
                  onChange={(v) => {
                    if (v === (pqrs.asignadoAUserId ?? undefined)) return
                    // 🔴 Sólo se REASIGNA, nunca se desasigna: una PQRS no puede
                    // quedar sin responsable (Nico, 2026-09-15). El back tiene la
                    // misma regla y responde 400 si igual le llega un `null`.
                    if (!v) return
                    const nombre = opcionesAgente.find((o) => o.value === v)?.label
                    void actualizar({ asignadoAUserId: v }, nombre ? `Responde ${nombre}` : 'Reasignada')
                  }}
                  placeholder={opcionesAgente.length ? 'Elegir un responsable' : 'Nadie del equipo puede responder PQRS'}
                  searchPlaceholder="Nombre"
                  disabled={guardando || opcionesAgente.length === 0 || pqrs.estado === 'CERRADA'}
                  contentClassName="z-[400]"
                />
                <p className="text-caption text-fg-muted">
                  Puede responderla cualquier persona del equipo con acceso a Solicitudes. ¿No aparece alguien? Dale
                  el permiso de Operaciones en Configuración → Equipo.
                </p>
              </div>
            </section>

            {detalle && detalle.historial.length > 0 && (
              <section className="space-y-3 border-t border-border pt-5" data-testid="pqrs-historial">
                <h4 className="text-sm font-medium text-fg">Historial</h4>
                <ol className="space-y-3">
                  {detalle.historial.map((e) => (
                    <li key={e.id} className="flex gap-3 text-sm">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-fg-subtle" aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="text-fg">
                          {EVENTO_LABEL[e.tipo] ?? e.tipo}
                          {(e.tipo === 'ASIGNADA' || e.tipo === 'REASIGNADA' || e.tipo === 'ESCALADA') && e.aNombre
                            ? ` a ${e.aNombre}`
                            : ''}
                          {e.tipo === 'ADJUNTO' && e.texto ? `: ${e.texto}` : ''}
                          {e.tipo === 'RESPUESTA' && e.medio ? ` (${MEDIO_LABEL[e.medio].toLowerCase()})` : ''}
                        </p>
                        <p className="text-caption text-fg-muted">
                          {formatDate(e.at, { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          {e.actorNombre ? ` · ${e.actorNombre}` : ''}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </CajonCuerpo>
        </>
      )}
    </Cajon>
  )
}
