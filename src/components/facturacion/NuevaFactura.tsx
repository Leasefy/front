'use client'

/**
 * «Nueva factura» — el mes, y todo lo que hay que facturar ese mes.
 *
 * Nico (2026-09-12): «Facturar y que me arroje el listado completo de las
 * facturas que hay por generar, NO QUE ME PONGA A ESCOGER UNA. En el módulo de
 * facturación debe tener la pestaña de nueva factura y permitir seleccionar
 * por mes de facturación. Una vez seleccione el mes, debe separar por facturas
 * de propietarios y facturas de inquilinos pero debe arrojar el listado
 * completo de las facturas que puedo generar para ese mes… El sistema ya debe
 * saber automáticamente si en septiembre tengo que facturar 800 contratos y
 * cuáles.»
 *
 * Por eso acá no hay ningún buscador de contrato ni ningún «elegir uno»: se
 * elige el MES y el back responde las dos listas completas
 * (`GET /inmobiliaria/facturacion/por-generar`). Lo único que la persona hace
 * es desmarcar lo que no quiere y apretar «Generar N facturas».
 *
 * ── Lo que la pantalla dice en voz alta ─────────────────────────────────────
 *
 * Las ya emitidas NO se esconden: se muestran con su número y sin casilla. Una
 * lista que sólo trae lo pendiente no deja verificar que el mes esté completo,
 * que es justamente lo que la persona de facturación necesita saber.
 *
 * Y el aviso de impuestos: mientras el escenario tributario del contrato no
 * esté conectado, la factura sale con los valores del contrato sin IVA ni
 * retenciones. Eso se dice, no se deja adivinar por un total que no cuadra.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Info, Receipt, Warning } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Spinner } from '@/components/ui/spinner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TablePagination } from '@/components/ui/pagination'
import {
  PAGE_SIZE_OPTIONS,
  useTablePagination,
} from '@/lib/hooks/use-table-pagination'
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { SinDatos } from '@/components/estado/SinDatos'
import { toast } from '@/components/ui/toast'
import { formatCurrency } from '@/lib/format'
import {
  facturacionPorMesService,
  mesActual,
  mesLegible,
  mesesParaElegir,
  type FacturaDelMes,
  type FacturasPorGenerar,
} from '@/lib/api/facturacion-por-mes.service'

/** Lo que se lee de un renglón cuando la fila resume sus conceptos. */
function conceptosLegibles(factura: FacturaDelMes): string {
  const nombres = factura.lineas
    .filter((l) => !l.resta)
    .map((l) => l.nombre)
  if (nombres.length === 0) return '—'
  if (nombres.length <= 2) return nombres.join(' · ')
  return `${nombres.slice(0, 2).join(' · ')} +${nombres.length - 2}`
}

interface TablaProps {
  titulo: string
  descripcion: string
  filas: FacturaDelMes[]
  seleccion: Set<string>
  onAlternarUna: (clave: string) => void
  onAlternarTodas: (claves: string[]) => void
  ocupado: boolean
  testid: string
}

