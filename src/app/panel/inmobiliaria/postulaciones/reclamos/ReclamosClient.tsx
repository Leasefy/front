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
 * Y el recordatorio de qué SÍ se puede decir: estuvo arriba, siempre abierto;
 * por decisión de Nico (23-10) va PLEGADO junto a la caja de respuesta, que es
 * donde se escribe («Qué sí y qué no decirle»).
 *
 * ── 🔴 Lo que faltaba (18-09-2026, de noche) ───────────────────────────────
 *
 * `tomarReclamo` existía en el back y **no tenía un solo consumidor**. Sin eso,
 * dos personas de la misma inmobiliaria pueden responderle al mismo candidato
 * sin saber la una de la otra — y el estado `EN_REVISION` no lo alcanzaba nadie
 * nunca. Tomar un reclamo es lo que lo pone a tu nombre.
 */

import { useMemo, useState } from 'react'
import { motivoEnCristiano } from '@/lib/errores/en-cristiano'
import { ChatCircleDots, Eye, ShieldWarning, Clock } from '@phosphor-icons/react'

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { CifraHeroe } from '@/components/pantalla/CifraHeroe'
import { MasDetalles } from '@/components/pantalla/MasDetalles'
import { PestanasDeEstado } from '@/components/pantalla/PestanasDeEstado'
import { diaEnColombia, fechaCorta } from '@/lib/fechas/fecha-de-la-casa'
import { CrossFade, Stagger, StaggerItem } from '@leasefy/cadence'
import { EsqueletoTabla } from '@/components/estado/EsqueletoTabla'
import { toast } from '@/components/ui/toast'
import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  Textarea,
} from '@/components/ui'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario'
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo'

/** El tope de la respuesta: `ResponderReclamoDto.respuesta`, `@MaxLength(4000)`. */
const MAX_LARGO_DE_LA_RESPUESTA = 4000
import { postulacionesApi, type ReclamoDelEstudio } from '@/lib/api/crm.service'
import { invalidar } from '@/lib/api/refresco-de-datos'
import { usePermissions } from '@/lib/hooks/usePermissions'
import { useCrm } from '@/lib/hooks/use-crm'
import { cn } from '@/lib/utils'

type Estado = ReclamoDelEstudio['estado']

const ROTULO: Record<
  Estado,
  { texto: string; variant: 'warning' | 'secondary' | 'outline' }
