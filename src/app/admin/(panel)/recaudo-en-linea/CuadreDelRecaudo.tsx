'use client'

/**
 * El cuadre Wompi → la cuenta de Leasefy: lo que Wompi reportó (y desembolsó)
 * frente a lo que Leasefy ya liquidó, por desembolso, con cada diferencia
 * MARCADA y su frase. No corrige nada: dice qué mirar.
 */

import { useState } from 'react'
import { CrossFade } from '@leasefy/cadence'

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
      <div className="card p-5">
        <div className="section-label">cuadre wompi → cuenta de leasefy</div>
        <p className="text-[13px] text-fg-muted mt-2">
          Lo que Wompi reportó y le desembolsó a Leasefy, frente a lo que Leasefy ya liquidó a las
          inmobiliarias. Por la fecha del pago.
        </p>
        <div className="flex flex-wrap gap-4 mt-4">
          <label className="block">
            <Etiqueta>desde</Etiqueta>
            <input type="date" className="input mt-1" value={desde} onChange={(e) => setDesde(e.target.value)} data-testid="cuadre-desde" />
          </label>
          <label className="block">
            <Etiqueta>hasta</Etiqueta>
            <input type="date" className="input mt-1" value={hasta} onChange={(e) => setHasta(e.target.value)} data-testid="cuadre-hasta" />
          </label>
        </div>
        {!valido ? (
          <p className="text-[13px] text-bad mt-3">Elige las dos fechas; «desde» va antes de «hasta».</p>
        ) : null}
      </div>

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
              <div className="card p-4">
                <Cifra nombre="wompi reportó (neto aprobado)" valor={pesos(c.totales.reportadoNetoCop)} />
                <p className="text-[13px] text-fg-muted mt-1">
                  {c.totales.aprobadas} aprobadas de {c.totales.transacciones} · bruto {pesos(c.totales.reportadoBrutoCop)}
                </p>
              </div>
              <div className="card p-4">
                <Cifra nombre="ya liquidado (neto)" valor={pesos(c.totales.liquidadoNetoCop)} tono="bien" />
              </div>
              <div className="card p-4">
                <Cifra
                  nombre="por liquidar"
                  valor={pesos(c.totales.porLiquidarNetoCop)}
                  tono={c.totales.porLiquidar > 0 ? 'ojo' : 'normal'}
                />
                <p className="text-[13px] text-fg-muted mt-1">{pagos(c.totales.porLiquidar, ' que cuadra', ' que cuadran')}</p>
              </div>
              <div className="card p-4">
                <Cifra
                  nombre="sin cuadrar"
                  valor={pesos(c.totales.sinCuadrarNetoCop)}
                  tono={c.totales.sinCuadrar > 0 ? 'mal' : 'normal'}
                />
                <p className="text-[13px] text-fg-muted mt-1">
                  {pagos(c.totales.sinCuadrar, ' que no se puede liquidar', ' que no se pueden liquidar')}
                </p>
              </div>
              <div className="card p-4" data-testid="diferencia-del-cuadre">
                <Cifra
                  nombre="liquidado distinto de lo reportado"
                  valor={pesos(c.totales.diferenciaCop)}
                  tono={c.totales.diferenciaCop !== 0 ? 'mal' : 'bien'}
                />
              </div>
              <div className="card p-4">
                <Cifra
                  nombre="registradas sin reporte"
                  valor={pesos(c.totales.registradasSinReporteCop)}
                  tono={c.totales.registradasSinReporte > 0 ? 'ojo' : 'normal'}
                />
                <p className="text-[13px] text-fg-muted mt-1">{pagos(c.totales.registradasSinReporte)}</p>
              </div>
            </div>

            {c.desembolsos.length > 0 ? (
              <div className="card overflow-x-auto">
                <table className="w-full text-[13px] table-zebra" data-testid="desembolsos-del-cuadre">
                  <thead>
                    <tr className="border-b border-bg-border text-left">
                      <th className="px-3 py-2"><Etiqueta>desembolso</Etiqueta></th>
                      <th className="px-3 py-2"><Etiqueta>fecha</Etiqueta></th>
                      <th className="px-3 py-2 text-right"><Etiqueta>pagos</Etiqueta></th>
                      <th className="px-3 py-2 text-right"><Etiqueta>wompi (neto)</Etiqueta></th>
                      <th className="px-3 py-2 text-right"><Etiqueta>liquidado</Etiqueta></th>
                      <th className="px-3 py-2 text-right"><Etiqueta>por liquidar</Etiqueta></th>
                      <th className="px-3 py-2 text-right"><Etiqueta>sin cuadrar</Etiqueta></th>
                      <th className="px-3 py-2 text-right"><Etiqueta>diferencia</Etiqueta></th>
                      <th className="px-3 py-2"><Etiqueta>estado</Etiqueta></th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.desembolsos.map((d) => (
                      <tr key={d.desembolsoId ?? 'sin-desembolso'}>
                        <td className="px-3 py-2 font-mono">{d.desembolsoId ?? 'Sin desembolso todavía'}</td>
                        <td className="px-3 py-2">{d.fecha ?? '—'}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{d.transacciones}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{pesos(d.netoCop)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{pesos(d.liquidadoNetoCop)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{pesos(d.porLiquidarNetoCop)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{pesos(d.sinCuadrarNetoCop)}</td>
                        <td className={`px-3 py-2 text-right tabular-nums ${d.diferenciaCop !== 0 ? 'text-bad' : ''}`}>
                          {pesos(d.diferenciaCop)}
                        </td>
                        <td className="px-3 py-2">
                          <Pill tone={TONO_DEL_DESEMBOLSO[d.estado]}>{NOMBRE_DEL_DESEMBOLSO[d.estado]}</Pill>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {c.diferencias.length > 0 ? (
              <div className="card p-5" data-testid="diferencias-del-cuadre">
                <Etiqueta>diferencias marcadas</Etiqueta>
                <ul className="mt-3 space-y-3">
                  {c.diferencias.map((d) => (
                    <li key={`${d.tipo}-${d.transaccionId}`} className="text-[13px]" data-testid={`diferencia-${d.transaccionId}`}>
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
                  <p className="text-[13px] text-fg-muted mt-3">
                    Y {data.diferenciasOmitidas} diferencias más: acorta el rango para verlas.
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-ok" data-testid="sin-diferencias">
                Sin diferencias en este rango: lo reportado por Wompi cuadra con lo liquidado y lo que falta por liquidar.
              </p>
            )}
            {data.sinFecha > 0 ? (
              <p className="text-[13px] text-warn">
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
