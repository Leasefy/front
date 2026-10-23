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
import { Eyebrow, Presence } from '@leasefy/cadence'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

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
import { Card } from '@leasefy/cadence'
import { Button } from '@/components/ui/button'

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
      <Card className="p-5">
        <Eyebrow>Subir el reporte de Wompi</Eyebrow>
        <p className="text-body-sm text-fg-muted mt-2">
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
      </Card>

      <ErrorDeLaAccion mensaje={error} testId="error-del-reporte" />

      <Presence show={resultado !== null}>
        {resultado ? (
          <Card className="p-5 mt-4 " data-testid="resultado-del-reporte">
            <Eyebrow>Importado · {resultado.archivo}</Eyebrow>
            <p className="text-body-sm text-fg mt-2">
              {resultado.importadas === 0
                ? 'No había nada nuevo: el reporte ya estaba cargado igual.'
                : `Se ${resultado.importadas === 1 ? 'importó 1 transacción' : `importaron ${resultado.importadas} transacciones`}.`}
              {resultado.cuadresActualizados > 0
                ? resultado.cuadresActualizados === 1
                  ? ' 1 ya estaba y se le volvió a revisar el cuadre.'
                  : ` ${resultado.cuadresActualizados} ya estaban y se les volvió a revisar el cuadre.`
                : ''}
              {resultado.resumen.frenadas > 0
                ? resultado.resumen.frenadas === 1
                  ? ' 1 quedó frenada y no entró (corrígela en el archivo y vuelve a subirlo).'
                  : ` ${resultado.resumen.frenadas} quedaron frenadas y no entraron (corrígelas en el archivo y vuelve a subirlo).`
                : ''}
            </p>
          </Card>
        ) : null}
      </Presence>

      <Presence show={lectura !== null}>
        {lectura ? (
          <Card className="p-5 mt-4" data-testid="vista-previa-del-reporte">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <Eyebrow>Vista previa · {lectura.archivo}</Eyebrow>
                {lectura.yaSubido ? (
                  <p className="text-body-sm text-warning mt-2" data-testid="ya-subido">
                    Este mismo archivo ya se subió el {fmtDateTime(lectura.yaSubido.at)}
                    {lectura.yaSubido.por ? ` (${lectura.yaSubido.por})` : ''}. Volver a importarlo no
                    duplica nada.
                  </p>
                ) : null}
              </div>
              <Button hideArrow type="button"
                
                disabled={ocupado !== null || porImportar === 0}
                onClick={() => void importar()}
                data-testid="importar-reporte"
              >
                {ocupado === 'importando'
                  ? 'Importando…'
                  : porImportar === 0
                    ? 'Nada nuevo para importar'
                    : `Importar ${porImportar} ${porImportar === 1 ? 'transacción' : 'transacciones'}`}
              </Button>
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
                    <li key={`${f.fila}-${f.transaccionId ?? ''}`} className="text-body-sm text-fg">
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
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-border text-left">
                        <TableHead ><Etiqueta>desembolso</Etiqueta></TableHead>
                        <TableHead ><Etiqueta>fecha</Etiqueta></TableHead>
                        <TableHead className="text-right"><Etiqueta>transacciones</Etiqueta></TableHead>
                        <TableHead className="text-right"><Etiqueta>bruto</Etiqueta></TableHead>
                        <TableHead className="text-right"><Etiqueta>descuentos</Etiqueta></TableHead>
                        <TableHead className="text-right"><Etiqueta>neto</Etiqueta></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lectura.desembolsos.map((d) => (
                        <TableRow key={d.desembolsoId}>
                          <TableCell className="px-2 py-1.5 font-mono">{d.desembolsoId}</TableCell>
                          <TableCell className="px-2 py-1.5">{d.fecha ?? '—'}</TableCell>
                          <TableCell className="px-2 py-1.5 text-right tabular-nums">{d.transacciones}</TableCell>
                          <TableCell className="px-2 py-1.5 text-right tabular-nums">{pesos(d.brutoCop)}</TableCell>
                          <TableCell className="px-2 py-1.5 text-right tabular-nums">{pesos(d.descuentosCop)}</TableCell>
                          <TableCell className="px-2 py-1.5 text-right tabular-nums">{pesos(d.netoCop)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : null}

            <div className="mt-5">
              <Etiqueta>transacción por transacción</Etiqueta>
              <div className="overflow-x-auto max-h-[28rem] overflow-y-auto mt-2" data-lenis-prevent>
                <Table data-testid="filas-del-reporte">
                  <TableHeader>
                    <TableRow className="border-b border-border text-left">
                      <TableHead ><Etiqueta>renglón</Etiqueta></TableHead>
                      <TableHead ><Etiqueta>transacción</Etiqueta></TableHead>
                      <TableHead ><Etiqueta>fecha</Etiqueta></TableHead>
                      <TableHead ><Etiqueta>estado</Etiqueta></TableHead>
                      <TableHead className="text-right"><Etiqueta>bruto</Etiqueta></TableHead>
                      <TableHead className="text-right"><Etiqueta>neto</Etiqueta></TableHead>
                      <TableHead ><Etiqueta>cuadre</Etiqueta></TableHead>
                      <TableHead ><Etiqueta>inmobiliaria</Etiqueta></TableHead>
                      <TableHead ><Etiqueta>qué pasa</Etiqueta></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lectura.filas.map((f) => (
                      <TableRow key={`${f.fila}-${f.transaccionId ?? ''}`} data-testid={`fila-${f.fila}`}>
                        <TableCell className="px-2 py-1.5 font-mono text-fg-subtle">{f.fila}</TableCell>
                        <TableCell className="px-2 py-1.5 font-mono">{f.transaccionId ?? '—'}</TableCell>
                        <TableCell className="px-2 py-1.5">{f.fecha ?? '—'}</TableCell>
                        <TableCell className="px-2 py-1.5">{f.estado ?? '—'}</TableCell>
                        <TableCell className="px-2 py-1.5 text-right tabular-nums">{pesos(f.brutoCop)}</TableCell>
                        <TableCell className="px-2 py-1.5 text-right tabular-nums">{pesos(f.netoCop)}</TableCell>
                        <TableCell className="px-2 py-1.5" title={f.detalleDelCuadre ?? undefined}>
                          {f.cuadre ? NOMBRE_DEL_CUADRE[f.cuadre] : '—'}
                        </TableCell>
                        <TableCell className="px-2 py-1.5">{f.inmobiliaria ?? '—'}</TableCell>
                        <TableCell className="px-2 py-1.5">
                          <Pill tone={TONO_DE_LA_ACCION[f.accion]}>{NOMBRE_DE_LA_ACCION[f.accion]}</Pill>
                          {f.motivo && f.accion !== 'frenada' ? (
                            <div className="text-body-sm text-fg-muted mt-1">{f.motivo}</div>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {lectura.filasOmitidas > 0 ? (
                <p className="text-body-sm text-fg-muted mt-2">
                  Y {lectura.filasOmitidas} renglones más que no caben aquí (las que ya estaban igual van
                  al final); el resumen de arriba los cuenta todos.
                </p>
              ) : null}
            </div>
          </Card>
        ) : null}
      </Presence>
    </div>
  )
}
