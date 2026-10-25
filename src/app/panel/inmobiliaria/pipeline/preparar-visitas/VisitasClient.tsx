'use client'

/**
 * VisitasClient — las visitas por atender, con lo que les falta.
 *
 * ── Qué contesta ───────────────────────────────────────────────────────────
 *
 *   · E-03: «NUNCA visitas sin asesor». La lista señala cuáles no tienen y deja
 *     asignarlo ahí mismo.
 *   · D-02: al inmueble ocupado hay que avisarle al inquilino 24 h antes; la
 *     fila dice hasta cuándo hay y deja dejar la constancia.
 *   · El recordatorio y el no-show, que existían en el front como etiqueta y no
 *     existían en el back.
 *
 * ── La decisión de presentación ────────────────────────────────────────────
 *
 * 🔴 Lo que FALTA va primero y con su plazo, no como una columna más. Una
 * visita sin asesor no es un dato: es alguien que mañana se va a parar en una
 * puerta y no va a llegar nadie. Por eso las filas con algo pendiente se
 * muestran arriba y el resto abajo.
 *
 * 🔴 Los recordatorios se PREVISUALIZAN antes de marcarlos: el botón dice
 * «marcar como enviados», no «enviar». Esta pantalla no manda nada — el envío
 * sale por los avisos de la inmobiliaria, que están apagados hasta que cada una
 * los prenda (y el 14-09 ya costó ~680 correos reales desde un back local).
 */

import { useNombresDelEquipo } from '@/components/dispersiones/lotes/use-nombres-del-equipo'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { agendaApi } from '@/lib/api/agenda.service'
import { motivoEnCristiano } from '@/lib/errores/en-cristiano'
import { CalendarCheck, Copy, UserPlus } from '@phosphor-icons/react'
import { useConsignaciones, usePipelineItems } from '@/lib/hooks/useInmobiliaria'
import { pipelineApi } from '@/lib/api/inmobiliaria.service'
import { AgendarVisitaDialog } from '@/components/inmobiliaria/AgendarVisitaDialog'
import { useTr } from '@/lib/i18n/use-tr'
import { paraHoy } from '@/lib/pipeline/para-hoy'
import { diaCortoDelEmbudo, esUnaVisita } from '@/lib/pipeline/proxima-accion'
import { hoyEnColombia } from '@/lib/fechas/fecha-de-la-casa'
import type { PipelineItem } from '@/lib/types/inmobiliaria'

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { Cifra, FranjaDeCifras, Stagger, StaggerItem } from '@leasefy/cadence'
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { ParaEntenderMas } from '@/components/ui/para-entender-mas'
import { EsqueletoTabla } from '@/components/estado/EsqueletoTabla'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui'
import { leadsApi, visitasApi } from '@/lib/api/crm.service'
import { invalidar } from '@/lib/api/refresco-de-datos'
import { usePermissions } from '@/lib/hooks/usePermissions'
import { useCrm } from '@/lib/hooks/use-crm'
import { toast } from '@/components/ui/toast'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'

/**
 * Cuando una acción de la fila falla (02-10-2026). Antes eran try/finally sin
 * `catch`: el botón dejaba de girar y nada decía que no se guardó (y la
 * promesa quedaba sin atrapar). Ahora pasa por el traductor: «conexión» sólo
 * sin respuesta; un 5xx es nuestro, con la referencia; un 4xx, lo que dijo el
 * back («la visita ya pasó», «ese asesor no es de la inmobiliaria»).
 */
function avisarQueNoSeGuardo(error: unknown, titulo: string, accion: string) {
  toast.error(titulo, {
    description: mensajeParaLaPersona(error, {
      porDefecto: 'No se guardó. Prueba de nuevo en un momento.',
      accion,
    }),
  })
}

/**
 * Revisora r22 (Preparar visitas #5): la visita no trae el id del interesado; se busca en Prospección por su
 * teléfono o su correo y el inmueble, para que el nombre abra su ficha. Sin coincidencia segura, no se enlaza.
 */
