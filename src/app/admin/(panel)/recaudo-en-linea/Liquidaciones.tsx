'use client'

/**
 * Las liquidaciones de Leasefy a cada inmobiliaria: por inmobiliaria, por
 * fecha del giro y por estado (generada → girada → conciliada en el banco de
 * la inmobiliaria). Cada una se abre con sus pagos, se descarga en Excel o PDF
 * y se marca «girada» cuando Leasefy transfirió. Desde la ola E (E6, Nico E2
 * Q2 a) una girada se puede DESMARCAR, con motivo obligatorio, y la historia
 * del giro queda a la vista.
 *
 * 🔴 Lo descontado se muestra TAL COMO VINO (reporte de Wompi o Leasefy):
 * esta pantalla no calcula ninguna tarifa.
 */

import { useState } from 'react'
import { Collapse, Presence } from '@leasefy/cadence'

import { Pill } from '@/components/admin/Pill'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/admin/screen/states'
import { Pagination } from '@/components/admin/screen/Pagination'
import { mensajeDelAdmin } from '@/lib/admin/errores-del-admin'
import { fmtDateTime } from '@/lib/admin/format'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { aFechaIso, hoyLocal } from '@/lib/fechas-locales'
import {
  exportarLiquidacionAExcel,
  exportarLiquidacionAPdf,
  pesos,
} from '@/lib/admin/documento-de-la-liquidacion'
import { usePlataConCentavos } from '@/lib/plata/use-plata-con-centavos'
import {
  desmarcarGirada,
  listarLiquidaciones,
  marcarGirada,
  MOTIVO_MAXIMO_PARA_DESMARCAR,
  MOTIVO_MINIMO_PARA_DESMARCAR,
  NOMBRE_DE_QUIEN_CONCILIO,
  NOMBRE_DEL_ESTADO,
  TONO_DEL_ESTADO,
  verLiquidacion,
  type DetalleDeLaLiquidacion,
  type EstadoDeLaLiquidacion,
  type FiltrosDeLiquidaciones,
  type InmobiliariaDelRecaudo,
  type LiquidacionDelRecaudo,
  type MovimientoDelGiro,
} from '@/lib/admin/recaudo-en-linea'
import { Cifra, ErrorDeLaAccion, Etiqueta } from './partes'
import { GenerarLiquidaciones } from './GenerarLiquidaciones'

const POR_PAGINA = 25

