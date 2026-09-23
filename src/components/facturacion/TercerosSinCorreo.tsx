'use client'

/**
 * «Terceros sin correo» — la lista para completarlos.
 *
 * Nico (2026-09-17): «el correo es OBLIGATORIO (se exige al crear/actualizar el
 * tercero y queda marcado si falta)», y a la vez «inquilino sin correo: se
 * emite igual y se entrega por WhatsApp o enlace».
 *
 * Esta pantalla es la mitad amable de esa regla. Crear un tercero sin correo
 * ya se frena en el formulario; a los que YA existen sin él —Portofino migró
 * 1.733 propietarios y no todos lo traían— no se les bloquea nada: salen acá,
 * ordenados por lo que cuestan (primero el que más contratos tiene, y entre
 * iguales el que no tiene ni WhatsApp, porque a ése no le llega NADA).
 *
 * ── 🔴 21-09 · «un listado infinito por allá abajo» ───────────────────────
 *
 * Eso dijo Nico de esta pestaña, y con 1.733 propietarios migrados era literal:
 * la tabla pintaba TODAS las filas, sin paginar y sin buscador, debajo de otra
 * tabla. Tres cosas cambiaron:
 *
 *   1. paginación y buscador, con el alcance dicho al lado («12 de 340»);
 *   2. el filtro de tipo dejó de ser un `<select>` crudo suelto encima de la
 *      tabla y pasó al `Select` del DS, en la cabecera de la tarjeta, donde se
 *      ve que gobierna a ESTA lista;
 *   3. la tarjeta dice qué es: son dos tablas seguidas en la misma pestaña, y
 *      ninguna se presentaba.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { EnvelopeSimpleOpen, MagnifyingGlass } from '@phosphor-icons/react'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TablePagination } from '@/components/ui/pagination'
import { PAGE_SIZE_OPTIONS, useTablePagination } from '@/lib/hooks/use-table-pagination'
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { SinDatos } from '@/components/estado/SinDatos'
import {
  facturacionElectronicaService,
  type ClaseDeTercero,
  type TercerosSinCorreo as Datos,
} from '@/lib/api/facturacion-electronica.service'

/** Radix reserva `''` para «sin selección», así que «Todos» lleva su clave. */
const TODOS = 'TODOS'

