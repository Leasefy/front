'use client'

/**
 * ReclamosClient — el canal del candidato rechazado (F-07).
 *
 * «Al rechazado se le da un motivo general y un canal para pedir detalle o
 * corregir datos; NUNCA el puntaje ni datos de centrales.»
 *
 * ── 🔴 Lo que esta pantalla impide ─────────────────────────────────────────
 *
 * Que la respuesta lleve el puntaje. El back tiene el colador y devuelve 400
 * con lo que encontró; acá ese 400 se muestra **al lado del campo, antes de
 * mandar nada**, y con las palabras que delató. No se «limpia» el texto: quien
 * escribe tiene que enterarse de que ese camino no existe.
 *
 * Y el recordatorio de qué SÍ se puede decir estaba escondido DENTRO del campo
 * de respuesta, o sea que sólo lo leía quien ya había decidido responder. Ahora
 * está arriba, siempre visible: la mitad de las veces el puntaje se filtra por
 * no saber qué poner en su lugar, y eso hay que saberlo antes de escribir.
 *
 * ── 🔴 Lo que faltaba (18-09-2026, de noche) ───────────────────────────────
 *
 * `tomarReclamo` existía en el back y **no tenía un solo consumidor**. Sin eso,
 * dos personas de la misma inmobiliaria pueden responderle al mismo candidato
 * sin saber la una de la otra — y el estado `EN_REVISION` no lo alcanzaba nadie
 * nunca. Tomar un reclamo es lo que lo pone a tu nombre.
 */

import { useMemo, useState } from 'react'
import { ChatCircleDots, Eye, ShieldWarning, Clock } from '@phosphor-icons/react'

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { EsqueletoTabla } from '@/components/estado/EsqueletoTabla'
import { toast } from '@/components/ui/toast'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Textarea,
} from '@/components/ui'
import { ApiError } from '@/lib/api/client'
import { postulacionesApi, type ReclamoDelEstudio } from '@/lib/api/crm.service'
import { invalidar } from '@/lib/api/refresco-de-datos'
import { usePermissions } from '@/lib/hooks/usePermissions'
import { useCrm } from '@/lib/hooks/use-crm'
import { cn } from '@/lib/utils'

type Estado = ReclamoDelEstudio['estado']

const ROTULO: Record<
  Estado,
  { texto: string; variant: 'default' | 'secondary' | 'outline' }
> = {
  ABIERTO: { texto: 'Sin responder', variant: 'default' },
  EN_REVISION: { texto: 'La estás viendo tú', variant: 'outline' },
  RESUELTO: { texto: 'Respondido', variant: 'secondary' },
}

/** Lo que se puede decir, y lo que no. Va arriba, no dentro del formulario. */
const SE_PUEDE = [
  'Qué documento volver a mandar, y cómo',
  'Que se presente con codeudor o con una póliza',
  'Que puede volver a intentarlo, y desde cuándo',
]
const NO_SE_PUEDE = [
  'Su puntaje, ni en número ni en palabras («bajo», «malo»)',
  'Lo que dicen las centrales de riesgo sobre él',
  'El nombre de la aseguradora que no lo aprobó',
]

function fecha(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })
}

