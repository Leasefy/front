'use client'

/**
 * El cuadre Wompi → la cuenta de Leasefy: lo que Wompi reportó (y desembolsó)
 * frente a lo que Leasefy ya liquidó, por desembolso, con cada diferencia
 * MARCADA y su frase. No corrige nada: dice qué mirar.
 */

import { useState } from 'react'
import { CrossFade, Eyebrow } from '@leasefy/cadence'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { Pill } from '@/components/admin/Pill'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/admin/screen/states'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { aFechaIso, hoyLocal } from '@/lib/fechas-locales'
import { pesos } from '@/lib/admin/documento-de-la-liquidacion'
import {
  cuadreDelRecaudo,
  NOMBRE_DE_LA_DIFERENCIA,
  NOMBRE_DEL_DESEMBOLSO,
  TONO_DEL_DESEMBOLSO,
  type TipoDeDiferencia,
} from '@/lib/admin/recaudo-en-linea'
import { Cifra, Etiqueta } from './partes'
import { Card } from '@leasefy/cadence'
import { Input } from '@/components/ui/input'

const TONO_DE_LA_DIFERENCIA: Record<TipoDeDiferencia, 'bad' | 'warn'> = {
  'no-cuadra': 'warn',
  'liquidada-con-otros-valores': 'bad',
  'liquidada-no-aprobada': 'bad',
  'registrada-sin-reporte': 'warn',
}

/** «1 pago», «3 pagos». */
const pagos = (n: number, cola = '', colaPlural = cola) => `${n} ${n === 1 ? 'pago' : 'pagos'}${n === 1 ? cola : colaPlural}`

function primeroDelMes(): string {
  const h = hoyLocal()
  return aFechaIso(new Date(h.getFullYear(), h.getMonth(), 1))
}