export function interesadoDeLaVisita(
  v: { telefono: string | null; correo: string | null; inmueble: { id: string } | null },
  items: readonly PipelineItem[],
): PipelineItem | null {
  const digitos = (t: string | null | undefined) => String(t ?? '').replace(/\D/g, '')
  const tel = digitos(v.telefono)
  const correo = (v.correo ?? '').trim().toLowerCase()
  if (!tel && !correo) return null
  const coinciden = items.filter(
    (i) =>
      (!v.inmueble || i.propertyId === v.inmueble.id) &&
      ((tel.length >= 7 && digitos(i.candidatePhone).endsWith(tel.slice(-10))) ||
        (correo !== '' && (i.candidateEmail ?? '').trim().toLowerCase() === correo)),
  )
  return coinciden.length === 1 ? coinciden[0]! : null
}

async function copiarElRecordatorio(texto: string) {
  try {
    await navigator.clipboard.writeText(texto)
    toast.success('Recordatorio copiado', { description: 'Pégalo en el WhatsApp o el correo de la persona.' })
  } catch {
    toast.error('No pudimos copiarlo', { description: 'Tu navegador no nos dejó usar el portapapeles.' })
  }
}

export function VisitasClient() {
  const { canAccess } = usePermissions()
  const puedeEditar = canAccess('pipeline', 'edit')

  const porAtender = useCrm(() => visitasApi.porAtender(), [], ['visitas'])
  const recordatorios = useCrm(
    () => visitasApi.recordatorios(false),
    [],
    ['visitas'],
  )
  const asesores = useCrm(() => leadsApi.asesores(), [], [])
  const { nombreDe } = useNombresDelEquipo()
  /** Sin nombre conocido, «Asesor sin nombre»: el «Usuario 1a2b3c4d» del respaldo es un id interno. */
  const nombreDelAsesor = (userId: string) => {
    const nombre = nombreDe(userId)
    return nombre.startsWith('Usuario ') ? 'Asesor sin nombre' : nombre
  }

  // Revisora r22 (#1): las visitas vencidas sin cerrar (las que Prospección pone en «Para hoy»): lo primero
  // que hay que preparar es reagendarlas o marcar si llegó.
  const { pipelineItems, refetch: releerElTablero } = usePipelineItems()
  const itemsDelTablero = pipelineItems ?? []
  const tr = useTr()
  /*
   * Revisora r24 (Preparar visitas #1): la vencida se cierra AQUÍ, con lo mismo que hace Prospección —«Sí llegó»
   * la pasa a «Visita hecha» (`pipelineApi.moveStage`, como el cajón) y «Reagendar» abre el MISMO diálogo de
   * cita (`AgendarVisitaDialog`)—. Antes la frase mandaba a la persona a buscarla en otra pantalla.
   * «No llegó» no va: como en la Agenda, la vencida no sale de «Para hoy» con esa marca (pendiente de Nico).
   */
  const [agendandoA, setAgendandoA] = useState<PipelineItem | null>(null)
  const { consignaciones } = useConsignaciones(undefined, { skip: !agendandoA })
  async function marcarQueLlego(item: PipelineItem) {
    const antes = item.stage
    setTocando(item.id)
    try {
      await pipelineApi.moveStage(item.id, 'visit_done')
      releerElTablero()
      toast.success(tr('Visita hecha: {nombre}', { nombre: item.candidateName }), {
        description: tr('Pasó a «Visita hecha» en Prospección.'),
        action: {
          label: tr('Deshacer'),
          onClick: () => {
            void pipelineApi.moveStage(item.id, antes).then(
              () => releerElTablero(),
              (e) => avisarQueNoSeGuardo(e, 'No se deshizo', 'deshacer la marca'),
            )
          },
        },
      })
    } catch (e) {
      avisarQueNoSeGuardo(e, 'No se marcó la visita como hecha', 'marcar la visita como hecha')
    } finally {
      setTocando(null)
    }
  }
  const vencidas = useMemo(
    () => paraHoy(itemsDelTablero, hoyEnColombia()).filter((p) => p.porQue === 'vencida' && esUnaVisita(p.item.nextAction)),
    [itemsDelTablero],
  )

  const [tocando, setTocando] = useState<string | null>(null)
  const [marcando, setMarcando] = useState(false)

  /*
   * 🔴 PL-21 (04-10-2026): «Tus avisos no reciben visitas». Sin horario, el
   * aviso público decía «Sin disponibilidad… vuelve pronto» y nadie en el
   * panel se enteraba. Ahora se dice acá, con cuáles y cómo arreglarlo.
   */
  const [sinHorario, setSinHorario] = useState<Awaited<ReturnType<typeof agendaApi.avisosSinHorario>> | null>(null)
  useEffect(() => {
    let vivo = true
    Promise.resolve()
      .then(() => agendaApi.avisosSinHorario())
      .then((r) => vivo && setSinHorario(r ?? null))
      .catch(() => vivo && setSinHorario(null))
    return () => {
      vivo = false
    }
  }, [])

  const visitas = porAtender.datos?.visitas ?? []
  const pendientes = recordatorios.datos?.visitas ?? []
  const horas = porAtender.datos?.horasDeAvisoAlInquilino ?? 24
  const todoVacio =
    !porAtender.cargando && !recordatorios.cargando && !porAtender.errorCrudo && !recordatorios.errorCrudo &&
    visitas.length === 0 && pendientes.length === 0

  // 🔴 Lo que falta, primero.
  const ordenadas = useMemo(
    () =>
      [...visitas].sort((a, b) => {
        const faltaA = (a.faltaElAsesor ? 2 : 0) + (a.faltaElAvisoAlInquilino ? 1 : 0)
        const faltaB = (b.faltaElAsesor ? 2 : 0) + (b.faltaElAvisoAlInquilino ? 1 : 0)
        if (faltaA !== faltaB) return faltaB - faltaA
        return a.visitaEn.localeCompare(b.visitaEn)
      }),
    [visitas],
  )

  async function asignar(visitId: string, asesorUserId: string) {
    setTocando(visitId)
    try {
      await visitasApi.asignarAsesor(visitId, asesorUserId)
      invalidar('visitas')
    } catch (e) {
      avisarQueNoSeGuardo(e, 'No se asignó el asesor', 'asignar el asesor')
    } finally {
      setTocando(null)
    }
  }

  async function avisar(visitId: string) {
    setTocando(visitId)
    try {
      await visitasApi.avisoAlInquilino(visitId, 'WHATSAPP')
      invalidar('visitas')
    } catch (e) {
      avisarQueNoSeGuardo(e, 'No se guardó el aviso al inquilino', 'guardar el aviso al inquilino')
    } finally {
      setTocando(null)
    }
  }

  async function noShow(visitId: string, ya: boolean) {
    setTocando(visitId)
    try {
      if (ya) await visitasApi.quitarNoShow(visitId)
      else await visitasApi.marcarNoShow(visitId)
      invalidar('visitas')
    } catch (e) {
      avisarQueNoSeGuardo(
        e,
        ya ? 'No se quitó la marca de «no llegó»' : 'No se marcó que no llegó',
        ya ? 'quitar la marca de «no llegó»' : 'marcar que no llegó',
      )
    } finally {
      setTocando(null)
    }
  }

  async function marcarRecordatorios() {
    setMarcando(true)
    try {
      await visitasApi.recordatorios(true)
      invalidar('visitas')
    } catch (e) {
      avisarQueNoSeGuardo(e, 'No se marcaron los recordatorios', 'marcar los recordatorios')
    } finally {
      setMarcando(false)
    }
  }

  // GLOW UP (21-10-2026): arriba, cuántas visitas tienen algo por resolver y de
  // qué tipo; abajo, la lista de trabajo y los recordatorios. Las reglas (sin
  // asesor no se confirma, el aviso al inquilino, «esta pantalla no envía») van
  // en «¿Cómo funciona?».
  const sinAsesor = ordenadas.filter((v) => v.faltaElAsesor).length
  const sinAviso = ordenadas.filter((v) => v.faltaElAvisoAlInquilino).length
  return (
    <div className="space-y-6 p-6 lg:p-8">
      {/*
        🔴 Se llamaba «Visitas», y Nico preguntó lo obvio el 21-09: «¿para qué
        existe esta sección si existe la de Agenda?». La Agenda YA muestra las
        visitas —tiene su ficha, su fila y los botones de confirmar, rechazar y
        cancelar—, así que dos entradas del menú llamadas casi igual prometían
        lo mismo dos veces.

        No son lo mismo, y la diferencia es la que ahora dice el nombre:

          · **Agenda** es el calendario: CUÁNDO pasa cada cosa —visitas, firmas,
            vencimientos, inspecciones— y ahí se confirma o se cancela.
          · **Preparar visitas** es la lista de trabajo: QUÉ LE FALTA a cada
            visita para poder hacerse. Una sin asesor no es un dato de agenda,
            es alguien que mañana se para en una puerta y no llega nadie; y al
            inmueble ocupado hay que avisarle al inquilino con horas de
            anticipación o la visita no se puede hacer.

        Meter esta lista dentro de la Agenda sería empeorar las dos: un
        calendario no es el sitio donde se persigue lo que falta.
      */}
      <EncabezadoDePantalla
        seccion="Captación y arriendo"
        titulo={tr('Preparar visitas')}
        descripcion={tr('Lo que le falta a cada visita para poder hacerse. El calendario completo está en Agenda.')}
        acciones={
          <Button size="sm" variant="outline" asChild>
            <Link href="/panel/inmobiliaria/agenda">{tr('Ver la agenda')}</Link>
          </Button>
        }
        ayuda={
          <ParaEntenderMas etiqueta="¿Cómo funciona?" titulo="Cómo funciona: preparar visitas" variante="secundario">
            <div className="space-y-3 text-body-sm text-fg-muted">
              <p>Ninguna visita se confirma sin asesor: asígnale uno desde su fila.</p>
              <p>
                Si el inmueble está ocupado, al inquilino se le avisa {horas} horas antes; cuando le avises, márcalo con
                «Ya le avisé».
              </p>
              <p>
                Los recordatorios aparecen 24 horas antes de cada visita confirmada. Esta pantalla no los envía: arma
                el texto y deja la constancia.
              </p>
              <p>Agenda es el calendario (cuándo pasa cada cosa); esta pantalla es la lista de lo que falta.</p>
            </div>
          </ParaEntenderMas>
        }
      />

      {!porAtender.noHabilitado && !porAtender.cargando && !porAtender.errorCrudo && ordenadas.length > 0 ? (
        <FranjaDeCifras fila="md" aria-label="Lo que falta en las visitas" data-testid="franja-visitas">
          <Cifra etiqueta="Próximas" valor={ordenadas.length} detalle="Visitas por atender" data-testid="cifra-proximas" />
          <Cifra
            etiqueta="Sin asesor"
            valor={sinAsesor}
            detalle={sinAsesor > 0 ? 'No se pueden confirmar' : 'Todas tienen asesor'}
            tono={sinAsesor > 0 ? 'peligro' : 'exito'}
            data-testid="cifra-sin-asesor"
          />
          <Cifra
            etiqueta="Avisar al inquilino"
            valor={sinAviso}
            detalle={sinAviso > 0 ? 'Inmuebles ocupados' : 'Nada pendiente'}
            tono={sinAviso > 0 ? 'aviso' : undefined}
            data-testid="cifra-sin-aviso"
          />
          <Cifra
            etiqueta="Recordatorios"
            valor={pendientes.length}
            detalle={pendientes.length > 0 ? 'Por mandar' : 'Ninguno pendiente'}
            tono={pendientes.length > 0 ? 'aviso' : undefined}
            data-testid="cifra-recordatorios"
          />
        </FranjaDeCifras>
      ) : null}

      {sinHorario && sinHorario.sinHorario > 0 && (
        <div
          role="status"
          className="rounded-lg border border-warning/40 bg-warning-soft p-4"
          data-testid="avisos-sin-horario"
        >
          <p className="font-medium text-fg">
            {sinHorario.sinHorario === sinHorario.publicados
              ? 'Tus avisos no reciben visitas'
              : `${sinHorario.sinHorario} de tus ${sinHorario.publicados} avisos no reciben visitas`}
          </p>
          <p className="mt-1 text-sm text-fg-muted">
            Ni el inmueble ni su asesor tienen horario de visitas, así que el aviso no ofrece turnos: quien
            quiere visitar sólo puede dejar su nombre y su teléfono para que lo llamen. Pon el horario del
            asesor (en su perfil) o el del inmueble (en su ficha, «Visitas»).
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {sinHorario.inmuebles.slice(0, 8).map((i) => (
              <li key={i.id}>
                <Link
                  href={`/panel/inmobiliaria/inmuebles/${i.id}`}
                  className="inline-flex rounded-full border border-border bg-card px-2.5 py-1 text-caption text-fg hover:border-primary/40"
                >
                  {i.codigo != null ? `#${i.codigo} · ` : ''}
                  {i.titulo}
                </Link>
              </li>
            ))}
            {sinHorario.inmuebles.length > 8 && (
              <li className="px-1 py-1 text-caption text-fg-muted">y {sinHorario.sinHorario - 8} más</li>
            )}
          </ul>
        </div>
      )}

      {vencidas.length > 0 ? (
        <section className="rounded-lg border border-border bg-surface" data-testid="visitas-vencidas">
          <header className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-4">
            <h2 className="text-[15px] font-medium text-fg">
              {vencidas.length === 1 ? tr('1 visita vencida sin cerrar') : tr('{n} visitas vencidas sin cerrar', { n: vencidas.length })}
            </h2>
          </header>
          <ul className="mt-2 divide-y divide-border-faint">
            {vencidas.map(({ item, dia }) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-fg">{item.candidateName}</p>
                  <p className="truncate text-body-sm text-fg-muted">
                    {item.propertyTitle || item.propertyAddress}
                    {dia ? <span className="font-mono"> · {diaCortoDelEmbudo(dia)}</span> : null}
                  </p>
                </div>
                {/* A 390 las acciones bajan al pie de la tarjeta (w-full); «Ver ficha» queda como enlace callado. */}
                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                  {puedeEditar && item.stage === 'visit_scheduled' ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={tocando === item.id}
                      onClick={() => void marcarQueLlego(item)}
                      data-testid={`vencida-llego-${item.id}`}
                    >
                      {tr('Sí llegó')}
                    </Button>
                  ) : null}
                  {puedeEditar ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={tocando === item.id}
                      onClick={() => setAgendandoA(item)}
                      data-testid={`vencida-reagendar-${item.id}`}
                    >
                      {tr('Reagendar')}
                    </Button>
                  ) : null}
                  <Link
                    href={`/panel/inmobiliaria/pipeline?lead=${encodeURIComponent(item.id)}`}
                    className="ml-auto text-body-sm text-fg-muted underline-offset-4 hover:text-fg hover:underline sm:ml-2"
                    data-testid={`vencida-${item.id}`}
                  >
                    {tr('Ver ficha')}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Ronda 22: con las dos listas vacías, UN vacío con su acción (eran dos tarjetas iguales de ~320 px). */}
      {todoVacio ? (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border bg-surface px-5 py-4 text-body-sm text-fg-muted" data-testid="nada-por-preparar">
          {vencidas.length > 0
            ? tr('Fuera de las vencidas, no hay visitas en los próximos 7 días ni recordatorios por mandar.')
            : tr('Nada por preparar: no hay visitas en los próximos 7 días ni recordatorios por mandar.')}
          {/* Revisora r23 (Preparar visitas #2): el enlace dice a dónde lleva; agendar se hace desde la ficha del interesado. */}
          <Link href="/panel/inmobiliaria/pipeline" className="font-medium text-primary underline-offset-4 hover:underline">
            {tr('Ir a Prospección')}
          </Link>
        </p>
      ) : (
      <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Visitas por preparar</CardTitle>
        </CardHeader>
        <CardContent>
          {porAtender.noHabilitado ? (
            <p
              className="text-muted-foreground text-sm"
              data-testid="visitas-no-habilitadas"
            >
              {motivoEnCristiano(porAtender.noHabilitado)}
            </p>
          ) : (
            <EstadoDeDatos
              principal
              cargando={porAtender.cargando}
              error={porAtender.errorCrudo}
              vacio={ordenadas.length === 0}
              queEs="las visitas"
              onReintentar={porAtender.refetch}
              conservarContenido
              esqueleto={<EsqueletoTabla filas={4} columnas={4} />}
              cuandoVacio={
                <EmptyState
                  icon={CalendarCheck}
                  title="No hay visitas próximas"
                  description="Cuando un interesado pida una visita desde el aviso, aparece aquí para asignarle asesor."
                />
              }
            >
              {/* Asignar asesor o avisar: las visitas entran escalonadas y la que se resuelve sale. */}
              <Stagger as="ul" className="divide-y" data-testid="lista-de-visitas">
                {ordenadas.map((v) => (
                  <StaggerItem as="li"
                    key={v.visitId}
                    className="space-y-2 py-3"
                    data-testid={`visita-${v.visitId}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <p className="font-medium">
                          {(() => {
                            const delTablero = interesadoDeLaVisita(v, itemsDelTablero)
                            return delTablero ? (
                              <Link
                                href={`/panel/inmobiliaria/pipeline?lead=${encodeURIComponent(delTablero.id)}`}
                                className="underline-offset-4 hover:underline"
                                data-testid={`abrir-interesado-${v.visitId}`}
                              >
                                {v.quien ?? 'Interesado'}
                              </Link>
                            ) : (
                              v.quien ?? 'Interesado'
                            )
                          })()}
                          <span className="text-muted-foreground ml-2 text-sm font-normal">
                            {v.comoSeLee}
                          </span>
                        </p>
                        <p className="text-muted-foreground text-sm">
                          {v.inmueble?.title}
                          {v.inmueble?.neighborhood
                            ? ` · ${v.inmueble.neighborhood}`
                            : ''}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {v.noShow ? (
                          <Badge variant="destructive">No asistió</Badge>
                        ) : null}
                        {v.ocupado ? (
                          <Badge variant="outline">Ocupado</Badge>
                        ) : null}
                      </div>
                    </div>

                    {/* 🔴 E-03: sin asesor no se confirma. */}
                    {v.faltaElAsesor ? (
                      <div
                        className="flex flex-wrap items-center gap-2"
                        data-testid={`falta-asesor-${v.visitId}`}
                      >
                        <span className="text-destructive text-sm">
                          Sin asesor: no se puede confirmar.
                        </span>
                        {puedeEditar && (asesores.datos?.length ?? 0) > 0 ? (
                          <Select
                            value=""
                            onValueChange={(u) => void asignar(v.visitId, u)}
                          >
                            <SelectTrigger className="w-56">
                              <span className="truncate">
                                <UserPlus className="mr-1.5 inline h-4 w-4" />
                                Asignar asesor
                              </span>
                            </SelectTrigger>
                            <SelectContent>
                              {(asesores.datos ?? []).map((a) => (
                                <SelectItem key={a.userId} value={a.userId}>
                                  {/* El nombre de la persona, nunca un pedazo de su id interno (glow up 22-10). */}
                                  {nombreDelAsesor(a.userId)} · {a.leadsActivos} {a.leadsActivos === 1 ? 'interesado' : 'interesados'}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : null}
                      </div>
                    ) : null}

                    {/* 🔴 D-02: hay alguien viviendo adentro. */}
                    {v.faltaElAvisoAlInquilino ? (
                      <div
                        className="flex flex-wrap items-center gap-2"
                        data-testid={`falta-aviso-${v.visitId}`}
                      >
                        <span className="text-sm">
                          {v.faltaElAvisoAlInquilino.message}
                        </span>
                        {puedeEditar ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={tocando === v.visitId}
                            onClick={() => void avisar(v.visitId)}
                          >
                            Ya le avisé
                          </Button>
                        ) : null}
                      </div>
                    ) : null}

                    {/* Ronda 22: «No llegó» sólo cuando la visita ya pasó (o para quitarlo si se marcó). */}
                    {puedeEditar && (v.noShow || new Date(v.visitaEn).getTime() < Date.now()) ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={tocando === v.visitId}
                        onClick={() => void noShow(v.visitId, v.noShow)}
                        data-testid={`no-show-${v.visitId}`}
                      >
                        {v.noShow ? 'Sí llegó (deshacer)' : 'No llegó'}
                      </Button>
                    ) : null}
                  </StaggerItem>
                ))}
              </Stagger>
            </EstadoDeDatos>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recordatorios por mandar</CardTitle>
          {puedeEditar && pendientes.length > 0 ? (
            <Button
              size="sm"
              variant="outline"
              onClick={marcarRecordatorios}
              disabled={marcando}
              data-testid="marcar-recordatorios"
            >
              {marcando ? 'Guardando…' : 'Marcar como enviados'}
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {recordatorios.noHabilitado ? (
            <p
              className="text-muted-foreground text-sm"
              data-testid="recordatorios-no-habilitados"
            >
              {motivoEnCristiano(recordatorios.noHabilitado)}
            </p>
          ) : (
            <EstadoDeDatos
              cargando={recordatorios.cargando}
              error={recordatorios.errorCrudo}
              vacio={pendientes.length === 0}
              queEs="los recordatorios"
              onReintentar={recordatorios.refetch}
              conservarContenido
              esqueleto={<EsqueletoTabla filas={3} columnas={2} />}
              cuandoVacio={
                <EmptyState
                  icon={CalendarCheck}
                  title="Ningún recordatorio pendiente"
                  description="Aparecen 24 horas antes de cada visita confirmada."
                />
              }
            >
              <p className="text-muted-foreground mb-3 text-sm">
                Esta pantalla no envía: arma el texto y deja la constancia. El
                envío sale por los avisos de la inmobiliaria; si lo mandas tú, cada uno trae «Copiar».
              </p>
              {/* Los recordatorios entran escalonados; el que se marca, sale. */}
              <Stagger as="ul" className="divide-y" data-testid="lista-recordatorios">
                {pendientes.map((r) => (
                  <StaggerItem as="li" key={r.visitId} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 py-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-sm">{r.mensaje}</p>
                      <p className="text-muted-foreground text-caption">
                        {r.correo ?? r.telefono ?? 'sin correo ni teléfono'}
                      </p>
                    </div>
                    {/* Revisora r22 (#4): «Copiar» en cada recordatorio, como «Copiar el mensaje» de Qué ofrecer. */}
                    <Button
                      size="sm"
                      variant="ghost"
                      hideArrow
                      onClick={() => void copiarElRecordatorio(r.mensaje)}
                      data-testid={`copiar-recordatorio-${r.visitId}`}
                    >
                      <Copy className="h-4 w-4" />
                      Copiar
                    </Button>
                  </StaggerItem>
                ))}
              </Stagger>
            </EstadoDeDatos>
          )}
        </CardContent>
      </Card>
      </>
      )}

      {agendandoA ? (
        <AgendarVisitaDialog
          item={agendandoA}
          consignaciones={consignaciones ?? []}
          onCerrar={() => setAgendandoA(null)}
          onAgendada={() => {
            setAgendandoA(null)
            releerElTablero()
            invalidar('visitas')
          }}
        />
      ) : null}
    </div>
  )
}
