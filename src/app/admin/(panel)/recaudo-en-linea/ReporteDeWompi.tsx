'use client'

/**
 * El reporte de Wompi: elegir el CSV, ver QUÉ pasaría (vista previa, sin
 * escribir) e importarlo.
 *
 * 🔴 Una celda no tira el archivo: lo que no se puede leer queda FRENADO con
 * su frase y el resto entra. Subir el mismo archivo otra vez no cambia nada
 * (idempotente). Una transacción que ya está en una liquidación no se
 * reescribe con otros valores: sale frenada y dice en cuál está.
 */

import { useRef, useState } from 'react'
import { Presence } from '@leasefy/cadence'

import { Pill } from '@/components/admin/Pill'
import { mensajeDelAdmin } from '@/lib/admin/errores-del-admin'
import { fmtDateTime } from '@/lib/admin/format'
import { pesos } from '@/lib/admin/documento-de-la-liquidacion'
import {
  importarElReporte,
  NOMBRE_DE_LA_ACCION,
  NOMBRE_DEL_CUADRE,
  TONO_DE_LA_ACCION,
  vistaPreviaDelReporte,
  type ArchivoDelReporte,
  type LecturaDelReporte,
  type ResultadoDeLaImportacion,
} from '@/lib/admin/recaudo-en-linea'
import { Cifra, ErrorDeLaAccion, Etiqueta } from './partes'

/** El mismo tope del back (`@MaxLength` del contenido). */
export const TOPE_DEL_REPORTE = 10_000_000

