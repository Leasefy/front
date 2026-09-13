"use client";

/**
 * Subir los comprobantes del sistema contable viejo.
 *
 * ── Por qué es un camino aparte y no «el libro diario» ─────────────────────
 *
 * El archivo real de la inmobiliaria («Accounting Documents.csv», 116.469
 * filas, 23 MB) trae ENCABEZADOS de comprobante: prefijo, consecutivo, tipo,
 * fecha, concepto y los TOTALES de débitos y créditos. **No trae las líneas
 * por cuenta.** Un asiento sin líneas no se puede imputar ni cuadrar: si esto
 * entrara por «Subir el libro diario» —que sí espera cuenta y débito/crédito
 * por línea— serían 116 mil asientos descuadrados y un plan de cuentas lleno
 * de basura.
 *
 * Así que entran como documentos contables migrados: se guardan tal cual y se
 * cuelgan del contrato del tercero que nombra el concepto («… REF 901780503»,
 * «EGRESO POR PAGO A …»). La ficha del contrato los lista. Decirlo en voz alta
 * arriba de la pantalla es parte del trabajo — quien sube el archivo tiene que
 * saber qué está cargando.
 *
 * ── Por qué se lee en trozos ───────────────────────────────────────────────
 *
 * 23 MB por el lector de planillas de la casa es la pestaña congelada varios
 * segundos y un pico de memoria que en un portátil termina en «Aw, snap».
 * `leerCsvEnTrozos` va por pedazos de 1 MB, arma lotes de 5.000 —el tope del
 * back— y entre lote y lote le devuelve el turno al navegador: la barra
 * avanza y «Cancelar» responde.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { CheckCircle, FileArrowUp, Info, Warning } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { TarjetaDeArchivo } from "@/components/migracion/TarjetaDeArchivo";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  contabilidadApi,
  MAX_DOCUMENTOS_POR_LOTE,
  type DocumentoMigrado,
  type RevisionDeDocumentos,
} from "@/lib/api/contabilidad.service";
import { leerCsvEnTrozos } from "@/lib/migracion/csv-en-trozos";
import { armarDocumentos, COLUMNAS_DE_DOCUMENTO } from "@/lib/migracion/columnas-de-documento";
import {
  mapearColumnas,
  obligatoriasSinMapear,
  type MapeoDeColumna,
} from "@/lib/migracion/columnas-de-tercero";

import { mensajeDeContabilidad } from "./contabilidad-errores";

/** El acumulado de todos los lotes: es lo que la persona lee al final. */
interface Acumulado {
  total: number;
  listos: number;
  yaMigrados: number;
  rechazados: number;
  porDocumento: number;
  porNombre: number;
  sinContrato: number;
  migrados: number;
  /** Motivo → cuántas filas. Agrupado: 40.000 filas iguales son UNA línea. */
  motivos: Map<string, number>;
}

function acumuladoVacio(): Acumulado {
  return {
    total: 0,
    listos: 0,
    yaMigrados: 0,
    rechazados: 0,
    porDocumento: 0,
    porNombre: 0,
    sinContrato: 0,
    migrados: 0,
    motivos: new Map(),
  };
}

function sumar(
  acc: Acumulado,
  r: RevisionDeDocumentos & { migrados?: number },
): Acumulado {
  const motivos = new Map(acc.motivos);
  for (const m of r.motivos) {
    motivos.set(m.motivo, (motivos.get(m.motivo) ?? 0) + m.filas.length);
  }
  return {
    total: acc.total + r.total,
    listos: acc.listos + r.listos,
    yaMigrados: acc.yaMigrados + r.yaMigrados,
    rechazados: acc.rechazados + r.rechazados,
    porDocumento: acc.porDocumento + r.asociados.porDocumento,
    porNombre: acc.porNombre + r.asociados.porNombre,
    sinContrato: acc.sinContrato + r.asociados.sinContrato,
    migrados: acc.migrados + (r.migrados ?? 0),
    motivos,
  };
}

type Fase = "elegir" | "leyendo" | "revisado" | "migrando" | "listo";

