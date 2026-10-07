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

import { porQueDelMapeo } from "@/lib/migracion/por-que-del-mapeo";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import {
  CheckCircle,
  Info,
  Warning,
  X,
} from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { TarjetaDeArchivo } from "@/components/migracion/TarjetaDeArchivo";
import { ZonaDeArchivo } from "@/components/migracion/ZonaDeArchivo";
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
  TableBodyAnimado,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableRowAnimada,
} from "@/components/ui/table";
import { TablePagination } from "@/components/ui/pagination";
import {
  PAGE_SIZE_OPTIONS,
  useTablePagination,
} from "@/lib/hooks/use-table-pagination";
import {
  contabilidadApi,
  MAX_CUENTAS_POR_IMPORTACION,
  type CuentaImportada,
  type CuentaRevisada,
  type ResultadoImportacionPuc,
  type RevisionDeImportacionPuc,
} from "@/lib/api/contabilidad.service";
import { useAvisoAlSalir } from "@/lib/hooks/use-aviso-al-salir";
import { useIsMobile } from "@/hooks/use-mobile";
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
import {
  fraseDelArchivoVacio,
  leerTablaDelArchivo,
  type HojaYEncabezado,
} from "./encabezado-del-archivo";
import { mensajeParaLaPersona } from "@/lib/errores/traductor-de-errores";

/** Sentinel: Radix `Select` no admite `value=""`. */
const IGNORAR = "__ignorar__";

/**
 * Por qué cada asiento automático no quedó asignado solo, dicho con verdad
 * (QA 22-09): «tu plan no tiene 130505» era falso cuando la cuenta estaba
 * como MAYOR, y un código que coincide con otro nombre no se asigna solo.
 */
export function fraseDeLoQueNoSeAsigno(
  sinCuenta: ReadonlyArray<{
    codigo: string;
    motivo?: "NO_EXISTE" | "NO_IMPUTABLE" | "INACTIVA" | "OTRO_NOMBRE";
    nombreEnTuPlan?: string;
  }>,
): string {
  // QA-MIG-B: dos asientos automáticos pueden proponer el MISMO código
  // («Tu plan no tiene 112005, …, 112005»): cada código se dice una vez.
  const de = (m: string) =>
    sinCuenta
      .filter((c) => (c.motivo ?? "NO_EXISTE") === m)
      .filter((c, i, todas) => todas.findIndex((o) => o.codigo === c.codigo) === i);
  const partes: string[] = [];
  const noExisten = de("NO_EXISTE");
  if (noExisten.length > 0) {
    partes.push(`Tu plan no tiene ${noExisten.map((c) => c.codigo).join(", ")}.`);
  }
  const mayores = de("NO_IMPUTABLE");
  if (mayores.length > 0) {
    partes.push(
      `${mayores.map((c) => c.codigo).join(", ")} ${mayores.length === 1 ? "está" : "están"} en tu plan como cuenta mayor: los movimientos van en una subcuenta.`,
    );
  }
  const inactivas = de("INACTIVA");
  if (inactivas.length > 0) {
    partes.push(
      `${inactivas.map((c) => c.codigo).join(", ")} ${inactivas.length === 1 ? "está inhabilitada" : "están inhabilitadas"} en tu plan.`,
    );
  }
  const otroNombre = de("OTRO_NOMBRE");
  if (otroNombre.length > 0) {
    partes.push(
      `En tu plan ${otroNombre
        .map((c) => `${c.codigo} se llama «${c.nombreEnTuPlan ?? ""}»`)
        .join(", ")}: no la asignamos sola porque el mismo código puede significar otra cosa.`,
    );
  }
  return partes.join(" ");
}

