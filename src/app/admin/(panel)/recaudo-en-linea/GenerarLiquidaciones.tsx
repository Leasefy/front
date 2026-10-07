'use client'

/**
 * Generar A MANO las liquidaciones de un rango de fechas (Nico: «frecuencia
 * del giro: POR DEFINIR» — no se inventa una).
 *
 *   1. Rango, fecha del giro, inmobiliaria (o todas) y si sólo entran los
 *      pagos que Wompi ya le desembolsó a Leasefy (por defecto sí: no se gira
 *      plata que Leasefy todavía no tiene).
 *   2. Vista previa: una por inmobiliaria, con sus pagos y lo descontado tal
 *      como viene; lo que queda fuera, con su frase. Se puede anotar lo que
 *      Leasefy descuenta además (concepto y valor TAL COMO VIENEN: aquí no se
 *      calcula ninguna tarifa); con eso hay que volver a pedir la vista previa.
 *   3. Generar (con confirmación). Repetir no duplica: el back devuelve las
 *      mismas («ya estaba»).
 */

import { useState } from 'react'
import { Presence } from '@leasefy/cadence'

import { Pill } from '@/components/admin/Pill'
import { mensajeDelAdmin } from '@/lib/admin/errores-del-admin'
import { aFechaIso, hoyLocal } from '@/lib/fechas-locales'
import { pesos } from '@/lib/admin/documento-de-la-liquidacion'
import {
  generarLiquidaciones,
  vistaPreviaDeLiquidaciones,
  type DescuentoDeLeasefy,
  type EstadoDelResultado,
  type InmobiliariaDelRecaudo,
  type ResultadoDeLaGeneracion,
  type VistaPreviaDeLiquidaciones,
} from '@/lib/admin/recaudo-en-linea'
import { Cifra, ErrorDeLaAccion, Etiqueta } from './partes'

const NOMBRE_DEL_RESULTADO: Record<EstadoDelResultado, string> = {
  creada: 'generada',
  repetida: 'ya estaba',
  bloqueada: 'no se generó',
  fallida: 'no se generó',
}
const TONO_DEL_RESULTADO = { creada: 'ok', repetida: 'muted', bloqueada: 'bad', fallida: 'bad' } as const

/** El descuento que se está escribiendo (texto: un campo vacío no es cero). */
interface DescuentoEscrito {
  concepto: string
  valor: string
}

/** Pesos enteros escritos con o sin puntos. `null` si no es un número entero positivo. */
export function pesosEscritos(texto: string): number | null {
  const limpio = texto.replace(/[$\s.]/g, '')
  if (!/^\d+$/.test(limpio)) return null
  const n = Number(limpio)
  return Number.isSafeInteger(n) && n > 0 ? n : null
}

function primeroDelMes(): string {
  const h = hoyLocal()
  return aFechaIso(new Date(h.getFullYear(), h.getMonth(), 1))
}

