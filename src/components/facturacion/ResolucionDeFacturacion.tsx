'use client'

/**
 * «Resolución» — el permiso de la DIAN para numerar facturas.
 *
 * Nico (2026-09-12, 22:50): «IVA y retenciones en las facturas, y el número de
 * factura DIAN.»
 *
 * Acá se carga lo que dice el papel de la DIAN: el número de la resolución, su
 * fecha, el prefijo autorizado, el rango de numeración y la vigencia. Con eso,
 * «Nueva factura» numera; sin eso, no emite nada y lo dice.
 *
 * ── Por qué esta pantalla vive en Facturación y no en Configuración ────────
 *
 * `Configuración → Facturación` es el plan y las facturas DE LEASEFY (lo que la
 * inmobiliaria nos paga). Esto es lo contrario: la autorización con la que la
 * inmobiliaria le factura a SUS clientes. Ponerlas en la misma pantalla es
 * pedirle a alguien que distinga dos cosas que se llaman igual. Todo
 * `/panel/inmobiliaria/facturacion` ya está detrás de `PageGuard` con ADMIN y
 * CONTADOR, que son exactamente los dos roles que pueden tocar esto.
 *
 * ── 🔴 21-09: cargar una resolución es un CTA, no media pantalla ───────────
 *
 * Nico, sobre esta pantalla: «no entiendo esos filtros por allá abajo. Eso de
 * carga resolución ni se entiende, creo que eso debería ser un CTA». El
 * formulario de nueve campos vivía debajo de la tabla y se leía como una barra
 * de filtros de la tabla de arriba. Se mudó entero a `CajonDeLaResolucion`,
 * detrás del botón de la cabecera de la tabla — que es donde vive lo que se
 * puede hacer con esa tabla.
 *
 * ── Lo que la pantalla NO deja hacer ───────────────────────────────────────
 *
 * Editar una resolución cargada. Un rango o una vigencia que cambian después de
 * haber numerado dejan facturas emitidas apuntando a una autorización que ya no
 * dice lo mismo. Lo que sí se puede es ANULARLA —deja de numerar, no se borra,
 * y las facturas que emitió la siguen apuntando— y cargar la siguiente.
 *
 * ── Anular pide confirmación y motivo (auditoría 13-09, F1) ────────────────
 *
 * Antes era un clic: el botón «Anular» de la fila mandaba la orden sin
 * preguntar, y la inmobiliaria quedaba sin poder numerar facturas hasta cargar
 * otra resolución. Ahora abre un diálogo que dice QUÉ se rompe y pide por qué;
 * el back exige ese `motivo` (400 si falta o son sólo espacios) y lo guarda con
 * la resolución.
 */

import { useCallback, useEffect, useState } from 'react'
import { Certificate, SealWarning } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { SinDatos } from '@/components/estado/SinDatos'
import { toast } from '@/components/ui/toast'
import {
  facturacionPorMesService,
  fechaLegible,
  type ResolucionDeFacturacion as Resolucion,
  type ResolucionesDeLaAgencia,
} from '@/lib/api/facturacion-por-mes.service'
import { NumeracionPorTipo } from './NumeracionPorTipo'
import { CajonDeLaResolucion } from './CajonDeLaResolucion'

/** El tope del back (`AnularResolucionDto`). */
export const MAX_MOTIVO_DE_ANULACION = 500

export interface ResolucionDeFacturacionProps {
  /**
   * Abre el cajón de carga al entrar. Lo usa «Nueva factura»: su aviso de «no
   * hay resolución» manda acá, y mandar a una pantalla donde todavía hay que
   * buscar el botón es la mitad del camino.
   */
  abrirCarga?: boolean
  /** Para que el padre baje su bandera y no se reabra al volver a la pestaña. */
  onCargaAbierta?: () => void
}

