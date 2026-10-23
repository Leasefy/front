'use client'

/**
 * «Saldo del sistema anterior recaudado» (Nico, 10-10-2026).
 *
 * El saldo que cada inquilino traía del sistema anterior (columna «Saldo» del
 * archivo de contratos) entra a la cartera y se cobra como cualquier deuda,
 * con interés desde la fecha de corte. Lo que se recauda de él NO se le gira
 * solo al propietario: finanzas decide qué se gira. Esta es la lista para
 * decidirlo: cuánto era, cuánto entró y cuánto falta, primero lo que ya entró.
 *
 * 🔴 Acá no se suma nada: los totales y el orden los manda el back.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ClockCounterClockwise, MagnifyingGlass } from '@phosphor-icons/react'

import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { TablePagination } from '@/components/ui/pagination'
import { PAGE_SIZE_OPTIONS, useTablePagination } from '@/lib/hooks/use-table-pagination'
import { CifraHeroe } from '@/components/pantalla/CifraHeroe'
import { cn } from '@/lib/utils'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { SinDatos } from '@/components/estado/SinDatos'
import { formatCurrency } from '@/lib/types/inmobiliaria'
import {
  saldoDelSistemaAnteriorApi,
  type SaldoDelSistemaAnterior as Lista,
} from '@/lib/api/saldo-del-sistema-anterior.service'

/** Una cifra en cero no informa: «—» atenuado. */
function PlataOGuion({ valor, className }: { valor: number; className?: string }) {
  return valor === 0 ? (
    <span className="text-fg-subtle">—</span>
  ) : (
    <span className={cn('font-mono tabular-nums', className)}>{formatCurrency(valor)}</span>
  )
}