> = {
  ABIERTO: { texto: 'Sin responder', variant: 'warning' },
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
  // «17 oct 2026» (la fecha de la casa), en hora de Colombia.
  return fechaCorta(diaEnColombia(iso))
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
      // Por el traductor (02-10-2026): un 5xx es nuestro, con la referencia;
      // «conexión» sólo sin respuesta.
      toast.error(
        mensajeParaLaPersona(e, {
          porDefecto: 'No se pudo tomar el reclamo',
          accion: 'tomar el reclamo',
        }),
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
      // 🔴 El 400 del colador se muestra tal cual, con lo que encontró, debajo
      // del campo. Lo demás pasa por el traductor (02-10-2026): antes todo lo
      // que no era 400 decía «Vuelve a intentar», también un 5xx.
      const reparto = repartirErroresDelServidor(e, {
        campos: ['respuesta'],
        porDefecto: 'No se pudo responder. Prueba de nuevo en un momento.',
        accion: 'responder el reclamo',
      })
      setFuga(reparto.porCampo.respuesta ?? reparto.sueltos.join(' · '))
      document.getElementById(`respuesta-${id}`)?.focus()
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <EncabezadoDePantalla
        seccion="Captación y arriendo"
        titulo="Reclamos de candidatos"
        descripcion="Lo que escribe quien no pasó el estudio —pidiendo detalle o avisando que un dato está mal— y su respuesta."
      />

      {/* Glow up 22-10 (la vara de Deuda del mes): LA RESPUESTA en una cifra —cuántos esperan
          respuesta— con la barra de los tres estados. Antes lo mismo se decía tres veces: la
          pastilla junto al título, la línea de la tarjeta y los botones de filtro. */}
      {reclamos.length > 0 && !datos.noHabilitado ? (
        <section className="rounded-lg border border-border bg-card px-5 py-5" data-testid="sin-responder">
          <CifraHeroe
            rotulo="Esperan respuesta"
            cifra={String(sinResponder)}
            contexto={reclamos.length === 1 ? 'de 1 reclamo' : `de ${reclamos.length} reclamos`}
            tramos={[
              { clave: 'ABIERTO', etiqueta: ROTULO.ABIERTO.texto, monto: cuenta.ABIERTO, tono: 'aviso', cifra: String(cuenta.ABIERTO) },
              { clave: 'EN_REVISION', etiqueta: ROTULO.EN_REVISION.texto, monto: cuenta.EN_REVISION, tono: 'neutro', cifra: String(cuenta.EN_REVISION) },
              { clave: 'RESUELTO', etiqueta: 'Respondidos', monto: cuenta.RESUELTO, tono: 'exito', cifra: String(cuenta.RESUELTO) },
            ]}
          />
        </section>
      ) : null}


      <Card className="overflow-hidden p-0">
        {/* Las pestañas de estado con su conteo, DENTRO de la tarjeta; sin responder, primero. */}
        {reclamos.length > 0 ? (
          <div className="border-b border-border px-4 py-2.5">
            <PestanasDeEstado<Estado | 'TODOS'>
              etiqueta="Estado de los reclamos"
              valor={filtro ?? 'TODOS'}
              onCambio={(v) => setFiltro(v === 'TODOS' ? null : v)}
              data-testid="filtro-estados"
              pestanas={[
                { valor: 'TODOS', etiqueta: 'Todos', cuantos: reclamos.length, fija: true },
                { valor: 'ABIERTO', etiqueta: ROTULO.ABIERTO.texto, cuantos: cuenta.ABIERTO, tono: 'aviso', testid: 'filtro-ABIERTO' },
                { valor: 'EN_REVISION', etiqueta: ROTULO.EN_REVISION.texto, cuantos: cuenta.EN_REVISION, testid: 'filtro-EN_REVISION' },
                { valor: 'RESUELTO', etiqueta: 'Respondidos', cuantos: cuenta.RESUELTO, testid: 'filtro-RESUELTO' },
              ]}
            />
          </div>
        ) : null}
        <CardContent className="p-4">
          {datos.noHabilitado ? (
            <p className="text-sm text-fg-muted" data-testid="reclamos-no-habilitados">
              {motivoEnCristiano(datos.noHabilitado)}
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
                  description="No hay nada que hacer aquí hasta que alguien reclame. Al candidato que no pasa se le manda el motivo junto con este canal; cuando lo use, su mensaje aparece en esta lista."
                />
              }
            >
              {/* Filtrar por estado: los reclamos entran escalonados y los que
                  sobran salen; al abrir la respuesta, los de abajo se corren. */}
              <Stagger as="ul" className="divide-y" data-testid="lista-de-reclamos">
                {visibles.map((r) => {
                  const rotulo = ROTULO[r.estado]
                  const pendiente = r.estado !== 'RESUELTO'
                  return (
                    <StaggerItem
                      as="li"
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

                      <p className="flex items-center gap-1.5 text-caption text-fg-subtle">
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        Escribió el {fecha(r.createdAt)}
                      </p>

                      <p className="text-sm text-fg">{r.mensaje}</p>

                      {/* Responder abre el campo con un fundido (y lo cierra);
                          `popLayout`: lo nuevo está YA, lo viejo se va encima. */}
                      <CrossFade
                        mode="popLayout"
                        swapKey={
                          r.respuesta
                            ? 'respondido'
                            : puedeResponder
                              ? abierto === r.id
                                ? 'respondiendo'
                                : 'acciones'
                              : pendiente
                                ? 'pendiente'
                                : 'nada'
                        }
                      >
                      {r.respuesta ? (
                        <div className="border-l-2 border-border pl-3">
                          <p className="text-caption text-fg-subtle">
                            Le respondimos{r.respondidoEl ? ` el ${fecha(r.respondidoEl)}` : ''}
                          </p>
                          <p className="text-sm text-fg-muted">{r.respuesta}</p>
                        </div>
                      ) : puedeResponder ? (
                        abierto === r.id ? (
                          <div className="space-y-2">
                            <Textarea
                              id={`respuesta-${r.id}`}
                              value={texto}
                              onChange={(e) => setTexto(e.target.value)}
                              rows={3}
                              maxLength={MAX_LARGO_DE_LA_RESPUESTA}
                              placeholder="La aseguradora no aprobó con las condiciones actuales. Puedes presentarte con un codeudor…"
                              data-testid={`respuesta-${r.id}`}
                              aria-invalid={fuga ? true : undefined}
                              aria-describedby={fuga ? 'fuga-detectada' : undefined}
                            />
                            <ErrorDelCampo id="fuga-detectada" mensaje={fuga} className="mt-0 text-sm" />
                            <GuiaDeLaRespuesta />
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
                        <p className="text-caption text-fg-subtle">
                          Sin responder. Quien tenga permiso en Pipeline puede
                          contestarle.
                        </p>
                      ) : null}
                      </CrossFade>
                    </StaggerItem>
                  )
                })}
              </Stagger>
            </EstadoDeDatos>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * La guía de qué sí y qué no decirle (decisión de Nico, 23-10): PLEGADA junto
 * a la caja de respuesta, donde se escribe. Montada siempre (oculta al
 * plegar) para que el lector de pantalla y las pruebas la encuentren.
 */
function GuiaDeLaRespuesta() {
  return (
    <MasDetalles
      etiqueta="Qué sí y qué no decirle"
      etiquetaAbierto="Ocultar la guía"
      montadoSiempre
      classNameDelContenido="mt-2"
      data-testid="guia-de-la-respuesta"
    >
      <div className="grid gap-4 rounded-md bg-surface-muted p-4 sm:grid-cols-2" data-testid="que-se-puede-decir">
          <div>
            <h3 className="mb-2 text-sm font-medium text-fg">Lo que sí puedes decirle</h3>
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
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-fg">
              <ShieldWarning weight="duotone" className="h-4 w-4 text-warning" aria-hidden="true" />
              Lo que la ley no te deja decir
            </h3>
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
            <p className="mt-2 text-caption text-fg-subtle">
              Si se te escapa, la respuesta no sale: te decimos qué palabra la
              frenó antes de que el candidato la reciba.
            </p>
          </div>
      </div>
    </MasDetalles>
  )
}
