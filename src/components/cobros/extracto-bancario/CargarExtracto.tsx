'use client';

/**
 * Cargar un extracto: el archivo se lee en el navegador (como todas las
 * importaciones), se mapean las columnas por sinónimos, se muestran cinco
 * filas de prueba y recién ahí se manda al back.
 */

import { useMemo, useRef, useState } from 'react';
import { UploadSimple, X } from '@phosphor-icons/react';
import { Banner } from '@leasefy/cadence';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import { parseSpreadsheetFile } from '@/components/inmobiliaria/import/lib/parseFile';
import { conciliacionBancariaApi } from '@/lib/api/conciliacion-bancaria.service';
import type { ResultadoDeCarga } from '@/lib/api/conciliacion-bancaria.types';
import {
  COLUMNAS_DE_EXTRACTO,
  armarFilasDeExtracto,
  faltantesDelMapeo,
  mapearColumnasDeExtracto,
  type CampoDeExtracto,
  type MapeoDeExtracto,
} from '@/lib/cobros/extracto-bancario';
import { mensajeDe, plata } from './formato';

interface Props {
  onCargado: (resultado: ResultadoDeCarga) => void;
}

const SIN_MAPEAR = '__ninguna__';

export function CargarExtracto({ onCargado }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [encabezados, setEncabezados] = useState<string[]>([]);
  const [crudas, setCrudas] = useState<Record<string, unknown>[]>([]);
  const [mapeo, setMapeo] = useState<MapeoDeExtracto>({});
  const [leyendo, setLeyendo] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoDeCarga | null>(null);

  const armadas = useMemo(() => armarFilasDeExtracto(crudas, mapeo), [crudas, mapeo]);
  const faltan = faltantesDelMapeo(mapeo);

  const leer = async (f: File) => {
    setLeyendo(true);
    setResultado(null);
    try {
      const r = await parseSpreadsheetFile(f);
      if (r.headers.length === 0) {
        toast.error('El archivo no tiene encabezados: no hay cómo saber qué columna es la fecha.');
        return;
      }
      setArchivo(f);
      setEncabezados(r.headers);
      setCrudas(r.rows as Record<string, unknown>[]);
      setMapeo(mapearColumnasDeExtracto(r.headers));
    } catch (error) {
      toast.error(mensajeDe(error, 'No se pudo leer el archivo.'));
    } finally {
      setLeyendo(false);
    }
  };

  const limpiar = () => {
    setArchivo(null);
    setEncabezados([]);
    setCrudas([]);
    setMapeo({});
    if (input.current) input.current.value = '';
  };

  const cargar = async () => {
    if (!archivo || faltan.length > 0 || armadas.filas.length === 0) return;
    setCargando(true);
    try {
      const r = await conciliacionBancariaApi.cargarExtracto(archivo.name, armadas.filas);
      setResultado(r);
      onCargado(r);
      toast.success(
        r.nuevas === 0
          ? 'Nada nuevo: todas las líneas ya estaban cargadas.'
          : `${r.nuevas} ${r.nuevas === 1 ? 'movimiento nuevo' : 'movimientos nuevos'} del extracto.`,
      );
      limpiar();
    } catch (error) {
      toast.error(mensajeDe(error, 'No se pudo cargar el extracto.'));
    } finally {
      setCargando(false);
    }
  };

  const cambiarMapeo = (campo: CampoDeExtracto, encabezado: string) => {
    setMapeo((m) => {
      const nuevo: MapeoDeExtracto = { ...m };
      // Un encabezado va a un solo campo.
      for (const k of Object.keys(nuevo) as CampoDeExtracto[]) {
        if (nuevo[k] === encabezado) delete nuevo[k];
      }
      if (encabezado === SIN_MAPEAR) delete nuevo[campo];
      else nuevo[campo] = encabezado;
      return nuevo;
    });
  };

  return (
    <section className="space-y-4 rounded-lg border border-border bg-surface p-5 shadow-sm" data-testid="cargar-extracto">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-fg">Cargar el extracto</h2>
          <p className="text-sm text-fg-muted">
            El CSV o Excel que exporta el banco, tal cual. Las líneas que ya estaban cargadas no se
            duplican, así que se puede subir el mes entero cada vez.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <input
            ref={input}
            type="file"
            accept=".csv,.xlsx,.xls,text/csv"
            className="sr-only"
            data-testid="archivo-de-extracto"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void leer(f);
            }}
          />
          <Button variant="secondary" hideArrow onClick={() => input.current?.click()} disabled={leyendo}>
            {leyendo ? <Spinner size="sm" /> : <UploadSimple className="h-4 w-4" aria-hidden="true" />}
            {archivo ? 'Otro archivo' : 'Elegir archivo'}
          </Button>
        </div>
      </div>

      {resultado && (
        <Banner variant={resultado.nuevas > 0 ? 'success' : 'info'} title="Extracto cargado">
          {resultado.nuevas} nuevas · {resultado.repetidas} ya estaban · {resultado.salidas} salidas de plata
          {resultado.descartadas > 0 ? ` · ${resultado.descartadas} descartadas por ilegibles` : ''}.
        </Banner>
      )}

      {archivo && (
        <div className="space-y-4" data-testid="vista-previa">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-fg">
              <span className="font-medium">{archivo.name}</span>{' '}
              <span className="text-fg-muted">
                · {crudas.length} {crudas.length === 1 ? 'fila' : 'filas'}
              </span>
            </p>
            <Button variant="ghost" size="sm" hideArrow onClick={limpiar} aria-label="Quitar el archivo">
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {COLUMNAS_DE_EXTRACTO.map((c) => (
              <label key={c.campo} className="space-y-1 text-sm">
                <span className="font-medium text-fg">{c.titulo}</span>
                <select
                  className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-fg"
                  value={mapeo[c.campo] ?? SIN_MAPEAR}
                  onChange={(e) => cambiarMapeo(c.campo, e.target.value)}
                  data-testid={`mapeo-${c.campo}`}
                >
                  <option value={SIN_MAPEAR}>— no viene —</option>
                  {encabezados.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                <span className="block text-xs text-fg-muted">{c.ayuda}</span>
              </label>
            ))}
          </div>

          {faltan.length > 0 ? (
            <Banner variant="warning" title="Falta indicar una columna">
              Sin {faltan.join(', ')} no hay cómo cargar el extracto. Elegí la columna del archivo que la trae.
            </Banner>
          ) : (
            <>
              <div className="overflow-x-auto rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Referencia</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {armadas.filas.slice(0, 5).map((f, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono tabular-nums">{f.fecha}</TableCell>
                        <TableCell className="max-w-md truncate">{f.descripcion}</TableCell>
                        <TableCell className="font-mono text-fg-muted">{f.referencia ?? '—'}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">{plata(f.valorCop)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-fg-muted">
                  {armadas.filas.length} {armadas.filas.length === 1 ? 'línea lista' : 'líneas listas'}
                  {armadas.descartadas.length > 0 && (
                    <>
                      {' '}
                      · {armadas.descartadas.length} descartadas:{' '}
                      {armadas.descartadas
                        .slice(0, 3)
                        .map((d) => `fila ${d.fila} (${d.motivo.replace(/\.$/, '')})`)
                        .join(', ')}
                      {armadas.descartadas.length > 3 ? '…' : ''}
                    </>
                  )}
                </p>
                <Button hideArrow onClick={() => void cargar()} disabled={cargando || armadas.filas.length === 0} data-testid="cargar">
                  {cargando ? <Spinner size="sm" /> : <UploadSimple className="h-4 w-4" aria-hidden="true" />}
                  Cargar {armadas.filas.length} {armadas.filas.length === 1 ? 'movimiento' : 'movimientos'}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