export function ImportarCuentas({
  onImportado,
  onCerrar,
  onOcupado,
}: {
  /** Se importó algo: el padre relee el árbol. */
  onImportado: (resultado: ResultadoImportacionPuc) => void;
  onCerrar: () => void;
  /** Aviso al muro mientras se revisa o importa: el pie espera. */
  onOcupado?: (ocupado: boolean, cancelar?: () => void) => void;
}) {
  /** El archivo tal cual. `null` = no hay nada subido; ver TarjetaDeArchivo. */
  const [archivo, setArchivo] = useState<File | null>(null);
  const [leyendo, setLeyendo] = useState(false);
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
  /**
   * QA-MIG-B (04-10): en qué hoja y desde qué fila se leyó. Los exports de
   * SIIGO o World Office traen títulos arriba; un libro puede traer la tabla
   * en la segunda hoja. Se dice cuando no fue lo obvio.
   */
  const [donde, setDonde] = useState<HojaYEncabezado | null>(null);
  const [fraseDonde, setFraseDonde] = useState<string | null>(null);

  useEffect(() => {
    onOcupado?.(cargando);
  }, [cargando, onOcupado]);
  useEffect(() => () => onOcupado?.(false), [onOcupado]);

  // T-0125 · el archivo leído vive sólo en el navegador hasta que se importa
  // (la importación en sí es atómica en el back): se avisa antes de perderlo.
  useAvisoAlSalir(cargando || (filas.length > 0 && !resultado));

  /** Lee el archivo (o otra hoja del mismo libro) desde su tabla de verdad. */
  const leer = useCallback(async (elArchivo: File, hoja?: string) => {
    setError(null);
    setRevision(null);
    setResultado(null);
    setCuentas([]);
    setLeyendo(true);
    try {
      const r = await leerTablaDelArchivo(elArchivo, COLUMNAS_DE_CUENTA, hoja);
      setFilas(r.rows);
      setEncabezados(r.headers);
      setMapeo(mapearColumnas(COLUMNAS_DE_CUENTA, r.headers));
      setDonde(r.donde);
      setFraseDonde(r.frase);
      if (r.vacio) setError(fraseDelArchivoVacio(elArchivo.name, r.vacio, "cuentas"));
    } catch (e) {
      setFilas([]);
      setEncabezados([]);
      setMapeo([]);
      setDonde(null);
      setFraseDonde(null);
      // El archivo se lee en el navegador: su error es un texto propio (o un
      // `TypeError` que no es para nadie, y entonces va la frase de respaldo).
      setError(
        mensajeParaLaPersona(e, { porDefecto: "No pudimos leer el archivo. ¿Es Excel o CSV?" }),
      );
    } finally {
      setLeyendo(false);
    }
  }, []);

  const onDrop = useCallback(async (aceptados: File[]) => {
    const archivo = aceptados[0];
    if (!archivo) return;
    // 🔴 `cuentas` también se limpia (en `leer`). Sin eso, subir un segundo
    // archivo dejaba el resumen del PRIMERO en pantalla — el mismo bug que en
    // asientos.
    setArchivo(archivo);
    setNombreDeArchivo(archivo.name);
    await leer(archivo);
  }, [leer]);

  /** Suelta el archivo y TODO lo que salió de él: lo que corre «Descartar». */
  const soltarArchivo = useCallback(() => {
    setArchivo(null);
    setLeyendo(false);
    setNombreDeArchivo("");
    setFilas([]);
    setEncabezados([]);
    setMapeo([]);
    setCuentas([]);
    setRevision(null);
    setResultado(null);
    setError(null);
    setDonde(null);
    setFraseDonde(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    maxFiles: 1,
    multiple: false,
  });

  const sinMapear = useMemo(
    () => obligatoriasSinMapear(COLUMNAS_DE_CUENTA, mapeo),
    [mapeo],
  );
  /**
   * Columnas que el archivo trae, que se mandan, y que el plan de cuentas NO
   * guarda: no hay dónde. Decirlo es la diferencia entre «se ignoró» y «se
   * perdió sin que nadie avisara».
   */
  const banderasIgnoradas = useMemo(
    () =>
      mapeo
        .filter((m) => m.campo === "controlDeTerceros" || m.campo === "cajaOBanco")
        .map((m) => m.columna),
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
          "No pudimos revisar el archivo. Intenta de nuevo.",
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
        `${mensajeDeContabilidad(e, "No pudimos importar el plan.")} Puedes importar de nuevo tranquilo: las cuentas que ya entraron no se duplican.`,
      );
    } finally {
      setCargando(false);
    }
  };

  if (resultado) {
    return (
      <section
        className="rounded-lg border border-border-faint bg-surface p-6 shadow-sm"
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
        {/* El mapeo automático por código sobre el plan importado
            (2026-09-02): lo que coincidió quedó asignado; lo demás se dice. */}
        {resultado.mapeo ? (
          <p className="mt-1 text-sm text-fg-muted" data-testid="puc-importacion-mapeo">
            {resultado.mapeo.sinCuenta.length === 0
              ? "Los asientos automáticos ya tienen su cuenta en tu plan."
              : `${fraseDeLoQueNoSeAsigno(resultado.mapeo.sinCuenta)} Asígnalas en «Cuentas de los asientos automáticos», más abajo.`}
          </p>
        ) : null}
        <AvisosDelArchivo avisos={resultado.advertencias} />
        {resultado.invalidas > 0 ? (
          <TablaDeRevision
            filaDeEncabezado={donde?.filaDeEncabezado ?? 0}
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
        className="rounded-lg border border-border-faint bg-surface p-6 shadow-sm"
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

        <AvisosDelArchivo avisos={revision.advertencias} />

        <TablaDeRevision filas={revision.filas} filaDeEncabezado={donde?.filaDeEncabezado ?? 0} />

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
      className="space-y-5 rounded-lg border border-border-faint bg-surface p-6 shadow-sm"
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

      {archivo ? (
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
          inputTestid="archivo-cuentas"
          onSubirOtro={open}
          onDescartar={soltarArchivo}
          ocupado={leyendo || cargando}
          testid="archivo-de-cuentas"
        />
      ) : (
        <ZonaDeArchivo
          rootProps={getRootProps()}
          inputProps={getInputProps()}
          activo={isDragActive}
          testid="dropzone-cuentas"
          inputTestid="archivo-cuentas"
          titulo="Arrastra el archivo o haz clic para elegirlo"
          detalle="Excel o CSV. Nada se crea todavía."
        />
      )}

      {error ? <Aviso tono="danger">{error}</Aviso> : null}

      {archivo && donde ? (
        <HojaDelLibro
          donde={donde}
          frase={fraseDonde}
          ocupado={leyendo || cargando}
          onElegir={(hoja) => void leer(archivo, hoja)}
        />
      ) : null}

      {encabezados.length > 0 ? (
        <div data-testid="mapeo-cuentas">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="font-medium text-fg">Qué es cada columna</h3>
              <p className="text-sm text-fg-muted">
                {armadas.length} {armadas.length === 1 ? "cuenta" : "cuentas"}{" "}
                en el archivo. Revisa lo que adivinamos.
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
                    <TableCell className="font-mono text-caption">
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
                    <TableCell className="text-caption text-fg-muted">
                      {porQueDelMapeo(m)}
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
              {MAX_CUENTAS_POR_IMPORTACION}. Parte el archivo y súbelo en
              tandas.
            </Aviso>
          ) : null}

          <Aviso tono="info">
            Los códigos con puntos o guiones se entienden («1105-05» → 110505).
            La jerarquía sale del código: 1105 queda debajo de 11, y 110505
            debajo de 1105. Las cuentas que ya tengas se dejan como están.
            «Último Nivel» es la cuenta que recibe movimientos, y «Habilitado»
            decide si queda activa.
          </Aviso>

          {banderasIgnoradas.length > 0 ? (
            <Aviso tono="info" testId="cuentas-banderas-ignoradas">
              {banderasIgnoradas.length === 1
                ? `La columna «${banderasIgnoradas[0]}» se lee pero no se guarda: `
                : `Las columnas ${banderasIgnoradas
                    .map((c) => `«${c}»`)
                    .join(" y ")} se leen pero no se guardan: `}
              el plan de cuentas todavía no tiene dónde{" "}
              {banderasIgnoradas.length === 1 ? "ponerla" : "ponerlas"}. Nada
              más del archivo se pierde.
            </Aviso>
          ) : null}

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
  filaDeEncabezado = 0,
}: {
  filas: CuentaRevisada[];
  titulo?: string;
  /** QA-MIG-B: con títulos arriba, la fila 1 de datos no es la 2 del Excel. */
  filaDeEncabezado?: number;
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
  /*
   * Un plan de cuentas importado trae cientos de filas: antes se recortaba a
   * las primeras 60 con un «se muestran 60 de N» y el resto no había forma de
   * mirarlo. Con el pie de tabla de la casa se llega a todas.
   */
  const { pageItems, total, page, pageSize, setPage, setPageSize, shouldPaginate } =
    useTablePagination(ordenadas, { resetKey: `${titulo ?? ""}|${filas.length}` });

  /*
   * QA-MIG-B (MC-28): a 390 px la tabla se corría de lado y «Qué pasa» —lo
   * que más importa— quedaba fuera de la vista. Bajo 768 px, tarjetas.
   */
  const enCelular = useIsMobile();
  const naturalezaDe = (f: CuentaRevisada) => (
    <>
      {f.naturaleza === "DEBITO" ? "Débito" : f.naturaleza === "CREDITO" ? "Crédito" : "—"}
      {/* QA-MIG-B: lo que no venía en el archivo se dice. */}
      {f.veredicto === "NUEVA" && f.naturalezaDe === "CLASE" ? (
        <span className="block text-fg-subtle" data-testid={`naturaleza-deducida-${f.indice}`}>
          por su clase
        </span>
      ) : f.veredicto === "NUEVA" && f.naturalezaDe === "PADRE" ? (
        <span className="block text-fg-subtle" data-testid={`naturaleza-deducida-${f.indice}`}>
          de su cuenta mayor
        </span>
      ) : null}
    </>
  );

  return (
    <div className="mt-4">
      {titulo ? <h3 className="text-sm font-medium text-fg">{titulo}</h3> : null}
      <div className="mt-2 overflow-hidden rounded-lg border border-border">
        {enCelular ? (
          <ul className="divide-y divide-border" data-testid="revision-cuentas-tarjetas">
            {pageItems.map((f) => (
              <li key={f.indice} className="space-y-1 p-3" data-testid={`revision-cuenta-${f.indice}`}>
                <p className="flex flex-wrap items-baseline gap-x-2 text-caption text-fg-subtle">
                  <span className="font-mono tabular-nums">Fila {f.indice + 2 + filaDeEncabezado}</span>
                  <span className="font-mono tabular-nums text-fg">{f.codigo || f.codigoOriginal}</span>
                </p>
                {f.nombre ? <p className="text-sm text-fg">{f.nombre}</p> : null}
                <div className="text-caption text-fg-muted">{naturalezaDe(f)}</div>
                <div className="text-caption">
                  <Veredicto fila={f} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
        <div className="overflow-x-auto">
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
            {/* Las filas entran escalonadas; cada página es una lista nueva
                (ARREGLOS-8, MOV-A6). */}
            <TableBodyAnimado key={`${page}|${pageSize}`}>
              {pageItems.map((f) => (
                <TableRowAnimada key={f.indice} data-testid={`revision-cuenta-${f.indice}`}>
                  {/* +2: en el archivo la primera fila de datos es la 2 (más
                      las filas de título que haya arriba del encabezado). */}
                  <TableCell className="font-mono text-caption tabular-nums text-fg-subtle">
                    {f.indice + 2 + filaDeEncabezado}
                  </TableCell>
                  <TableCell className="font-mono text-caption tabular-nums">
                    {f.codigo || f.codigoOriginal}
                  </TableCell>
                  <TableCell className="text-sm">{f.nombre}</TableCell>
                  <TableCell className="text-caption text-fg-muted">
                    {naturalezaDe(f)}
                  </TableCell>
                  <TableCell className="text-caption">
                    <Veredicto fila={f} />
                  </TableCell>
                </TableRowAnimada>
              ))}
            </TableBodyAnimado>
          </Table>
        </div>
        )}
        {shouldPaginate ? (
          <div className="border-t border-border px-4 py-3">
            <TablePagination
              total={total}
              page={page}
              pageSize={pageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        ) : null}
      </div>
      {ordenadas.length > 1 ? (
        <p className="mt-2 text-caption text-fg-subtle">
          Primero las que necesitan atención.
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
    // QA-MIG-B (MC-29): si el archivo trae OTRO estado, también se dice.
    const otroMotivo = fila.motivo
      ?.replace(/^Ya está como «[^»]*»; se conserva ese nombre\.\s*/, "")
      .trim();
    return (
      <span className="text-fg-muted">
        Ya existe{fila.nombreActual ? ` como «${fila.nombreActual}»` : ""} — no
        se toca
        {otroMotivo ? (
          <span className="block text-warning" data-testid={`otro-estado-${fila.indice}`}>
            {otroMotivo}
          </span>
        ) : null}
      </span>
    );
  }
  return (
    <span className="inline-flex items-start gap-1 text-success">
      <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" weight="fill" />
      <span>
        Nueva{fila.imputable ? "" : " · mayor, sin movimientos"}
        {fila.sinPadre ? " · sin su cuenta mayor" : ""}
        {fila.motivo ? ` — ${fila.motivo}` : ""}
      </span>
    </span>
  );
}

/**
 * QA-MIG-B (04-10): lo que el back completó con una regla fija o no guarda
 * (naturaleza por la clase, todas activas porque el archivo no lo decía,
 * columnas sin dónde vivir). Antes viajaba en `advertencias` y la pantalla no
 * lo mostraba: un dato deducido parecía venir del archivo.
 */
function AvisosDelArchivo({ avisos }: { avisos?: readonly string[] }) {
  if (!avisos || avisos.length === 0) return null;
  return (
    <div
      className="mt-4 flex items-start gap-2 rounded-md border border-border bg-info-soft p-3"
      data-testid="puc-avisos-del-archivo"
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
      <ul className="space-y-1 text-sm text-fg">
        {avisos.map((a) => (
          <li key={a}>{a}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * QA-MIG-B (04-10): de qué hoja y desde qué fila se leyó, y la salida para
 * elegir otra hoja cuando el libro trae varias.
 */
export function HojaDelLibro({
  donde,
  frase,
  ocupado,
  onElegir,
}: {
  donde: HojaYEncabezado;
  frase: string | null;
  ocupado: boolean;
  onElegir: (hoja: string) => void;
}) {
  if (!frase && donde.hojas.length <= 1) return null;
  return (
    <div
      className="flex flex-wrap items-center gap-3 rounded-md bg-surface-muted p-3"
      data-testid="hoja-del-libro"
    >
      {frase ? (
        <p className="min-w-0 flex-1 text-sm text-fg-muted" data-testid="donde-se-leyo">
          {frase}
        </p>
      ) : (
        <p className="min-w-0 flex-1 text-sm text-fg-muted">
          El libro trae {donde.hojas.length} hojas; leímos «{donde.hoja}».
        </p>
      )}
      {donde.hojas.length > 1 ? (
        <Select value={donde.hoja} onValueChange={onElegir} disabled={ocupado}>
          <SelectTrigger className="w-56" aria-label="Hoja del libro" data-testid="elegir-hoja">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {donde.hojas.map((h) => (
              <SelectItem key={h} value={h}>
                {h}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
    </div>
  );
}
