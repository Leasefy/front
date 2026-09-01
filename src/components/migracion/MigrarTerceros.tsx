'use client';

/**
 * Paso 1 de la migración: los terceros.
 *
 * ── preparar → corregir → aplicar ───────────────────────────────────────────
 *
 * Tres pasos y no uno, por la misma razón que en la migración de contratos: un
 * import que crea o falla obliga a corregir el Excel y volver a subirlo por
 * cada dato que falte, y en 600 propietarios siempre falta uno. Acá la fila
 * entra SIEMPRE, se revisa en pantalla, y sólo lo que quedó `LISTO` se
 * convierte en una ficha real.
 *
 * ── Cuatro cosas que esta pantalla hace a propósito ─────────────────────────
 *
 * 1. **Las columnas las manda el back.** `GET /plantilla` alimenta el mapeo Y
 *    la descarga de la plantilla vacía. Una lista escrita en el front se queda
 *    vieja sin un solo error.
 * 2. **Muestra POR QUÉ mapeó cada columna, y deja corregirlo.** Y distingue el
 *    empate exacto del parecido: «coincide con» no es «se parece a».
 * 3. **Ningún archivo se rechaza por lo que le falta.** Lo que falte se
 *    completa fila por fila, sin volver a subir nada.
 * 4. **Un duplicado se pregunta.** Nunca se fusiona solo.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  CheckCircle,
  DownloadSimple,
  FileArrowUp,
  Info,
  UserCircle,
  Users,
  Warning,
} from '@phosphor-icons/react';
import { SegmentedControl } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { parseSpreadsheetFile } from '@/components/inmobiliaria/import/lib/parseFile';
import {
  migracionTercerosApi,
  celdasDemasiadoLargas,
  MAX_FILAS_POR_LOTE,
  type FilaDeStaging,
  type FilaTercero,
  type LoteDeTerceros,
  type PlantillaDeTerceros,
  type ResumenDeAplicacion,
  type ResumenDeLote,
  type TipoDeTercero,
} from '@/lib/api/migracion-terceros.service';
import {
  armarFila,
  columnasNoSoportadas,
  mapearColumnas,
  nombreDeLoteSugerido,
  obligatoriasSinMapear,
  remapear,
  type MapeoDeColumna,
} from '@/lib/migracion/columnas-de-tercero';
import { descargarPlantillaDeTerceros } from '@/lib/migracion/plantilla-de-terceros';
import { FilaDeTercero } from './FilaDeTercero';

/** Sentinel de Radix: un `<Select>` no admite `value=""`. */
const IGNORAR = '__ignorar__';

/**
 * Cuántas filas por página en la lista de trabajo.
 *
 * Con 400 pendientes, pintarlas todas son 400 tarjetas con sus propios
 * controles: la pestaña se arrastra y nadie llega a la última.
 */
const POR_PAGINA = 25;

type Fila = Record<string, unknown>;

const mensaje = (e: unknown, respaldo: string) =>
  e instanceof Error && e.message ? e.message : respaldo;

export interface MigrarTercerosProps {
  /**
   * Adentro del muro cada tipo es un paso: se fija el tipo y desaparece el
   * switch «¿Qué estás cargando?» — Nico vio que nadie iba a entender que
   * cambiando esa pestaña cambiaba lo que subía.
   */
  tipoFijo?: TipoDeTercero;
  /** Con qué tipo arranca la pantalla suelta (`/migracion/terceros?tipo=…`). */
  tipoInicial?: TipoDeTercero;
  /**
   * Aviso hacia el muro: `true` mientras se están CREANDO las fichas.
   * Sin esto, el pie ofrecía «Seguir con Inquilinos» apenas el conteo del
   * estado pasaba de cero, con la creación todavía corriendo (Nico lo vio).
   */
  onOcupado?: (ocupado: boolean) => void;
}

