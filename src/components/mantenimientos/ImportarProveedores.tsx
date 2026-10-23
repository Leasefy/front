'use client';

/**
 * Importar proveedores desde un Excel (reunión con Portofino, 22-10-2026).
 * Juliana: Portofino nos pasa su lista de proveedores. Nico: «subir un Excel en
 * Proveedores».
 *
 * El archivo llega TAL COMO VENGA: se reconocen las columnas (la persona las
 * cambia si no son), el back revisa cada fila sin escribir nada y la pantalla
 * dice qué pasará con cada una — se registra, ya estaba (no se toca) o le falta
 * algo. Lo que le falta se corrige AQUÍ, sin volver al Excel. Nada se registra
 * hasta «Registrar N proveedores».
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { CheckCircle, PencilSimple, UploadSimple, WarningCircle } from '@phosphor-icons/react';
import { Presence } from '@leasefy/cadence';

import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon';
import { Button, Input } from '@/components/ui';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ZonaDeArchivo } from '@/components/migracion/ZonaDeArchivo';
import { TarjetaDeArchivo } from '@/components/migracion/TarjetaDeArchivo';
import { TipoDeDocumentoDelProveedor } from '@/components/inmobiliaria/mantenimiento/TipoDeDocumentoDelProveedor';
import { EN_PALABRAS } from './especialidades';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { leerPlanilla, type PlanillaLeida } from '@/lib/importar/leer-planilla';
import type { Mapeo } from '@/lib/importar/reconocer-columnas';
import {
  CAMPOS_DEL_PROVEEDOR,
  armarFilasDeProveedores,
  type CampoDelProveedor,
  type FilaDeProveedorDelArchivo,
} from '@/lib/mantenimiento/proveedores-del-archivo';
import type { TipoDeDocumentoDelProveedor as TipoDelDocumento } from '@/lib/mantenimiento/documento-del-proveedor';
import {
  proveedoresDeMantenimientoApi,
  type EstadoDeLaFilaImportada,
  type FilaImportadaDeProveedor,
  type ResultadoDeImportarProveedores,
} from '@/lib/api/proveedores-de-mantenimiento.service';

const TOPE_BYTES = 8_000_000;
const SIN_COLUMNA = '—';
const DE_A = 50;

type Filtro = 'NUEVO' | 'CON_PROBLEMA' | 'YA_ESTABA' | 'HECHO';

const contar = (n: number, uno: string, varios: string) => `${n.toLocaleString('es-CO')} ${n === 1 ? uno : varios}`;

const ESTILO_DEL_ESTADO: Record<EstadoDeLaFilaImportada, { texto: string; clase: string }> = {
  NUEVO: { texto: 'Se registra', clase: 'bg-success-soft text-success' },
  CREADO: { texto: 'Registrado', clase: 'bg-success-soft text-success' },
  YA_ESTABA: { texto: 'Ya estaba', clase: 'bg-surface-muted text-fg-muted' },
  CON_PROBLEMA: { texto: 'Por corregir', clase: 'bg-warning-soft text-warning' },
  NO_SE_CREO: { texto: 'No se registró', clase: 'bg-danger-soft text-danger' },
};

/** Una fila del archivo, con lo que dijo el back y, si le falta algo, cómo corregirla. */
function FilaDelArchivo({
  fila,
  onCorregir,
}: {
  fila: FilaImportadaDeProveedor;
  onCorregir?: (cambios: Partial<FilaDeProveedorDelArchivo>) => void;
}) {
  const [corrigiendo, setCorrigiendo] = useState(false);
  const [nombre, setNombre] = useState(fila.nombre);
  const [tipo, setTipo] = useState<TipoDelDocumento | ''>(fila.tipoDocumento ?? '');
  const [documento, setDocumento] = useState(fila.documento);
  const estilo = ESTILO_DEL_ESTADO[fila.estado];
  const datos = [
    fila.documento ? `${fila.tipoDocumento ? `${fila.tipoDocumento} ` : ''}${fila.documento}` : null,
    fila.especialidades.map((e) => EN_PALABRAS.get(e) ?? e).join(', ') || null,
    fila.telefono,
    fila.correo,
  ].filter(Boolean);

  return (
    <li className="space-y-2 px-4 py-3" data-testid={`fila-importada-${fila.fila}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-medium text-fg">
            <span className="font-normal text-fg-muted">Fila {fila.fila} · </span>
            {fila.nombre || <span className="text-fg-muted">Sin nombre</span>}
          </p>
          {datos.length > 0 && <p className="break-words text-xs text-fg-muted">{datos.join(' · ')}</p>}
        </div>
        <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-medium', estilo.clase)}>{estilo.texto}</span>
      </div>
      {fila.existente && fila.estado === 'YA_ESTABA' && (
        <p className="text-xs text-fg-muted">Está como «{fila.existente.nombre}». No se toca.</p>
      )}
      {fila.problemas.map((p) => (
        <p key={p} className="flex items-start gap-1.5 text-xs text-danger">
          <WarningCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {p}
        </p>
      ))}
      {fila.avisos.map((a) => (
        <p key={a} className="text-xs text-warning">
          {a}
        </p>
      ))}
      {onCorregir && !corrigiendo && (
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          onClick={() => setCorrigiendo(true)}
          data-testid={`corregir-fila-${fila.fila}`}
        >
          <PencilSimple className="h-3.5 w-3.5" aria-hidden="true" />
          Corregir aquí
        </button>
      )}
      {onCorregir && (
        <Presence show={corrigiendo} direction="down">
          <div className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,11rem)_minmax(0,10rem)_auto] sm:items-end">
            <div className="min-w-0 space-y-1">
              <Label htmlFor={`nombre-${fila.fila}`} className="text-caption">Nombre</Label>
              <Input id={`nombre-${fila.fila}`} value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </div>
            <div className="min-w-0 space-y-1">
              <Label htmlFor={`tipo-${fila.fila}`} className="text-caption">Tipo</Label>
              <TipoDeDocumentoDelProveedor id={`tipo-${fila.fila}`} valor={tipo} onCambiar={setTipo} />
            </div>
            <div className="min-w-0 space-y-1">
              <Label htmlFor={`documento-${fila.fila}`} className="text-caption">Número</Label>
              <Input
                id={`documento-${fila.fila}`}
                value={documento}
                inputMode={tipo === 'PASSPORT' ? 'text' : 'numeric'}
                onChange={(e) => setDocumento(e.target.value)}
              />
            </div>
            <Button
              type="button"
              size="sm"
              hideArrow
              onClick={() => {
                onCorregir({
                  nombre: nombre.trim(),
                  // El código (CC, NIT…) lo lee el back igual que una celda.
                  ...(tipo ? { tipoDocumento: tipo } : {}),
                  documento: documento.trim(),
                });
                setCorrigiendo(false);
              }}
              data-testid={`listo-fila-${fila.fila}`}
            >
              Listo
            </Button>
          </div>
        </Presence>
      )}
    </li>
  );
}

export function ImportarProveedores({
  abierto,
  onCerrar,
  onImportado,
}: {
  abierto: boolean;
  onCerrar: () => void;
  /** Después de registrar: volver a leer la lista. */
  onImportado: () => void;
}) {
  const [archivo, setArchivo] = useState<{ nombre: string; peso: number } | null>(null);
  const [planilla, setPlanilla] = useState<PlanillaLeida<CampoDelProveedor> | null>(null);
  const [mapeo, setMapeo] = useState<Mapeo<CampoDelProveedor>>({});
  const [correcciones, setCorrecciones] = useState<Record<number, Partial<FilaDeProveedorDelArchivo>>>({});
  const [previa, setPrevia] = useState<ResultadoDeImportarProveedores | null>(null);
  const [resultado, setResultado] = useState<ResultadoDeImportarProveedores | null>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [revisando, setRevisando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>('NUEVO');
  const [cuantas, setCuantas] = useState(DE_A);
  const pedido = useRef(0);

  const descartar = () => {
    setArchivo(null);
    setPlanilla(null);
    setMapeo({});
    setCorrecciones({});
    setPrevia(null);
    setResultado(null);
  };

  // Cada apertura arranca en blanco.
  useEffect(() => {
    if (abierto) descartar();
  }, [abierto]);

  /** Las filas que viajan: las del archivo con las columnas elegidas y lo corregido aquí. */
  const filas = useMemo(() => {
    if (!planilla) return [];
    return armarFilasDeProveedores(planilla.filas, mapeo, planilla.filaDeEncabezado).map((f) => ({
      ...f,
      ...(correcciones[f.fila] ?? {}),
    }));
  }, [planilla, mapeo, correcciones]);

  const revisar = useCallback(async () => {
    if (filas.length === 0) {
      setPrevia(null);
      return;
    }
    const este = ++pedido.current;
    setRevisando(true);
    try {
      const r = await proveedoresDeMantenimientoApi.importar(filas, true);
      if (este !== pedido.current) return;
      setPrevia(r);
      setFiltro((f) => (f === 'NUEVO' && r.nuevos === 0 && r.conProblema > 0 ? 'CON_PROBLEMA' : f));
    } catch (e) {
      if (este !== pedido.current) return;
      setPrevia(null);
      toast.error('No se pudo revisar el archivo', {
        description: mensajeParaLaPersona(e, { accion: 'revisar el archivo de proveedores' }),
      });
    } finally {
      if (este === pedido.current) setRevisando(false);
    }
  }, [filas]);

  useEffect(() => {
    if (planilla && !resultado) void revisar();
  }, [planilla, resultado, revisar]);

  const elegir = async (a: File) => {
    if (a.size > TOPE_BYTES) {
      toast.error(`El archivo pesa ${(a.size / 1_000_000).toFixed(1)} MB y el tope son 8 MB.`);
      return;
    }
    descartar();
    setLeyendo(true);
    try {
      const leida = await leerPlanilla(a, CAMPOS_DEL_PROVEEDOR);
      setArchivo({ nombre: a.name, peso: a.size });
      setPlanilla(leida);
      setMapeo(leida.mapeo);
      setFiltro('NUEVO');
      setCuantas(DE_A);
    } catch (e) {
      toast.error('No se pudo leer el archivo', {
        description: mensajeParaLaPersona(e, {
          porDefecto: 'Revisa que sea un Excel (.xlsx, .xls), un CSV o un .ods.',
          accion: 'leer el archivo de proveedores',
        }),
      });
    } finally {
      setLeyendo(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: (aceptados: File[]) => {
      if (aceptados[0]) void elegir(aceptados[0]);
    },
    onDropRejected: () => toast.error('Ese archivo no se puede leer: sube un Excel (.xlsx, .xls), un CSV o un .ods.'),
    multiple: false,
    maxFiles: 1,
    disabled: leyendo || importando,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.oasis.opendocument.spreadsheet': ['.ods'],
    },
  });

  const importar = async () => {
    if (!previa || previa.nuevos === 0 || importando) return;
    setImportando(true);
    try {
      const r = await proveedoresDeMantenimientoApi.importar(filas, false);
      setResultado(r);
      setFiltro('HECHO');
      setCuantas(DE_A);
      toast.success(
        r.creados === 1 ? 'Quedó 1 proveedor registrado' : `Quedaron ${r.creados.toLocaleString('es-CO')} proveedores registrados`,
        r.noSeCrearon > 0 ? { description: `${contar(r.noSeCrearon, 'fila no se registró', 'filas no se registraron')}: abajo está por qué.` } : undefined,
      );
      onImportado();
    } catch (e) {
      toast.error('No se pudieron registrar los proveedores', {
        description: mensajeParaLaPersona(e, { accion: 'registrar los proveedores del archivo' }),
      });
    } finally {
      setImportando(false);
    }
  };

  const vista = resultado ?? previa;
  const visibles = useMemo(() => {
    if (!vista) return [];
    const de = (e: EstadoDeLaFilaImportada[]) => vista.filas.filter((f) => e.includes(f.estado));
    if (filtro === 'HECHO') return de(['CREADO', 'NO_SE_CREO']);
    return de([filtro]);
  }, [vista, filtro]);

  const pestanas: Array<{ id: Filtro; texto: string; n: number }> = vista
    ? resultado
      ? [
          { id: 'HECHO', texto: 'Registrados', n: resultado.creados + resultado.noSeCrearon },
          { id: 'CON_PROBLEMA', texto: 'Por corregir', n: resultado.conProblema },
          { id: 'YA_ESTABA', texto: 'Ya estaban', n: resultado.yaEstaban },
        ]
      : [
          { id: 'NUEVO', texto: 'Para registrar', n: vista.nuevos },
          { id: 'CON_PROBLEMA', texto: 'Por corregir', n: vista.conProblema },
          { id: 'YA_ESTABA', texto: 'Ya estaban', n: vista.yaEstaban },
        ]
    : [];

  const ayuda = resultado
    ? `${contar(resultado.creados, 'proveedor quedó registrado', 'proveedores quedaron registrados')}.`
    : previa
      ? previa.nuevos === 0
        ? 'No hay ninguno para registrar todavía.'
        : `Las que ya estaban no se tocan${previa.conProblema > 0 ? ' y las que tienen algo por corregir no se registran' : ''}.`
      : 'Nada se registra hasta que lo confirmes.';

  return (
    <Cajon abierto={abierto} onOpenChange={(v) => !v && onCerrar()} tamano="xl" data-testid="importar-proveedores">
      <CajonCabecera
        titulo="Importar proveedores"
        descripcion="Sube el Excel o el CSV tal como lo tengas. Reconocemos las columnas, te mostramos qué pasará con cada fila y nada se registra hasta que lo confirmes."
      />
      <CajonCuerpo className="space-y-5">
        {archivo ? (
          <TarjetaDeArchivo
            nombre={archivo.nombre}
            peso={archivo.peso}
            detalle={planilla ? `Hoja «${planilla.hoja}» · ${contar(planilla.filas.length, 'fila', 'filas')}` : undefined}
            inputProps={getInputProps()}
            inputTestid="archivo-de-proveedores"
            onSubirOtro={open}
            onDescartar={descartar}
            ocupado={leyendo || importando}
          />
        ) : (
          <ZonaDeArchivo
            rootProps={getRootProps()}
            inputProps={getInputProps()}
            activo={isDragActive}
            testid="zona-de-proveedores"
            inputTestid="archivo-de-proveedores"
            titulo="Arrastra el archivo de proveedores o haz clic para elegirlo"
            detalle="Excel (.xlsx, .xls), CSV u .ods, con una fila por proveedor. Sirve con los títulos que traiga: nombre, NIT o cédula, teléfono, correo, oficio…"
          />
        )}
        {leyendo && (
          <p className="text-sm text-fg-muted" role="status">
            Leyendo el archivo…
          </p>
        )}

        {planilla && !resultado && (
          <section className="space-y-3 rounded-lg border border-border p-4" data-testid="columnas-de-proveedores">
            <p className="text-sm font-medium text-fg">Esta es la columna de cada dato; cámbiala si no es.</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {CAMPOS_DEL_PROVEEDOR.map((c) => (
                <div key={c.campo} className="min-w-0 space-y-1">
                  <Label className="text-caption">
                    {c.etiqueta}
                    {c.requerido ? null : <span className="text-fg-muted"> (opcional)</span>}
                  </Label>
                  <Select
                    value={mapeo[c.campo] ?? SIN_COLUMNA}
                    onValueChange={(v) =>
                      setMapeo((m) => {
                        const nuevo = { ...m };
                        if (v === SIN_COLUMNA) delete nuevo[c.campo];
                        else nuevo[c.campo] = v;
                        return nuevo;
                      })
                    }
                  >
                    <SelectTrigger data-testid={`columna-${c.campo}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SIN_COLUMNA}>— No viene —</SelectItem>
                      {planilla.encabezados.map((e) => (
                        <SelectItem key={e} value={e}>
                          {e}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </section>
        )}

        {planilla && filas.length === 0 && !leyendo && (
          <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-fg-muted">
            Con estas columnas no sale ningún proveedor. Elige al menos la columna del nombre o la del documento.
          </p>
        )}

        {revisando && !vista && (
          <p className="text-sm text-fg-muted" role="status">
            Revisando cada fila…
          </p>
        )}

        {vista && (
          <section className="space-y-3" aria-busy={revisando} data-testid="revision-de-proveedores">
            {!vista.disponible && (
              <p role="alert" className="rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-xs text-warning">
                Todavía no se pueden registrar proveedores: Leasefy tiene pendiente una actualización.
              </p>
            )}
            {resultado && (
              <p className="flex items-center gap-2 text-sm text-fg">
                <CheckCircle className="h-4 w-4 text-success" aria-hidden="true" />
                {contar(resultado.creados, 'proveedor registrado', 'proveedores registrados')}
                {resultado.noSeCrearon > 0 ? ` · ${contar(resultado.noSeCrearon, 'no se registró', 'no se registraron')}` : ''}.
              </p>
            )}
            <div role="tablist" aria-label="Filas del archivo" className="flex flex-wrap gap-2">
              {pestanas
                .filter((p) => p.n > 0 || p.id === filtro)
                .map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    role="tab"
                    aria-selected={filtro === p.id}
                    onClick={() => {
                      setFiltro(p.id);
                      setCuantas(DE_A);
                    }}
                    className={cn(
                      'rounded-full border px-3 py-1 text-sm transition-colors',
                      filtro === p.id
                        ? 'border-primary bg-primary-soft text-fg'
                        : 'border-border text-fg-muted hover:text-fg',
                    )}
                    data-testid={`pestana-${p.id}`}
                  >
                    {p.texto} <span className="tabular-nums">{p.n.toLocaleString('es-CO')}</span>
                  </button>
                ))}
            </div>
            {visibles.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-fg-muted">
                {filtro === 'CON_PROBLEMA' ? 'Ninguna fila tiene algo por corregir.' : 'No hay filas aquí.'}
              </p>
            ) : (
              <ul className="divide-y divide-border-faint rounded-lg border border-border">
                {visibles.slice(0, cuantas).map((f) => (
                  <FilaDelArchivo
                    key={`${f.fila}-${f.estado}-${f.documento}`}
                    fila={f}
                    onCorregir={
                      !resultado && f.estado === 'CON_PROBLEMA'
                        ? (cambios) => setCorrecciones((c) => ({ ...c, [f.fila]: { ...(c[f.fila] ?? {}), ...cambios } }))
                        : undefined
                    }
                  />
                ))}
              </ul>
            )}
            {visibles.length > cuantas && (
              <Button type="button" variant="outline" size="sm" hideArrow onClick={() => setCuantas((n) => n + DE_A)}>
                Ver {Math.min(DE_A, visibles.length - cuantas)} más de {visibles.length.toLocaleString('es-CO')}
              </Button>
            )}
          </section>
        )}
      </CajonCuerpo>
      <CajonPie ayuda={<span data-testid="importar-proveedores-ayuda">{ayuda}</span>}>
        {resultado ? (
          <Button hideArrow onClick={onCerrar}>
            Listo
          </Button>
        ) : (
          <>
            <Button variant="outline" hideArrow onClick={onCerrar} disabled={importando}>
              Cancelar
            </Button>
            <Button
              hideArrow
              isLoading={importando}
              disabled={!previa || previa.nuevos === 0 || !previa.disponible || importando || revisando}
              onClick={() => void importar()}
              data-testid="registrar-proveedores-del-archivo"
            >
              <UploadSimple className="h-4 w-4" aria-hidden="true" />
              {previa && previa.nuevos > 0
                ? `Registrar ${contar(previa.nuevos, 'proveedor', 'proveedores')}`
                : 'Registrar proveedores'}
            </Button>
          </>
        )}
      </CajonPie>
    </Cajon>
  );
}
