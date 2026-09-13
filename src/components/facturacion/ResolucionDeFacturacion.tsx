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
 */

import { useCallback, useEffect, useState } from 'react'
import { Certificate, SealWarning } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
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
  type ResolucionesDeLaAgencia,
} from '@/lib/api/facturacion-por-mes.service'

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
  const completo =
    form.numero.trim() !== '' &&
    form.fechaResolucion !== '' &&
    form.desde !== '' &&
    form.hasta !== '' &&
    form.vigenteDesde !== '' &&
    form.vigenteHasta !== ''

  async function guardar() {
    if (!completo) return
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

  async function anular(id: string) {
    setAnulando(id)
    try {
      await facturacionPorMesService.anularResolucion(id)
      toast.success('Resolución anulada: ya no numera facturas')
      await cargar()
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : 'No se pudo anular la resolución.',
      )
    } finally {
      setAnulando(null)
    }
  }

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
                              onClick={() => void anular(r.id)}
                              data-testid={`anular-${r.id}`}
                            >
                              {anulando === r.id ? (
                                <Spinner className="h-4 w-4" />
                              ) : null}
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
            />
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
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="resolucion-vigente-desde">Vigente desde</Label>
            <Input
              id="resolucion-vigente-desde"
              type="date"
              value={form.vigenteDesde}
              onChange={(e) => campo('vigenteDesde')(e.target.value)}
              data-testid="resolucion-campo-vigente-desde"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="resolucion-vigente-hasta">Vigente hasta</Label>
            <Input
              id="resolucion-vigente-hasta"
              type="date"
              value={form.vigenteHasta}
              onChange={(e) => campo('vigenteHasta')(e.target.value)}
              data-testid="resolucion-campo-vigente-hasta"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            hideArrow
            disabled={!completo || guardando}
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
    </div>
  )
}