export function ResolucionDeFacturacion({
  abrirCarga = false,
  onCargaAbierta,
}: ResolucionDeFacturacionProps = {}) {
  const [datos, setDatos] = useState<ResolucionesDeLaAgencia | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [cargandoResolucion, setCargandoResolucion] = useState(false)
  const [anulando, setAnulando] = useState<string | null>(null)
  /** La resolución que se está por anular: abre el diálogo que pide el motivo. */
  const [porAnular, setPorAnular] = useState<Resolucion | null>(null)
  const [motivo, setMotivo] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      setDatos(await facturacionPorMesService.resoluciones())
    } catch (e) {
      setError(e)
      setDatos(null)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  useEffect(() => {
    if (!abrirCarga) return
    setCargandoResolucion(true)
    onCargaAbierta?.()
  }, [abrirCarga, onCargaAbierta])

  function pedirAnulacion(r: Resolucion) {
    setMotivo('')
    setPorAnular(r)
  }

  const motivoLimpio = motivo.trim()

  async function anular() {
    const r = porAnular
    // El back responde 400 a un motivo vacío o de puros espacios. El botón ya
    // está apagado en ese caso; esto es la misma regla, por si llega un Enter.
    if (!r || motivoLimpio === '' || anulando) return
    setAnulando(r.id)
    try {
      await facturacionPorMesService.anularResolucion(r.id, motivoLimpio)
      toast.success(`Resolución ${r.numero} anulada: ya no numera facturas`)
      setPorAnular(null)
      setMotivo('')
      await cargar()
    } catch (e) {
      // El diálogo queda abierto y con el motivo escrito: reintentar no obliga
      // a escribirlo de nuevo.
      toast.error(
        e instanceof Error ? e.message : 'No se pudo anular la resolución.',
      )
    } finally {
      setAnulando(null)
    }
  }

  /*
   * Qué se rompe al anular, dicho para ESTA resolución. La que numera hoy deja
   * a la inmobiliaria sin poder facturar; una que ya no numeraba (vencida,
   * agotada) no cambia nada de hoy, y decirle a alguien que se va a quedar sin
   * facturar cuando no es así es asustarlo en falso.
   */
  const numeraHoy = porAnular?.puedeNumerar === true

  return (
    <div className="space-y-4">
      {/* El estado de hoy, arriba: es la única pregunta que trae a alguien a
          esta pantalla — «¿puedo facturar?». */}
      {datos && (
        <div
          className={`rounded-lg border p-3 flex items-start gap-2.5 ${
            datos.vigente.puedeNumerar
              ? 'bg-surface-muted border-border'
              : 'bg-warning-soft border-warning/30'
          }`}
          data-testid="resolucion-estado"
        >
          {datos.vigente.puedeNumerar ? (
            <Certificate
              className="w-5 h-5 text-fg-muted flex-shrink-0 mt-0.5"
              weight="fill"
            />
          ) : (
            <SealWarning
              className="w-5 h-5 text-warning flex-shrink-0 mt-0.5"
              weight="fill"
            />
          )}
          <p className="text-caption text-fg">
            {datos.vigente.puedeNumerar
              ? `Facturando con la resolución ${datos.vigente.numero}. La próxima factura lleva el ${datos.vigente.siguiente}; quedan ${datos.vigente.disponibles} números y la autorización vence el ${fechaLegible(datos.vigente.vigenteHasta)}.`
              : (datos.vigente.explicacion ??
                'No hay una resolución de facturación vigente con la cual numerar.')}
          </p>
        </div>
      )}

      {datos && <NumeracionPorTipo datos={datos} />}

      <EstadoDeDatos
        cargando={cargando}
        error={error}
        vacio={false}
        queEs="las resoluciones de facturación"
        onReintentar={cargar}
      >
        {datos && (
          <section
            className="rounded-lg border border-border bg-surface overflow-hidden"
            data-testid="resolucion-listado"
          >
            {/* 🔴 La cabecera de la tabla es donde vive lo que se puede hacer
                con la tabla. Antes «Cargar una resolución» era un formulario
                entero puesto abajo, y desde acá no se veía que existiera. */}
            <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-body font-semibold text-fg">
                  Resoluciones cargadas
                </h3>
                <p className="text-caption text-fg-muted">
                  Una resolución no se edita: si el rango o la vigencia cambian,
                  se carga la nueva y se anula la anterior.
                </p>
              </div>
              <Button
                hideArrow
                className="shrink-0"
                onClick={() => setCargandoResolucion(true)}
                data-testid="resolucion-abrir-carga"
              >
                <Certificate className="h-4 w-4" weight="bold" />
                Cargar una resolución
              </Button>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Resolución</TableHead>
                    <TableHead className="whitespace-nowrap">Prefijo</TableHead>
                    <TableHead className="whitespace-nowrap">Numera</TableHead>
                    <TableHead className="whitespace-nowrap">Rango</TableHead>
                    <TableHead className="whitespace-nowrap text-right">Usados</TableHead>
                    <TableHead className="whitespace-nowrap text-right">Disponibles</TableHead>
                    <TableHead className="whitespace-nowrap">Vigencia</TableHead>
                    <TableHead className="whitespace-nowrap">Estado</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {datos.resoluciones.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="p-0">
                        <SinDatos
                          queSon="resoluciones de facturación"
                          icono={Certificate}
                          descripcion="Sin una resolución de la DIAN no se puede numerar una factura. Cárgala con el botón de arriba: son los datos del papel que te autorizó."
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    datos.resoluciones.map((r) => (
                      <TableRow key={r.id} data-testid={`resolucion-${r.id}`}>
                        <TableCell className="whitespace-nowrap tabular-nums text-fg">
                          {r.numero}
                          <p className="text-caption text-fg-muted">
                            del {fechaLegible(r.fechaResolucion)}
                          </p>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-fg-muted">
                          {r.prefijo || '—'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-fg-muted">
                          {r.tipoNombre ?? 'Cualquier tipo de documento'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap tabular-nums text-fg-muted">
                          {r.desde}–{r.hasta}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right tabular-nums text-fg-muted">
                          {r.usados}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right tabular-nums text-fg-muted">
                          {r.disponibles}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-fg-muted">
                          {fechaLegible(r.vigenteDesde)} –{' '}
                          {fechaLegible(r.vigenteHasta)}
                        </TableCell>
                        <TableCell className="max-w-[260px]">
                          {r.puedeNumerar ? (
                            <span className="text-caption text-primary">
                              Numerando · sigue el {r.siguiente}
                            </span>
                          ) : (
                            <span className="text-caption text-fg-muted">
                              {r.explicacion}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right">
                          {!r.anulada && (
                            <Button
                              variant="ghost"
                              hideArrow
                              disabled={anulando === r.id}
                              onClick={() => pedirAnulacion(r)}
                              data-testid={`anular-${r.id}`}
                            >
                              Anular
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </section>
        )}
      </EstadoDeDatos>

      <CajonDeLaResolucion
        abierto={cargandoResolucion}
        onOpenChange={setCargandoResolucion}
        datos={datos}
        onCargada={cargar}
      />

      <AlertDialog
        open={porAnular !== null}
        onOpenChange={(abierto) => {
          // Mientras la orden viaja no se cierra: cerrar a mitad dejaría sin
          // saber si la resolución quedó anulada o no.
          if (!abierto && anulando === null) setPorAnular(null)
        }}
      >
        <AlertDialogContent data-testid="anular-resolucion-dialogo">
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Anular la resolución {porAnular?.numero}?
            </AlertDialogTitle>
            <AlertDialogDescription data-testid="anular-resolucion-consecuencia">
              {numeraHoy
                ? 'Es la resolución con la que numeras hoy. Sin resolución vigente no vas a poder numerar facturas hasta cargar otra: «Generar» queda apagado.'
                : `Hoy no está numerando${porAnular?.explicacion ? ` (${porAnular.explicacion.replace(/\.$/, '')})` : ''}, así que no cambia lo que puedes facturar hoy.`}{' '}
              Anular no se deshace; las facturas que ya numeró conservan su
              número.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="motivo-anulacion">Motivo</Label>
            <Textarea
              id="motivo-anulacion"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="La DIAN autorizó un rango nuevo y este quedó sin uso."
              rows={3}
              maxLength={MAX_MOTIVO_DE_ANULACION}
              disabled={anulando !== null}
              data-testid="motivo-anulacion"
            />
            <p className="text-caption text-fg-muted">
              Obligatorio: queda guardado con la resolución. Hasta{' '}
              {MAX_MOTIVO_DE_ANULACION} caracteres.
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={anulando !== null}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              tone="danger"
              onClick={(e) => {
                // Radix cierra el diálogo al hacer clic: se frena para cerrarlo
                // sólo si el back confirmó.
                e.preventDefault()
                void anular()
              }}
              disabled={motivoLimpio === '' || anulando !== null}
              data-testid="confirmar-anular"
            >
              {anulando !== null ? 'Anulando…' : 'Anular la resolución'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
