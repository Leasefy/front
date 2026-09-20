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

import { useMemo, useState } from 'react'
import { toast } from '@/components/ui/toast'

import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'
import { Label } from '@/components/ui/label'
import { Combobox } from '@/components/ui/combobox'
import { Cajon, CajonCuerpo } from '@/components/ui/cajon'
import { SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { useAgentes } from '@/lib/hooks/useInmobiliaria'
import { useUltimoPresente } from '@/lib/hooks/use-ultimo-presente'
import { ApiError } from '@/lib/api/client'
import { pqrsApi } from '@/lib/api/pqrs-agencia.service'
import type { ActualizarPqrsInput, Pqrs, PqrsEstado } from '@/lib/api/pqrs-agencia.types'
import {
  ESTADO_BADGE,
  ESTADO_LABEL,
  SOLICITANTE_LABEL,
  TIPO_LABEL,
  estadosSiguientes,
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
  const { agentes } = useAgentes({ skip: !open })
  const [guardando, setGuardando] = useState(false)

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

  const siguientes = pqrs ? estadosSiguientes(pqrs.estado) : []
  const sla = pqrs ? textoSla(pqrs.slaVenceAt, pqrs.estado) : null
  const fecha = (iso: string) => formatDate(iso, { day: 'numeric', month: 'short', year: 'numeric' })

  async function actualizar(input: ActualizarPqrsInput, mensaje: string) {
    if (!pqrs || guardando) return
    setGuardando(true)
    try {
      const actualizado = await pqrsApi.actualizar(pqrs.id, input)
      toast.success(mensaje)
      onActualizado(actualizado)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return
      toast.error('No se pudo actualizar la solicitud', {
        description: err instanceof ApiError && err.message.length < 160 ? err.message : undefined,
      })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Cajon abierto={open} onOpenChange={onOpenChange} ancho="sm:max-w-xl">
      {pqrs && (
        <>
          {/* Cabecera fija: el radicado y el estado se quedan a la vista
              mientras el cuerpo hace scroll. La insignia va al lado del título,
              por eso no usa `CajonCabecera`. */}
          <div className="flex-none border-b border-border px-6 py-5 pr-14">
            <div className="flex items-center gap-2">
              <SheetTitle className="text-lg font-semibold text-fg">{pqrs.radicado}</SheetTitle>
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2 py-0.5 text-caption font-medium',
                  ESTADO_BADGE[pqrs.estado],
                )}
                data-testid="pqrs-estado-badge"
              >
                {ESTADO_LABEL[pqrs.estado]}
              </span>
            </div>
            <SheetDescription className="mt-0.5 text-sm text-fg-muted">
              {TIPO_LABEL[pqrs.tipo]} · radicada el {fecha(pqrs.createdAt)}
            </SheetDescription>
          </div>

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
                {pqrs.inmuebleLabel ?? <span className="text-fg-subtle">Sin inmueble</span>}
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
              <Dato etiqueta="SLA">
                {sla && (
                  <span className={cn('tabular-nums', sla.vencido && 'text-danger font-medium')} data-testid="pqrs-sla">
                    {sla.texto}
                  </span>
                )}
                <span className="block text-fg-muted">vence el {fecha(pqrs.slaVenceAt)}</span>
              </Dato>
              {pqrs.resueltaAt && <Dato etiqueta="Resuelta el">{fecha(pqrs.resueltaAt)}</Dato>}
              {pqrs.cerradaAt && <Dato etiqueta="Cerrada el">{fecha(pqrs.cerradaAt)}</Dato>}
            </dl>

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
                      if (v) void actualizar({ estado: v as PqrsEstado }, `Movida a ${ESTADO_LABEL[v as PqrsEstado]}`)
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
                  placeholder={opcionesAgente.length ? 'Elegir un responsable' : 'Sin agentes activos'}
                  searchPlaceholder="Nombre del agente"
                  disabled={guardando || opcionesAgente.length === 0 || pqrs.estado === 'CERRADA'}
                  contentClassName="z-[400]"
                />
              </div>
            </section>
          </CajonCuerpo>
        </>
      )}
    </Cajon>
  )
}