export function Liquidaciones({
  inmobiliarias,
  giroDisponible,
  version,
}: {
  inmobiliarias: InmobiliariaDelRecaudo[]
  giroDisponible: boolean
  /** Sube cuando otra parte de la pantalla cambió algo (importar un reporte). */
  version: number
}) {
  const [filtros, setFiltros] = useState<FiltrosDeLiquidaciones>({})
  const [pagina, setPagina] = useState(0)
  const [abierta, setAbierta] = useState<string | null>(null)
  const [generando, setGenerando] = useState(false)
  const rangoInvertido = !!filtros.desde && !!filtros.hasta && filtros.desde > filtros.hasta

  const { data, isLoading, error, refetch } = useApiQuery(
    (signal) => listarLiquidaciones({ ...filtros, pagina, porPagina: POR_PAGINA }, signal),
    [filtros.agencyId, filtros.desde, filtros.hasta, filtros.estado, pagina, version],
    !rangoInvertido,
  )

  const cambiar = (cambio: Partial<FiltrosDeLiquidaciones>) => {
    setFiltros((f) => ({ ...f, ...cambio }))
    setPagina(0)
    setAbierta(null)
  }

  return (
    <div data-testid="liquidaciones">
      <div className="card p-5">
        <div className="flex flex-wrap items-end gap-4">
          <label className="block min-w-[14rem]">
            <Etiqueta>inmobiliaria</Etiqueta>
            <select
              className="input mt-1"
              value={filtros.agencyId ?? ''}
              onChange={(e) => cambiar({ agencyId: e.target.value || undefined })}
              data-testid="filtro-inmobiliaria"
            >
              <option value="">Todas</option>
              {inmobiliarias.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <Etiqueta>giro desde</Etiqueta>
            <input
              type="date"
              className="input mt-1"
              value={filtros.desde ?? ''}
              onChange={(e) => cambiar({ desde: e.target.value || undefined })}
              data-testid="filtro-desde"
            />
          </label>
          <label className="block">
            <Etiqueta>giro hasta</Etiqueta>
            <input
              type="date"
              className="input mt-1"
              value={filtros.hasta ?? ''}
              onChange={(e) => cambiar({ hasta: e.target.value || undefined })}
              data-testid="filtro-hasta"
            />
          </label>
          <label className="block">
            <Etiqueta>estado</Etiqueta>
            <select
              className="input mt-1"
              value={filtros.estado ?? ''}
              onChange={(e) => cambiar({ estado: (e.target.value || undefined) as EstadoDeLaLiquidacion | undefined })}
              data-testid="filtro-estado"
            >
              <option value="">Todos</option>
              <option value="generada">Generada</option>
              <option value="girada">Girada</option>
              <option value="conciliada">Conciliada en el banco</option>
            </select>
          </label>
          <div className="ml-auto">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setGenerando((g) => !g)}
              aria-expanded={generando}
              data-testid="abrir-generar"
            >
              {generando ? 'Cerrar' : 'Generar liquidaciones'}
            </button>
          </div>
        </div>
        {rangoInvertido ? (
          <p className="text-[13px] text-bad mt-3" data-testid="rango-invertido">
            La fecha «desde» va antes de la fecha «hasta».
          </p>
        ) : null}
      </div>

      <Collapse open={generando}>
        <div className="pt-4">
          <GenerarLiquidaciones
            inmobiliarias={inmobiliarias}
            alGenerar={() => {
              setPagina(0)
              refetch()
            }}
          />
        </div>
      </Collapse>

      {data && data.disponible && data.total > 0 ? (
        <div className="grid grid-cols-3 gap-4 mt-4" data-testid="totales-de-liquidaciones">
          <div className="card p-4">
            <Cifra nombre="liquidaciones" valor={data.totales.liquidaciones} />
          </div>
          <div className="card p-4">
            <Cifra nombre="bruto" valor={pesos(data.totales.brutoCop)} />
          </div>
          <div className="card p-4">
            <Cifra nombre="neto que se gira" valor={pesos(data.totales.netoCop)} />
          </div>
        </div>
      ) : null}

      <div className="mt-4">
        {isLoading ? (
          <LoadingBlock label="cargando liquidaciones" />
        ) : error ? (
          <ErrorBlock error={error} />
        ) : !data || data.data.length === 0 ? (
          <EmptyBlock
            title="Ninguna liquidación con estos filtros"
            hint="Genera las de un rango de fechas con «Generar liquidaciones»: la frecuencia del giro está por definir."
          />
        ) : (
          <div className="space-y-px" data-testid="lista-de-liquidaciones">
            {data.data.map((l) => (
              <FilaDeLiquidacion
                key={l.id}
                liquidacion={l}
                abierta={abierta === l.id}
                alAbrir={() => setAbierta((a) => (a === l.id ? null : l.id))}
                giroDisponible={giroDisponible && data.giroDisponible}
                alCambiar={refetch}
              />
            ))}
          </div>
        )}
        {data ? <Pagination page={pagina} total={data.total} pageSize={POR_PAGINA} onPage={setPagina} /> : null}
      </div>
    </div>
  )
}

