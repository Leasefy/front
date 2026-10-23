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

import { useCallback, useEffect, useState } from 'react'
import { ClockCounterClockwise } from '@phosphor-icons/react'

import { Card } from '@/components/ui/card'
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
            <Card className="border-warning/40 bg-warning-soft p-4" data-testid="aviso-no-se-gira-solo">
              <p className="text-sm text-fg">{lista.aviso}</p>
            </Card>

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
                  clave: 'por-recaudar',
                  etiqueta: 'Sigue en la cartera, con su interés de mora',
                  monto: lista.totales.pendienteCop,
                  tono: 'neutro',
                  cifra: formatCurrency(lista.totales.pendienteCop),
                },
              ]}
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
                  {lista.filas.map((f) => (
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
            </Card>
            )}
          </>
        )}
      </EstadoDeDatos>
    </div>
  )
}
