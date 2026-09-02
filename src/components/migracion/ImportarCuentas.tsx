"use client";

/**
 * Importar el plan de cuentas desde un archivo.
 *
 * Nico: «tanto el PUC como los registros contables, ellos tienden a tener un
 * CSV para cada uno». Una inmobiliaria que viene de Siigo o de World Office
 * exporta su plan con SUS códigos, y ese plan es el que su contador conoce.
 * La semilla del Decreto 2650 sigue estando para quien arranca de cero; esto
 * es para quien ya tiene uno.
 *
 * subir → mapear columnas → revisar → importar, la misma forma que los
 * asientos y los terceros. `revisar` no escribe nada y devuelve fila por fila
 * qué entra, qué ya existe y qué no se entendió. Lo que ya existe **no se
 * toca** — nunca se pisa un nombre que la inmobiliaria ya editó.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import {
  CheckCircle,
  FileArrowUp,
  Info,
  Warning,
  X,
} from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
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
import { parseSpreadsheetFile } from "@/components/inmobiliaria/import/lib/parseFile";
import {
  contabilidadApi,
  MAX_CUENTAS_POR_IMPORTACION,
  type CuentaImportada,
  type CuentaRevisada,
  type ResultadoImportacionPuc,
  type RevisionDeImportacionPuc,
} from "@/lib/api/contabilidad.service";
import {
  mapearColumnas,
  obligatoriasSinMapear,
  remapear,
  type MapeoDeColumna,
} from "@/lib/migracion/columnas-de-tercero";
import {
  armarCuentas,
  COLUMNAS_DE_CUENTA,
} from "@/lib/migracion/columnas-de-cuenta";

import { mensajeDeContabilidad } from "./contabilidad-errores";

/** Sentinel: Radix `Select` no admite `value=""`. */
const IGNORAR = "__ignorar__";
const MAX_FILAS_EN_PANTALLA = 60;