export function DocumentosContables({
  onOcupado,
}: {
  /** Aviso al muro mientras se lee o se escribe: el pie espera. */
  onOcupado?: (ocupado: boolean, cancelar?: () => void) => void;
} = {}) {
  const [fase, setFase] = useState<Fase>("elegir");
  const [nombreDeArchivo, setNombreDeArchivo] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [encabezados, setEncabezados] = useState<string[]>([]);
  const [mapeo, setMapeo] = useState<MapeoDeColumna[]>([]);
  const [leidas, setLeidas] = useState(0);
  const [acumulado, setAcumulado] = useState<Acumulado | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cancelar = useRef(false);

  const ocupado = fase === "leyendo" || fase === "migrando";
  useEffect(() => {
    onOcupado?.(ocupado);
  }, [ocupado, onOcupado]);
  useEffect(() => () => onOcupado?.(false), [onOcupado]);

  const sinMapear = useMemo(
    () => obligatoriasSinMapear(COLUMNAS_DE_DOCUMENTO, mapeo),
    [mapeo],
  );

  /**
   * Lee el archivo entero y, por cada lote de 5.000, llama al back.
   *
   * `revisar` no escribe nada; `migrar` sí. Es el mismo recorrido para los
   * dos, así que va una sola función: leer dos veces un archivo de 23 MB para
   * revisar y después para migrar duplicaría el tiempo y abriría la puerta a
   * que la segunda pasada lea algo distinto.
   */
  const recorrer = useCallback(
    async (elArchivo: File, modo: "revisar" | "migrar") => {
      cancelar.current = false;
      setError(null);
      setLeidas(0);
      setAcumulado(acumuladoVacio());
      setFase(modo === "revisar" ? "leyendo" : "migrando");

      let acc = acumuladoVacio();
      let mapeoDelArchivo: MapeoDeColumna[] = mapeo;

      try {
        const resultado = await leerCsvEnTrozos(elArchivo, {
          tamanoDeLote: MAX_DOCUMENTOS_POR_LOTE,
          cancelado: () => cancelar.current,
          onEncabezados: (cabeceras) => {
            setEncabezados(cabeceras);
            // El mapeo se calcula sobre los encabezados REALES del archivo, no
            // sobre el estado de React: en el primer recorrido `mapeo` todavía
            // está vacío y armar las filas con él las dejaría todas en blanco.
            mapeoDelArchivo = mapearColumnas(COLUMNAS_DE_DOCUMENTO, cabeceras);
            setMapeo(mapeoDelArchivo);
          },
          onLote: async (filas, hastaAhora) => {
            setLeidas(hastaAhora);
            const documentos: DocumentoMigrado[] = armarDocumentos(filas, mapeoDelArchivo);
            if (documentos.length === 0) return;
            const r =
              modo === "revisar"
                ? await contabilidadApi.migracion.documentos.revisar(documentos)
                : await contabilidadApi.migracion.documentos.migrar(documentos);
            acc = sumar(acc, r);
            setAcumulado(acc);
          },
        });
        setLeidas(resultado.filas);
        setFase(modo === "revisar" ? "revisado" : "listo");
      } catch (e) {
        setError(
          `${mensajeDeContabilidad(e, "No pudimos procesar el archivo.")} ` +
            `Lo que ya entró NO se duplica al reintentar: cada comprobante se ` +
            `identifica por su prefijo y consecutivo.`,
        );
        // Se conserva lo acumulado: cortar a la mitad y mostrar 0 escondería
        // los 40.000 que sí entraron.
        setFase(modo === "revisar" ? "revisado" : "listo");
      }
    },
    [mapeo],
  );

  const onDrop = useCallback(
    (aceptados: File[]) => {
      const elegido = aceptados[0];
      if (!elegido) return;
      setArchivo(elegido);
      setNombreDeArchivo(elegido.name);
      setAcumulado(null);
      setEncabezados([]);
      setMapeo([]);
      setError(null);
      setFase("elegir");
      void recorrer(elegido, "revisar");
    },
    [recorrer],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    maxFiles: 1,
    multiple: false,
  });

  /** Suelta el archivo y TODO lo que salió de él: lo que corre «Descartar». */
  const soltarArchivo = useCallback(() => {
    cancelar.current = true;
    setArchivo(null);
    setNombreDeArchivo("");
    setEncabezados([]);
    setMapeo([]);
    setLeidas(0);
    setAcumulado(null);
    setError(null);
    setFase("elegir");
  }, []);

  return (
    <section className="space-y-5" data-testid="documentos-contables">
      {/*
        Lo primero que se lee, antes de arrastrar nada: qué es este archivo y
        en qué se diferencia del libro diario. Confundirlos es cargar 116 mil
        asientos descuadrados.
      */}
      <div className="flex items-start gap-2 rounded-md border border-border bg-info-soft p-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
        <div className="text-sm text-fg">
          <p className="font-medium">
            Este archivo son los comprobantes, no los asientos
          </p>
          <p className="mt-0.5 text-fg-muted">
            El export de comprobantes trae el encabezado de cada documento
            —prefijo, consecutivo, tipo, fecha, concepto y los totales de
            débitos y créditos— pero <strong>no las líneas por cuenta</strong>.
            Por eso no entran al libro diario: se guardan como documentos
            históricos y se cuelgan del contrato del tercero que nombra el
            concepto. La ficha de cada contrato los lista. Si tu archivo SÍ
            trae una cuenta y un débito/crédito por línea, ése va en «Subir el
            libro diario».
          </p>
        </div>
      </div>

      {archivo ? (
        <TarjetaDeArchivo
          nombre={nombreDeArchivo || archivo.name}
          peso={archivo.size}
          detalle={
            ocupado
              ? `leyendo\u2026 ${leidas.toLocaleString("es-CO")} filas`
              : leidas > 0
                ? `${leidas.toLocaleString("es-CO")} ${leidas === 1 ? "fila" : "filas"}`
                : undefined
          }
          inputProps={getInputProps()}
          inputTestid="archivo-documentos"
          onSubirOtro={open}
          onDescartar={soltarArchivo}
          ocupado={ocupado}
          testid="archivo-de-documentos"
        />
      ) : (
        <div
          {...getRootProps()}
          className={`flex cursor-pointer flex-col items-center gap-3 rounded-md border border-dashed p-8 text-center transition-colors ${
            isDragActive ? "border-primary bg-primary-soft" : "border-border hover:bg-surface-muted"
          }`}
          data-testid="dropzone-documentos"
        >
          {/* allowlist: react-dropzone hidden file input (mecanismo canónico) */}
          <input {...getInputProps()} data-testid="archivo-documentos" />
          <FileArrowUp className="h-8 w-8 text-fg-muted" />
          <div>
            <p className="text-sm font-medium text-fg">
              Arrastra el CSV de comprobantes o haz clic para elegirlo
            </p>
            <p className="text-xs text-fg-subtle">
              Se lee por partes, así que un archivo de decenas de miles de filas
              no congela la pantalla. Nada se escribe hasta que lo pidas.
            </p>
          </div>
        </div>
      )}

      {error ? (
        <div
          className="flex items-start gap-2 rounded-md border border-border bg-danger-soft p-3"
          role="alert"
          data-testid="documentos-error"
        >
          <Warning className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          <p className="text-sm text-fg">{error}</p>
        </div>
      ) : null}

      {ocupado ? (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface p-3"
          aria-live="polite"
          data-testid="documentos-progreso"
        >
          <p className="text-sm text-fg">
            {fase === "leyendo" ? "Revisando" : "Migrando"}{" "}
            <span className="font-mono tabular-nums">{leidas.toLocaleString("es-CO")}</span>{" "}
            comprobantes…
          </p>
          <Button
            size="sm"
            variant="outline"
            hideArrow
            onClick={() => {
              cancelar.current = true;
            }}
            data-testid="documentos-cancelar"
          >
            Cancelar
          </Button>
        </div>
      ) : null}

      {encabezados.length > 0 && sinMapear.length > 0 ? (
        <div
          className="flex items-start gap-2 rounded-md border border-border bg-warning-soft p-3"
          data-testid="documentos-sin-mapear"
        >
          <Warning className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <p className="text-sm text-fg">
            No encontramos la columna de{" "}
            {sinMapear.map((c) => `«${c.titulo}»`).join(" ni ")}. Sin eso no se
            puede identificar el comprobante y las filas se rechazan.
          </p>
        </div>
      ) : null}

      {acumulado && !ocupado ? (
        <ResumenDeDocumentos
          acumulado={acumulado}
          fase={fase}
          onMigrar={archivo ? () => void recorrer(archivo, "migrar") : undefined}
        />
      ) : null}
    </section>
  );
}

