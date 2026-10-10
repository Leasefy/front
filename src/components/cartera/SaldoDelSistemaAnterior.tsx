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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { SinDatos } from '@/components/estado/SinDatos'
import { formatCurrency } from '@/lib/types/inmobiliaria'
import {
  saldoDelSistemaAnteriorApi,
  type SaldoDelSistemaAnterior as Lista,
} from '@/lib/api/saldo-del-sistema-anterior.service'

function Cifra({
  rotulo,
  valor,
  tono,
  explicacion,
  testid,
}: {
  rotulo: string
  valor: number
  tono?: string
  explicacion: string
  testid: string
}) {
  return (
    <Card className="p-4">
      <p className="text-xs text-fg-muted">{rotulo}</p>
      <p className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${tono ?? 'text-fg'}`} data-testid={testid}>
        {formatCurrency(valor)}
      </p>
      <p className="mt-1 text-xs text-fg-muted">{explicacion}</p>
    </Card>
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

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Cifra
                rotulo="Saldo que traían"
                valor={lista.totales.saldoCop}
                explicacion={`De ${lista.totales.contratos} ${lista.totales.contratos === 1 ? 'contrato' : 'contratos'}, a la fecha de corte.`}
                testid="total-saldo-anterior"
              />
              <Cifra
                rotulo="Recaudado"
                valor={lista.totales.recaudadoCop}
                tono="text-success"
                explicacion="Lo que ya entró. Esto es lo que falta decidir si se gira."
                testid="total-recaudado-anterior"
              />
              <Cifra
                rotulo="Por recaudar"
                valor={lista.totales.pendienteCop}
                tono="text-danger"
                explicacion="Sigue en la cartera, con su interés de mora."
                testid="total-pendiente-anterior"
              />
            </div>

            <Card className="overflow-hidden p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contrato</TableHead>
                    <TableHead>Inquilino</TableHead>
                    <TableHead>Propietario</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead className="text-right">Recaudado</TableHead>
                    <TableHead className="text-right">Por recaudar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lista.filas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="p-0">
                        <SinDatos
                          queSon="saldos del sistema anterior"
                          icono={ClockCounterClockwise}
                          titulo="Ningún contrato trae saldo del sistema anterior"
                          descripcion="Se carga con la columna «Saldo» del archivo de contratos, al migrar o al volver a subirlo."
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    lista.filas.map((f) => (
                      <TableRow key={f.contractId} data-testid="fila-saldo-anterior">
                        <TableCell>
                          <a
                            href={`/panel/inmobiliaria/contratos/${f.contractId}`}
                            className="font-medium text-fg underline-offset-2 hover:underline"
                          >
                            {f.contrato ? `#${f.contrato}` : 'Ver contrato'}
                          </a>
                          {f.inmueble && <p className="text-xs text-fg-muted">{f.inmueble}</p>}
                        </TableCell>
                        <TableCell>{f.inquilino ?? '—'}</TableCell>
                        <TableCell>{f.propietario ?? '—'}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">{formatCurrency(f.saldoCop)}</TableCell>
                        <TableCell
                          className={`text-right font-mono tabular-nums ${f.recaudadoCop > 0 ? 'text-success' : 'text-fg-muted'}`}
                        >
                          {formatCurrency(f.recaudadoCop)}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">{formatCurrency(f.pendienteCop)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </>
        )}
      </EstadoDeDatos>
    </div>
  )
}