export function TercerosSinCorreo() {
  const [datos, setDatos] = useState<Datos | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [clase, setClase] = useState<ClaseDeTercero | ''>('')
  const [busqueda, setBusqueda] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      setDatos(
        await facturacionElectronicaService.tercerosSinCorreo(
          clase || undefined,
        ),
      )
    } catch (e) {
      setError(e)
      setDatos(null)
    } finally {
      setCargando(false)
    }
  }, [clase])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const todos = datos?.terceros ?? []
  const visibles = useMemo(() => {
    const t = busqueda.trim().toLowerCase()
    if (t === '') return todos
    return todos.filter(
      (x) =>
        x.nombre.toLowerCase().includes(t) ||
        (x.documento ?? '').toLowerCase().includes(t) ||
        (x.telefono ?? '').toLowerCase().includes(t),
    )
  }, [todos, busqueda])
  const paginado = useTablePagination(visibles, { resetKey: `${clase}|${busqueda}` })

  return (
    <div className="space-y-4" data-testid="terceros-sin-correo">
      {datos && (
        <div
          className={`rounded-lg border p-3 flex items-start gap-2.5 ${
            datos.sinCorreo === 0
              ? 'bg-surface-muted border-border'
              : 'bg-warning-soft border-warning/30'
          }`}
          data-testid="terceros-resumen"
        >
          <EnvelopeSimpleOpen
            className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
              datos.sinCorreo === 0 ? 'text-fg-muted' : 'text-warning'
            }`}
            weight="fill"
          />
          <div className="space-y-1">
            <p className="text-caption text-fg">
              {datos.sinCorreo === 0
                ? `Todos tus ${datos.total} terceros tienen correo: sus facturas salen con el XML y el PDF.`
                : `${datos.sinCorreo} de ${datos.total} terceros no tienen correo. A ${datos.sinCorreoConWhatsapp} les llega por WhatsApp; a ${datos.sinNingunCanal} no les llega nada y su factura queda esperando en un enlace.`}
            </p>
            <p className="text-caption text-fg-muted">
              {datos.exigido
                ? 'Un tercero nuevo no se crea sin correo. Los que ya existen no se bloquean: se completan desde su ficha.'
                : 'El correo obligatorio está apagado para esta inmobiliaria. Préndelo cuando tengas los correos cargados.'}
              {!datos.configurable &&
                ' (La política llega con una migración que todavía no está aplicada en esta base.)'}
            </p>
          </div>
        </div>
      )}

      <section
        className="overflow-x-clip rounded-lg border border-border bg-surface"
        data-testid="terceros-tarjeta"
      >
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-body font-semibold text-fg">A quién le falta el correo</h3>
            <p className="text-caption text-fg-muted">
              Primero los que más cuestan: el que tiene más contratos, y entre
              iguales el que no tiene ni WhatsApp. Se completa desde su ficha.
            </p>
          </div>
          <Select
            value={clase === '' ? TODOS : clase}
            onValueChange={(v) => setClase(v === TODOS ? '' : (v as ClaseDeTercero))}
          >
            <SelectTrigger
              id="terceros-clase"
              className="w-48 shrink-0"
              aria-label="Tipo de tercero en la lista"
              data-testid="terceros-clase"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos los terceros</SelectItem>
              <SelectItem value="INQUILINO">Sólo inquilinos</SelectItem>
              <SelectItem value="PROPIETARIO">Sólo propietarios</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <MagnifyingGlass
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted"
              aria-hidden="true"
            />
            <Input
              className="pl-9"
              placeholder="Nombre, documento o teléfono"
              aria-label="Buscar un tercero sin correo"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              data-testid="buscar-tercero"
            />
          </div>
          <p className="text-caption text-fg-muted" data-testid="alcance-de-terceros">
            {visibles.length} de {todos.length}{' '}
            {todos.length === 1 ? 'tercero' : 'terceros'} sin correo
          </p>
        </div>

        <EstadoDeDatos
          cargando={cargando}
          error={error}
          vacio={false}
          queEs="los terceros sin correo"
          onReintentar={cargar}
        >
          <div className="overflow-x-auto">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Nombre</TableHead>
                <TableHead className="whitespace-nowrap">Tipo</TableHead>
                <TableHead className="whitespace-nowrap">Documento</TableHead>
                <TableHead className="whitespace-nowrap">Teléfono</TableHead>
                <TableHead className="whitespace-nowrap text-right">
                  Contratos
                </TableHead>
                <TableHead className="whitespace-nowrap">Mientras tanto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginado.pageItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="p-0">
                    {/* 🔴 «No hay ninguno» y «ninguno coincide con lo que
                        buscaste» no son lo mismo: con el buscador escrito, el
                        primero se leería como que ya están todos completos. */}
                    <SinDatos
                      queSon="terceros sin correo"
                      icono={EnvelopeSimpleOpen}
                      titulo={
                        todos.length > 0
                          ? `Ningún tercero coincide con «${busqueda.trim()}»`
                          : 'Todos tus terceros tienen correo'
                      }
                      descripcion={
                        todos.length > 0
                          ? 'Buscamos por nombre, documento y teléfono en la lista de arriba.'
                          : 'Sus facturas electrónicas salen con el XML y el PDF, y queda la constancia de cada entrega.'
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                paginado.pageItems.map((t) => (
                  <TableRow key={`${t.clase}-${t.id}`} data-testid={`tercero-${t.id}`}>
                    <TableCell className="text-fg">{t.nombre}</TableCell>
                    <TableCell className="whitespace-nowrap text-fg-muted">
                      {t.clase === 'INQUILINO' ? 'Inquilino' : 'Propietario'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums text-fg-muted">
                      {t.documento ?? '—'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums text-fg-muted">
                      {t.telefono ?? '—'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums text-fg-muted">
                      {t.contratos}
                    </TableCell>
                    <TableCell
                      className={`whitespace-nowrap ${t.tieneWhatsapp ? 'text-fg-muted' : 'text-danger'}`}
                    >
                      {t.tieneWhatsapp
                        ? 'Se le entrega por WhatsApp'
                        : 'No le llega nada: queda en un enlace'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
          {paginado.shouldPaginate && (
            <div className="border-t border-border px-4 py-3">
              <TablePagination
                total={paginado.total}
                page={paginado.page}
                pageSize={paginado.pageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageChange={paginado.setPage}
                onPageSizeChange={paginado.setPageSize}
              />
            </div>
          )}
        </EstadoDeDatos>
      </section>
    </div>
  )
}