export function MigrarTerceros({ tipoFijo, tipoInicial, onOcupado }: MigrarTercerosProps = {}) {
  const [tipo, setTipo] = useState<TipoDeTercero>(tipoFijo ?? tipoInicial ?? 'PROPIETARIO');
  const [plantilla, setPlantilla] = useState<PlantillaDeTerceros | null>(null);

  const [filas, setFilas] = useState<Fila[]>([]);
  const [encabezados, setEncabezados] = useState<string[]>([]);
  const [mapeo, setMapeo] = useState<MapeoDeColumna[]>([]);
  const [nombreDeArchivo, setNombreDeArchivo] = useState('');
  const [lote, setLote] = useState('');

  const [loteAbierto, setLoteAbierto] = useState<string | null>(null);
  const [resumen, setResumen] = useState<ResumenDeLote | null>(null);
  const [pendientes, setPendientes] = useState<FilaDeStaging[]>([]);
  const [totalPendientes, setTotalPendientes] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [aplicacion, setAplicacion] = useState<ResumenDeAplicacion | null>(null);

  const [lotesAbiertos, setLotesAbiertos] = useState<LoteDeTerceros[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /*
   * `useMemo` y no `plantilla?.columnas ?? []` suelto: ese `[]` es un array
   * nuevo en cada render, así que TODO lo que depende de `columnas` se
   * recalcula siempre — incluido `celdasDemasiadoLargas` sobre las 5.000 filas
   * del archivo, en cada tecla del nombre del lote.
   */
  const columnas = useMemo(() => plantilla?.columnas ?? [], [plantilla]);

  // ── La plantilla, por tipo ────────────────────────────────────────────────

  useEffect(() => {
    let vigente = true;
    setPlantilla(null);
    migracionTercerosApi
      .plantilla(tipo)
      .then((p) => vigente && setPlantilla(p))
      .catch((e) => vigente && setError(mensaje(e, 'No pudimos leer las columnas esperadas.')));
    return () => {
      vigente = false;
    };
  }, [tipo]);

  // Cambiar de tipo invalida el mapeo: las columnas de un inquilino no son las
  // de un propietario, y remapear contra la plantilla vieja guardaría el banco
  // en un campo que ya no existe.
  useEffect(() => {
    setFilas([]);
    setEncabezados([]);
    setMapeo([]);
    setNombreDeArchivo('');
  }, [tipo]);

  useEffect(() => {
    setLote(nombreDeLoteSugerido(tipo));
  }, [tipo]);

  // ── Migraciones a medias ──────────────────────────────────────────────────

  const refrescarLotesAbiertos = useCallback(() => {
    migracionTercerosApi
      .lotesAbiertos()
      .then(setLotesAbiertos)
      .catch(() => {
        // No poder listarlos no puede impedir empezar uno nuevo.
      });
  }, []);

  useEffect(refrescarLotesAbiertos, [refrescarLotesAbiertos]);

  // ── Leer el archivo ───────────────────────────────────────────────────────

  const leerArchivo = useCallback(
    async (archivo: File) => {
      setError(null);
      setAplicacion(null);
      try {
        const { rows, headers } = await parseSpreadsheetFile(archivo);
        setFilas(rows as Fila[]);
        setEncabezados(headers);
        setMapeo(mapearColumnas(columnas, headers));
        setNombreDeArchivo(archivo.name);
      } catch (e) {
        setError(mensaje(e, 'No pudimos leer el archivo.'));
        setFilas([]);
        setEncabezados([]);
        setMapeo([]);
      }
    },
    [columnas],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (aceptados) => {
      const archivo = aceptados[0];
      if (archivo) void leerArchivo(archivo);
    },
    maxFiles: 1,
    multiple: false,
    disabled: !plantilla,
  });

  // ── Preparar ──────────────────────────────────────────────────────────────

  const aMigrar = useMemo(
    () => filas.map((fila) => armarFila(fila, mapeo)),
    [filas, mapeo],
  );
  const celdasLargas = useMemo(() => celdasDemasiadoLargas(aMigrar), [aMigrar]);
  const noSoportadas = useMemo(() => columnasNoSoportadas(columnas), [columnas]);
  const faltanObligatorias = useMemo(
    () => obligatoriasSinMapear(columnas, mapeo),
    [columnas, mapeo],
  );

  const refrescar = useCallback(async (elLote: string, pag = 1) => {
    const [r, p] = await Promise.all([
      migracionTercerosApi.resumen(elLote),
      migracionTercerosApi.filas({
        lote: elLote,
        estado: 'REQUIERE_ATENCION',
        pagina: pag,
        porPagina: POR_PAGINA,
      }),
    ]);
    setResumen(r);
    setPendientes(p.filas);
    setTotalPendientes(p.total);
    setPagina(p.pagina);
    // `seleccion` sobrevive a propósito: se limpia sólo cuando cambia el LOTE.
    // Reiniciarla acá haría que resolver una fila borrara lo elegido en otras
    // páginas, y aplicar algo a 300 filas serían doce masivas repetidas.
  }, []);

  const preparar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const r = await migracionTercerosApi.preparar(lote.trim(), tipo, aMigrar);
      setResumen(r);
      setLoteAbierto(lote.trim());
      setSeleccion(new Set());
      await refrescar(lote.trim());
    } catch (e) {
      // El 409 `LOTE_YA_EXISTE` trae su propio mensaje con el nombre adentro;
      // se muestra tal cual en vez de traducirlo a «error al preparar».
      setError(mensaje(e, 'No pudimos preparar la carga.'));
    } finally {
      setCargando(false);
    }
  }, [lote, tipo, aMigrar, refrescar]);

  const retomar = useCallback(
    async (l: LoteDeTerceros) => {
      setError(null);
      setTipo(l.tipo);
      setLoteAbierto(l.lote);
      setSeleccion(new Set());
      try {
        await refrescar(l.lote);
      } catch (e) {
        setError(mensaje(e, 'No pudimos abrir esa carga.'));
      }
    },
    [refrescar],
  );

  const volverAEmpezar = useCallback(() => {
    setResumen(null);
    setLoteAbierto(null);
    setPendientes([]);
    setTotalPendientes(0);
    setAplicacion(null);
    setSeleccion(new Set());
    setFilas([]);
    setEncabezados([]);
    setMapeo([]);
    setNombreDeArchivo('');
    setLote(nombreDeLoteSugerido(tipo));
    refrescarLotesAbiertos();
  }, [tipo, refrescarLotesAbiertos]);

  // ── Acciones sobre filas ──────────────────────────────────────────────────

  const conRefresco = useCallback(
    async (accion: () => Promise<unknown>, respaldo: string) => {
      if (!loteAbierto) return;
      setCargando(true);
      setError(null);
      try {
        await accion();
        await refrescar(loteAbierto, pagina);
      } catch (e) {
        setError(mensaje(e, respaldo));
      } finally {
        setCargando(false);
      }
    },
    [loteAbierto, pagina, refrescar],
  );

  const aplicar = useCallback(async () => {
    if (!loteAbierto) return;
    setCargando(true);
    setError(null);
    onOcupado?.(true);
    try {
      const informe = await migracionTercerosApi.aplicar(loteAbierto);
      setAplicacion(informe);
      await refrescar(loteAbierto, 1);
    } catch (e) {
      setError(mensaje(e, 'No pudimos crear las fichas.'));
    } finally {
      setCargando(false);
      onOcupado?.(false);
    }
  }, [loteAbierto, refrescar, onOcupado]);

  // ══ Lista de trabajo ══════════════════════════════════════════════════════

  if (resumen && loteAbierto) {
    return (
      <ListaDeTrabajo
        lote={loteAbierto}
        tipo={tipo}
        enElMuro={Boolean(tipoFijo)}
        resumen={resumen}
        columnas={columnas}
        pendientes={pendientes}
        totalPendientes={totalPendientes}
        pagina={pagina}
        seleccion={seleccion}
        aplicacion={aplicacion}
        cargando={cargando}
        error={error}
        onSeleccionCambia={setSeleccion}
        onPaginaCambia={(p) => void refrescar(loteAbierto, p)}
        onCorregir={(id, campos) =>
          void conRefresco(
            () => migracionTercerosApi.corregir(id, { campos }),
            'No pudimos guardar la corrección.',
          )
        }
        onVincular={(id) =>
          void conRefresco(
            () => migracionTercerosApi.corregir(id, { vincularAExistente: true }),
            'No pudimos vincular la fila.',
          )
        }
        onDescartar={(id) =>
          void conRefresco(
            () => migracionTercerosApi.descartar(id),
            'No pudimos descartar la fila.',
          )
        }
        onMasivo={(cambios) =>
          void conRefresco(async () => {
            const r = await migracionTercerosApi.resolverMasivo(
              Array.from(seleccion),
              cambios,
            );
            setSeleccion(new Set());
            if (r.fallidas.length > 0) {
              // Una masiva que dice «listo» tapando lo que no pudo es la
              // mentira que este diseño evita.
              setError(
                `Se aplicaron ${r.aplicadas} de ${r.pedidas}. ${r.fallidas.length} no se pudieron: ${r.fallidas[0].motivo}`,
              );
            }
          }, 'No pudimos aplicar el cambio a las filas seleccionadas.')
        }
        onAplicar={() => void aplicar()}
        onOtroArchivo={volverAEmpezar}
      />
    );
  }

  // ══ Entrada: elegir tipo, retomar, subir ══════════════════════════════════

  const demasiadasFilas = filas.length > MAX_FILAS_POR_LOTE;
  const puedePreparar =
    filas.length > 0 &&
    !demasiadasFilas &&
    celdasLargas.length === 0 &&
    lote.trim().length > 0 &&
    !cargando;

  // Con el tipo fijo, las cargas sin terminar del OTRO tipo son de otro paso.
  const lotesVisibles = tipoFijo ? lotesAbiertos.filter((l) => l.tipo === tipoFijo) : lotesAbiertos;

  return (
    <div className="space-y-6">
      {lotesVisibles.length > 0 ? (
        <section
          className="space-y-3 rounded-lg border border-primary/30 bg-surface p-5 shadow-sm"
          data-testid="lotes-abiertos"
        >
          <p className="text-sm font-medium text-fg">Tenés una carga sin terminar</p>
          {lotesVisibles.map((l) => (
            <div key={l.lote} className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-fg-muted">
                <span className="text-fg">{l.lote}</span>
                {' · '}
                {l.tipo === 'PROPIETARIO' ? 'propietarios' : 'inquilinos'}
                {' · '}
                <span className="font-mono tabular-nums">{l.requierenAtencion}</span>{' '}
                {l.requierenAtencion === 1 ? 'fila por revisar' : 'filas por revisar'}
                {l.listos > 0 ? (
                  <>
                    {' · '}
                    <span className="font-mono tabular-nums">{l.listos}</span> listas para crear
                  </>
                ) : null}
              </p>
              <Button size="sm" hideArrow disabled={cargando} onClick={() => void retomar(l)}>
                Retomar
              </Button>
            </div>
          ))}
          <p className="text-xs text-fg-subtle">
            Si volvés a subir el mismo archivo con otro nombre, las personas se duplican y hay
            que resolver el duplicado una por una.
          </p>
        </section>
      ) : null}

      <section className="space-y-4 rounded-lg border border-border bg-surface p-6 shadow-sm">
        {tipoFijo ? (
          <div className="space-y-1" data-testid="tipo-fijo" data-tipo={tipoFijo}>
            <h2 className="text-sm font-medium text-fg">
              {tipoFijo === 'PROPIETARIO' ? 'El archivo de propietarios' : 'El archivo de inquilinos'}
            </h2>
            <p className="text-sm text-fg-muted">
              {tipoFijo === 'PROPIETARIO'
                ? 'Una fila por propietario: documento, nombre, y el banco, tipo y número de cuenta para poder girarle.'
                : 'Una fila por inquilino: documento, nombre y correo para poder invitarlo al portal. El contrato de cada uno entra en el paso 4.'}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            <h2 className="text-sm font-medium text-fg">¿Qué estás cargando?</h2>
            <p className="text-sm text-fg-muted">
              Van en archivos separados: a un propietario hay que poder pagarle (banco y cuenta) y
              a un inquilino hay que poder invitarlo (correo). No son las mismas columnas.
            </p>
          </div>
        )}

        {tipoFijo ? null : (
        <SegmentedControl<TipoDeTercero>
          value={tipo}
          onChange={setTipo}
          aria-label="Tipo de tercero"
          options={[
            {
              value: 'PROPIETARIO',
              label: (
                <span className="flex items-center gap-2">
                  <UserCircle className="h-4 w-4" />
                  Propietarios
                </span>
              ),
              ariaLabel: 'Propietarios',
            },
            {
              value: 'INQUILINO',
              label: (
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Inquilinos
                </span>
              ),
              ariaLabel: 'Inquilinos',
            },
          ]}
        />
        )}

        {noSoportadas.length > 0 ? (
          <div className="flex items-start gap-2 rounded-md border border-border bg-danger-soft p-3">
            <Warning className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
            <div>
              <p className="text-sm font-medium text-danger">
                Hay columnas nuevas que esta pantalla todavía no sabe mandar
              </p>
              <p className="mt-0.5 text-sm text-fg-muted">
                {noSoportadas.map((c) => c.titulo).join(' · ')} — se van a ignorar. Avisale al
                equipo antes de seguir para no perder ese dato.
              </p>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            hideArrow
            disabled={!plantilla}
            onClick={() => plantilla && void descargarPlantillaDeTerceros(tipo, columnas)}
          >
            <DownloadSimple className="mr-1.5 h-4 w-4" />
            Descargar la plantilla
          </Button>
          <p className="text-xs text-fg-subtle">
            O subí el archivo que ya tenés: abajo se muestra cómo entendimos tus columnas.
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
        <div
          {...getRootProps()}
          className={`flex cursor-pointer flex-col items-center gap-3 rounded-md border border-dashed p-8 text-center transition-colors ${
            isDragActive ? 'border-primary bg-primary-soft' : 'border-border hover:bg-surface-muted'
          }`}
          data-testid="dropzone-terceros"
        >
          {/* allowlist: react-dropzone hidden file input (mecanismo canónico) */}
          <input {...getInputProps()} />
          <FileArrowUp className="h-8 w-8 text-fg-muted" />
          <div>
            <p className="text-sm font-medium text-fg">
              {nombreDeArchivo || 'Arrastrá el archivo o hacé clic para elegirlo'}
            </p>
            <p className="text-xs text-fg-subtle">
              Excel o CSV exportado de tu sistema actual. Nada se crea todavía.
            </p>
          </div>
        </div>

        {error ? (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-border bg-danger-soft p-3">
            <Warning className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
            <p className="text-sm text-fg">{error}</p>
          </div>
        ) : null}
      </section>

      {mapeo.length > 0 ? (
        <section className="space-y-4 rounded-lg border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-sm font-medium text-fg">Así entendimos tus columnas</h2>
              <p className="text-xs text-fg-muted">
                <span className="font-mono tabular-nums">{filas.length}</span> filas en el
                archivo. Revisá el mapeo antes de seguir: lo que se mapea mal no falla, se guarda
                en el campo de al lado.
              </p>
            </div>
            <Button
              variant="link"
              size="sm"
              hideArrow
              className="shrink-0 text-xs"
              onClick={() => setMapeo(mapearColumnas(columnas, encabezados))}
            >
              Restablecer
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Columna del archivo</TableHead>
                  <TableHead>Campo del tercero</TableHead>
                  <TableHead>Por qué</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mapeo.map((m) => (
                  <TableRow key={m.columna}>
                    <TableCell className="font-medium">{m.columna || '(sin nombre)'}</TableCell>
                    <TableCell>
                      <Select
                        value={m.campo ?? IGNORAR}
                        onValueChange={(v) =>
                          setMapeo((actual) =>
                            remapear(actual, m.columna, v === IGNORAR ? null : v),
                          )
                        }
                      >
                        <SelectTrigger
                          className="w-full min-w-[200px]"
                          data-testid={`mapeo-${m.columna}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={IGNORAR}>Ignorar</SelectItem>
                          {columnas.map((c) => (
                            <SelectItem key={c.campo} value={c.campo}>
                              {c.titulo}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-xs text-fg-muted">
                      {/* Tres estados distintos, y decirlos importa: el empate
                          por parecido es el que se equivoca. */}
                      {m.isManual
                        ? 'elegido a mano'
                        : m.porque && m.exacto
                          ? `coincide con «${m.porque}»`
                          : m.porque
                            ? `se parece a «${m.porque}»`
                            : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {faltanObligatorias.length > 0 ? (
            <div className="flex items-start gap-2 rounded-md border border-border bg-info-soft p-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
              <div>
                <p className="text-sm font-medium text-info">
                  {faltanObligatorias.length === 1
                    ? 'Falta una columna obligatoria'
                    : `Faltan ${faltanObligatorias.length} columnas obligatorias`}
                </p>
                <p className="mt-0.5 text-sm text-fg-muted">
                  {faltanObligatorias.map((c) => c.titulo).join(' · ')} — igual podés seguir: las
                  filas van a quedar marcadas y se completan acá mismo, sin volver a subir nada.
                </p>
              </div>
            </div>
          ) : null}

          {celdasLargas.length > 0 ? (
            <div className="flex items-start gap-2 rounded-md border border-border bg-danger-soft p-3">
              <Warning className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
              <div>
                <p className="text-sm font-medium text-danger">
                  {celdasLargas.length === 1
                    ? 'Hay una celda más larga de lo que el sistema acepta'
                    : `Hay ${celdasLargas.length} celdas más largas de lo que el sistema acepta`}
                </p>
                <p className="mt-0.5 text-sm text-fg-muted">
                  {celdasLargas
                    .slice(0, 3)
                    .map((c) => `fila ${c.fila}: ${c.campo} (${c.largo} de ${c.maximo})`)
                    .join(' · ')}
                  {celdasLargas.length > 3 ? ` y ${celdasLargas.length - 3} más` : ''}. Corregilas
                  en el archivo y volvé a subirlo — no las recortamos por vos.
                </p>
              </div>
            </div>
          ) : null}

          {demasiadasFilas ? (
            <p className="text-sm text-danger">
              El archivo tiene{' '}
              <span className="font-mono tabular-nums">{filas.length.toLocaleString('es-CO')}</span>{' '}
              filas y el máximo por carga es{' '}
              <span className="font-mono tabular-nums">
                {MAX_FILAS_POR_LOTE.toLocaleString('es-CO')}
              </span>
              . Partilo en dos archivos.
            </p>
          ) : null}

          <label className="block max-w-sm space-y-1">
            <span className="text-sm text-fg-muted">Nombre de esta carga</span>
            <Input
              value={lote}
              maxLength={60}
              onChange={(e) => setLote(e.target.value)}
              data-testid="nombre-del-lote"
            />
            <span className="block text-xs text-fg-subtle">
              Sirve para volver a encontrarla si la dejás a medias. No se puede repetir.
            </span>
          </label>

          {/* No dice «importar»: todavía no se crea nada. */}
          <Button
            hideArrow
            disabled={!puedePreparar}
            isLoading={cargando}
            onClick={() => void preparar()}
            data-testid="revisar-terceros"
          >
            Revisar {filas.length} {tipo === 'PROPIETARIO' ? 'propietarios' : 'inquilinos'}
          </Button>
        </section>
      ) : null}
    </div>
  );
}

// ══ La lista de trabajo ═════════════════════════════════════════════════════

/**
 * En vez de un reporte de lo que falló, una lista de lo que falta con la
 * salida al lado. Nada se perdió y nada se creó todavía.
 */
function ListaDeTrabajo({
  lote,
  tipo,
  enElMuro,
  resumen,
  columnas,
  pendientes,
  totalPendientes,
  pagina,
  seleccion,
  aplicacion,
  cargando,
  error,
  onSeleccionCambia,
  onPaginaCambia,
  onCorregir,
  onVincular,
  onDescartar,
  onMasivo,
  onAplicar,
  onOtroArchivo,
}: {
  lote: string;
  tipo: TipoDeTercero;
  /** Adentro del asistente hay un pie con el botón de seguir; suelto, no. */
  enElMuro: boolean;
  resumen: ResumenDeLote;
  columnas: readonly import('@/lib/api/migracion-terceros.service').ColumnaDePlantilla[];
  pendientes: FilaDeStaging[];
  totalPendientes: number;
  pagina: number;
  seleccion: Set<string>;
  aplicacion: ResumenDeAplicacion | null;
  cargando: boolean;
  error: string | null;
  onSeleccionCambia: (s: Set<string>) => void;
  onPaginaCambia: (p: number) => void;
  onCorregir: (id: string, campos: FilaTercero) => void;
  onVincular: (id: string) => void;
  onDescartar: (id: string) => void;
  onMasivo: (cambios: {
    campos?: FilaTercero;
    vincularAExistente?: boolean;
    descartar?: boolean;
  }) => void;
  onAplicar: () => void;
  onOtroArchivo: () => void;
}) {
  const totalPaginas = Math.max(1, Math.ceil(totalPendientes / POR_PAGINA));
  const todasMarcadas = pendientes.length > 0 && pendientes.every((f) => seleccion.has(f.id));

  return (
    <div className="space-y-6" data-testid="lista-de-trabajo">
      <section className="space-y-4 rounded-lg border border-border bg-surface p-6 shadow-sm">
        <p className="text-sm text-fg-muted">
          Carga <span className="text-fg">{lote}</span> ·{' '}
          {tipo === 'PROPIETARIO' ? 'propietarios' : 'inquilinos'}
        </p>

        <div className="grid gap-3 sm:grid-cols-4">
          <Dato etiqueta="En el archivo" valor={resumen.total} />
          <Dato etiqueta="Listas para crear" valor={resumen.listos} tono="ok" />
          <Dato etiqueta="Les falta algo" valor={resumen.requierenAtencion} tono="mal" />
          <Dato etiqueta="Ya creadas" valor={resumen.aplicados} />
        </div>

        {resumen.listos > 0 ? (
          <>
            <Button hideArrow disabled={cargando} isLoading={cargando} onClick={onAplicar}>
              Crear {resumen.listos}{' '}
              {tipo === 'PROPIETARIO'
                ? resumen.listos === 1
                  ? 'propietario'
                  : 'propietarios'
                : resumen.listos === 1
                  ? 'inquilino'
                  : 'inquilinos'}
            </Button>
            <p className="text-xs text-fg-subtle">
              {/* Decir de antemano qué pasa: el correo sale al aplicar, y una
                  invitación no se puede des-enviar. */}
              {tipo === 'INQUILINO'
                ? 'Se crean sólo las que no les falta nada, y a cada inquilino le llega la invitación al portal por correo. Se manda por tandas, no todo de golpe.'
                : 'Se crean sólo las que no les falta nada. Las demás quedan acá esperando.'}
            </p>
          </>
        ) : null}

        {resumen.listos === 0 && resumen.requierenAtencion > 0 ? (
          <p className="text-sm text-fg-muted">
            Todavía no hay ninguna lista. Resolvé lo de abajo y van pasando solas.
          </p>
        ) : null}

        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </section>

      {aplicacion ? (
        <section
          className="space-y-2 rounded-lg border border-border bg-surface p-6 shadow-sm"
          data-testid="informe-aplicacion"
        >
          <p className="flex items-center gap-2 text-sm font-medium text-fg">
            <CheckCircle className="h-4 w-4 text-success" weight="fill" />
            <span className="font-mono tabular-nums">{aplicacion.aplicadas}</span> creadas
            {aplicacion.invitados > 0 ? (
              <>
                {' · '}
                <span className="font-mono tabular-nums">{aplicacion.invitados}</span> invitados al
                portal
              </>
            ) : null}
            {(aplicacion.sinInvitar ?? 0) > 0 ? (
              <>
                {' · '}
                <span className="font-mono tabular-nums">{aplicacion.sinInvitar}</span> sin
                invitación todavía
              </>
            ) : null}
          </p>
          {(aplicacion.sinInvitar ?? 0) > 0 ? (
            <p className="text-sm text-fg-muted" data-testid="sin-invitar">
              El proveedor de correo limitó los envíos: esas cuentas quedaron creadas y la
              invitación se manda después. No hace falta volver a subir nada.
            </p>
          ) : null}
          {/* El puente que faltaba: sin esta línea, «25 creadas» arriba y 85
              tarjetas abajo parecen contradecirse (Nico no entendió qué eran). */}
          {totalPendientes > 0 ? (
            <p className="text-sm text-fg-muted" data-testid="puente-por-revisar">
              {totalPendientes === 1 ? (
                <>Queda 1 fila del archivo sin crear: está acá abajo esperando tu decisión.</>
              ) : (
                <>
                  Quedan <span className="font-mono tabular-nums">{totalPendientes}</span> filas
                  del archivo sin crear: están acá abajo esperando tu decisión.
                </>
              )}
            </p>
          ) : null}
          {aplicacion.fallidas > 0 ? (
            <ul className="space-y-1 text-sm text-fg-muted">
              {aplicacion.resultados
                .filter((r) => r.estado === 'fallido')
                .map((r) => (
                  <li key={r.id}>
                    Fila <span className="font-mono tabular-nums">{r.fila}</span>: {r.motivo}
                  </li>
                ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {/*
       * El título que le dice a la persona QUÉ es esta lista. Sin él, después
       * de crear las primeras fichas quedaban 85 tarjetas sueltas debajo del
       * «25 creadas» y nadie sabía si eran un error, un pendiente o un
       * repetido (Nico lo vio). El conteo baja en vivo a medida que resuelve.
       */}
      {totalPendientes > 0 ? (
        <div className="space-y-1 pt-2" data-testid="titulo-por-revisar">
          <h2 className="text-sm font-medium text-fg">
            {totalPendientes === 1
              ? 'Queda 1 fila del archivo por decidir'
              : `Quedan ${totalPendientes} filas del archivo por decidir`}
          </h2>
          <p className="text-sm text-fg-muted">
            {tipo === 'INQUILINO'
              ? 'No se crearon todavía: son personas que ya existen en la plataforma —quizá las subiste en Propietarios o ya tenían cuenta— o filas a las que les falta un dato. '
              : 'No se crearon todavía: son personas que ya existen en la plataforma, filas repetidas en el archivo, o a las que les falta un dato. '}
            Resolvé cada una acá, o marcá varias y resolvelas juntas: al decidir salen de esta
            lista y quedan listas para crear con el botón de arriba.
          </p>
        </div>
      ) : null}

      {pendientes.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/*
           * `aria-labelledby` y no un `<label>` alrededor: el `Checkbox` de
           * cadence es el de Radix, que renderiza un `<button role="checkbox">`.
           * Un `<button>` no es un elemento etiquetable, así que ni envolverlo
           * en un `<label>` ni un `htmlFor` le dan nombre — un lector de
           * pantalla anunciaría «casilla, sin marcar» y nada más.
           */}
          <div className="flex items-center gap-2 text-sm text-fg">
            <Checkbox
              aria-labelledby="seleccionar-pagina"
              checked={todasMarcadas}
              onCheckedChange={(c) => {
                // Sólo agrega o quita las de ESTA página: reemplazar toda la
                // selección borraría lo elegido en las otras.
                const s = new Set(seleccion);
                if (c === true) pendientes.forEach((f) => s.add(f.id));
                else pendientes.forEach((f) => s.delete(f.id));
                onSeleccionCambia(s);
              }}
            />
            <span id="seleccionar-pagina">
              Seleccionar las {pendientes.length} de esta página
            </span>
          </div>
          {/* El total ya lo dice el título de arriba; repetirlo acá era ruido. */}
        </div>
      ) : null}

      {seleccion.size > 0 ? (
        <ResolucionMasiva
          cantidad={seleccion.size}
          columnas={columnas}
          cargando={cargando}
          onAplicar={onMasivo}
          onLimpiar={() => onSeleccionCambia(new Set())}
        />
      ) : null}

      {pendientes.map((fila) => (
        <div key={fila.id} className="flex items-start gap-3">
          {/* Sin texto al lado, así que el nombre va en `aria-label` — y no
              dice «seleccionar fila» a secas: con doscientas casillas
              idénticas, eso no le sirve a nadie que navegue por teclado. */}
          <Checkbox
            className="mt-6"
            aria-label={`Seleccionar la fila ${fila.datos._fila}${
              typeof fila.datos.nombre === 'string' && fila.datos.nombre
                ? `, ${fila.datos.nombre}`
                : ''
            }`}
            checked={seleccion.has(fila.id)}
            onCheckedChange={(c) => {
              const s = new Set(seleccion);
              if (c === true) s.add(fila.id);
              else s.delete(fila.id);
              onSeleccionCambia(s);
            }}
          />
          <div className="min-w-0 flex-1">
            <FilaDeTercero
              fila={fila}
              columnas={columnas}
              guardando={cargando}
              onCorregir={(campos) => onCorregir(fila.id, campos)}
              onVincular={() => onVincular(fila.id)}
              onDescartar={() => onDescartar(fila.id)}
            />
          </div>
        </div>
      ))}

      {pendientes.length === 0 && resumen.requierenAtencion === 0 ? (
        <p className="rounded-lg border border-border bg-surface p-6 text-sm text-fg-muted shadow-sm">
          No queda nada por revisar en esta carga.
          {/* El empujón al paso siguiente sólo adentro del asistente: la
              pantalla suelta no tiene ese pie. */}
          {resumen.listos > 0
            ? ' Ya podés crear las que quedaron listas con el botón de arriba.'
            : enElMuro
              ? ' Podés seguir con el paso siguiente desde el botón de abajo.'
              : ''}
        </p>
      ) : null}

      {totalPaginas > 1 ? (
        <Pagination
          currentPage={pagina}
          totalPages={totalPaginas}
          onPageChange={onPaginaCambia}
        />
      ) : null}

      <Button variant="outline" hideArrow onClick={onOtroArchivo}>
        Subir otro archivo
      </Button>
    </div>
  );
}

/**
 * La misma corrección a muchas filas.
 *
 * Un archivo real trae doscientas filas a las que les falta lo mismo: el mismo
 * banco mal escrito, el mismo tipo de documento vacío. Resolverlas de a una son
 * doscientas veces el mismo dato.
 */
function ResolucionMasiva({
  cantidad,
  columnas,
  cargando,
  onAplicar,
  onLimpiar,
}: {
  cantidad: number;
  columnas: readonly import('@/lib/api/migracion-terceros.service').ColumnaDePlantilla[];
  cargando: boolean;
  onAplicar: (cambios: {
    campos?: FilaTercero;
    vincularAExistente?: boolean;
    descartar?: boolean;
  }) => void;
  onLimpiar: () => void;
}) {
  const [campo, setCampo] = useState<string>('');
  const [valor, setValor] = useState('');

  const columna = columnas.find((c) => c.campo === campo);

  return (
    <section className="space-y-3 rounded-lg border border-primary/30 bg-surface p-5 shadow-sm">
      <p className="text-sm font-medium text-fg">
        <span className="font-mono tabular-nums">{cantidad}</span>{' '}
        {cantidad === 1 ? 'fila seleccionada' : 'filas seleccionadas'}
      </p>

      {/*
       * `div` + `aria-labelledby`, no un `<label>` envolviendo el control: el
       * `SelectTrigger` de Radix es un `<button>`, y un `<button>` no es
       * etiquetable — el `<label>` no le presta su texto como nombre
       * accesible y un lector de pantalla anuncia «botón» a secas.
       */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <span id="masivo-campo-etiqueta" className="block text-xs text-fg-muted">
            Ponerles el mismo
          </span>
          <Select
            value={campo || IGNORAR}
            onValueChange={(v) => {
              setCampo(v === IGNORAR ? '' : v);
              setValor('');
            }}
          >
            <SelectTrigger
              className="w-56"
              aria-labelledby="masivo-campo-etiqueta"
              data-testid="masivo-campo"
            >
              <SelectValue placeholder="Elegí un campo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={IGNORAR}>Elegí un campo</SelectItem>
              {columnas.map((c) => (
                <SelectItem key={c.campo} value={c.campo}>
                  {c.titulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {columna ? (
          <div className="space-y-1">
            <span id="masivo-valor-etiqueta" className="block text-xs text-fg-muted">
              Valor
            </span>
            {columna.opciones ? (
              <Select value={valor} onValueChange={setValor}>
                <SelectTrigger
                  className="w-56"
                  aria-labelledby="masivo-valor-etiqueta"
                  data-testid="masivo-valor"
                >
                  <SelectValue placeholder="Elegí" />
                </SelectTrigger>
                <SelectContent>
                  {columna.opciones.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                className="w-56"
                value={valor}
                placeholder={columna.ejemplo}
                aria-labelledby="masivo-valor-etiqueta"
                data-testid="masivo-valor"
                onChange={(e) => setValor(e.target.value)}
              />
            )}
          </div>
        ) : null}

        <Button
          size="sm"
          hideArrow
          disabled={!campo || !valor || cargando}
          onClick={() => {
            onAplicar({ campos: { [campo]: valor } as FilaTercero });
            setCampo('');
            setValor('');
          }}
        >
          Aplicar a las {cantidad}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <Button
          size="sm"
          variant="outline"
          hideArrow
          disabled={cargando}
          onClick={() => onAplicar({ vincularAExistente: true })}
        >
          Son las mismas personas que ya existen
        </Button>
        <Button
          size="sm"
          variant="outline"
          hideArrow
          disabled={cargando}
          className="text-danger hover:bg-danger-soft hover:text-danger"
          onClick={() => onAplicar({ descartar: true })}
        >
          No traer ninguna de estas
        </Button>
        <span className="flex-1" />
        <Button size="sm" variant="link" hideArrow className="text-xs" onClick={onLimpiar}>
          Quitar la selección
        </Button>
      </div>
    </section>
  );
}

function Dato({
  etiqueta,
  valor,
  tono,
}: {
  etiqueta: string;
  valor: number;
  tono?: 'ok' | 'mal';
}) {
  return (
    <div className="rounded-md border border-border p-3">
      <p className="text-xs text-fg-muted">{etiqueta}</p>
      <p
        className={`font-mono text-xl font-semibold tabular-nums ${
          tono === 'ok' && valor > 0
            ? 'text-success'
            : tono === 'mal' && valor > 0
              ? 'text-danger'
              : 'text-fg'
        }`}
      >
        {valor}
      </p>
    </div>
  );
}
