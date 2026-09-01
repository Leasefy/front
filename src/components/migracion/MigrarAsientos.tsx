'use client';

/**
 * Camino B del paso 5: migrar el libro diario histórico desde un archivo.
 *
 * subir → mapear columnas → revisar → aplicar, la misma forma que terceros.
 * La diferencia que importa: `revisar` no escribe nada y devuelve, fila por
 * fila, qué entra y qué no. Y las cuentas que el archivo nombra y el plan no
 * tiene **no se crean solas**: se listan, se manda al paso 4 a crearlas, y se
 * vuelve a revisar. Inventar una cuenta desde un código suelto es inventarle
 * una naturaleza y un lugar en el árbol, y eso lo decide el contador.
 */

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useDropzone } from 'react-dropzone';
import { ArrowRight, CheckCircle, FileArrowUp, Info, Warning } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { parseSpreadsheetFile } from '@/components/inmobiliaria/import/lib/parseFile';
import {
  contabilidadApi,
  LARGO_MAXIMO_DE_LOTE,
  MAX_ASIENTOS_POR_LOTE,
  type AsientoMigrado,
  type InformeDeMigracion,
  type RevisionDeLote,
} from '@/lib/api/contabilidad.service';
import {
  mapearColumnas,
  obligatoriasSinMapear,
  remapear,
  type MapeoDeColumna,
} from '@/lib/migracion/columnas-de-tercero';
import {
  armarAsientos,
  COLUMNAS_DE_ASIENTO,
  nombreDeLoteDeAsientos,
} from '@/lib/migracion/columnas-de-asiento';

import { mensajeDeContabilidad } from './contabilidad-errores';

/** Sentinel: Radix `Select` no admite `value=""`. */
const IGNORAR = '__ignorar__';
const MAX_FILAS_EN_PANTALLA = 50;
const RUTA_DEL_PASO_4 = '/panel/inmobiliaria/migracion/puc';

