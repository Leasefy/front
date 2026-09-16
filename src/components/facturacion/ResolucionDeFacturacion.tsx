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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import {
  erroresDeLaResolucion,
  hayErrores,
} from '@/lib/facturacion/errores-de-la-resolucion'
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

/** El tope del back (`AnularResolucionDto`). */
export const MAX_MOTIVO_DE_ANULACION = 500

/** El formulario, con los campos como los trae el papel de la DIAN. */
interface Formulario {
  numero: string
  fechaResolucion: string
  prefijo: string
  desde: string
  hasta: string
  vigenteDesde: string
  vigenteHasta: string
  ultimoNumeroUsado: string
}

const VACIO: Formulario = {
  numero: '',
  fechaResolucion: '',
  prefijo: '',
  desde: '',
  hasta: '',
  vigenteDesde: '',
  vigenteHasta: '',
  ultimoNumeroUsado: '',
}

export function ResolucionDeFacturacion() {
  const [datos, setDatos] = useState<ResolucionesDeLaAgencia | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [form, setForm] = useState<Formulario>(VACIO)
  const [guardando, setGuardando] = useState(false)
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

  const campo = (clave: keyof Formulario) => (valor: string) =>
    setForm((previo) => ({ ...previo, [clave]: valor }))

  /*
   * El formulario está completo cuando están los seis campos obligatorios. El
   * prefijo NO lo es: hay resoluciones sin prefijo, y entonces el número va
   * pelado. `ultimoNumeroUsado` tampoco: sólo hace falta cuando la inmobiliaria
   * ya gastó parte del rango en otro sistema.
   */
  /*
   * 🔴 F5 (auditoría 13-09): lo que está mal se dice AL LADO DEL CAMPO, no en
   * un toast que se va solo a los cinco segundos justo cuando la persona baja
   * la vista al formulario. Son las mismas cuatro reglas del back, que las
   * sigue aplicando: esto no lo reemplaza, lo adelanta.
   */
  const errores = erroresDeLaResolucion(form)

  const completo =
    form.numero.trim() !== '' &&
    form.fechaResolucion !== '' &&
    form.desde !== '' &&
    form.hasta !== '' &&
    form.vigenteDesde !== '' &&
    form.vigenteHasta !== ''

  async function guardar() {
    if (!completo || hayErrores(errores)) return
    setGuardando(true)
    try {
      await facturacionPorMesService.crearResolucion({
        numero: form.numero.trim(),
        fechaResolucion: form.fechaResolucion,
        prefijo: form.prefijo.trim(),
        desde: Number(form.desde),
        hasta: Number(form.hasta),
        vigenteDesde: form.vigenteDesde,
        vigenteHasta: form.vigenteHasta,
        ...(form.ultimoNumeroUsado !== ''
          ? { ultimoNumeroUsado: Number(form.ultimoNumeroUsado) }
          : {}),
      })
      toast.success('Resolución cargada')
      setForm(VACIO)
      await cargar()
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : 'No se pudo cargar la resolución.',
      )
    } finally {
      setGuardando(false)
    }
  }

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
            <div className="border-b border-border p-4">
              <h3 className="text-body font-semibold text-fg">
                Resoluciones cargadas
              </h3>
              <p className="text-caption text-fg-muted">
                Una resolución no se edita: si el rango o la vigencia cambian,
                se carga la nueva y se anula la anterior.
              </p>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Resolución</TableHead>
                    <TableHead className="whitespace-nowrap">Prefijo</TableHead>
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
                      <TableCell colSpan={8} className="p-0">
                        <SinDatos
                          queSon="resoluciones de facturación"
                          icono={Certificate}
                          descripcion="Carga abajo la resolución que te autorizó la DIAN. Sin ella no se puede numerar una factura."
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

      <section
        className="rounded-lg border border-border bg-surface p-4 space-y-4"
        data-testid="resolucion-formulario"
      >
        <div>
          <h3 className="text-body font-semibold text-fg">Cargar una resolución</h3>
          <p className="text-caption text-fg-muted">
            Copia los datos tal cual están en la resolución que te dio la DIAN.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="resolucion-numero">Número de la resolución</Label>
            <Input
              id="resolucion-numero"
              value={form.numero}
              onChange={(e) => campo('numero')(e.target.value)}
              placeholder="18764003394379"
              data-testid="resolucion-campo-numero"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="resolucion-fecha">Fecha de la resolución</Label>
            <Input
              id="resolucion-fecha"
              type="date"
              value={form.fechaResolucion}
              onChange={(e) => campo('fechaResolucion')(e.target.value)}
              data-testid="resolucion-campo-fecha"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="resolucion-prefijo">Prefijo</Label>
            <Input
              id="resolucion-prefijo"
              value={form.prefijo}
              onChange={(e) => campo('prefijo')(e.target.value)}
              placeholder="FE"
              data-testid="resolucion-campo-prefijo"
            />
            <p className="text-caption text-fg-muted">
              Déjalo vacío si tu resolución no tiene prefijo.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="resolucion-ultimo">Último número ya usado</Label>
            <Input
              id="resolucion-ultimo"
              type="number"
              value={form.ultimoNumeroUsado}
              onChange={(e) => campo('ultimoNumeroUsado')(e.target.value)}
              placeholder="opcional"
              data-testid="resolucion-campo-ultimo"
            />
            <p className="text-caption text-fg-muted">
              Sólo si ya gastaste parte del rango en otro sistema.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="resolucion-desde">Rango desde</Label>
            <Input
              id="resolucion-desde"
              type="number"
              value={form.desde}
              onChange={(e) => campo('desde')(e.target.value)}
              placeholder="1"
              data-testid="resolucion-campo-desde"
              aria-invalid={errores.desde ? true : undefined}
              aria-describedby={errores.desde ? 'resolucion-error-desde' : undefined}
            />
            {errores.desde ? (
              <p
                id="resolucion-error-desde"
                role="alert"
                className="text-caption text-danger"
                data-testid="resolucion-error-desde"
              >
                {errores.desde}
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="resolucion-hasta">Rango hasta</Label>
            <Input
              id="resolucion-hasta"
              type="number"
              value={form.hasta}
              onChange={(e) => campo('hasta')(e.target.value)}
              placeholder="5000"
              data-testid="resolucion-campo-hasta"
              aria-invalid={errores.hasta ? true : undefined}
              aria-describedby={errores.hasta ? 'resolucion-error-hasta' : undefined}
            />
            {errores.hasta ? (
              <p
                id="resolucion-error-hasta"
                role="alert"
                className="text-caption text-danger"
                data-testid="resolucion-error-hasta"
              >
                {errores.hasta}
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="resolucion-vigente-desde">Vigente desde</Label>
            <Input
              id="resolucion-vigente-desde"
              type="date"
              value={form.vigenteDesde}
              onChange={(e) => campo('vigenteDesde')(e.target.value)}
              data-testid="resolucion-campo-vigente-desde"
              aria-invalid={errores.vigenteDesde ? true : undefined}
              aria-describedby={errores.vigenteDesde ? 'resolucion-error-vigente-desde' : undefined}
            />
            {errores.vigenteDesde ? (
              <p
                id="resolucion-error-vigente-desde"
                role="alert"
                className="text-caption text-danger"
                data-testid="resolucion-error-vigente-desde"
              >
                {errores.vigenteDesde}
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="resolucion-vigente-hasta">Vigente hasta</Label>
            <Input
              id="resolucion-vigente-hasta"
              type="date"
              value={form.vigenteHasta}
              onChange={(e) => campo('vigenteHasta')(e.target.value)}
              data-testid="resolucion-campo-vigente-hasta"
              aria-invalid={errores.vigenteHasta ? true : undefined}
              aria-describedby={errores.vigenteHasta ? 'resolucion-error-vigente-hasta' : undefined}
            />
            {errores.vigenteHasta ? (
              <p
                id="resolucion-error-vigente-hasta"
                role="alert"
                className="text-caption text-danger"
                data-testid="resolucion-error-vigente-hasta"
              >
                {errores.vigenteHasta}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            hideArrow
            disabled={!completo || guardando || hayErrores(errores)}
            onClick={() => void guardar()}
            data-testid="resolucion-guardar"
          >
            {guardando ? (
              <Spinner className="h-4 w-4" />
            ) : (
              <Certificate className="h-4 w-4" weight="bold" />
            )}
            {guardando ? 'Cargando…' : 'Cargar resolución'}
          </Button>
        </div>
      </section>

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