function FilaDeLiquidacion({
  liquidacion: l,
  abierta,
  alAbrir,
  giroDisponible,
  alCambiar,
}: {
  liquidacion: LiquidacionDelRecaudo
  abierta: boolean
  alAbrir: () => void
  giroDisponible: boolean
  alCambiar: () => void
}) {
  return (
    <div className="card" data-testid={`liquidacion-${l.numero}`}>
      <button
        type="button"
        className="w-full text-left p-4 hover:bg-bg-hover transition-colors"
        onClick={alAbrir}
        aria-expanded={abierta}
        data-testid={`abrir-${l.numero}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm text-fg">{l.numero}</span>
          <Pill tone={TONO_DEL_ESTADO[l.estado]}>{NOMBRE_DEL_ESTADO[l.estado]}</Pill>
          <span className="text-sm text-fg-muted">{l.inmobiliaria ?? 'Sin nombre'}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mt-3">
          <Cifra nombre="fecha del giro" valor={l.fechaDelGiro ?? '—'} />
          <Cifra nombre="pagos" valor={l.cantidadDePagos} />
          <Cifra nombre="bruto" valor={pesos(l.brutoCop)} />
          <Cifra nombre="comisión" valor={pesos(l.comisionCop)} />
          <Cifra nombre="iva" valor={pesos(l.ivaCop)} />
          <Cifra nombre="retenciones" valor={pesos(l.retencionesCop)} />
          <Cifra nombre="otros de leasefy" valor={pesos(l.otrosDescuentosCop)} />
          <Cifra nombre="neto" valor={pesos(l.netoCop)} tono="bien" />
        </div>
      </button>
      <Collapse open={abierta}>
        <DetalleDeLiquidacion id={l.id} giroDisponible={giroDisponible} alCambiar={alCambiar} />
      </Collapse>
    </div>
  )
}

function DetalleDeLiquidacion({
  id,
  giroDisponible,
  alCambiar,
}: {
  id: string
  giroDisponible: boolean
  alCambiar: () => void
}) {
  const [tick, setTick] = useState(0)
  const { data: l, isLoading, error } = useApiQuery((signal) => verLiquidacion(id, signal), [id, tick])
  const [exportando, setExportando] = useState<'xlsx' | 'pdf' | null>(null)
  const [errorDeAccion, setErrorDeAccion] = useState<string | null>(null)
  // «Centavos en todo» (P8 a): con la llave de la tesorería el PDF escribe
  // siempre los dos decimales; apagada, como siempre.
  const conCentavos = usePlataConCentavos('tesoreria_y_conciliacion')

  async function exportar(formato: 'xlsx' | 'pdf', d: DetalleDeLaLiquidacion) {
    setExportando(formato)
    setErrorDeAccion(null)
    try {
      if (formato === 'xlsx') await exportarLiquidacionAExcel(d)
      // Con la llave apagada, la llamada de siempre (sin opciones).
      else if (conCentavos) await exportarLiquidacionAPdf(d, { conCentavos })
      else await exportarLiquidacionAPdf(d)
    } catch (err) {
      setErrorDeAccion(
        mensajeDelAdmin(err, {
          accion: 'descargar la liquidación',
          porDefecto: 'No se pudo armar el archivo de la liquidación. Prueba de nuevo.',
        }),
      )
    } finally {
      setExportando(null)
    }
  }

  if (isLoading && !l) return <div className="px-4 pb-4"><LoadingBlock label="cargando pagos" /></div>
  if (error) return <div className="px-4 pb-4"><ErrorBlock error={error} /></div>
  if (!l) return null

  return (
    <div className="px-4 pb-5 border-t border-bg-border" data-testid={`detalle-${l.numero}`}>
      <div className="grid gap-4 sm:grid-cols-2 pt-4">
        <div>
          <Etiqueta>la inmobiliaria</Etiqueta>
          <p className="text-sm text-fg mt-1">
            {l.inmobiliaria ?? 'Sin nombre'} · NIT {l.nit ?? 'sin registrar'}
          </p>
          <p className="text-[13px] text-fg-muted mt-1">
            Referencia del giro: <span className="font-mono">{l.referenciaDelGiro}</span>
          </p>
          <p className="text-[13px] text-fg-muted">
            Generada por {l.creadaPor}
            {l.createdAt ? ` el ${fmtDateTime(l.createdAt)}` : ''}
          </p>
          <EstadoEnPalabras l={l} />
        </div>
        <div>
          <Etiqueta>bruto, descuentos y neto (tal como vienen)</Etiqueta>
          <ul className="mt-1 space-y-0.5 text-[13px]" data-testid="descuentos">
            <li className="flex justify-between gap-3">
              <span className="text-fg">Recaudado (bruto)</span>
              <span className="tabular-nums">{pesos(l.brutoCop)}</span>
            </li>
            {l.descuentos.map((d, i) => (
              <li key={`${d.concepto}-${i}`} className="flex justify-between gap-3">
                <span className="text-fg-muted">
                  {d.concepto}{' '}
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">
                    {d.fuente === 'leasefy' ? 'leasefy' : 'reporte de wompi'}
                  </span>
                </span>
                <span className="tabular-nums">−{pesos(d.valorCop)}</span>
              </li>
            ))}
            <li className="flex justify-between gap-3 border-t border-bg-border pt-1 font-medium">
              <span className="text-fg">Neto que se gira</span>
              <span className="tabular-nums">{pesos(l.netoCop)}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        <button
          type="button"
          className="btn"
          disabled={exportando !== null}
          onClick={() => void exportar('xlsx', l)}
          data-testid="descargar-excel"
        >
          {exportando === 'xlsx' ? 'Armando el Excel…' : 'Descargar Excel'}
        </button>
        <button
          type="button"
          className="btn"
          disabled={exportando !== null}
          onClick={() => void exportar('pdf', l)}
          data-testid="descargar-pdf"
        >
          {exportando === 'pdf' ? 'Armando el PDF…' : 'Descargar PDF'}
        </button>
      </div>

      {l.estado === 'generada' ? (
        <MarcarGirada
          liquidacion={l}
          giroDisponible={giroDisponible}
          alMarcar={() => {
            setTick((t) => t + 1)
            alCambiar()
          }}
        />
      ) : null}

      {l.estado === 'girada' ? (
        <DesmarcarGirada
          liquidacion={l}
          alDesmarcar={() => {
            setTick((t) => t + 1)
            alCambiar()
          }}
        />
      ) : null}

      {l.historiaDelGiro && l.historiaDelGiro.length > 0 ? (
        <HistoriaDelGiro historia={l.historiaDelGiro} />
      ) : null}

      <ErrorDeLaAccion mensaje={errorDeAccion} testId="error-del-detalle" />

      <div className="mt-5">
        <Etiqueta>los pagos en línea que incluye</Etiqueta>
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-[13px] table-zebra" data-testid="pagos-de-la-liquidacion">
            <thead>
              <tr className="border-b border-bg-border text-left">
                <th className="px-2 py-1.5"><Etiqueta>fecha</Etiqueta></th>
                <th className="px-2 py-1.5"><Etiqueta>transacción</Etiqueta></th>
                <th className="px-2 py-1.5"><Etiqueta>referencia</Etiqueta></th>
                <th className="px-2 py-1.5"><Etiqueta>recibo</Etiqueta></th>
                <th className="px-2 py-1.5 text-right"><Etiqueta>bruto</Etiqueta></th>
                <th className="px-2 py-1.5 text-right"><Etiqueta>comisión</Etiqueta></th>
                <th className="px-2 py-1.5 text-right"><Etiqueta>iva</Etiqueta></th>
                <th className="px-2 py-1.5 text-right"><Etiqueta>retenciones</Etiqueta></th>
                <th className="px-2 py-1.5 text-right"><Etiqueta>neto de wompi</Etiqueta></th>
              </tr>
            </thead>
            <tbody>
              {l.pagos.map((p) => (
                <tr key={p.transaccionId}>
                  <td className="px-2 py-1.5">{p.fecha ?? '—'}</td>
                  <td className="px-2 py-1.5 font-mono">{p.transaccionId}</td>
                  <td className="px-2 py-1.5 font-mono">{p.referencia ?? '—'}</td>
                  <td className="px-2 py-1.5 font-mono">{p.reciboNumero ?? '—'}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{pesos(p.brutoCop)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{pesos(p.comisionCop)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{pesos(p.ivaCop)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{pesos(p.retencionesCop)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{pesos(p.netoCop)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function EstadoEnPalabras({ l }: { l: DetalleDeLaLiquidacion }) {
  if (l.estado === 'conciliada') {
    const quien = l.conciliadaPor ? (NOMBRE_DE_QUIEN_CONCILIO[l.conciliadaPor] ?? l.conciliadaPor) : null
    const detalle = [l.conciliadaAt ? fmtDateTime(l.conciliadaAt) : null, quien].filter(Boolean).join(', ')
    return (
      <p className="text-[13px] text-ok mt-2" data-testid="estado-en-palabras">
        La línea del giro ya está conciliada en el banco de la inmobiliaria{detalle ? ` (${detalle})` : ''}.
      </p>
    )
  }
  if (l.estado === 'girada') {
    return (
      <p className="text-[13px] text-fg mt-2" data-testid="estado-en-palabras">
        Leasefy la giró el {l.giradaEl ?? '—'}
        {l.giradaPor ? ` (marcó ${l.giradaPor})` : ''}
        {l.referenciaBancariaDelGiro ? ` · comprobante ${l.referenciaBancariaDelGiro}` : ''}. Falta que la
        línea aparezca en el extracto de la inmobiliaria.
      </p>
    )
  }
  return (
    <p className="text-[13px] text-warn mt-2" data-testid="estado-en-palabras">
      Generada: todavía no se ha girado.
    </p>
  )
}

function MarcarGirada({
  liquidacion: l,
  giroDisponible,
  alMarcar,
}: {
  liquidacion: DetalleDeLaLiquidacion
  giroDisponible: boolean
  alMarcar: () => void
}) {
  const hoy = aFechaIso(hoyLocal())
  const [abierto, setAbierto] = useState(false)
  const [fecha, setFecha] = useState(hoy)
  const [referencia, setReferencia] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const problema = !/^\d{4}-\d{2}-\d{2}$/.test(fecha)
    ? 'Elige el día en que salió la transferencia.'
    : fecha > hoy
      ? 'La fecha del giro no puede ser después de hoy.'
      : null

  if (!giroDisponible) {
    return (
      <p className="text-[13px] text-fg-muted mt-4" data-testid="giro-sin-migracion">
        Marcar «girada» todavía no está habilitado en esta base (falta una migración que aplica Víctor).
      </p>
    )
  }

  async function confirmar() {
    if (problema) return
    setEnviando(true)
    setError(null)
    try {
      await marcarGirada(l.id, { fecha, referenciaBancaria: referencia })
      setAbierto(false)
      alMarcar()
    } catch (err) {
      setError(mensajeDelAdmin(err, { accion: 'marcar la liquidación como girada', porDefecto: 'No se pudo marcar como girada.' }))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="mt-4">
      {!abierto ? (
        <button type="button" className="btn btn-primary" onClick={() => setAbierto(true)} data-testid="marcar-girada">
          Marcar como girada
        </button>
      ) : null}
      <Presence show={abierto}>
        <div className="card p-4 border-l-4 border-l-brand" data-testid="confirmar-girada">
          <p className="text-sm text-fg">
            Esto deja dicho que Leasefy ya le transfirió {pesos(l.netoCop)} a {l.inmobiliaria ?? 'la inmobiliaria'}.
            ¿Ya salió la plata?
          </p>
          <div className="grid gap-4 sm:grid-cols-2 mt-3">
            <label className="block">
              <Etiqueta>día de la transferencia</Etiqueta>
              <input
                type="date"
                className="input mt-1"
                value={fecha}
                max={hoy}
                onChange={(e) => setFecha(e.target.value)}
                data-testid="fecha-del-giro"
              />
            </label>
            <label className="block">
              <Etiqueta>comprobante o referencia (opcional)</Etiqueta>
              <input
                className="input mt-1"
                value={referencia}
                maxLength={120}
                onChange={(e) => setReferencia(e.target.value)}
                data-testid="referencia-del-giro"
              />
            </label>
          </div>
          {problema ? <p className="text-[13px] text-bad mt-2">{problema}</p> : null}
          <p className="text-[13px] text-fg-muted mt-2">
            Si la línea del banco todavía no ha llegado, la fecha del giro pasa a ser este día: con ella
            se busca en el extracto de la inmobiliaria.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              className="btn btn-primary"
              disabled={enviando || problema !== null}
              onClick={() => void confirmar()}
              data-testid="confirmar-girada-si"
            >
              {enviando ? 'Guardando…' : 'Sí, ya se giró'}
            </button>
            <button type="button" className="btn btn-ghost" disabled={enviando} onClick={() => setAbierto(false)}>
              Cancelar
            </button>
          </div>
          <ErrorDeLaAccion mensaje={error} testId="error-de-girada" />
        </div>
      </Presence>
    </div>
  )
}

/**
 * 🔴 Desmarcar «girada» (ola E, E6 · Nico E2 Q2 a): sólo el equipo de Leasefy
 * llega a este panel; el motivo es OBLIGATORIO (10 a 500 caracteres) y queda en
 * la bitácora del giro. La liquidación vuelve a «generada».
 */
function DesmarcarGirada({
  liquidacion: l,
  alDesmarcar,
}: {
  liquidacion: DetalleDeLaLiquidacion
  alDesmarcar: () => void
}) {
  const [abierto, setAbierto] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const largo = motivo.trim().length
  const problema =
    largo < MOTIVO_MINIMO_PARA_DESMARCAR
      ? `Escribe por qué se desmarca (al menos ${MOTIVO_MINIMO_PARA_DESMARCAR} caracteres).`
      : largo > MOTIVO_MAXIMO_PARA_DESMARCAR
        ? `El motivo va en ${MOTIVO_MAXIMO_PARA_DESMARCAR} caracteres como máximo.`
        : null

  // Un back anterior no dice si se puede: no se ofrece.
  if (l.desmarcarDisponible === undefined) return null
  if (!l.desmarcarDisponible) {
    return (
      <p className="text-[13px] text-fg-muted mt-4" data-testid="desmarcar-sin-migracion">
        Desmarcar «girada» todavía no está habilitado en esta base (falta la migración de la bitácora del giro,
        que aplica Víctor).
      </p>
    )
  }

  async function confirmar() {
    if (problema) return
    setEnviando(true)
    setError(null)
    try {
      await desmarcarGirada(l.id, motivo)
      setAbierto(false)
      setMotivo('')
      alDesmarcar()
    } catch (err) {
      setError(
        mensajeDelAdmin(err, {
          accion: 'desmarcar la liquidación como girada',
          porDefecto: 'No se pudo desmarcar la liquidación.',
        }),
      )
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="mt-4">
      {!abierto ? (
        <button type="button" className="btn" onClick={() => setAbierto(true)} data-testid="desmarcar-girada">
          Desmarcar como girada
        </button>
      ) : null}
      <Presence show={abierto}>
        <div className="card p-4 border-l-4 border-l-warn" data-testid="confirmar-desmarcar">
          <p className="text-sm text-fg">
            La liquidación {l.numero} vuelve a «generada»: deja de decir que Leasefy le giró {pesos(l.netoCop)} a{' '}
            {l.inmobiliaria ?? 'la inmobiliaria'} el {l.giradaEl ?? '—'}. Queda escrito en la bitácora del giro con tu
            motivo.
          </p>
          <label className="block mt-3">
            <Etiqueta>¿por qué se desmarca?</Etiqueta>
            <textarea
              className="input mt-1 min-h-[5rem]"
              value={motivo}
              maxLength={MOTIVO_MAXIMO_PARA_DESMARCAR}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Por ejemplo: el banco rechazó la transferencia"
              data-testid="motivo-de-desmarcar"
            />
          </label>
          <p className="text-[13px] text-fg-muted mt-1 tabular-nums">
            {largo} de {MOTIVO_MAXIMO_PARA_DESMARCAR}
          </p>
          {problema && largo > 0 ? <p className="text-[13px] text-bad mt-1">{problema}</p> : null}
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              className="btn btn-primary"
              disabled={enviando || problema !== null}
              onClick={() => void confirmar()}
              data-testid="confirmar-desmarcar-si"
            >
              {enviando ? 'Guardando…' : 'Sí, desmarcar'}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={enviando}
              onClick={() => {
                setAbierto(false)
                setError(null)
              }}
            >
              Cancelar
            </button>
          </div>
          <ErrorDeLaAccion mensaje={error} testId="error-de-desmarcar" />
        </div>
      </Presence>
    </div>
  )
}

/** La bitácora del giro (ola E, E6): cada vez que se marcó o se desmarcó, la más reciente primero. */
function HistoriaDelGiro({ historia }: { historia: MovimientoDelGiro[] }) {
  return (
    <div className="mt-5" data-testid="historia-del-giro">
      <Etiqueta>historia del giro</Etiqueta>
      <ul className="mt-2 space-y-1.5 text-[13px]">
        {historia.map((h, i) => (
          <li key={`${h.accion}-${h.at ?? i}`} className="text-fg">
            {h.accion === 'marcada' ? (
              <>
                Marcada como girada el {h.giradaEl ?? '—'}
                {h.referenciaBancaria ? ` (comprobante ${h.referenciaBancaria})` : ''}
              </>
            ) : (
              <>
                Desmarcada: <span className="text-fg-muted">«{h.motivo ?? ''}»</span>
              </>
            )}
            <span className="text-fg-muted">
              {' '}
              · {h.por}
              {h.at ? `, ${fmtDateTime(h.at)}` : ''}
              {h.fechaDelGiroAntes && h.fechaDelGiroDespues && h.fechaDelGiroAntes !== h.fechaDelGiroDespues
                ? ` · fecha del giro ${h.fechaDelGiroAntes} → ${h.fechaDelGiroDespues}`
                : ''}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
