"use client";

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

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  aplicarPorTandas,
  revisarPorTandas,
  tandasDe,
  type ProgresoDeTandas,
} from "./asientosPorTandas";
import { BarraDeTrabajo } from "./BarraDeTrabajo";
import Link from "next/link";
import { useDropzone } from "react-dropzone";
import {
  ArrowRight,
  CheckCircle,
  FileArrowUp,
  Info,
  Receipt,
  Warning,
} from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { TarjetaDeArchivo } from "@/components/migracion/TarjetaDeArchivo";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TablePagination } from "@/components/ui/pagination";
import {
  PAGE_SIZE_OPTIONS,
  useTablePagination,
} from "@/lib/hooks/use-table-pagination";
import { parseSpreadsheetFile } from "@/components/inmobiliaria/import/lib/parseFile";
import {
  contabilidadApi,
  LARGO_MAXIMO_DE_LOTE,
  MAX_ASIENTOS_POR_LOTE,
  type AsientoMigrado,
  type InformeDeMigracion,
  type RevisionDeLote,
} from "@/lib/api/contabilidad.service";
import {
  mapearColumnas,
  obligatoriasSinMapear,
  remapear,
  type MapeoDeColumna,
} from "@/lib/migracion/columnas-de-tercero";
import { hayQueAvisarDeOtraPuerta } from "@/lib/migracion/que-archivo-contable-es";
import {
  armarAsientos,
  COLUMNAS_DE_ASIENTO,
  nombreDeLoteDeAsientos,
} from "@/lib/migracion/columnas-de-asiento";

import { mensajeDeContabilidad } from "./contabilidad-errores";

/** Sentinel: Radix `Select` no admite `value=""`. */
const IGNORAR = "__ignorar__";
const MAX_FILAS_EN_PANTALLA = 50;
const RUTA_DEL_PASO_4 = "/panel/inmobiliaria/migracion/puc";