export function ReclamosClient() {
  const { canAccess } = usePermissions()
  const puedeResponder = canAccess('pipeline', 'edit')

  const datos = useCrm(() => postulacionesApi.reclamos(), [], ['postulaciones'])
  const [filtro, setFiltro] = useState<Estado | null>(null)
  const [abierto, setAbierto] = useState<string | null>(null)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [tomando, setTomando] = useState<string | null>(null)
  const [fuga, setFuga] = useState<string | null>(null)

  const reclamos = datos.datos?.reclamos ?? []

  const cuenta = useMemo(() => {
    const c: Record<Estado, number> = { ABIERTO: 0, EN_REVISION: 0, RESUELTO: 0 }
    for (const r of reclamos) c[r.estado] += 1
    return c
  }, [reclamos])

  /** Sin responder primero: es lo que alguien vino a hacer acá. */
  const visibles = useMemo(() => {
    const base = filtro ? reclamos.filter((r) => r.estado === filtro) : reclamos
    const peso: Record<Estado, number> = { ABIERTO: 0, EN_REVISION: 1, RESUELTO: 2 }
    return [...base].sort((a, b) => peso[a.estado] - peso[b.estado])
  }, [reclamos, filtro])

  const sinResponder = cuenta.ABIERTO + cuenta.EN_REVISION

  async function tomar(id: string) {
    setTomando(id)
    try {
      await postulacionesApi.tomarReclamo(id)
      toast.success('Queda a tu nombre: el resto del equipo ve que lo tienes tú.')
      invalidar('postulaciones')
    } catch (e) {
      toast.error(
        e instanceof ApiError && e.message ? e.message : 'No se pudo tomar el reclamo',
      )
    } finally {
      setTomando(null)
    }
  }

  async function responder(id: string) {
    setEnviando(true)
    setFuga(null)
    try {
      await postulacionesApi.responderReclamo(id, texto)
      toast.success('Respuesta enviada al candidato.')
      setAbierto(null)
      setTexto('')
      invalidar('postulaciones')
    } catch (e) {
      // 🔴 El 400 del colador: se muestra tal cual, con lo que encontró.
      if (e instanceof ApiError && e.status === 400) {
        setFuga(e.messages?.[0] ?? e.message)
      } else {
        setFuga('No se pudo responder. Vuelve a intentar.')
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="max-w-2xl space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Reclamos de candidatos
        </h1>
        <p className="text-sm text-fg-muted">
          A quien no pasó el estudio se le da el motivo general y este canal.
          Acá llega lo que escribe —pidiendo detalle o avisando que un dato está
          mal— y acá se le responde.
        </p>
      </header>

      {/* ── La regla, antes de escribir y no dentro del formulario ───────── */}
      <section
        className="grid gap-4 rounded-lg border border-border bg-surface p-5 sm:grid-cols-2"
        data-testid="que-se-puede-decir"
      >
        <div>
          <h2 className="mb-2 text-sm font-medium text-fg">Lo que sí puedes decirle</h2>
          <ul className="space-y-1 text-sm text-fg-muted">
            {SE_PUEDE.map((t) => (
              <li key={t} className="flex gap-2">
                <span aria-hidden="true" className="text-fg-subtle">
                  ·
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-fg">
            <ShieldWarning weight="duotone" className="h-4 w-4 text-warning" aria-hidden="true" />
            Lo que la ley no te deja decir
          </h2>
          <ul className="space-y-1 text-sm text-fg-muted">
            {NO_SE_PUEDE.map((t) => (
              <li key={t} className="flex gap-2">
                <span aria-hidden="true" className="text-fg-subtle">
                  ·
                </span>
                {t}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-fg-subtle">
            Si se te escapa, la respuesta no sale: te decimos qué palabra la
            frenó antes de que el candidato la reciba.
          </p>
        </div>
      </section>

      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base">Los reclamos</CardTitle>
              <p className="text-sm text-fg-muted">
                {sinResponder > 0
                  ? `${sinResponder} ${sinResponder === 1 ? 'espera' : 'esperan'} respuesta.`
                  : 'Un renglón por reclamo, sin responder primero.'}
              </p>
            </div>
            {reclamos.length > 0 ? (
              <div className="flex flex-wrap gap-2" data-testid="filtro-estados">
                <Button
                  size="sm"
                  variant={filtro === null ? 'default' : 'outline'}
                  onClick={() => setFiltro(null)}
                >
                  Todos {reclamos.length}
                </Button>
                {(Object.keys(ROTULO) as Estado[]).map((e) =>
                  cuenta[e] > 0 ? (
                    <Button
                      key={e}
                      size="sm"
                      variant={filtro === e ? 'default' : 'outline'}
                      onClick={() => setFiltro(e)}
                      data-testid={`filtro-${e}`}
                    >
                      {ROTULO[e].texto} {cuenta[e]}
                    </Button>
                  ) : null,
                )}
              </div>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {datos.noHabilitado ? (
            <p className="text-sm text-fg-muted" data-testid="reclamos-no-habilitados">
              Próximamente: {datos.noHabilitado}
            </p>
          ) : (
            <EstadoDeDatos
              cargando={datos.cargando}
              error={datos.errorCrudo}
              vacio={reclamos.length === 0}
              queEs="los reclamos"
              onReintentar={datos.refetch}
              conservarContenido
              esqueleto={<EsqueletoTabla filas={4} columnas={3} />}
              cuandoVacio={
                <EmptyState
                  icon={ChatCircleDots}
                  title="Ningún reclamo todavía"
                  description="No hay nada que hacer acá hasta que alguien reclame. Al candidato que no pasa se le manda el motivo junto con este canal; cuando lo use, su mensaje aparece en esta lista."
                />
              }
            >
              <ul className="divide-y" data-testid="lista-de-reclamos">
                {visibles.map((r) => {
                  const rotulo = ROTULO[r.estado]
                  const pendiente = r.estado !== 'RESUELTO'
                  return (
                    <li
                      key={r.id}
                      className={cn(
                        '-mx-4 space-y-2 px-4 py-4',
                        r.estado === 'ABIERTO' && 'bg-warning/5',
                      )}
                      data-testid={`reclamo-${r.id}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium text-fg">
                          {r.solicitanteNombre}
                          <span className="ml-2 text-sm font-normal text-fg-muted">
                            {r.solicitanteCorreo}
                          </span>
                        </p>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline">
                            {r.tipo === 'DETALLE' ? 'Pide detalle' : 'Corrige un dato'}
                          </Badge>
                          <Badge variant={rotulo.variant}>{rotulo.texto}</Badge>
                        </div>
                      </div>

                      <p className="flex items-center gap-1.5 text-xs text-fg-subtle">
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        Escribió el {fecha(r.createdAt)}
                      </p>

                      <p className="text-sm text-fg">{r.mensaje}</p>

                      {r.respuesta ? (
                        <div className="border-l-2 border-border pl-3">
                          <p className="text-xs text-fg-subtle">
                            Le respondimos{r.respondidoEl ? ` el ${fecha(r.respondidoEl)}` : ''}
                          </p>
                          <p className="text-sm text-fg-muted">{r.respuesta}</p>
                        </div>
                      ) : puedeResponder ? (
                        abierto === r.id ? (
                          <div className="space-y-2">
                            <Textarea
                              value={texto}
                              onChange={(e) => setTexto(e.target.value)}
                              rows={3}
                              placeholder="La aseguradora no aprobó con las condiciones actuales. Puedes presentarte con un codeudor…"
                              data-testid={`respuesta-${r.id}`}
                            />
                            {fuga ? (
                              <p
                                className="text-sm text-destructive"
                                role="alert"
                                data-testid="fuga-detectada"
                              >
                                {fuga}
                              </p>
                            ) : null}
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                disabled={enviando || texto.trim().length < 5}
                                onClick={() => void responder(r.id)}
                                data-testid={`enviar-${r.id}`}
                              >
                                {enviando ? 'Enviando…' : 'Responder'}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setAbierto(null)
                                  setFuga(null)
                                }}
                              >
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setAbierto(r.id)
                                setTexto('')
                                setFuga(null)
                              }}
                              data-testid={`responder-${r.id}`}
                            >
                              Responder
                            </Button>
                            {/* 🔴 Tomarlo evita que dos personas de la misma
                                inmobiliaria le contesten al mismo candidato. */}
                            {r.estado === 'ABIERTO' ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={tomando === r.id}
                                onClick={() => void tomar(r.id)}
                                data-testid={`tomar-${r.id}`}
                              >
                                <Eye className="mr-1.5 h-4 w-4" />
                                {tomando === r.id ? 'Tomando…' : 'Lo veo yo'}
                              </Button>
                            ) : null}
                          </div>
                        )
                      ) : pendiente ? (
                        <p className="text-xs text-fg-subtle">
                          Sin responder. Quien tenga permiso en Pipeline puede
                          contestarle.
                        </p>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            </EstadoDeDatos>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