export function MigrarAsientos({
  onAplicado,
  onIrAlPuc,
}: {
  onAplicado: (informe: InformeDeMigracion) => void;
  /** Adentro del muro: abrir el paso 4 en el mismo muro. Sin esto, enlace en pestaña nueva. */
  onIrAlPuc?: () => void;
}) {
  const [filas, setFilas] = useState<Record<string, unknown>[]>([]);
  const [encabezados, setEncabezados] = useState<string[]>([]);
  const [mapeo, setMapeo] = useState<MapeoDeColumna[]>([]);
  const [nombreDeArchivo, setNombreDeArchivo] = useState('');
  const [lote, setLote] = useState('');
  const [asientos, setAsientos] = useState<AsientoMigrado[]>([]);
  const [revision, setRevision] = useState<RevisionDeLote | null>(null);
  const [informe, setInforme] = useState<InformeDeMigracion | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const volverAEmpezar = () => {
    setFilas([]);
    setEncabezados([]);
    setMapeo([]);
    setNombreDeArchivo('');
    setLote('');
    setAsientos([]);
    setRevision(null);
    setInforme(null);
    setError(null);
  };

  const onDrop = useCallback(async (aceptados: File[]) => {
    const archivo = aceptados[0];
    if (!archivo) return;
    setError(null);
    setRevision(null);
    setInforme(null);
    try {
      const r = await parseSpreadsheetFile(archivo);
      setFilas(r.rows as Record<string, unknown>[]);
      setEncabezados(r.headers);
      setMapeo(mapearColumnas(COLUMNAS_DE_ASIENTO, r.headers));
      setNombreDeArchivo(archivo.name);
      setLote(nombreDeLoteDeAsientos());
    } catch (e) {
      setError(
        e instanceof Error && e.message ? e.message : 'No pudimos leer el archivo. ¿Es Excel o CSV?',
      );
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    multiple: false,
  });

  const sinMapear = useMemo(() => obligatoriasSinMapear(COLUMNAS_DE_ASIENTO, mapeo), [mapeo]);
  const armados = useMemo(() => (filas.length ? armarAsientos(filas, mapeo) : []), [filas, mapeo]);
  const demasiados = armados.length > MAX_ASIENTOS_POR_LOTE;
  const puedeRevisar =
    armados.length > 0 && sinMapear.length === 0 && !demasiados && lote.trim().length > 0 && !cargando;

  const revisar = async () => {
    setCargando(true);
    setError(null);
    try {
      const r = await contabilidadApi.migracion.revisar({ lote: lote.trim(), asientos: armados });
      setAsientos(armados);
      setRevision(r);
    } catch (e) {
      setError(mensajeDeContabilidad(e, 'No pudimos revisar el archivo. Intentá de nuevo.'));
    } finally {
      setCargando(false);
    }
  };

  const aplicar = async () => {
    setCargando(true);
    setError(null);
    try {
      const r = await contabilidadApi.migracion.aplicar({ lote: lote.trim(), asientos });
      setInforme(r);
      onAplicado(r);
    } catch (e) {
      setError(mensajeDeContabilidad(e, 'No pudimos aplicar el lote. Intentá de nuevo.'));
    } finally {
      setCargando(false);
    }
  };

  if (informe) {
    return <Informe informe={informe} onOtro={volverAEmpezar} />;
  }

  if (revision) {
    return (
      <Revision
        revision={revision}
        cargando={cargando}
        error={error}
        onRevisarDeNuevo={revisar}
        onIrAlPuc={onIrAlPuc}
        onAplicar={aplicar}
        onOtroArchivo={volverAEmpezar}
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
        <h2 className="font-medium text-fg">Migrar el histórico</h2>
        <p className="mt-1 max-w-2xl text-sm text-fg-muted">
          El libro diario exportado de tu sistema actual: una fila por movimiento, con número de
          comprobante, fecha, cuenta, débito y crédito. Las filas con el mismo número forman un
          asiento. Primero se revisa todo; recién después se escribe.
        </p>

        <div
          {...getRootProps()}
          className={`mt-4 flex cursor-pointer flex-col items-center gap-3 rounded-md border border-dashed p-8 text-center transition-colors ${
            isDragActive ? 'border-primary bg-primary-soft' : 'border-border hover:bg-surface-muted'
          }`}
          data-testid="dropzone-asientos"
        >
          {/* allowlist: react-dropzone hidden file input (mecanismo canónico) */}
          <input {...getInputProps()} />
          <FileArrowUp className="h-8 w-8 text-fg-muted" />
          <div>
            <p className="text-sm font-medium text-fg">
              {nombreDeArchivo || 'Arrastrá el archivo o hacé clic para elegirlo'}
            </p>
            <p className="text-xs text-fg-subtle">Excel o CSV. Nada se crea todavía.</p>
          </div>
        </div>

        {error ? (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-border bg-danger-soft p-3" role="alert">
            <Warning className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
            <p className="text-sm text-fg">{error}</p>
          </div>
        ) : null}
      </section>

      {encabezados.length > 0 ? (
        <section className="rounded-lg border border-border bg-surface p-6 shadow-sm" data-testid="mapeo-asientos">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-medium text-fg">Qué es cada columna</h2>
              <p className="text-sm text-fg-muted">
                {filas.length} filas → {armados.length} asientos. Revisá lo que adivinamos.
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              hideArrow
              onClick={() => setMapeo(mapearColumnas(COLUMNAS_DE_ASIENTO, encabezados))}
            >
              Restablecer
            </Button>
          </div>

          <div className="mt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Columna del archivo</TableHead>
                  <TableHead>Campo del asiento</TableHead>
                  <TableHead>Por qué</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mapeo.map((m) => (
                  <TableRow key={m.columna}>
                    <TableCell className="font-mono text-xs">{m.columna}</TableCell>
                    <TableCell>
                      <Select
                        value={m.campo ?? IGNORAR}
                        onValueChange={(v) =>
                          setMapeo((actual) => remapear(actual, m.columna, v === IGNORAR ? null : v))
                        }
                      >
                        <SelectTrigger className="w-60" aria-label={`Campo para ${m.columna}`} data-testid={`mapeo-${m.columna}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={IGNORAR}>Ignorar</SelectItem>
                          {COLUMNAS_DE_ASIENTO.map((c) => (
                            <SelectItem key={c.campo} value={c.campo}>
                              {c.titulo}
                              {c.obligatoria ? ' *' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-xs text-fg-muted">
                      {m.isManual ? 'elegido a mano' : m.porque}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {sinMapear.length > 0 ? (
            <div className="mt-4 flex items-start gap-2 rounded-md border border-border bg-warning-soft p-3" data-testid="asientos-sin-mapear">
              <Warning className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <p className="text-sm text-fg">
                Falta decir qué columna es {sinMapear.map((c) => `«${c.titulo}»`).join(', ')}. Sin
                eso el back rechaza todas las filas.
              </p>
            </div>
          ) : null}

          {demasiados ? (
            <div className="mt-4 flex items-start gap-2 rounded-md border border-border bg-danger-soft p-3">
              <Warning className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
              <p className="text-sm text-fg">
                Son {armados.length} asientos y un lote admite hasta {MAX_ASIENTOS_POR_LOTE}. Partí
                el archivo (por año, por ejemplo) y subilo en tandas.
              </p>
            </div>
          ) : null}

          <div className="mt-4 flex items-start gap-2 rounded-md border border-border bg-info-soft p-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
            <p className="text-sm text-fg-muted">
              Los montos entran como están («1.500.000», «1500000,00»); las fechas en AAAA-MM-DD
              o DD/MM/AAAA. Las cuentas se buscan por código en tu plan: las que no existan se
              avisan, no se inventan.
            </p>
          </div>

          <div className="mt-5 flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label htmlFor="lote-asientos" className="text-sm font-medium text-fg">
                Nombre del lote
              </label>
              <Input
                id="lote-asientos"
                value={lote}
                maxLength={LARGO_MAXIMO_DE_LOTE}
                onChange={(e) => setLote(e.target.value)}
                className="w-72"
                data-testid="nombre-del-lote-asientos"
              />
              <p className="text-xs text-fg-subtle">
                Para reconocerlo después. Subir el mismo lote dos veces no duplica nada.
              </p>
            </div>
            <Button onClick={revisar} disabled={!puedeRevisar} isLoading={cargando} hideArrow data-testid="revisar-asientos">
              Revisar {armados.length} asientos
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

// ── Revisión ────────────────────────────────────────────────────────────────

function Revision({
  revision,
  cargando,
  error,
  onRevisarDeNuevo,
  onIrAlPuc,
  onAplicar,
  onOtroArchivo,
}: {
  revision: RevisionDeLote;
  cargando: boolean;
  error: string | null;
  onRevisarDeNuevo: () => void;
  onIrAlPuc?: () => void;
  onAplicar: () => void;
  onOtroArchivo: () => void;
}) {
  const rechazadas = revision.filas.filter((f) => f.estado === 'RECHAZADA');
  const puedeAplicar = revision.listas > 0 && !cargando;

  return (
    <div className="space-y-6" data-testid="revision-asientos">
      <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
        <h2 className="font-medium text-fg">Revisión de «{revision.lote}»</h2>
        <p className="mt-1 text-sm text-fg-muted">
          Nada se escribió todavía. Esto es lo que pasaría si aplicás el lote.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <Dato etiqueta="En el archivo" valor={revision.total} />
          <Dato etiqueta="Listos para entrar" valor={revision.listas} tono="ok" />
          <Dato etiqueta="Con problemas" valor={revision.rechazadas} tono="mal" />
          <Dato etiqueta="Ya migrados antes" valor={revision.yaMigradas} />
        </div>
      </section>

      {revision.cuentasFaltantes.length > 0 ? (
        <section
          className="rounded-lg border border-warning bg-warning-soft p-5"
          data-testid="cuentas-faltantes"
        >
          <div className="flex items-start gap-2">
            <Warning className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-fg">
                {revision.cuentasFaltantes.length === 1
                  ? 'Una cuenta del archivo no existe en tu plan'
                  : `${revision.cuentasFaltantes.length} cuentas del archivo no existen en tu plan`}
              </h3>
              <p className="mt-0.5 text-sm text-fg-muted">
                No se crean solas: un código suelto no dice ni la naturaleza ni de qué cuelga.
                Crealas en el paso 4 con tu contador y volvé a revisar: el archivo sigue acá.
              </p>
            </div>
          </div>
          <ul className="mt-3 flex flex-wrap gap-2">
            {revision.cuentasFaltantes.map((c) => (
              <li
                key={c.codigo}
                className="rounded-md border border-border bg-surface px-2.5 py-1 text-sm text-fg"
              >
                <span className="font-mono tabular-nums">{c.codigo}</span>
                <span className="text-fg-subtle"> · {c.filas.length} {c.filas.length === 1 ? 'asiento' : 'asientos'}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            {onIrAlPuc ? (
              <Button size="sm" variant="outline" hideArrow onClick={onIrAlPuc}>
                Crear las cuentas en el paso 4
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button asChild size="sm" variant="outline" hideArrow>
                <Link href={RUTA_DEL_PASO_4} target="_blank" rel="noopener">
                  Crear las cuentas en el paso 4
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
            <Button size="sm" variant="ghost" hideArrow onClick={onRevisarDeNuevo} isLoading={cargando} data-testid="revisar-de-nuevo">
              Ya las creé, revisar de nuevo
            </Button>
          </div>
        </section>
      ) : null}

      {revision.motivos.length > 0 ? (
        <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
          <h3 className="font-medium text-fg">Por qué no entran</h3>
          <ul className="mt-2 space-y-1 text-sm text-fg-muted">
            {revision.motivos.map((m) => (
              <li key={m.motivo}>
                <span className="font-mono tabular-nums text-fg">{m.filas.length}</span> · {m.motivo}
              </li>
            ))}
          </ul>
          {rechazadas.length > 0 ? (
            <div className="mt-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Fila</TableHead>
                    <TableHead className="w-32">Comprobante</TableHead>
                    <TableHead>Qué pasa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rechazadas.slice(0, MAX_FILAS_EN_PANTALLA).map((f) => (
                    <TableRow key={f.clave}>
                      <TableCell className="font-mono text-xs tabular-nums">{f.fila}</TableCell>
                      <TableCell className="font-mono text-xs">{f.numeroOriginal ?? '—'}</TableCell>
                      <TableCell className="text-sm">{f.errores.join(' · ')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {rechazadas.length > MAX_FILAS_EN_PANTALLA ? (
                <p className="mt-2 text-xs text-fg-subtle">
                  …y {rechazadas.length - MAX_FILAS_EN_PANTALLA} más con los mismos motivos.
                </p>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {error ? (
        <div className="flex items-start gap-2 rounded-md border border-border bg-danger-soft p-3" role="alert">
          <Warning className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          <p className="text-sm text-fg">{error}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface p-4">
        <Button onClick={onAplicar} disabled={!puedeAplicar} isLoading={cargando} hideArrow data-testid="aplicar-asientos">
          Aplicar {revision.listas} {revision.listas === 1 ? 'asiento' : 'asientos'}
        </Button>
        {revision.rechazadas > 0 ? (
          <p className="text-sm text-fg-muted">
            Los {revision.rechazadas} con problemas quedan afuera; podés corregir el archivo y
            subirlo de nuevo con el mismo nombre de lote sin duplicar los que ya entraron.
          </p>
        ) : null}
        <Button variant="ghost" size="sm" hideArrow onClick={onOtroArchivo} disabled={cargando} className="ml-auto">
          Otro archivo
        </Button>
      </div>
    </div>
  );
}

function Informe({ informe, onOtro }: { informe: InformeDeMigracion; onOtro: () => void }) {
  return (
    <section className="rounded-lg border border-border bg-surface p-6 shadow-sm" data-testid="informe-asientos">
      <div className="flex items-start gap-3">
        <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-success" weight="fill" />
        <div>
          <h2 className="font-medium text-fg">
            {informe.aplicados === 1
              ? 'Entró 1 asiento'
              : `Entraron ${informe.aplicados} asientos`}
            {informe.primerNumero !== null && informe.ultimoNumero !== null
              ? ` (N.º ${informe.primerNumero} a ${informe.ultimoNumero})`
              : ''}
          </h2>
          <p className="mt-1 text-sm text-fg-muted">
            Lote «{informe.lote}»: {informe.total} en el archivo · {informe.aplicados} aplicados ·{' '}
            {informe.omitidos} omitidos · {informe.yaMigrados} ya estaban.
          </p>
        </div>
      </div>

      {informe.fallasAlEscribir.length > 0 ? (
        <div className="mt-4 rounded-md border border-border bg-danger-soft p-3">
          <p className="text-sm font-medium text-fg">
            {informe.fallasAlEscribir.length} no se pudieron escribir
          </p>
          <ul className="mt-1 space-y-0.5 text-sm text-fg-muted">
            {informe.fallasAlEscribir.slice(0, MAX_FILAS_EN_PANTALLA).map((f) => (
              <li key={f.fila}>
                Fila {f.fila}: {f.motivo}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        <Button asChild hideArrow>
          <Link href="/panel/inmobiliaria/migracion">Volver a la secuencia</Link>
        </Button>
        <Button variant="outline" hideArrow onClick={onOtro}>
          Subir otro archivo
        </Button>
      </div>
    </section>
  );
}

function Dato({ etiqueta, valor, tono }: { etiqueta: string; valor: number; tono?: 'ok' | 'mal' }) {
  return (
    <div className="rounded-md border border-border p-3">
      <p className="text-xs text-fg-muted">{etiqueta}</p>
      <p
        className={`font-mono text-xl font-semibold tabular-nums ${
          tono === 'ok' && valor > 0 ? 'text-success' : tono === 'mal' && valor > 0 ? 'text-danger' : 'text-fg'
        }`}
      >
        {valor}
      </p>
    </div>
  );
}