export function MigrarAsientos({
  onAplicado,
  onIrAlPuc,
  onIrAComprobantes,
  enElMuro = false,
  onOcupado,
}: {
  onAplicado: (informe: InformeDeMigracion) => void;
  /** Adentro del muro: abrir el paso 4 en el mismo muro. Sin esto, enlace en pestaña nueva. */
  onIrAlPuc?: () => void;
  /**
   * Cambiar al camino de comprobantes, cuando el archivo que subieron es ése.
   * Sin el callback el aviso se muestra igual —decir que está en la puerta
   * equivocada vale por sí solo— pero sin el botón que la abre.
   */
  onIrAComprobantes?: () => void;
  /** Adentro del muro no se ofrece «volver a la secuencia»: el muro es la secuencia. */
  enElMuro?: boolean;
  /** Aviso al muro mientras se revisa o aplica el lote: el pie espera. */
  onOcupado?: (ocupado: boolean, cancelar?: () => void) => void;
}) {
  /** El archivo tal cual. `null` = no hay nada subido; ver TarjetaDeArchivo. */
  const [archivo, setArchivo] = useState<File | null>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [filas, setFilas] = useState<Record<string, unknown>[]>([]);
  const [encabezados, setEncabezados] = useState<string[]>([]);
  const [mapeo, setMapeo] = useState<MapeoDeColumna[]>([]);
  const [nombreDeArchivo, setNombreDeArchivo] = useState("");
  const [lote, setLote] = useState("");
  const [asientos, setAsientos] = useState<AsientoMigrado[]>([]);
  const [revision, setRevision] = useState<RevisionDeLote | null>(null);
  const [informe, setInforme] = useState<InformeDeMigracion | null>(null);
  const [cargando, setCargando] = useState(false);
  /* 🔴 La barra de los asientos (Nico, 2026-09-12). El archivo real trae
     116.469 filas: sin esto, «Aplicar» es media hora de spinner. Desde el
     mismo día mide también la REVISIÓN, que con 24 tandas dejó de ser
     instantánea. */
  const [progreso, setProgreso] = useState<ProgresoDeTandas | null>(null);
  /** Qué se está haciendo: la barra dice «Revisando…» o «Escribiendo…». */
  const [faena, setFaena] = useState<"revisando" | "aplicando" | null>(null);
  /** Rechazadas que no caben en la tabla (ver `TOPE_DE_RECHAZADAS`). */
  const [rechazadasNoListadas, setRechazadasNoListadas] = useState(0);
  const detenerRef = useRef(false);
  const [deteniendo, setDeteniendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // El pie del muro espera mientras el lote se revisa o se aplica — la misma
  // carrera que en terceros e inmuebles: sin esto ofrecía seguir con la
  // operación todavía corriendo.
  useEffect(() => {
    onOcupado?.(cargando);
  }, [cargando, onOcupado]);
  useEffect(() => () => onOcupado?.(false), [onOcupado]);

  const volverAEmpezar = () => {
    setArchivo(null);
    setLeyendo(false);
    setFilas([]);
    setEncabezados([]);
    setMapeo([]);
    setNombreDeArchivo("");
    setLote("");
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
    // 🔴 `asientos` también. Sin esta línea, subir un segundo archivo dejaba
    // el resumen del PRIMERO en pantalla — Nico lo vio el 2026-09-10: el
    // feedback no se reiniciaba al cambiar de archivo.
    setAsientos([]);
    setArchivo(archivo);
    setNombreDeArchivo(archivo.name);
    setLeyendo(true);
    try {
      const r = await parseSpreadsheetFile(archivo);
      setFilas(r.rows as Record<string, unknown>[]);
      setEncabezados(r.headers);
      setMapeo(mapearColumnas(COLUMNAS_DE_ASIENTO, r.headers));
      setLote(nombreDeLoteDeAsientos());
    } catch (e) {
      setFilas([]);
      setEncabezados([]);
      setMapeo([]);
      setError(
        e instanceof Error && e.message
          ? e.message
          : "No pudimos leer el archivo. ¿Es Excel o CSV?",
      );
    } finally {
      setLeyendo(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    maxFiles: 1,
    multiple: false,
  });

  const sinMapear = useMemo(
    () => obligatoriasSinMapear(COLUMNAS_DE_ASIENTO, mapeo),
    [mapeo],
  );
  /*
   * ¿El archivo que subieron es de esta puerta? Se mira sobre los ENCABEZADOS
   * del archivo, no sobre el mapeo: el mapeo se puede corregir a mano y la
   * pregunta acá es otra —qué archivo es—, que no cambia porque alguien mueva
   * un desplegable.
   */
  const esOtroArchivo = useMemo(
    () => hayQueAvisarDeOtraPuerta(encabezados, mapeo),
    [encabezados, mapeo],
  );
  const armados = useMemo(
    () => (filas.length ? armarAsientos(filas, mapeo) : []),
    [filas, mapeo],
  );
  /*
   * 🔴 Un archivo grande YA NO se rechaza: se parte solo.
   *
   * Nico, 2026-09-12, con 116.262 asientos y el cartel que le pedía partir el
   * Excel por año: «debemos ampliar lo del lote porque mira que pueden llegar
   * a ser muchos». El tope del back se queda donde está —el body-parser está
   * en 15 MB y 116.000 asientos no caben en un request pase lo que pase—; lo
   * que cambia es quién parte el archivo. Ver `asientosPorTandas`.
   */
  const cuantasTandas = tandasDe(armados.length);
  const puedeRevisar =
    armados.length > 0 &&
    sinMapear.length === 0 &&
    lote.trim().length > 0 &&
    !cargando;

  const revisar = async () => {
    setCargando(true);
    setError(null);
    setProgreso(null);
    setFaena("revisando");
    detenerRef.current = false;
    setDeteniendo(false);
    try {
      /*
       * Por tandas de 5.000: el tope del back es por REQUEST, y 116.000
       * asientos no caben en uno. Todas las tandas van con el mismo nombre de
       * lote, así que para el back es un solo lote y reenviarlo es seguro.
       */
      const vuelta = await revisarPorTandas(
        lote.trim(),
        armados,
        (cuerpo) => contabilidadApi.migracion.revisar(cuerpo),
        setProgreso,
        { debeParar: () => detenerRef.current },
      );
      setAsientos(armados);
      setRevision(vuelta.revision);
      setRechazadasNoListadas(vuelta.rechazadasNoListadas);
      if (vuelta.detenidoPorPersona) {
        setError(
          `Se revisaron ${vuelta.revision.total} de ${armados.length} asientos. ` +
            "Nada se escribió: vuelve a revisar cuando quieras y empieza de cero.",
        );
      }
    } catch (e) {
      setError(
        mensajeDeContabilidad(
          e,
          "No pudimos revisar el archivo. Intenta de nuevo.",
        ),
      );
    } finally {
      setCargando(false);
      setProgreso(null);
      setFaena(null);
      setDeteniendo(false);
    }
  };

  const aplicar = async () => {
    setCargando(true);
    setError(null);
    setProgreso(null);
    setFaena("aplicando");
    detenerRef.current = false;
    setDeteniendo(false);
    try {
      /*
       * DOS particiones anidadas, y ninguna reemplaza a la otra: por tamaño
       * de request afuera (5.000 por llamada, el body-parser está en 15 MB) y
       * por reloj adentro (el back corta a los 15 s y dice cuántos quedan).
       * Sin la de afuera el request no cabe; sin la de adentro no vuelve.
       * Reenviar es seguro: la idempotencia es por `(lote, clave)`.
       */
      const vuelta = await aplicarPorTandas(
        lote.trim(),
        asientos,
        (cuerpo) => contabilidadApi.migracion.aplicar(cuerpo),
        ({ dentroDeLaTanda: _dentro, ...p }) => setProgreso(p),
        { debeParar: () => detenerRef.current },
      );
      const r = vuelta.informe;
      setInforme(r);
      onAplicado(r);
      if (vuelta.detenidoPorPersona) {
        setError(
          `Se aplicaron ${r.aplicados} asientos y quedaron ${asientos.length - r.total}. ` +
            "Nada se duplica: vuelve a aplicar el mismo lote y sigue donde quedó.",
        );
      } else if (vuelta.detenidoSinAvance) {
        setError(
          `Se aplicaron ${r.aplicados} asientos y el lote dejó de avanzar: ` +
            "la última vuelta no escribió ninguno. Revisa el informe de abajo.",
        );
      }
    } catch (e) {
      setError(
        // La segunda frase es un hecho del back, no un consuelo: cada fila
        // lleva llave de idempotencia y `aplicar` re-prepara antes de
        // escribir, así que lo ya escrito vuelve como «ya migrado».
        `${mensajeDeContabilidad(
          e,
          "No pudimos aplicar el lote.",
        )} Puedes aplicar de nuevo tranquilo: los asientos que ya entraron no se duplican.`,
      );
    } finally {
      setCargando(false);
      setProgreso(null);
      setFaena(null);
      setDeteniendo(false);
    }
  };

  if (informe) {
    return (
      <Informe
        enElMuro={enElMuro}
        informe={informe}
        onOtro={volverAEmpezar}
        onReintentar={aplicar}
        cargando={cargando}
        error={error}
      />
    );
  }

  if (revision) {
    return (
      <Revision
        revision={revision}
        rechazadasNoListadas={rechazadasNoListadas}
        cargando={cargando}
        error={error}
        onRevisarDeNuevo={revisar}
        onIrAlPuc={onIrAlPuc}
        onAplicar={aplicar}
        progreso={progreso}
        deteniendo={deteniendo}
        onDetener={() => {
          detenerRef.current = true;
          setDeteniendo(true);
        }}
        onOtroArchivo={volverAEmpezar}
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
        <h2 className="font-medium text-fg">Migrar el histórico</h2>
        <p className="mt-1 max-w-2xl text-sm text-fg-muted">
          El libro diario exportado de tu sistema actual: una fila por
          movimiento, con número de comprobante, fecha, cuenta, débito y
          crédito. Las filas con el mismo número forman un asiento. Primero se
          revisa todo; recién después se escribe.
        </p>

        {archivo ? (
          <div className="mt-4">
            <TarjetaDeArchivo
              nombre={archivo.name}
              peso={archivo.size}
              detalle={
                leyendo
                  ? "leyendo\u2026"
                  : filas.length > 0
                    ? `${filas.length.toLocaleString("es-CO")} ${filas.length === 1 ? "fila" : "filas"}`
                    : undefined
              }
              inputProps={getInputProps()}
              onSubirOtro={open}
              onDescartar={volverAEmpezar}
              ocupado={leyendo || cargando}
              testid="archivo-de-asientos"
            />
          </div>
        ) : (
          <div
            {...getRootProps()}
            className={`mt-4 flex cursor-pointer flex-col items-center gap-3 rounded-md border border-dashed p-8 text-center transition-colors ${
              isDragActive
                ? "border-primary bg-primary-soft"
                : "border-border hover:bg-surface-muted"
            }`}
            data-testid="dropzone-asientos"
          >
            {/* allowlist: react-dropzone hidden file input (mecanismo canónico) */}
            <input {...getInputProps()} />
            <FileArrowUp className="h-8 w-8 text-fg-muted" />
            <div>
              <p className="text-sm font-medium text-fg">
                Arrastra el archivo o haz clic para elegirlo
              </p>
              <p className="text-xs text-fg-subtle">
                Excel o CSV. Nada se crea todavía.
              </p>
            </div>
          </div>
        )}

        {error ? (
          <div
            className="mt-4 flex items-start gap-2 rounded-md border border-border bg-danger-soft p-3"
            role="alert"
          >
            <Warning className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
            <p className="text-sm text-fg">{error}</p>
          </div>
        ) : null}
      </section>

      {encabezados.length > 0 ? (
        <section
          className="rounded-lg border border-border bg-surface p-6 shadow-sm"
          data-testid="mapeo-asientos"
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-medium text-fg">Qué es cada columna</h2>
              <p className="text-sm text-fg-muted">
                {filas.length} filas → {armados.length} asientos. Revisa lo que
                adivinamos.
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              hideArrow
              onClick={() =>
                setMapeo(mapearColumnas(COLUMNAS_DE_ASIENTO, encabezados))
              }
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
                    <TableCell className="font-mono text-xs">
                      {m.columna}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={m.campo ?? IGNORAR}
                        onValueChange={(v) =>
                          setMapeo((actual) =>
                            remapear(
                              actual,
                              m.columna,
                              v === IGNORAR ? null : v,
                            ),
                          )
                        }
                      >
                        <SelectTrigger
                          className="w-60"
                          aria-label={`Campo para ${m.columna}`}
                          data-testid={`mapeo-${m.columna}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={IGNORAR}>Ignorar</SelectItem>
                          {COLUMNAS_DE_ASIENTO.map((c) => (
                            <SelectItem key={c.campo} value={c.campo}>
                              {c.titulo}
                              {c.obligatoria ? " *" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-xs text-fg-muted">
                      {m.isManual ? "elegido a mano" : m.porque}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* 🔴 EL ARCHIVO EN LA PUERTA EQUIVOCADA, antes que cualquier otra
              cosa. Nico, 2026-09-12: «¿qué es código de cuenta? ¿y por qué no
              lo trae?». No lo traía porque su archivo era el export de
              COMPROBANTES, que no puede traerlo — y la puerta correcta estaba
              al lado, sin que nada se lo dijera. Un archivo en la puerta
              equivocada no es un archivo con un error. */}
          {esOtroArchivo ? (
            <div
              className="mt-4 rounded-md border border-warning bg-warning-soft p-4"
              data-testid="asientos-archivo-de-comprobantes"
            >
              <div className="flex items-start gap-2">
                <Receipt className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-fg">
                    Este archivo son comprobantes, no el libro diario
                  </p>
                  <p className="text-sm text-fg-muted">
                    Trae {esOtroArchivo.senales.slice(0, 3).map((c) => `«${c}»`).join(", ")}
                    {esOtroArchivo.senales.length > 3
                      ? ` y ${esOtroArchivo.senales.length - 3} columnas más`
                      : ""}
                    : son datos del comprobante entero, no de cada movimiento.
                    Por eso no trae el código de cuenta — una fila es un
                    documento con sus totales, y la cuenta vive en cada línea
                    del asiento.
                  </p>
                  <p className="text-sm text-fg-muted">
                    Tiene su propio lugar y ahí sí entra completo: los
                    comprobantes se cuelgan de la ficha de cada contrato.
                  </p>
                  {onIrAComprobantes ? (
                    <Button
                      size="sm"
                      hideArrow
                      onClick={onIrAComprobantes}
                      data-testid="ir-a-comprobantes"
                    >
                      Subir los comprobantes
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : sinMapear.length > 0 ? (
            <div
              className="mt-4 flex items-start gap-2 rounded-md border border-border bg-warning-soft p-3"
              data-testid="asientos-sin-mapear"
            >
              <Warning className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              {/* 🔴 Qué ES la columna y qué pasa si falta, en el idioma de
                  quien migra. Antes decía «sin eso el back rechaza todas las
                  filas»: «el back» no es nada para nadie fuera de acá, y
                  «rechaza» no explica por qué. */}
              <div className="space-y-1 text-sm">
                <p className="text-fg">
                  Falta decir qué columna de tu archivo es{" "}
                  {sinMapear.map((c) => `«${c.titulo}»`).join(", ")}.
                </p>
                {sinMapear.map((c) => (
                  <p key={c.titulo} className="text-fg-muted">
                    <span className="font-medium">{c.titulo}</span>
                    {c.ayuda ? `: ${c.ayuda}` : ""}
                    {c.ejemplo ? ` Por ejemplo: ${c.ejemplo}.` : ""}
                  </p>
                ))}
                <p className="text-fg-muted">
                  Sin esa columna no podemos saber a qué cuenta va cada
                  movimiento, así que no entraría ninguna fila.
                </p>
              </div>
            </div>
          ) : null}

          {cuantasTandas > 1 ? (
            <div
              className="mt-4 flex items-start gap-2 rounded-md border border-border bg-info-soft p-3"
              data-testid="asientos-en-tandas"
            >
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
              <p className="text-sm text-fg-muted">
                Son {armados.length} asientos: van en {cuantasTandas} tandas de
                hasta {MAX_ASIENTOS_POR_LOTE}, con este mismo nombre de lote.
                No tienes que partir el archivo; puedes detener a mitad y
                seguir después sin duplicar nada.
              </p>
            </div>
          ) : null}

          <div className="mt-4 flex items-start gap-2 rounded-md border border-border bg-info-soft p-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
            <p className="text-sm text-fg-muted">
              Los montos entran como están («1.500.000», «1500000,00»); las
              fechas en AAAA-MM-DD o DD/MM/AAAA. Las cuentas se buscan por
              código en tu plan: las que no existan se avisan, no se inventan.
            </p>
          </div>

          <div className="mt-5 flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label
                htmlFor="lote-asientos"
                className="text-sm font-medium text-fg"
              >
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
                Para reconocerlo después. Subir el mismo lote dos veces no
                duplica nada.
              </p>
            </div>
            <Button
              onClick={revisar}
              disabled={!puedeRevisar}
              isLoading={cargando}
              hideArrow
              data-testid="revisar-asientos"
            >
              Revisar {armados.length} asientos
            </Button>
          </div>

          {/* Revisar también se volvió una espera larga en cuanto dejó de ser
              una sola llamada: 24 tandas contra la base son minutos. Misma
              barra, mismo «Detener» — revisar no escribe nada, así que cortar
              a mitad no deja nada a medias. */}
          {faena === "revisando" && progreso ? (
            <div className="mt-4">
              <BarraDeTrabajo
                testid="revision-asientos"
                titulo="Revisando el archivo"
                hechas={progreso.hechos}
                total={progreso.total}
                onDetener={() => {
                  detenerRef.current = true;
                  setDeteniendo(true);
                }}
                deteniendo={deteniendo}
                nota={
                  progreso.tandas > 1
                    ? `Tanda ${progreso.tanda} de ${progreso.tandas}. Todavía no se escribe nada.`
                    : undefined
                }
              />
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

// ── Revisión ────────────────────────────────────────────────────────────────

function Revision({
  revision,
  rechazadasNoListadas,
  cargando,
  error,
  onRevisarDeNuevo,
  onIrAlPuc,
  onAplicar,
  progreso,
  deteniendo,
  onDetener,
  onOtroArchivo,
}: {
  revision: RevisionDeLote;
  /** Rechazadas que no caben en la tabla. Se DICEN: truncar en silencio es
   *  cómo alguien concluye que ya las revisó todas. */
  rechazadasNoListadas: number;
  cargando: boolean;
  error: string | null;
  onRevisarDeNuevo: () => void;
  onIrAlPuc?: () => void;
  onAplicar: () => void;
  /** Lo que va pasando mientras se escriben los asientos. `null` = quieto. */
  progreso: ProgresoDeTandas | null;
  deteniendo: boolean;
  onDetener: () => void;
  onOtroArchivo: () => void;
}) {
  const rechazadas = revision.filas.filter((f) => f.estado === "RECHAZADA");
  const puedeAplicar = revision.listas > 0 && !cargando;
  /*
   * Un archivo del libro diario trae cientos de filas y las rechazadas pueden
   * ser todas. Antes se cortaba en 50 con un «…y N más» y esas N no había cómo
   * verlas: con el pie de tabla de la casa se llega a todas.
   */
  const pag = useTablePagination(rechazadas, {
    resetKey: `${revision.lote}|${rechazadas.length}`,
  });

  return (
    <div className="space-y-6" data-testid="revision-asientos">
      <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
        <h2 className="font-medium text-fg">Revisión de «{revision.lote}»</h2>
        <p className="mt-1 text-sm text-fg-muted">
          Nada se escribió todavía. Esto es lo que pasaría si aplicas el lote.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <Dato etiqueta="En el archivo" valor={revision.total} />
          <Dato
            etiqueta="Listos para entrar"
            valor={revision.listas}
            tono="ok"
          />
          <Dato
            etiqueta="Con problemas"
            valor={revision.rechazadas}
            tono="mal"
          />
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
                  ? "Una cuenta del archivo no existe en tu plan"
                  : `${revision.cuentasFaltantes.length} cuentas del archivo no existen en tu plan`}
              </h3>
              <p className="mt-0.5 text-sm text-fg-muted">
                No se crean solas: un código suelto no dice ni la naturaleza ni
                de qué cuelga. Créalas en el paso 4 con tu contador y vuelve a
                revisar: el archivo sigue acá.
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
                <span className="text-fg-subtle">
                  {" "}
                  · {c.filas.length}{" "}
                  {c.filas.length === 1 ? "asiento" : "asientos"}
                </span>
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
            <Button
              size="sm"
              variant="ghost"
              hideArrow
              onClick={onRevisarDeNuevo}
              isLoading={cargando}
              data-testid="revisar-de-nuevo"
            >
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
                <span className="font-mono tabular-nums text-fg">
                  {m.filas.length}
                </span>{" "}
                · {m.motivo}
              </li>
            ))}
          </ul>
          {/* 🔴 Lo que no se lista se DICE. Con 116.000 asientos, guardar
              TODAS las filas rechazadas es una segunda copia del archivo en
              memoria, así que se guardan hasta un tope (`TOPE_DE_RECHAZADAS`).
              Un corte silencioso es cómo alguien concluye que ya las vio
              todas. Los motivos de arriba sí las cuentan a todas. */}
          {rechazadasNoListadas > 0 ? (
            <p className="mt-4 text-sm text-fg-muted" data-testid="rechazadas-no-listadas">
              Se listan {rechazadas.length} de {revision.rechazadas}. Las otras{" "}
              {rechazadasNoListadas} están contadas arriba por motivo; corrige
              el archivo y vuelve a revisar para verlas.
            </p>
          ) : null}
          {rechazadas.length > 0 ? (
            <div className="mt-4 overflow-hidden rounded-lg border border-border">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Fila</TableHead>
                      <TableHead className="w-32">Comprobante</TableHead>
                      <TableHead>Qué pasa</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pag.pageItems.map((f) => (
                      <TableRow key={f.clave}>
                        <TableCell className="font-mono text-xs tabular-nums">
                          {f.fila}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {f.numeroOriginal ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {f.errores.join(" · ")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {pag.shouldPaginate ? (
                <div className="border-t border-border px-4 py-3">
                  <TablePagination
                    total={pag.total}
                    page={pag.page}
                    pageSize={pag.pageSize}
                    pageSizeOptions={PAGE_SIZE_OPTIONS}
                    onPageChange={pag.setPage}
                    onPageSizeChange={pag.setPageSize}
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {error ? (
        <div
          className="flex items-start gap-2 rounded-md border border-border bg-danger-soft p-3"
          role="alert"
        >
          <Warning className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          <p className="text-sm text-fg">{error}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface p-4">
        <Button
          onClick={onAplicar}
          disabled={!puedeAplicar}
          isLoading={cargando}
          hideArrow
          data-testid="aplicar-asientos"
        >
          {progreso
            ? `Aplicando… ${progreso.hechos} de ${progreso.total}`
            : `Aplicar ${revision.listas} ${revision.listas === 1 ? "asiento" : "asientos"}`}
        </Button>
        {/* 🔴 La barra (Nico, 2026-09-12): 116.469 filas sin un dato de avance
            eran media hora de spinner. El total es el del ARCHIVO, no el de la
            tanda: con 24 tandas, una barra que se reinicia en cada una no dice
            cuánto falta, dice cuánto falta de un pedazo que nadie eligió. */}
        {progreso ? (
          <div className="w-full">
            <BarraDeTrabajo
              testid="asientos"
              titulo="Escribiendo los asientos"
              hechas={progreso.hechos}
              total={progreso.total}
              onDetener={onDetener}
              deteniendo={deteniendo}
              nota={
                progreso.tandas > 1
                  ? `Tanda ${progreso.tanda} de ${progreso.tandas}. Puedes detener y seguir después: nada se duplica.`
                  : undefined
              }
            />
          </div>
        ) : null}
        {revision.rechazadas > 0 ? (
          <p className="text-sm text-fg-muted">
            Los {revision.rechazadas} con problemas quedan afuera; puedes
            corregir el archivo y subirlo de nuevo con el mismo nombre de lote
            sin duplicar los que ya entraron.
          </p>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          hideArrow
          onClick={onOtroArchivo}
          disabled={cargando}
          className="ml-auto"
        >
          Otro archivo
        </Button>
      </div>
    </div>
  );
}

function Informe({
  informe,
  onOtro,
  onReintentar,
  cargando = false,
  error = null,
  enElMuro = false,
}: {
  informe: InformeDeMigracion;
  onOtro: () => void;
  /** Volver a aplicar el MISMO lote: lo escrito vuelve como «ya migrado». */
  onReintentar?: () => void;
  cargando?: boolean;
  error?: string | null;
  enElMuro?: boolean;
}) {
  return (
    <section
      className="rounded-lg border border-border bg-surface p-6 shadow-sm"
      data-testid="informe-asientos"
    >
      <div className="flex items-start gap-3">
        <CheckCircle
          className="mt-0.5 h-5 w-5 shrink-0 text-success"
          weight="fill"
        />
        <div>
          <h2 className="font-medium text-fg">
            {informe.aplicados === 1
              ? "Entró 1 asiento"
              : `Entraron ${informe.aplicados} asientos`}
            {informe.primerNumero !== null && informe.ultimoNumero !== null
              ? ` (N.º ${informe.primerNumero} a ${informe.ultimoNumero})`
              : ""}
          </h2>
          <p className="mt-1 text-sm text-fg-muted">
            Lote «{informe.lote}»: {informe.total} en el archivo ·{" "}
            {informe.aplicados} aplicados · {informe.omitidos} omitidos ·{" "}
            {informe.yaMigrados} ya estaban.
          </p>
        </div>
      </div>

      {informe.fallasAlEscribir.length > 0 ? (
        <div className="mt-4 rounded-md border border-border bg-danger-soft p-3">
          <p className="text-sm font-medium text-fg">
            {informe.fallasAlEscribir.length} no se pudieron escribir
          </p>
          <ul className="mt-1 space-y-0.5 text-sm text-fg-muted">
            {informe.fallasAlEscribir
              .slice(0, MAX_FILAS_EN_PANTALLA)
              .map((f) => (
                <li key={f.fila}>
                  Fila {f.fila}: {f.motivo}
                </li>
              ))}
          </ul>
          <p className="mt-2 text-sm text-fg-muted">
            Suelen ser fallas del momento (la conexión, la base ocupada).
            Reintentar aplica sólo estas: las que ya entraron no se duplican.
          </p>
        </div>
      ) : null}

      {error ? (
        <div
          className="mt-4 flex items-start gap-2 rounded-md border border-border bg-danger-soft p-3"
          role="alert"
        >
          <Warning className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          <p className="text-sm text-fg">{error}</p>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        {informe.fallasAlEscribir.length > 0 && onReintentar ? (
          <Button
            hideArrow
            isLoading={cargando}
            onClick={onReintentar}
            data-testid="reintentar-fallas"
          >
            Reintentar {informe.fallasAlEscribir.length}{" "}
            {informe.fallasAlEscribir.length === 1 ? "asiento" : "asientos"}
          </Button>
        ) : null}
        {/* Adentro del muro no hay a dónde ir: el muro es la migración. */}
        {enElMuro ? null : (
          <Button asChild hideArrow>
            <Link href="/panel/inmobiliaria/contabilidad">
              Ir a Contabilidad
            </Link>
          </Button>
        )}
        <Button variant="outline" hideArrow onClick={onOtro}>
          Subir otro archivo
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
  tono?: "ok" | "mal";
}) {
  return (
    <div className="rounded-md border border-border p-3">
      <p className="text-xs text-fg-muted">{etiqueta}</p>
      <p
        className={`font-mono text-xl font-semibold tabular-nums ${
          tono === "ok" && valor > 0
            ? "text-success"
            : tono === "mal" && valor > 0
              ? "text-danger"
              : "text-fg"
        }`}
      >
        {valor}
      </p>
    </div>
  );
}