export function ReporteDeWompi({ alImportar }: { alImportar?: () => void }) {
  const entrada = useRef<HTMLInputElement>(null)
  const [archivo, setArchivo] = useState<ArchivoDelReporte | null>(null)
  const [lectura, setLectura] = useState<LecturaDelReporte | null>(null)
  const [resultado, setResultado] = useState<ResultadoDeLaImportacion | null>(null)
  const [ocupado, setOcupado] = useState<'leyendo' | 'importando' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function elegir(f: File | undefined) {
    setError(null)
    setResultado(null)
    setLectura(null)
    setArchivo(null)
    if (!f) return
    if (f.size > TOPE_DEL_REPORTE) {
      setError('El reporte pasa de 10 MB: descárgalo por partes (por fechas) y súbelas una por una.')
      return
    }
    setOcupado('leyendo')
    try {
      const a = { archivo: f.name, contenido: await f.text() }
      const v = await vistaPreviaDelReporte(a)
      setArchivo(a)
      setLectura(v)
    } catch (err) {
      setError(mensajeDelAdmin(err, { accion: 'leer el reporte', porDefecto: 'No se pudo leer el reporte.' }))
    } finally {
      setOcupado(null)
      if (entrada.current) entrada.current.value = ''
    }
  }

  async function importar() {
    if (!archivo) return
    setOcupado('importando')
    setError(null)
    try {
      const r = await importarElReporte(archivo)
      setResultado(r)
      setLectura(null)
      setArchivo(null)
      alImportar?.()
    } catch (err) {
      setError(mensajeDelAdmin(err, { accion: 'importar el reporte', porDefecto: 'No se pudo importar el reporte.' }))
    } finally {
      setOcupado(null)
    }
  }

  const porImportar = lectura ? lectura.resumen.nuevas + lectura.resumen.actualizan : 0
  const frenadas = lectura?.filas.filter((f) => f.accion === 'frenada') ?? []

  return (
    <div data-testid="reporte-de-wompi">
      <div className="card p-5">
        <div className="section-label">subir el reporte de wompi</div>
        <p className="text-[13px] text-fg-muted mt-2">
          Descárgalo del panel de comercios de Wompi (Transacciones o Desembolsos) en CSV. Primero ves
          qué pasaría con cada transacción; nada se guarda hasta que lo importes.
        </p>
        <label className="btn mt-4 cursor-pointer">
          {ocupado === 'leyendo' ? 'Leyendo…' : 'Elegir el archivo CSV'}
          <input
            ref={entrada}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            disabled={ocupado !== null}
            onChange={(e) => void elegir(e.target.files?.[0])}
            data-testid="archivo-del-reporte"
          />
        </label>
      </div>

      <ErrorDeLaAccion mensaje={error} testId="error-del-reporte" />

      <Presence show={resultado !== null}>
        {resultado ? (
          <div className="card p-5 mt-4 border-l-4 border-l-ok" data-testid="resultado-del-reporte">
            <div className="section-label">importado · {resultado.archivo}</div>
            <p className="text-sm text-fg mt-2">
              {resultado.importadas === 0
                ? 'No había nada nuevo: el reporte ya estaba cargado igual.'
                : `Se ${resultado.importadas === 1 ? 'importó 1 transacción' : `importaron ${resultado.importadas} transacciones`}.`}
              {resultado.cuadresActualizados > 0
                ? ` ${resultado.cuadresActualizados} ya estaban y se les volvió a revisar el cuadre.`
                : ''}
              {resultado.resumen.frenadas > 0
                ? ` ${resultado.resumen.frenadas} quedaron frenadas y no entraron (corrígelas en el archivo y vuelve a subirlo).`
                : ''}
            </p>
          </div>
        ) : null}
      </Presence>

      <Presence show={lectura !== null}>
        {lectura ? (
          <div className="card p-5 mt-4" data-testid="vista-previa-del-reporte">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="section-label">vista previa · {lectura.archivo}</div>
                {lectura.yaSubido ? (
                  <p className="text-[13px] text-warn mt-2" data-testid="ya-subido">
                    Este mismo archivo ya se subió el {fmtDateTime(lectura.yaSubido.at)}
                    {lectura.yaSubido.por ? ` (${lectura.yaSubido.por})` : ''}. Volver a importarlo no
                    duplica nada.
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                className="btn btn-primary"
                disabled={ocupado !== null || porImportar === 0}
                onClick={() => void importar()}
                data-testid="importar-reporte"
              >
                {ocupado === 'importando'
                  ? 'Importando…'
                  : porImportar === 0
                    ? 'Nada nuevo para importar'
                    : `Importar ${porImportar} ${porImportar === 1 ? 'transacción' : 'transacciones'}`}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-4" data-testid="resumen-del-reporte">
              <Cifra nombre="entran" valor={lectura.resumen.nuevas} tono={lectura.resumen.nuevas > 0 ? 'bien' : 'normal'} />
              <Cifra nombre="actualizan" valor={lectura.resumen.actualizan} />
              <Cifra nombre="ya estaban igual" valor={lectura.resumen.iguales} />
              <Cifra nombre="repetidas" valor={lectura.resumen.repetidas} />
              <Cifra nombre="frenadas" valor={lectura.resumen.frenadas} tono={lectura.resumen.frenadas > 0 ? 'mal' : 'normal'} />
            </div>

            {frenadas.length > 0 ? (
              <div className="mt-5" data-testid="frenadas">
                <Etiqueta>frenadas — no entran</Etiqueta>
                <ul className="mt-2 space-y-1">
                  {frenadas.map((f) => (
                    <li key={`${f.fila}-${f.transaccionId ?? ''}`} className="text-[13px] text-fg">
                      <span className="font-mono text-fg-subtle">
                        renglón {f.fila}
                        {f.transaccionId ? ` · ${f.transaccionId}` : ''}
                      </span>{' '}
                      {f.motivo}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {lectura.desembolsos.length > 0 ? (
              <div className="mt-5">
                <Etiqueta>desembolsos de wompi a leasefy en el archivo</Etiqueta>
                <div className="overflow-x-auto mt-2">
                  <table className="w-full text-[13px] table-zebra">
                    <thead>
                      <tr className="border-b border-bg-border text-left">
                        <th className="px-2 py-1.5"><Etiqueta>desembolso</Etiqueta></th>
                        <th className="px-2 py-1.5"><Etiqueta>fecha</Etiqueta></th>
                        <th className="px-2 py-1.5 text-right"><Etiqueta>transacciones</Etiqueta></th>
                        <th className="px-2 py-1.5 text-right"><Etiqueta>bruto</Etiqueta></th>
                        <th className="px-2 py-1.5 text-right"><Etiqueta>descuentos</Etiqueta></th>
                        <th className="px-2 py-1.5 text-right"><Etiqueta>neto</Etiqueta></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lectura.desembolsos.map((d) => (
                        <tr key={d.desembolsoId}>
                          <td className="px-2 py-1.5 font-mono">{d.desembolsoId}</td>
                          <td className="px-2 py-1.5">{d.fecha ?? '—'}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums">{d.transacciones}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums">{pesos(d.brutoCop)}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums">{pesos(d.descuentosCop)}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums">{pesos(d.netoCop)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            <div className="mt-5">
              <Etiqueta>transacción por transacción</Etiqueta>
              <div className="overflow-x-auto max-h-[28rem] overflow-y-auto mt-2" data-lenis-prevent>
                <table className="w-full text-[13px] table-zebra" data-testid="filas-del-reporte">
                  <thead>
                    <tr className="border-b border-bg-border text-left">
                      <th className="px-2 py-1.5"><Etiqueta>renglón</Etiqueta></th>
                      <th className="px-2 py-1.5"><Etiqueta>transacción</Etiqueta></th>
                      <th className="px-2 py-1.5"><Etiqueta>fecha</Etiqueta></th>
                      <th className="px-2 py-1.5"><Etiqueta>estado</Etiqueta></th>
                      <th className="px-2 py-1.5 text-right"><Etiqueta>bruto</Etiqueta></th>
                      <th className="px-2 py-1.5 text-right"><Etiqueta>neto</Etiqueta></th>
                      <th className="px-2 py-1.5"><Etiqueta>cuadre</Etiqueta></th>
                      <th className="px-2 py-1.5"><Etiqueta>inmobiliaria</Etiqueta></th>
                      <th className="px-2 py-1.5"><Etiqueta>qué pasa</Etiqueta></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lectura.filas.map((f) => (
                      <tr key={`${f.fila}-${f.transaccionId ?? ''}`} data-testid={`fila-${f.fila}`}>
                        <td className="px-2 py-1.5 font-mono text-fg-subtle">{f.fila}</td>
                        <td className="px-2 py-1.5 font-mono">{f.transaccionId ?? '—'}</td>
                        <td className="px-2 py-1.5">{f.fecha ?? '—'}</td>
                        <td className="px-2 py-1.5">{f.estado ?? '—'}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{pesos(f.brutoCop)}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{pesos(f.netoCop)}</td>
                        <td className="px-2 py-1.5" title={f.detalleDelCuadre ?? undefined}>
                          {f.cuadre ? NOMBRE_DEL_CUADRE[f.cuadre] : '—'}
                        </td>
                        <td className="px-2 py-1.5">{f.inmobiliaria ?? '—'}</td>
                        <td className="px-2 py-1.5">
                          <Pill tone={TONO_DE_LA_ACCION[f.accion]}>{NOMBRE_DE_LA_ACCION[f.accion]}</Pill>
                          {f.motivo && f.accion !== 'frenada' ? (
                            <div className="text-[13px] text-fg-muted mt-1">{f.motivo}</div>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {lectura.filasOmitidas > 0 ? (
                <p className="text-[13px] text-fg-muted mt-2">
                  Y {lectura.filasOmitidas} renglones más que no caben aquí (las que ya estaban igual van
                  al final); el resumen de arriba los cuenta todos.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </Presence>
    </div>
  )
}