export function ImportarCuentas({
  onImportado,
  onCerrar,
  onOcupado,
}: {
  /** Se importó algo: el padre relee el árbol. */
  onImportado: (resultado: ResultadoImportacionPuc) => void;
  onCerrar: () => void;
  /** Aviso al muro mientras se revisa o importa: el pie espera. */
  onOcupado?: (ocupado: boolean) => void;
}) {
  const [filas, setFilas] = useState<Record<string, unknown>[]>([]);
  const [encabezados, setEncabezados] = useState<string[]>([]);
  const [mapeo, setMapeo] = useState<MapeoDeColumna[]>([]);
  const [nombreDeArchivo, setNombreDeArchivo] = useState("");
  const [cuentas, setCuentas] = useState<CuentaImportada[]>([]);
  const [revision, setRevision] = useState<RevisionDeImportacionPuc | null>(
    null,
  );
  const [resultado, setResultado] = useState<ResultadoImportacionPuc | null>(
    null,
  );
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onOcupado?.(cargando);
  }, [cargando, onOcupado]);
  useEffect(() => () => onOcupado?.(false), [onOcupado]);

  const onDrop = useCallback(async (aceptados: File[]) => {
    const archivo = aceptados[0];
    if (!archivo) return;
    setError(null);
    setRevision(null);
    setResultado(null);
    try {
      const r = await parseSpreadsheetFile(archivo);
      setFilas(r.rows as Record<string, unknown>[]);
      setEncabezados(r.headers);
      setMapeo(mapearColumnas(COLUMNAS_DE_CUENTA, r.headers));
      setNombreDeArchivo(archivo.name);
    } catch (e) {
      setError(
        e instanceof Error && e.message
          ? e.message
          : "No pudimos leer el archivo. ¿Es Excel o CSV?",
      );
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    multiple: false,
  });

  const sinMapear = useMemo(
    () => obligatoriasSinMapear(COLUMNAS_DE_CUENTA, mapeo),
    [mapeo],
  );
  const armadas = useMemo(
    () => (filas.length ? armarCuentas(filas, mapeo) : []),
    [filas, mapeo],
  );
  const demasiadas = armadas.length > MAX_CUENTAS_POR_IMPORTACION;
  const puedeRevisar =
    armadas.length > 0 && sinMapear.length === 0 && !demasiadas && !cargando;

  const revisar = async () => {
    setCargando(true);
    setError(null);
    try {
      const r = await contabilidadApi.puc.revisarImportacion(armadas);
      setCuentas(armadas);
      setRevision(r);
    } catch (e) {
      setError(
        mensajeDeContabilidad(
          e,
          "No pudimos revisar el archivo. Intentá de nuevo.",
        ),
      );
    } finally {
      setCargando(false);
    }
  };

  const importar = async () => {
    setCargando(true);
    setError(null);
    try {
      const r = await contabilidadApi.puc.importar(cuentas);
      setResultado(r);
      onImportado(r);
    } catch (e) {
      setError(
        // Un hecho del back, no un consuelo: `importar` es idempotente — lo
        // que ya entró sale como «ya existe» la segunda vez.
        `${mensajeDeContabilidad(e, "No pudimos importar el plan.")} Podés importar de nuevo tranquilo: las cuentas que ya entraron no se duplican.`,
      );
    } finally {
      setCargando(false);
    }
  };

  if (resultado) {
    return (
      <section
        className="rounded-lg border border-border bg-surface p-6 shadow-sm"
        data-testid="puc-importacion-resultado"
      >
        <p className="flex items-center gap-2 font-medium text-fg">
          <CheckCircle className="h-4 w-4 text-success" weight="fill" />
          {resultado.creadas === 1
            ? "Se creó 1 cuenta"
            : `Se crearon ${resultado.creadas} cuentas`}{" "}
          de tu archivo
        </p>
        <p className="mt-1 text-sm text-fg-muted">
          {resultado.existentes > 0
            ? resultado.existentes === 1
              ? "1 ya estaba y se dejó como estaba. "
              : `${resultado.existentes} ya estaban y se dejaron como estaban. `
            : ""}
          {resultado.invalidas > 0
            ? resultado.invalidas === 1
              ? "1 no entró — está marcada abajo con su motivo."
              : `${resultado.invalidas} no entraron — están marcadas abajo con su motivo.`
            : ""}
        </p>
        {resultado.invalidas > 0 ? (
          <TablaDeRevision
            filas={resultado.filas.filter((f) => f.veredicto === "INVALIDA")}
            titulo="Las que no entraron"
          />
        ) : null}
        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={onCerrar} hideArrow data-testid="puc-importacion-listo">
            Listo
          </Button>
        </div>
      </section>
    );
  }

  if (revision) {
    return (
      <section
        className="rounded-lg border border-border bg-surface p-6 shadow-sm"
        data-testid="puc-importacion-revision"
      >
        <h2 className="font-medium text-fg">Así va a quedar</h2>
        <p className="mt-1 text-sm text-fg-muted">
          Nada se escribió todavía.{" "}
          <span className="font-mono tabular-nums text-fg">
            {revision.nuevas}
          </span>{" "}
          {revision.nuevas === 1 ? "cuenta nueva" : "cuentas nuevas"}
          {revision.existentes > 0 ? (
            <>
              {" · "}
              <span className="font-mono tabular-nums text-fg">
                {revision.existentes}
              </span>{" "}
              ya {revision.existentes === 1 ? "existe" : "existen"} y no se{" "}
              {revision.existentes === 1 ? "toca" : "tocan"}
            </>
          ) : null}
          {revision.invalidas > 0 ? (
            <>
              {" · "}
              <span className="font-mono tabular-nums text-danger">
                {revision.invalidas}
              </span>{" "}
              con algo que no se entendió
            </>
          ) : null}
          .
        </p>

        <TablaDeRevision filas={revision.filas} />

        {error ? <Aviso tono="danger">{error}</Aviso> : null}

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Button
            onClick={importar}
            disabled={revision.nuevas === 0 || cargando}
            isLoading={cargando}
            hideArrow
            data-testid="puc-importar"
          >
            {revision.nuevas === 0
              ? "No hay cuentas nuevas que importar"
              : `Importar ${revision.nuevas} ${
                  revision.nuevas === 1 ? "cuenta" : "cuentas"
                }`}
          </Button>
          <Button variant="ghost" hideArrow onClick={() => setRevision(null)}>
            Volver al mapeo
          </Button>
          <Button variant="ghost" hideArrow onClick={onCerrar}>
            Cancelar
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section
      className="space-y-5 rounded-lg border border-border bg-surface p-6 shadow-sm"
      data-testid="puc-importacion"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-medium text-fg">Subir mi plan de cuentas</h2>
          <p className="mt-1 max-w-2xl text-sm text-fg-muted">
            El PUC exportado de tu sistema actual: una fila por cuenta, con
            código y nombre. Si trae naturaleza y si recibe movimientos, mejor;
            si no, se deducen del código. Primero se revisa todo; recién
            después se escribe, y lo que ya tengas no se toca.
          </p>
        </div>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar"
          className="rounded-full p-1 text-fg-subtle hover:bg-surface-muted hover:text-fg"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div
        {...getRootProps()}
        className={`flex cursor-pointer flex-col items-center gap-3 rounded-md border border-dashed p-8 text-center transition-colors ${
          isDragActive
            ? "border-primary bg-primary-soft"
            : "border-border hover:bg-surface-muted"
        }`}
        data-testid="dropzone-cuentas"
      >
        {/* allowlist: react-dropzone hidden file input (mecanismo canónico) */}
        <input {...getInputProps()} data-testid="archivo-cuentas" />
        <FileArrowUp className="h-8 w-8 text-fg-muted" />
        <div>
          <p className="text-sm font-medium text-fg">
            {nombreDeArchivo || "Arrastrá el archivo o hacé clic para elegirlo"}
          </p>
          <p className="text-xs text-fg-subtle">
            Excel o CSV. Nada se crea todavía.
          </p>
        </div>
      </div>

      {error ? <Aviso tono="danger">{error}</Aviso> : null}

      {encabezados.length > 0 ? (
        <div data-testid="mapeo-cuentas">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="font-medium text-fg">Qué es cada columna</h3>
              <p className="text-sm text-fg-muted">
                {armadas.length} {armadas.length === 1 ? "cuenta" : "cuentas"}{" "}
                en el archivo. Revisá lo que adivinamos.
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              hideArrow
              onClick={() =>
                setMapeo(mapearColumnas(COLUMNAS_DE_CUENTA, encabezados))
              }
            >
              Restablecer
            </Button>
          </div>

          <div className="mt-3 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Columna del archivo</TableHead>
                  <TableHead>Campo de la cuenta</TableHead>
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
                          className="w-56"
                          aria-label={`Campo para ${m.columna}`}
                          data-testid={`mapeo-cuenta-${m.columna}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={IGNORAR}>Ignorar</SelectItem>
                          {COLUMNAS_DE_CUENTA.map((c) => (
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

          {sinMapear.length > 0 ? (
            <Aviso tono="warning" testId="cuentas-sin-mapear">
              Falta decir qué columna es{" "}
              {sinMapear.map((c) => `«${c.titulo}»`).join(" y ")}. Sin eso no
              hay cuenta que armar.
            </Aviso>
          ) : null}

          {demasiadas ? (
            <Aviso tono="danger">
              Son {armadas.length} cuentas y una importación admite hasta{" "}
              {MAX_CUENTAS_POR_IMPORTACION}. Partí el archivo y subilo en
              tandas.
            </Aviso>
          ) : null}

          <Aviso tono="info">
            Los códigos con puntos o guiones se entienden («1105-05» → 110505).
            La jerarquía sale del código: 1105 queda debajo de 11, y 110505
            debajo de 1105. Las cuentas que ya tengas se dejan como están.
          </Aviso>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              onClick={revisar}
              disabled={!puedeRevisar}
              isLoading={cargando}
              hideArrow
              data-testid="revisar-cuentas"
            >
              Revisar {armadas.length}{" "}
              {armadas.length === 1 ? "cuenta" : "cuentas"}
            </Button>
            <Button variant="ghost" hideArrow onClick={onCerrar}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Aviso({
  tono,
  children,
  testId,
}: {
  tono: "info" | "warning" | "danger";
  children: React.ReactNode;
  testId?: string;
}) {
  const estilos = {
    info: { caja: "bg-info-soft", icono: <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" /> },
    warning: { caja: "bg-warning-soft", icono: <Warning className="mt-0.5 h-4 w-4 shrink-0 text-warning" /> },
    danger: { caja: "bg-danger-soft", icono: <Warning className="mt-0.5 h-4 w-4 shrink-0 text-danger" /> },
  }[tono];
  return (
    <div
      className={`mt-4 flex items-start gap-2 rounded-md border border-border p-3 ${estilos.caja}`}
      role={tono === "danger" ? "alert" : undefined}
      data-testid={testId}
    >
      {estilos.icono}
      <p className="text-sm text-fg">{children}</p>
    </div>
  );
}

function TablaDeRevision({
  filas,
  titulo,
}: {
  filas: CuentaRevisada[];
  titulo?: string;
}) {
  // Primero lo que necesita atención; lo que ya existe, al final.
  const orden: Record<CuentaRevisada["veredicto"], number> = {
    INVALIDA: 0,
    NUEVA: 1,
    YA_EXISTE: 2,
  };
  const ordenadas = [...filas].sort(
    (a, b) => orden[a.veredicto] - orden[b.veredicto] || a.indice - b.indice,
  );
  const visibles = ordenadas.slice(0, MAX_FILAS_EN_PANTALLA);

  return (
    <div className="mt-4">
      {titulo ? <h3 className="text-sm font-medium text-fg">{titulo}</h3> : null}
      <div className="mt-2 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Fila</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Naturaleza</TableHead>
              <TableHead>Qué pasa</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibles.map((f) => (
              <TableRow key={f.indice} data-testid={`revision-cuenta-${f.indice}`}>
                {/* +2: en el archivo la primera fila de datos es la 2. */}
                <TableCell className="font-mono text-xs tabular-nums text-fg-subtle">
                  {f.indice + 2}
                </TableCell>
                <TableCell className="font-mono text-xs tabular-nums">
                  {f.codigo || f.codigoOriginal}
                </TableCell>
                <TableCell className="text-sm">{f.nombre}</TableCell>
                <TableCell className="text-xs text-fg-muted">
                  {f.naturaleza === "DEBITO"
                    ? "Débito"
                    : f.naturaleza === "CREDITO"
                      ? "Crédito"
                      : "—"}
                </TableCell>
                <TableCell className="text-xs">
                  <Veredicto fila={f} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {ordenadas.length > MAX_FILAS_EN_PANTALLA ? (
        <p className="mt-2 text-xs text-fg-subtle">
          Se muestran {MAX_FILAS_EN_PANTALLA} de {ordenadas.length}, primero
          las que necesitan atención.
        </p>
      ) : null}
    </div>
  );
}

function Veredicto({ fila }: { fila: CuentaRevisada }) {
  if (fila.veredicto === "INVALIDA") {
    return (
      <span className="inline-flex items-start gap-1 text-danger">
        <Warning className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>{fila.motivo}</span>
      </span>
    );
  }
  if (fila.veredicto === "YA_EXISTE") {
    return (
      <span className="text-fg-muted">
        Ya existe{fila.nombreActual ? ` como «${fila.nombreActual}»` : ""} — no
        se toca
      </span>
    );
  }
  return (
    <span className="inline-flex items-start gap-1 text-success">
      <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" weight="fill" />
      <span>
        Nueva{fila.imputable ? "" : " · mayor, sin movimientos"}
        {fila.motivo ? ` — ${fila.motivo}` : ""}
      </span>
    </span>
  );
}