export function GenerarLiquidaciones({
  inmobiliarias,
  alGenerar,
}: {
  inmobiliarias: InmobiliariaDelRecaudo[]
  alGenerar: () => void
}) {
  const hoy = aFechaIso(hoyLocal())
  const [desde, setDesde] = useState(primeroDelMes)
  const [hasta, setHasta] = useState(hoy)
  const [fechaDelGiro, setFechaDelGiro] = useState(hoy)
  const [agencyId, setAgencyId] = useState('')
  const [soloDesembolsadas, setSoloDesembolsadas] = useState(true)
  const [descuentos, setDescuentos] = useState<Record<string, DescuentoEscrito>>({})
  const [vista, setVista] = useState<VistaPreviaDeLiquidaciones | null>(null)
  const [vistaVieja, setVistaVieja] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [resultado, setResultado] = useState<ResultadoDeLaGeneracion | null>(null)
  const [ocupado, setOcupado] = useState<'viendo' | 'generando' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const problema = !desde || !hasta
    ? 'Elige las dos fechas del rango.'
    : desde > hasta
      ? 'La fecha «desde» va antes de la fecha «hasta».'
      : !fechaDelGiro
        ? 'Elige la fecha en que Leasefy va a girar.'
        : null

  /** Lo que se escribió en un descuento y no sirve (para no mandarlo a medias). */
  const descuentoMalo = Object.values(descuentos).find(
    (d) => (d.concepto.trim() || d.valor.trim()) && (d.concepto.trim().length < 2 || pesosEscritos(d.valor) === null),
  )

  const descuentosParaElBack = (): DescuentoDeLeasefy[] =>
    Object.entries(descuentos)
      .filter(([, d]) => d.concepto.trim().length >= 2 && pesosEscritos(d.valor) !== null)
      .map(([id, d]) => ({ agencyId: id, concepto: d.concepto.trim(), valorCop: pesosEscritos(d.valor)! }))

  const pedido = () => ({
    desde,
    hasta,
    agencyId: agencyId || undefined,
    soloDesembolsadas,
    descuentosDeLeasefy: descuentosParaElBack(),
  })

  function cambio<T>(fijar: (v: T) => void) {
    return (v: T) => {
      fijar(v)
      if (vista) setVistaVieja(true)
      setConfirmando(false)
      setResultado(null)
    }
  }

  async function verVistaPrevia() {
    if (problema || descuentoMalo) return
    setOcupado('viendo')
    setError(null)
    setResultado(null)
    try {
      setVista(await vistaPreviaDeLiquidaciones(pedido()))
      setVistaVieja(false)
    } catch (err) {
      setError(mensajeDelAdmin(err, { accion: 'ver qué se liquidaría', porDefecto: 'No se pudo armar la vista previa.' }))
    } finally {
      setOcupado(null)
    }
  }

  async function generar() {
    if (!vista || vistaVieja || problema || descuentoMalo) return
    setOcupado('generando')
    setError(null)
    try {
      const r = await generarLiquidaciones({ ...pedido(), fechaDelGiro })
      setResultado(r)
      setConfirmando(false)
      setVista(null)
      setDescuentos({})
      alGenerar()
    } catch (err) {
      setError(mensajeDelAdmin(err, { accion: 'generar las liquidaciones', porDefecto: 'No se pudieron generar las liquidaciones.' }))
    } finally {
      setOcupado(null)
    }
  }

  const generables = vista?.propuestas.filter((p) => !p.bloqueo) ?? []

  return (
    <div className="card p-5" data-testid="generar-liquidaciones">
      <div className="section-label">generar liquidaciones a mano</div>
      <p className="text-[13px] text-fg-muted mt-2">
        La frecuencia del giro está <strong>por definir</strong>: aquí se liquida el rango que elijas,
        por la fecha del pago. Un pago ya liquidado no vuelve a entrar.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-4">
        <label className="block">
          <Etiqueta>pagos desde</Etiqueta>
          <input type="date" className="input mt-1" value={desde} onChange={(e) => cambio(setDesde)(e.target.value)} data-testid="generar-desde" />
        </label>
        <label className="block">
          <Etiqueta>pagos hasta</Etiqueta>
          <input type="date" className="input mt-1" value={hasta} onChange={(e) => cambio(setHasta)(e.target.value)} data-testid="generar-hasta" />
        </label>
        <label className="block">
          <Etiqueta>fecha del giro</Etiqueta>
          <input
            type="date"
            className="input mt-1"
            value={fechaDelGiro}
            onChange={(e) => cambio(setFechaDelGiro)(e.target.value)}
            data-testid="generar-fecha-del-giro"
          />
        </label>
        <label className="block">
          <Etiqueta>inmobiliaria</Etiqueta>
          <select className="input mt-1" value={agencyId} onChange={(e) => cambio(setAgencyId)(e.target.value)} data-testid="generar-inmobiliaria">
            <option value="">Todas</option>
            {inmobiliarias.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex items-start gap-2 mt-4 text-sm text-fg">
        <input
          type="checkbox"
          className="mt-1"
          checked={soloDesembolsadas}
          onChange={(e) => cambio(setSoloDesembolsadas)(e.target.checked)}
          data-testid="solo-desembolsadas"
        />
        <span>
          Sólo los pagos que Wompi ya le desembolsó a Leasefy
          <span className="block text-[13px] text-fg-muted">
            Recomendado: así no se le gira a una inmobiliaria plata que Leasefy todavía no tiene.
          </span>
        </span>
      </label>
      {problema ? <p className="text-[13px] text-bad mt-3">{problema}</p> : null}

      <div className="flex flex-wrap gap-2 mt-4">
        <button
          type="button"
          className="btn"
          disabled={ocupado !== null || problema !== null || !!descuentoMalo}
          onClick={() => void verVistaPrevia()}
          data-testid="ver-vista-previa"
        >
          {ocupado === 'viendo' ? 'Armando…' : vista ? 'Actualizar la vista previa' : 'Ver qué se liquidaría'}
        </button>
      </div>

      <ErrorDeLaAccion mensaje={error} testId="error-de-generar" />

      <Presence show={resultado !== null}>
        {resultado ? (
          <div className="mt-4" data-testid="resultado-de-generar">
            <Etiqueta>resultado</Etiqueta>
            {resultado.resultados.length === 0 ? (
              <p className="text-sm text-fg mt-1">No había pagos por liquidar en ese rango.</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {resultado.resultados.map((r) => (
                  <li key={`${r.agencyId}-${r.numero}`} className="text-[13px] text-fg flex flex-wrap items-center gap-2">
                    <Pill tone={TONO_DEL_RESULTADO[r.estado]}>{NOMBRE_DEL_RESULTADO[r.estado]}</Pill>
                    <span className="font-mono">{r.numero}</span>
                    <span>{r.inmobiliaria ?? 'Sin nombre'}</span>
                    <span className="tabular-nums">{pesos(r.netoCop)}</span>
                    {r.motivo ? <span className="text-bad">{r.motivo}</span> : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </Presence>

      <Presence show={vista !== null}>
        {vista ? (
          <div className="mt-5" data-testid="vista-previa-de-liquidaciones">
            {vistaVieja ? (
              <p className="text-[13px] text-warn mb-3" data-testid="vista-vieja">
                Cambiaste algo: actualiza la vista previa antes de generar.
              </p>
            ) : null}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Cifra nombre="liquidaciones" valor={vista.totales.liquidaciones} />
              <Cifra nombre="bruto" valor={pesos(vista.totales.brutoCop)} />
              <Cifra nombre="neto que se gira" valor={pesos(vista.totales.netoCop)} tono="bien" />
              <Cifra nombre="pagos que quedan fuera" valor={vista.totales.pagosFuera} tono={vista.totales.pagosFuera > 0 ? 'ojo' : 'normal'} />
            </div>

            {vista.propuestas.length === 0 ? (
              <p className="text-sm text-fg mt-4">No hay pagos por liquidar en ese rango.</p>
            ) : (
              <div className="space-y-3 mt-4">
                {vista.propuestas.map((p) => {
                  const d = descuentos[p.agencyId] ?? { concepto: '', valor: '' }
                  return (
                    <div key={p.agencyId} className="border border-bg-border p-4" data-testid={`propuesta-${p.agencyId}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-fg">{p.inmobiliaria ?? 'Sin nombre'}</span>
                        <span className="font-mono text-[13px] text-fg-subtle">{p.numero}</span>
                        {p.bloqueo ? <Pill tone="bad">no se puede generar</Pill> : null}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mt-3">
                        <Cifra nombre="pagos" valor={p.cantidadDePagos} />
                        <Cifra nombre="bruto" valor={pesos(p.brutoCop)} />
                        <Cifra nombre="comisión" valor={pesos(p.comisionCop)} />
                        <Cifra nombre="iva" valor={pesos(p.ivaCop)} />
                        <Cifra nombre="retenciones" valor={pesos(p.retencionesCop)} />
                        <Cifra nombre="otros de leasefy" valor={pesos(p.otrosDescuentosCop)} />
                        <Cifra nombre="neto" valor={pesos(p.netoCop)} tono={p.bloqueo ? 'mal' : 'bien'} />
                      </div>
                      {p.bloqueo ? <p className="text-[13px] text-bad mt-2">{p.bloqueo}</p> : null}
                      <div className="grid gap-3 sm:grid-cols-[1fr_12rem] mt-3">
                        <label className="block">
                          <Etiqueta>otro descuento de leasefy (opcional, tal como viene)</Etiqueta>
                          <input
                            className="input mt-1"
                            value={d.concepto}
                            maxLength={120}
                            placeholder="Concepto"
                            onChange={(e) => {
                              const concepto = e.target.value
                              cambio(setDescuentos)({ ...descuentos, [p.agencyId]: { ...d, concepto } })
                            }}
                            data-testid={`descuento-concepto-${p.agencyId}`}
                          />
                        </label>
                        <label className="block">
                          <Etiqueta>valor (pesos)</Etiqueta>
                          <input
                            className="input mt-1"
                            value={d.valor}
                            inputMode="numeric"
                            placeholder="0"
                            onChange={(e) => {
                              const valor = e.target.value
                              cambio(setDescuentos)({ ...descuentos, [p.agencyId]: { ...d, valor } })
                            }}
                            data-testid={`descuento-valor-${p.agencyId}`}
                          />
                        </label>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {descuentoMalo ? (
              <p className="text-[13px] text-bad mt-3" data-testid="descuento-malo">
                Un descuento de Leasefy lleva su concepto y un valor en pesos enteros mayor que cero.
              </p>
            ) : null}

            {vista.fuera.length > 0 ? (
              <div className="mt-4" data-testid="pagos-fuera">
                <Etiqueta>pagos que quedan fuera</Etiqueta>
                <ul className="mt-2 space-y-1">
                  {vista.fuera.map((f) => (
                    <li key={f.transaccionId} className="text-[13px] text-fg">
                      <span className="font-mono text-fg-subtle">
                        {f.transaccionId}
                        {f.fecha ? ` · ${f.fecha}` : ''} · {pesos(f.brutoCop)}
                        {f.inmobiliaria ? ` · ${f.inmobiliaria}` : ''}
                      </span>{' '}
                      {f.motivo}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {vista.sinFecha > 0 ? (
              <p className="text-[13px] text-warn mt-3">
                {vista.sinFecha} {vista.sinFecha === 1 ? 'pago aprobado no trae' : 'pagos aprobados no traen'} fecha
                ni desembolso en el reporte: ningún rango {vista.sinFecha === 1 ? 'lo' : 'los'} alcanza. Sube un
                reporte que traiga la fecha.
              </p>
            ) : null}

            {generables.length > 0 ? (
              <div className="mt-5">
                {!confirmando ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={ocupado !== null || vistaVieja || !!descuentoMalo}
                    onClick={() => setConfirmando(true)}
                    data-testid="generar"
                  >
                    Generar {generables.length} {generables.length === 1 ? 'liquidación' : 'liquidaciones'}
                  </button>
                ) : null}
                <Presence show={confirmando}>
                  <div className="card p-4 border-l-4 border-l-brand" data-testid="confirmar-generar">
                    <p className="text-sm text-fg">
                      Se van a generar {generables.length}{' '}
                      {generables.length === 1 ? 'liquidación' : 'liquidaciones'} por{' '}
                      {pesos(vista.totales.netoCop)} de neto, con fecha del giro {fechaDelGiro}. Esto no mueve
                      plata: el giro lo hace Leasefy en su banco.
                    </p>
                    <div className="flex gap-2 mt-3">
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={ocupado !== null || vistaVieja}
                        onClick={() => void generar()}
                        data-testid="confirmar-generar-si"
                      >
                        {ocupado === 'generando' ? 'Generando…' : 'Sí, generarlas'}
                      </button>
                      <button type="button" className="btn btn-ghost" disabled={ocupado !== null} onClick={() => setConfirmando(false)}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                </Presence>
              </div>
            ) : null}
          </div>
        ) : null}
      </Presence>
    </div>
  )
}