export function SaldoDelSistemaAnterior() {
  const [lista, setLista] = useState<Lista | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<unknown>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      setLista(await saldoDelSistemaAnteriorApi.lista())
    } catch (e) {
      setError(e)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  /* Ronda 30 (revisora r27 y la regla de Nico: «las tablas siempre con buscador y paginación»). */
  const [busqueda, setBusqueda] = useState('')
  const filas = useMemo(() => {
    const q = busqueda.trim().toLocaleLowerCase('es')
    const todas = lista?.filas ?? []
    if (!q) return todas
    return todas.filter((f) =>
      [f.inquilino, f.propietario, f.inmueble, f.contrato].some((x) => (x ?? '').toString().toLocaleLowerCase('es').includes(q)),
    )
  }, [lista, busqueda])
  const pag = useTablePagination(filas, { resetKey: busqueda })

  return (
    <div className="space-y-6" data-testid="saldo-del-sistema-anterior">
      <EstadoDeDatos
        cargando={cargando && !lista}
        error={error}
        queEs="el saldo del sistema anterior"
        onReintentar={cargar}
        principal
      >
        {lista && (
          <>
            {/* Ronda 26 (revisora r25, Saldo anterior #1): UNA cifra —lo que falta recaudar de lo que traían— con
                su barra recaudado · por recaudar, en vez de tres tarjetas del mismo peso. «Por recaudar» ya no va en
                rojo: no es mora, es saldo. */}
            <CifraHeroe
              rotulo="Por recaudar"
              cifra={<span data-testid="total-pendiente-anterior">{formatCurrency(lista.totales.pendienteCop)}</span>}
              contexto={
                <>
                  de los <span className="font-mono tabular-nums" data-testid="total-saldo-anterior">{formatCurrency(lista.totales.saldoCop)}</span>{' '}
                  que traían {lista.totales.contratos === 1 ? '1 contrato' : `${lista.totales.contratos} contratos`} a la fecha de corte
                </>
              }
              total={lista.totales.saldoCop}
              tramos={[
                {
                  clave: 'recaudado',
                  etiqueta: 'Recaudado: falta decidir si se gira',
                  monto: lista.totales.recaudadoCop,
                  tono: 'exito',
                  cifra: <span data-testid="total-recaudado-anterior">{formatCurrency(lista.totales.recaudadoCop)}</span>,
                  siempre: true,
                },
                {
                  /* Ronda 30 (revisora r27): sin repetir la plata de «Por recaudar», que es la cifra grande. */
                  clave: 'por-recaudar',
                  etiqueta: 'Por recaudar: sigue en la cartera, con su interés de mora',
                  monto: lista.totales.pendienteCop,
                  tono: 'neutro',
                  cifra: null,
                },
              ]}
              pie={
                /* Ronda 30 (revisora r27): el aviso va al pie de la cifra, no antes de la respuesta. */
                lista.aviso ? (
                  <p className="flex items-baseline gap-2 text-body-sm text-fg" data-testid="aviso-no-se-gira-solo">
                    <span className="h-1.5 w-1.5 shrink-0 translate-y-[-2px] self-center rounded-full bg-warning-500" aria-hidden="true" />
                    <span>{lista.aviso}</span>
                  </p>
                ) : null
              }
              esCero={lista.totales.saldoCop === 0}
              cuandoEsCero="Ningún contrato trae saldo del sistema anterior."
              data-testid="cifra-saldo-anterior"
            />

            {lista.filas.length === 0 ? (
              <SinDatos
                queSon="saldos del sistema anterior"
                icono={ClockCounterClockwise}
                titulo="Ningún contrato trae saldo del sistema anterior"
                descripcion="Se carga con la columna «Saldo» del archivo de contratos, al migrar o al volver a subirlo."
              />
            ) : (
            <Card className="overflow-hidden p-0">
              <div className="border-b border-border px-4 py-3">
                <div className="relative w-full sm:w-72">
                  <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" aria-hidden="true" />
                  <Input
                    className="pl-9"
                    placeholder="Buscar inquilino, propietario o inmueble"
                    aria-label="Buscar en el saldo del sistema anterior"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    data-testid="buscar-saldo-anterior"
                  />
                </div>
              </div>
              {/* Ronda 26 (#2 y UI): la primera columna es el inquilino (quien identifica), el contrato debajo;
                  los «$ 0» en «—»; a 390, una tarjeta por contrato (patrón de CuotasDelMesTabla). */}
              <Table className="max-md:block">
                <TableHeader className="max-md:hidden">
                  <TableRow>
                    <TableHead>Inquilino</TableHead>
                    <TableHead>Propietario</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead className="text-right">Recaudado</TableHead>
                    <TableHead className="text-right">Por recaudar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="max-md:block">
                  {filas.length === 0 ? (
                    <TableRow className="max-md:block">
                      <TableCell colSpan={5} className="max-md:block">
                        <SinDatos
                          hayFiltros
                          queSon="saldos del sistema anterior"
                          titulo="Ningún contrato coincide con la búsqueda"
                          onLimpiarFiltros={() => setBusqueda('')}
                        />
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {pag.pageItems.map((f) => (
                    <TableRow
                      key={f.contractId}
                      data-testid="fila-saldo-anterior"
                      className="max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-x-4 max-md:gap-y-1 max-md:border-b max-md:border-border max-md:px-4 max-md:py-3"
                    >
                      <TableCell className="max-md:col-start-1 max-md:row-start-1 max-md:block max-md:p-0">
                        <p className="font-medium text-fg">{f.inquilino ?? 'Sin nombre registrado'}</p>
                        <p className="text-caption text-fg-muted">
                          <a
                            href={`/panel/inmobiliaria/contratos/${f.contractId}`}
                            className="underline-offset-2 hover:text-fg hover:underline"
                          >
                            {f.contrato ? `#${f.contrato}` : 'Ver contrato'}
                          </a>
                          {f.inmueble ? ` · ${f.inmueble}` : ''}
                        </p>
                      </TableCell>
                      <TableCell className="max-md:col-span-2 max-md:row-start-2 max-md:block max-md:p-0 max-md:text-caption max-md:text-fg-muted">
                        <span className="md:hidden">Propietario: </span>
                        {f.propietario ?? '—'}
                      </TableCell>
                      <TableCell className="text-right max-md:hidden">
                        <PlataOGuion valor={f.saldoCop} />
                      </TableCell>
                      <TableCell className="text-right max-md:col-span-2 max-md:row-start-3 max-md:block max-md:p-0 max-md:text-left max-md:text-caption">
                        <span className="text-fg-muted md:hidden">Recaudado </span>
                        <PlataOGuion valor={f.recaudadoCop} />
                        <span className="text-fg-muted md:hidden"> de {formatCurrency(f.saldoCop)}</span>
                      </TableCell>
                      <TableCell className="text-right max-md:col-start-2 max-md:row-start-1 max-md:block max-md:p-0">
                        <PlataOGuion valor={f.pendienteCop} className="text-fg" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filas.length > 0 ? (
                <div className="border-t border-border px-4 py-3">
                  <TablePagination
                    total={pag.total}
                    page={pag.page}
                    pageSize={pag.pageSize}
                    pageSizeOptions={PAGE_SIZE_OPTIONS}
                    onPageChange={pag.setPage}
                    onPageSizeChange={pag.setPageSize}
                  />
                </div>
              ) : null}
            </Card>
            )}
          </>
        )}
      </EstadoDeDatos>
    </div>
  )
}
