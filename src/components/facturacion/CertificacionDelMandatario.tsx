'use client'

/**
 * «Certificación del mandatario» — lo que el propietario necesita para declarar.
 *
 * Nico y Juan Camilo (2026-09-17): «la inmobiliaria emite el canon con su
 * propio NIT y numeración, marcando que actúa POR MANDATO, y le entrega al
 * propietario la CERTIFICACIÓN DEL MANDATARIO —lo facturado, IVA y
 * retenciones— para su declaración».
 *
 * ── Por qué se puede volver a generar ──────────────────────────────────────
 *
 * Porque la plata del período cambia: una nota crédito de marzo emitida en
 * mayo hace que la certificación de marzo diga otra cosa. Volver a generarla
 * ACTUALIZA la que había —hay una sola por propietario y período— en vez de
 * dejar dos documentos que se contradicen.
 *
 * ── 🔴 21-09 · Qué cambió, y por qué ──────────────────────────────────────
 *
 * Nico: «esto es horrible, un listado infinito por allá abajo y no se sabe bien
 * qué hacer y qué se puede hacer dentro de mandato y correos».
 *
 *   1. El formulario se fue al cajón (`CajonDeLaCertificacion`), detrás del CTA
 *      de la cabecera de la tabla. Y de paso se arregló lo más caro que tenía:
 *      pedía escribir el **id** del propietario. Ahora se busca por nombre o
 *      cédula.
 *   2. La tabla dejó de ser infinita: buscador + paginación, y la cabecera dice
 *      cuántas de cuántas se están viendo.
 *   3. La tabla DICE QUÉ ES. «No nombramos las tablas» vale cuando la tarjeta
 *      ya lo dice; acá había dos tablas seguidas en la misma pestaña y ninguna
 *      se presentaba.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Certificate, MagnifyingGlass, Warning } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TablePagination } from '@/components/ui/pagination'
import { PAGE_SIZE_OPTIONS, useTablePagination } from '@/lib/hooks/use-table-pagination'
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { SinDatos } from '@/components/estado/SinDatos'
import {
  facturacionElectronicaService,
  pesos,
  type CertificacionesDelMandatario,
} from '@/lib/api/facturacion-electronica.service'
import { CajonDeLaCertificacion } from './CajonDeLaCertificacion'

/**
 * El CSV sigue exportándose desde acá para quien ya lo importaba; vive en
 * `certificacion-en-csv` porque también lo usa el cajón.
 */
export { comoCsv } from './certificacion-en-csv'

export interface CertificacionDelMandatarioProps {
  /** Precarga el propietario cuando se abre desde su ficha. */
  propietarioId?: string
  /** Su nombre, para no mostrarle un id a nadie cuando viene precargado. */
  propietarioNombre?: string
}

