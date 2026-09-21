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

import { useMemo, useState } from 'react'
import { motivoEnCristiano } from '@/lib/errores/en-cristiano'
import { CalendarCheck, UserPlus } from '@phosphor-icons/react'

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
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

  const [tocando, setTocando] = useState<string | null>(null)
  const [marcando, setMarcando] = useState(false)

  const visitas = porAtender.datos?.visitas ?? []
  const pendientes = recordatorios.datos?.visitas ?? []
  const horas = porAtender.datos?.horasDeAvisoAlInquilino ?? 24

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
    } finally {
      setTocando(null)
    }
  }

  async function avisar(visitId: string) {
    setTocando(visitId)
    try {
      await visitasApi.avisoAlInquilino(visitId, 'WHATSAPP')
      invalidar('visitas')
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
    } finally {
      setTocando(null)
    }
  }

  async function marcarRecordatorios() {
    setMarcando(true)
    try {
      await visitasApi.recordatorios(true)
      invalidar('visitas')
    } finally {
      setMarcando(false)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
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
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Preparar visitas</h1>
        <p className="text-muted-foreground text-sm">
          Lo que le falta a cada visita para poder hacerse. Ninguna se confirma sin asesor, y
          al inmueble ocupado se le avisa al inquilino {horas} horas antes. El calendario
          completo está en Agenda.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Por atender</CardTitle>
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
                  description="Cuando un interesado pida una visita desde el aviso, aparece acá para asignarle asesor."
                />
              }
            >
              <ul className="divide-y" data-testid="lista-de-visitas">
                {ordenadas.map((v) => (
                  <li
                    key={v.visitId}
                    className="space-y-2 py-3"
                    data-testid={`visita-${v.visitId}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <p className="font-medium">
                          {v.quien ?? 'Interesado'}
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
                                  {a.userId.slice(0, 8)} · {a.leadsActivos} leads
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

                    {puedeEditar ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={tocando === v.visitId}
                        onClick={() => void noShow(v.visitId, v.noShow)}
                        data-testid={`no-show-${v.visitId}`}
                      >
                        {v.noShow ? 'No, sí llegó' : 'No llegó'}
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
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
                Esta pantalla NO envía: arma el texto y deja la constancia. El
                envío sale por los avisos de la inmobiliaria.
              </p>
              <ul className="divide-y" data-testid="lista-recordatorios">
                {pendientes.map((r) => (
                  <li key={r.visitId} className="space-y-1 py-3">
                    <p className="text-sm">{r.mensaje}</p>
                    <p className="text-muted-foreground text-xs">
                      {r.correo ?? r.telefono ?? 'sin correo ni teléfono'}
                    </p>
                  </li>
                ))}
              </ul>
            </EstadoDeDatos>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