export function CuadreDelRecaudo({ version }: { version: number }) {
  const [desde, setDesde] = useState(primeroDelMes)
  const [hasta, setHasta] = useState(() => aFechaIso(hoyLocal()))
  const valido = !!desde && !!hasta && desde <= hasta

  const { data, isLoading, error } = useApiQuery(
    (signal) => cuadreDelRecaudo(desde, hasta, signal),
    [desde, hasta, version],
    valido,
  )
  const c = data?.cuadre ?? null

  return (
    <div data-testid="cuadre-del-recaudo">
      <Card className="p-5">
        <Eyebrow>Cuadre Wompi a la cuenta de Leasefy</Eyebrow>
        <p className="text-body-sm text-fg-muted mt-2">
          Lo que Wompi reportó y le desembolsó a Leasefy, frente a lo que Leasefy ya liquidó a las
          inmobiliarias. Por la fecha del pago.
        </p>
        <div className="flex flex-wrap gap-4 mt-4">
          <label className="block">
            <Etiqueta>desde</Etiqueta>
            <Input type="date" className="mt-1" value={desde} onChange={(e) => setDesde(e.target.value)} data-testid="cuadre-desde" />
          </label>
          <label className="block">
            <Etiqueta>hasta</Etiqueta>
            <Input type="date" className="mt-1" value={hasta} onChange={(e) => setHasta(e.target.value)} data-testid="cuadre-hasta" />
          </label>
        </div>
        {!valido ? (
          <p className="text-body-sm text-danger mt-3">Elige las dos fechas; «desde» va antes de «hasta».</p>
        ) : null}
      </Card>

      <CrossFade swapKey={isLoading ? 'cargando' : error ? 'error' : c ? `listo-${desde}-${hasta}` : 'vacio'} className="mt-4">
        {isLoading ? (
          <LoadingBlock label="cuadrando" />
        ) : error ? (
          <ErrorBlock error={error} />
        ) : !data || !data.disponible || !c ? (
          <EmptyBlock title="Todavía no hay nada que cuadrar" hint="Sube un reporte de Wompi para empezar." />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4" data-testid="totales-del-cuadre">
              <Card className="p-4">
                <Cifra nombre="wompi reportó (neto aprobado)" valor={pesos(c.totales.reportadoNetoCop)} />
                <p className="text-body-sm text-fg-muted mt-1">
                  {c.totales.aprobadas} aprobadas de {c.totales.transacciones} · bruto {pesos(c.totales.reportadoBrutoCop)}
                </p>
              </Card>
              <Card className="p-4">
                <Cifra nombre="ya liquidado (neto)" valor={pesos(c.totales.liquidadoNetoCop)} tono="bien" />
              </Card>
              <Card className="p-4">
                <Cifra
                  nombre="por liquidar"
                  valor={pesos(c.totales.porLiquidarNetoCop)}
                  tono={c.totales.porLiquidar > 0 ? 'ojo' : 'normal'}
                />
                <p className="text-body-sm text-fg-muted mt-1">{pagos(c.totales.porLiquidar, ' que cuadra', ' que cuadran')}</p>
              </Card>
              <Card className="p-4">
                <Cifra
                  nombre="sin cuadrar"
                  valor={pesos(c.totales.sinCuadrarNetoCop)}
                  tono={c.totales.sinCuadrar > 0 ? 'mal' : 'normal'}
                />
                <p className="text-body-sm text-fg-muted mt-1">
                  {pagos(c.totales.sinCuadrar, ' que no se puede liquidar', ' que no se pueden liquidar')}
                </p>
              </Card>
              <Card className="p-4" data-testid="diferencia-del-cuadre">
                <Cifra
                  nombre="liquidado distinto de lo reportado"
                  valor={pesos(c.totales.diferenciaCop)}
                  tono={c.totales.diferenciaCop !== 0 ? 'mal' : 'bien'}
                />
              </Card>
              <Card className="p-4">
                <Cifra
                  nombre="registradas sin reporte"
                  valor={pesos(c.totales.registradasSinReporteCop)}
                  tono={c.totales.registradasSinReporte > 0 ? 'ojo' : 'normal'}
                />
                <p className="text-body-sm text-fg-muted mt-1">{pagos(c.totales.registradasSinReporte)}</p>
              </Card>
            </div>

            {c.desembolsos.length > 0 ? (
              <Card className="overflow-x-auto">
                <Table data-testid="desembolsos-del-cuadre">
                  <TableHeader>
                    <TableRow className="border-b border-border text-left">
                      <TableHead ><Etiqueta>desembolso</Etiqueta></TableHead>
                      <TableHead ><Etiqueta>fecha</Etiqueta></TableHead>
                      <TableHead className="text-right"><Etiqueta>pagos</Etiqueta></TableHead>
                      <TableHead className="text-right"><Etiqueta>wompi (neto)</Etiqueta></TableHead>
                      <TableHead className="text-right"><Etiqueta>liquidado</Etiqueta></TableHead>
                      <TableHead className="text-right"><Etiqueta>por liquidar</Etiqueta></TableHead>
                      <TableHead className="text-right"><Etiqueta>sin cuadrar</Etiqueta></TableHead>
                      <TableHead className="text-right"><Etiqueta>diferencia</Etiqueta></TableHead>
                      <TableHead ><Etiqueta>estado</Etiqueta></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {c.desembolsos.map((d) => (
                      <TableRow key={d.desembolsoId ?? 'sin-desembolso'}>
                        <TableCell className="font-mono">{d.desembolsoId ?? 'Sin desembolso todavía'}</TableCell>
                        <TableCell >{d.fecha ?? '—'}</TableCell>
                        <TableCell className="text-right tabular-nums">{d.transacciones}</TableCell>
                        <TableCell className="text-right tabular-nums">{pesos(d.netoCop)}</TableCell>
                        <TableCell className="text-right tabular-nums">{pesos(d.liquidadoNetoCop)}</TableCell>
                        <TableCell className="text-right tabular-nums">{pesos(d.porLiquidarNetoCop)}</TableCell>
                        <TableCell className="text-right tabular-nums">{pesos(d.sinCuadrarNetoCop)}</TableCell>
                        <TableCell className={`px-3 py-2 text-right tabular-nums ${d.diferenciaCop !== 0 ? 'text-danger' : ''}`}>
                          {pesos(d.diferenciaCop)}
                        </TableCell>
                        <TableCell >
                          <Pill tone={TONO_DEL_DESEMBOLSO[d.estado]}>{NOMBRE_DEL_DESEMBOLSO[d.estado]}</Pill>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            ) : null}

            {c.diferencias.length > 0 ? (
              <Card className="p-5" data-testid="diferencias-del-cuadre">
                <Etiqueta>diferencias marcadas</Etiqueta>
                <ul className="mt-3 space-y-3">
                  {c.diferencias.map((d) => (
                    <li key={`${d.tipo}-${d.transaccionId}`} className="text-body-sm" data-testid={`diferencia-${d.transaccionId}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <Pill tone={TONO_DE_LA_DIFERENCIA[d.tipo]}>{NOMBRE_DE_LA_DIFERENCIA[d.tipo]}</Pill>
                        <span className="font-mono text-fg">{d.transaccionId}</span>
                        {d.inmobiliaria ? <span className="text-fg-muted">{d.inmobiliaria}</span> : null}
                        {d.fecha ? <span className="text-fg-subtle">{d.fecha}</span> : null}
                      </div>
                      <p className="text-fg mt-1">{d.detalle}</p>
                    </li>
                  ))}
                </ul>
                {data.diferenciasOmitidas > 0 ? (
                  <p className="text-body-sm text-fg-muted mt-3">
                    Y {data.diferenciasOmitidas} diferencias más: acorta el rango para verlas.
                  </p>
                ) : null}
              </Card>
            ) : (
              <p className="text-sm text-success" data-testid="sin-diferencias">
                Sin diferencias en este rango: lo reportado por Wompi cuadra con lo liquidado y lo que falta por liquidar.
              </p>
            )}
            {data.sinFecha > 0 ? (
              <p className="text-body-sm text-warning">
                {data.sinFecha} {data.sinFecha === 1 ? 'transacción del reporte no trae' : 'transacciones del reporte no traen'} fecha
                ni desembolso: ningún rango {data.sinFecha === 1 ? 'la' : 'las'} alcanza.
              </p>
            ) : null}
          </div>
        )}
      </CrossFade>
    </div>
  )
}