export function CertificacionDelMandatario({
  propietarioId,
  propietarioNombre,
}: CertificacionDelMandatarioProps) {
  const [datos, setDatos] = useState<CertificacionesDelMandatario | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [generando, setGenerando] = useState(false)
  const [busqueda, setBusqueda] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      setDatos(
        await facturacionElectronicaService.certificaciones(propietarioId),
      )
    } catch (e) {
      setError(e)
      setDatos(null)
    } finally {
      setCargando(false)
    }
  }, [propietarioId])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const todas = datos?.certificaciones ?? []
  const visibles = useMemo(() => {
    const t = busqueda.trim().toLowerCase()
    if (t === '') return todas
    return todas.filter(
      (c) =>
        c.propietarioNombre.toLowerCase().includes(t) ||
        (c.propietarioDocumento ?? '').toLowerCase().includes(t) ||
        c.enPalabras.toLowerCase().includes(t),
    )
  }, [todas, busqueda])
  const paginado = useTablePagination(visibles, { resetKey: busqueda })

  const sinMigracion = datos !== null && !datos.disponible

  return (
    <div className="space-y-4" data-testid="certificacion-del-mandatario">
      {/* 🔴 Este aviso NO es de los que se pueden cerrar: dice que la función
          está a medias en esta base. `AvisoQueSePuedeCerrar` está documentado
          como «no es para alarmas», y esto lo es. */}
      {sinMigracion && (
        <div
          className="flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning-soft p-3"
          data-testid="certificacion-sin-migracion"
        >
          <Warning
            className="mt-0.5 h-5 w-5 flex-shrink-0 text-warning"
            weight="fill"
          />
          <p className="text-caption text-fg">{datos.explicacion}</p>
        </div>
      )}

      <section
        className="overflow-x-clip rounded-lg border border-border bg-surface"
        data-testid="certificaciones-tarjeta"
      >
        {/* 🔴 La cabecera nombra la tabla y trae su CTA: son dos tablas seguidas
            en la misma pestaña y hay que poder decir cuál es cuál. */}
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-body font-semibold text-fg">
              Certificaciones generadas
            </h3>
            <p className="text-caption text-fg-muted">
              Una por propietario y período. Volver a generar la de un
              propietario actualiza la que había.
            </p>
          </div>
          <Button
            hideArrow
            className="shrink-0"
            onClick={() => setGenerando(true)}
            data-testid="cert-abrir"
          >
            <Certificate className="h-4 w-4" weight="bold" />
            Generar una certificación
          </Button>
        </div>

        <div className="flex flex-col gap-2 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <MagnifyingGlass
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted"
              aria-hidden="true"
            />
            <Input
              className="pl-9"
              placeholder="Propietario, documento o período"
              aria-label="Buscar una certificación"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              data-testid="buscar-certificacion"
            />
          </div>
          <p className="text-caption text-fg-muted" data-testid="alcance-de-certificaciones">
            {visibles.length} de {todas.length}{' '}
            {todas.length === 1 ? 'certificación' : 'certificaciones'}
          </p>
        </div>

        <EstadoDeDatos
          cargando={cargando}
          error={error}
          vacio={false}
          queEs="las certificaciones del mandatario"
          onReintentar={cargar}
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Propietario</TableHead>
                  <TableHead className="whitespace-nowrap">Período</TableHead>
                  <TableHead className="whitespace-nowrap text-right">
                    Facturas
                  </TableHead>
                  <TableHead className="whitespace-nowrap text-right">Base</TableHead>
                  <TableHead className="whitespace-nowrap text-right">IVA</TableHead>
                  <TableHead className="whitespace-nowrap text-right">
                    Retenciones
                  </TableHead>
                  <TableHead className="whitespace-nowrap text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginado.pageItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="p-0">
                      <SinDatos
                        queSon="certificaciones del mandatario"
                        icono={Certificate}
                        titulo={
                          sinMigracion
                            ? 'La certificación llega con una migración que falta'
                            : todas.length > 0
                              ? `Ninguna certificación coincide con «${busqueda.trim()}»`
                              : 'Todavía no has generado ninguna certificación'
                        }
                        descripcion={
                          datos?.explicacion ??
                          'Es lo que cada propietario necesita para declarar: lo que le facturaste a sus inquilinos por su cuenta, con su IVA y sus retenciones. Genera la primera con el botón de arriba.'
                        }
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  paginado.pageItems.map((c) => (
                    <TableRow key={c.id} data-testid={`certificacion-${c.id}`}>
                      <TableCell className="text-fg">
                        {c.propietarioNombre}
                        <p className="font-mono text-caption tabular-nums text-fg-muted">
                          {c.propietarioDocumento ?? '—'}
                        </p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-fg-muted">
                        {c.enPalabras}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right font-mono tabular-nums text-fg-muted">
                        {c.facturasContadas}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right font-mono tabular-nums text-fg-muted">
                        {pesos(c.baseCop)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right font-mono tabular-nums text-fg-muted">
                        {pesos(c.ivaCop)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right font-mono tabular-nums text-fg-muted">
                        {pesos(c.retefuenteCop + c.reteivaCop + c.reteicaCop)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right font-mono tabular-nums text-fg">
                        {pesos(c.totalCop)}
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

      <CajonDeLaCertificacion
        abierto={generando}
        onOpenChange={setGenerando}
        propietario={
          propietarioId
            ? { id: propietarioId, nombre: propietarioNombre ?? 'Este propietario' }
            : undefined
        }
        onGenerada={cargar}
      />
    </div>
  )
}