function TablaDeFacturas({
  titulo,
  descripcion,
  filas,
  seleccion,
  onAlternarUna,
  onAlternarTodas,
  ocupado,
  testid,
}: TablaProps) {
  const { pageItems, total, page, pageSize, setPage, setPageSize, shouldPaginate } =
    useTablePagination(filas, { resetKey: testid + filas.length })

  const porEmitir = useMemo(
    () => filas.filter((f) => f.estado === 'POR_EMITIR').map((f) => f.clave),
    [filas],
  )
  const elegidas = porEmitir.filter((c) => seleccion.has(c))
  const todas = porEmitir.length > 0 && elegidas.length === porEmitir.length
  const algunas = elegidas.length > 0 && !todas

  return (
    <section
      className="rounded-lg border border-border bg-surface overflow-hidden"
      data-testid={`facturacion-${testid}`}
    >
      <div className="border-b border-border p-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-body font-semibold text-fg">{titulo}</h3>
          <p className="text-caption text-fg-muted">{descripcion}</p>
        </div>
        <p className="text-caption text-fg-muted tabular-nums whitespace-nowrap">
          {total} {total === 1 ? 'factura' : 'facturas'} ·{' '}
          {formatCurrency(filas.reduce((s, f) => s + f.totalCop, 0))}
        </p>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={todas}
                  indeterminate={algunas}
                  disabled={ocupado || porEmitir.length === 0}
                  onCheckedChange={() => onAlternarTodas(porEmitir)}
                  aria-label={`Seleccionar todas las facturas de ${titulo.toLowerCase()}`}
                  data-testid={`facturacion-${testid}-todas`}
                />
              </TableHead>
              <TableHead className="whitespace-nowrap">Contrato</TableHead>
              <TableHead className="whitespace-nowrap">Tercero</TableHead>
              <TableHead className="whitespace-nowrap">Inmueble</TableHead>
              <TableHead className="whitespace-nowrap">Concepto</TableHead>
              <TableHead className="whitespace-nowrap text-right">Período</TableHead>
              <TableHead className="whitespace-nowrap text-right">Monto</TableHead>
              <TableHead className="whitespace-nowrap">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="p-0">
                  <SinDatos
                    queSon={`facturas de ${titulo.toLowerCase()} este mes`}
                    icono={Receipt}
                    descripcion={descripcion}
                  />
                </TableCell>
              </TableRow>
            ) : (
              pageItems.map((factura) => {
                const emitida = factura.estado === 'EMITIDA'
                return (
                  <TableRow
                    key={factura.clave}
                    data-testid={`factura-${factura.clave}`}
                    className={emitida ? 'opacity-70' : undefined}
                  >
                    <TableCell className="w-10">
                      <Checkbox
                        checked={!emitida && seleccion.has(factura.clave)}
                        disabled={emitida || ocupado}
                        onCheckedChange={() => onAlternarUna(factura.clave)}
                        aria-label={
                          emitida
                            ? 'Ya emitida'
                            : `Seleccionar la factura de ${factura.terceroNombre}`
                        }
                      />
                    </TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {/* El número que la inmobiliaria conoce es el suyo (el
                          Nui), no nuestro consecutivo. Se muestran los dos
                          diciendo cuál es cuál. */}
                      <span className="font-medium text-fg">
                        {factura.numeroExterno ?? `#${factura.codigo ?? '—'}`}
                      </span>
                      {factura.numeroExterno && factura.codigo !== null && (
                        <span className="text-fg-muted"> · #{factura.codigo}</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[220px]">
                      <p className="truncate text-fg">{factura.terceroNombre}</p>
                      {factura.terceroDocumento && (
                        <p className="truncate text-caption text-fg-muted tabular-nums">
                          {factura.terceroDocumento}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[220px]">
                      <p className="truncate text-fg-muted">{factura.inmueble}</p>
                    </TableCell>
                    <TableCell className="max-w-[240px]">
                      <p className="truncate text-fg-muted">
                        {conceptosLegibles(factura)}
                      </p>
                      {factura.deduccionAlEgresoCop > 0 && (
                        <p className="truncate text-caption text-fg-muted">
                          {formatCurrency(factura.deduccionAlEgresoCop)} van a
                          deducción del egreso, no a la factura
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums text-fg-muted">
                      {factura.diasFacturados === factura.diasDelMes
                        ? 'Mes completo'
                        : `${factura.diasFacturados} de ${factura.diasDelMes} días`}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums font-medium text-fg">
                      {formatCurrency(factura.totalCop)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {emitida ? (
                        <span className="text-caption text-fg-muted">
                          Emitida · N° {factura.numero}
                        </span>
                      ) : (
                        <span className="text-caption text-primary">Por emitir</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {shouldPaginate && (
        <div className="border-t border-border px-4 py-3">
          <TablePagination
            total={total}
            page={page}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}
    </section>
  )
}

export function NuevaFactura() {
  const [mes, setMes] = useState(() => mesActual())
  const [datos, setDatos] = useState<FacturasPorGenerar | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set())
  const [generando, setGenerando] = useState(false)

  const meses = useMemo(() => mesesParaElegir(), [])

  const cargar = useCallback(
    async (elMes: string) => {
      setCargando(true)
      setError(null)
      try {
        const r = await facturacionPorMesService.porGenerar(elMes)
        setDatos(r)
        // Todo lo que está por emitir arranca seleccionado: el pedido es
        // facturar el mes, no ir marcando 800 casillas. Desmarcar lo que
        // sobra es mucho menos trabajo que marcar lo que falta.
        setSeleccion(
          new Set(
            [...r.inquilinos, ...r.propietarios]
              .filter((f) => f.estado === 'POR_EMITIR')
              .map((f) => f.clave),
          ),
        )
      } catch (e) {
        setError(e)
        setDatos(null)
      } finally {
        setCargando(false)
      }
    },
    [],
  )

  useEffect(() => {
    void cargar(mes)
  }, [cargar, mes])

  const alternarUna = (clave: string) => {
    setSeleccion((previa) => {
      const siguiente = new Set(previa)
      if (siguiente.has(clave)) siguiente.delete(clave)
      else siguiente.add(clave)
      return siguiente
    })
  }

  const alternarTodas = (claves: string[]) => {
    setSeleccion((previa) => {
      const siguiente = new Set(previa)
      if (claves.every((c) => siguiente.has(c))) {
        for (const c of claves) siguiente.delete(c)
      } else {
        for (const c of claves) siguiente.add(c)
      }
      return siguiente
    })
  }

  const elegidas = useMemo(() => [...seleccion], [seleccion])
  const totalElegido = useMemo(() => {
    if (!datos) return 0
    return [...datos.inquilinos, ...datos.propietarios]
      .filter((f) => seleccion.has(f.clave) && f.estado === 'POR_EMITIR')
      .reduce((s, f) => s + f.totalCop, 0)
  }, [datos, seleccion])

  async function generar() {
    if (elegidas.length === 0) return
    setGenerando(true)
    try {
      const r = await facturacionPorMesService.generar(mes, elegidas)
      const partes = [
        `${r.emitidas} ${r.emitidas === 1 ? 'factura emitida' : 'facturas emitidas'}`,
        formatCurrency(r.totalCop),
      ]
      if (r.yaEstaban > 0) partes.push(`${r.yaEstaban} ya estaban emitidas`)
      toast.success(partes.join(' · '))
      await cargar(mes)
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : 'No se pudieron emitir las facturas.',
      )
    } finally {
      setGenerando(false)
    }
  }

  const vacio =
    datos !== null &&
    datos.inquilinos.length === 0 &&
    datos.propietarios.length === 0

  return (
    <div className="space-y-4">
      {/* 🔴 Lo que esta pantalla todavía NO hace. Se dice, no se deja adivinar
          por un total que no cuadra con lo que el contador espera. */}
      <div className="rounded-lg bg-surface-muted border border-border p-3 flex items-start gap-2.5">
        <Info className="w-5 h-5 text-fg-muted flex-shrink-0 mt-0.5" weight="fill" />
        <p className="text-caption text-fg-muted">
          Los montos salen del contrato: canon, administración, conceptos y la
          comisión pactada. Todavía no se calculan IVA ni retenciones —eso llega
          con el escenario tributario del contrato— y el número de la factura es
          el consecutivo interno de la inmobiliaria, no una numeración
          autorizada por la DIAN.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="facturacion-mes"
            className="text-caption font-medium text-fg"
          >
            Mes de facturación
          </label>
          <Select value={mes} onValueChange={setMes}>
            <SelectTrigger
              id="facturacion-mes"
              className="w-56"
              data-testid="facturacion-selector-mes"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {meses.map((m) => (
                <SelectItem key={m} value={m}>
                  {mesLegible(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col items-start gap-1.5 sm:items-end">
          {datos && (
            <p className="text-caption text-fg-muted tabular-nums">
              {datos.totales.contratosDelMes}{' '}
              {datos.totales.contratosDelMes === 1 ? 'contrato toca' : 'contratos tocan'}{' '}
              {mesLegible(mes)}
              {elegidas.length > 0 && ` · ${formatCurrency(totalElegido)} seleccionados`}
            </p>
          )}
          <Button
            hideArrow
            disabled={elegidas.length === 0 || generando || cargando}
            onClick={() => void generar()}
            data-testid="facturacion-generar"
          >
            {generando ? (
              <Spinner className="h-4 w-4" />
            ) : (
              <Receipt className="h-4 w-4" weight="bold" />
            )}
            {generando
              ? 'Generando…'
              : `Generar ${elegidas.length} ${elegidas.length === 1 ? 'factura' : 'facturas'}`}
          </Button>
        </div>
      </div>

      <EstadoDeDatos
        cargando={cargando}
        error={error}
        vacio={vacio}
        queEs="las facturas del mes"
        onReintentar={() => void cargar(mes)}
        cuandoVacio={
          <SinDatos
            queSon={`facturas por generar en ${mesLegible(mes)}`}
            icono={Receipt}
            descripcion="Ningún contrato de la inmobiliaria cubre ese mes. Elige otro mes o revisa las fechas de los contratos."
          />
        }
      >
        {datos && (
          <div className="space-y-4">
            <TablaDeFacturas
              titulo="Inquilinos"
              descripcion="El canon del período y los conceptos que se le facturan al inquilino."
              filas={datos.inquilinos}
              seleccion={seleccion}
              onAlternarUna={alternarUna}
              onAlternarTodas={alternarTodas}
              ocupado={generando}
              testid="inquilinos"
            />
            <TablaDeFacturas
              titulo="Propietarios"
              descripcion="La comisión de administración del mes. Lo que el propietario paga y no se factura va a deducción del egreso."
              filas={datos.propietarios}
              seleccion={seleccion}
              onAlternarUna={alternarUna}
              onAlternarTodas={alternarTodas}
              ocupado={generando}
              testid="propietarios"
            />

            {/* Los contratos que tocan el mes y NO generan factura. Sin esto,
                la diferencia entre «735 contratos» y «730 facturas» no tiene
                explicación en ninguna parte. */}
            {datos.omitidos.length > 0 && (
              <details
                className="rounded-lg border border-border bg-surface p-4"
                data-testid="facturacion-omitidos"
              >
                <summary className="cursor-pointer text-body-sm text-fg flex items-center gap-2">
                  <Warning className="h-4 w-4 text-fg-muted" weight="fill" />
                  {datos.omitidos.length} contratos del mes no generan factura
                </summary>
                <ul className="mt-3 space-y-1.5">
                  {datos.omitidos.slice(0, 50).map((o) => (
                    <li
                      key={`${o.contractId}-${o.destinatario}`}
                      className="text-caption text-fg-muted"
                    >
                      <span className="tabular-nums">#{o.codigo ?? '—'}</span> ·{' '}
                      {o.inmueble} ·{' '}
                      {o.destinatario === 'INQUILINO' ? 'inquilino' : 'propietario'}:{' '}
                      {o.motivo}
                    </li>
                  ))}
                  {datos.omitidos.length > 50 && (
                    <li className="text-caption text-fg-muted">
                      …y {datos.omitidos.length - 50} más.
                    </li>
                  )}
                </ul>
              </details>
            )}
          </div>
        )}
      </EstadoDeDatos>
    </div>
  )
}