/**
 * El resumen honesto: cuántos entran, cuántos ya estaban, cuántos se
 * rechazaron y —lo que se preguntó— cuántos quedaron colgados de un contrato
 * y cuántos no, con el motivo agrupado.
 */
function ResumenDeDocumentos({
  acumulado,
  fase,
  onMigrar,
}: {
  acumulado: Acumulado;
  fase: Fase;
  onMigrar?: () => void;
}) {
  const conContrato = acumulado.porDocumento + acumulado.porNombre;
  const motivos = [...acumulado.motivos.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const yaSeEscribio = fase === "listo";

  return (
    <section
      className="rounded-lg border border-border bg-surface p-5"
      data-testid="documentos-resumen"
      aria-live="polite"
    >
      <h3 className="flex items-center gap-2 font-medium text-fg">
        {yaSeEscribio ? (
          <CheckCircle className="h-4 w-4 text-success" weight="fill" />
        ) : null}
        {yaSeEscribio
          ? `Se migraron ${acumulado.migrados.toLocaleString("es-CO")} comprobantes`
          : `Así quedarían tus ${acumulado.total.toLocaleString("es-CO")} comprobantes`}
      </h3>
      {!yaSeEscribio ? (
        <p className="mt-0.5 text-sm text-fg-muted">Todavía no se escribió nada.</p>
      ) : null}

      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Dato titulo="Entran" valor={acumulado.listos} />
        <Dato titulo="Ya estaban" valor={acumulado.yaMigrados} />
        <Dato titulo="Rechazados" valor={acumulado.rechazados} tono="danger" />
        <Dato titulo="Con contrato" valor={conContrato} tono="success" />
      </dl>

      <div className="mt-4 space-y-1 text-sm">
        <p className="text-fg">
          <span className="font-mono tabular-nums">
            {acumulado.porDocumento.toLocaleString("es-CO")}
          </span>{" "}
          <span className="text-fg-muted">
            quedaron colgados de un contrato por el documento del tercero (el
            «REF» del concepto).
          </span>
        </p>
        <p className="text-fg">
          <span className="font-mono tabular-nums">
            {acumulado.porNombre.toLocaleString("es-CO")}
          </span>{" "}
          <span className="text-fg-muted">
            por el nombre del tercero, cuando el concepto no traía documento.
          </span>
        </p>
        <p className="text-fg">
          <span className="font-mono tabular-nums">
            {acumulado.sinContrato.toLocaleString("es-CO")}
          </span>{" "}
          <span className="text-fg-muted">
            quedaron SIN contrato: el concepto no nombra a ningún tercero que
            esté en un contrato de tu agencia. Se guardan igual, con su
            concepto, y se pueden buscar; lo que no se hace es inventarles un
            contrato.
          </span>
        </p>
      </div>

      {motivos.length > 0 ? (
        <div className="mt-4" data-testid="documentos-motivos">
          <h4 className="text-sm font-medium text-fg">Por qué</h4>
          <div className="mt-2 overflow-hidden rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Motivo</TableHead>
                  <TableHead className="w-28 text-right">Filas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {motivos.map(([motivo, cuantas]) => (
                  <TableRow key={motivo}>
                    <TableCell className="text-sm">{motivo}</TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums">
                      {cuantas.toLocaleString("es-CO")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : null}

      {!yaSeEscribio && onMigrar ? (
        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            onClick={onMigrar}
            disabled={acumulado.listos === 0}
            hideArrow
            data-testid="documentos-migrar"
          >
            {acumulado.listos === 0
              ? "No hay comprobantes nuevos que migrar"
              : `Migrar ${acumulado.listos.toLocaleString("es-CO")} comprobantes`}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function Dato({
  titulo,
  valor,
  tono,
}: {
  titulo: string;
  valor: number;
  tono?: "danger" | "success";
}) {
  const color =
    tono === "danger" ? "text-danger" : tono === "success" ? "text-success" : "text-fg";
  return (
    <div className="rounded-md border border-border bg-surface-muted p-3">
      <dt className="text-xs text-fg-muted">{titulo}</dt>
      <dd className={`mt-0.5 font-mono text-lg tabular-nums ${color}`}>
        {valor.toLocaleString("es-CO")}
      </dd>
    </div>
  );
}
