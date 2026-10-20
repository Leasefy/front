"use client";

/**
 * 🔴 La cartera que traían los inquilinos, POR FACTURA (T-0168; Juan, Portofino,
 * 15-10-2026: «la migración debería traer la cartera antigua»).
 *
 * Se sube el informe de cartera del sistema anterior: una fila por cada
 * factura pendiente. De cada fila se toman cinco datos —la fecha de
 * vencimiento, el documento y el nombre del INQUILINO, el concepto y el SALDO
 * PENDIENTE— y cada línea entra al contrato de su inquilino con mora desde su
 * propia fecha. Antes era el balance de prueba por tercero: una cifra por
 * inquilino y una sola fecha, la del corte.
 *
 * Todo el archivo viaja en UNA llamada (el back reemplaza la cartera de cada
 * contrato con lo que llega; partirlo dejaría a un inquilino con la mitad).
 * Primero la vista previa —el back dice qué contrato toma cada inquilino y qué
 * líneas no se pueden cargar—; nada se escribe hasta «Cargar».
 *
 * El candado (`bloqueada`): mientras la carga de comprobantes congela el paso,
 * esta zona se ve apagada y lo dice. Sigue DENTRO del `inert` del muro.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { CheckCircle, Warning } from "@phosphor-icons/react";

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
import { TarjetaDeArchivo } from "@/components/migracion/TarjetaDeArchivo";
import { ZonaDeArchivo } from "@/components/migracion/ZonaDeArchivo";
import { ApiError } from "@/lib/api/client";
import { contractsApi, type CargaDeCarteraPorFactura } from "@/lib/api/contracts.service";
import { mensajeParaLaPersona } from "@/lib/errores/traductor-de-errores";
import { useI18n } from "@/lib/i18n";
import { localeDeLasCifras } from "@/lib/i18n/idioma-de-las-cifras";
import {
  CAMPOS_DE_CARTERA,
  COLUMNAS_DE_CARTERA,
  columnasQueFaltan,
  elegirColumnaDelCampo,
  encabezadosParaElCampo,
  mapearColumnasDeCartera,
  type CampoDeCartera,
  type MapeoDeCartera,
} from "@/lib/migracion/columnas-de-cartera";
import {
  date1904DelLibro,
  esLibroConSeriales,
  leerLineasDeCartera,
  MAX_LINEAS_DE_CARTERA,
  type OpcionesDeFecha,
} from "@/lib/migracion/lineas-de-cartera";
import { formatCurrency } from "@/lib/format";
import { diaLegible } from "@/lib/mandato/textos";

import { fraseDelArchivoVacio, leerTablaDelArchivo, type HojaYEncabezado } from "./encabezado-del-archivo";
import { HojaDelLibro } from "./ImportarCuentas";

const NINGUNA = "__ninguna__";
const numero = (n: number) => n.toLocaleString(localeDeLasCifras());
const MAX_INQUILINOS_A_LA_VISTA = 50;
const MAX_PROBLEMAS_A_LA_VISTA = 20;

const ESTADOS_CONOCIDOS = new Set<string>([
  "SE_CARGA",
  "CARGADO",
  "IGUAL",
  "CON_PAGOS",
  "SIN_CONTRATO",
  "SIN_LINEAS",
  "NO_SE_SABE",
]);
/** Lo que el back da por hecho o por bueno; el resto se marca con atención. */
const ESTADOS_SIN_ALARMA = new Set<string>(["SE_CARGA", "CARGADO", "IGUAL"]);

const CLAVE = "migracion.cartera";

export function CarteraDelSistemaAnterior({ bloqueada = false }: { bloqueada?: boolean }) {
  const { t } = useI18n();
  const tc = useCallback(
    (clave: string, params?: Record<string, string | number>) => t(`${CLAVE}.${clave}`, params),
    [t],
  );
  /** «1 fila» / «N filas»: el singular vive en la clave que termina en `Uno`. */
  const tn = useCallback(
    (clave: string, n: number, params: Record<string, string | number> = {}) =>
      t(`${CLAVE}.${n === 1 ? `${clave}Uno` : clave}`, { n: numero(n), ...params }),
    [t],
  );

  // La fecha de corte la dice el back (`GET /contracts/migrar/fecha-de-corte`).
  const [fechaDeCorte, setFechaDeCorte] = useState<string | null>(null);
  useEffect(() => {
    let vigente = true;
    contractsApi.migracion
      .fechaDeCorte()
      .then((r) => {
        if (vigente) setFechaDeCorte(r.fecha);
      })
      .catch(() => {
        /* sin la lectura, se pide la fecha de corte como si faltara */
      });
    return () => {
      vigente = false;
    };
  }, []);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [filas, setFilas] = useState<Record<string, unknown>[]>([]);
  const [encabezados, setEncabezados] = useState<string[]>([]);
  const [mapeo, setMapeo] = useState<MapeoDeCartera[]>([]);
  const [fechas, setFechas] = useState<OpcionesDeFecha>({ esXlsx: false, date1904: false });
  const [donde, setDonde] = useState<HojaYEncabezado | null>(null);
  const [fraseDonde, setFraseDonde] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [vista, setVista] = useState<CargaDeCarteraPorFactura | null>(null);
  const [pidiendo, setPidiendo] = useState(false);
  const [cargado, setCargado] = useState<CargaDeCarteraPorFactura | null>(null);

  const limpiar = useCallback(() => {
    setFilas([]);
    setEncabezados([]);
    setMapeo([]);
    setVista(null);
    setCargado(null);
    setError(null);
  }, []);

  const leer = useCallback(
    async (elArchivo: File, hoja?: string) => {
      limpiar();
      setLeyendo(true);
      try {
        const [r, date1904] = await Promise.all([
          leerTablaDelArchivo(elArchivo, COLUMNAS_DE_CARTERA, hoja),
          date1904DelLibro(elArchivo),
        ]);
        setFilas(r.rows);
        setEncabezados(r.headers);
        setMapeo(mapearColumnasDeCartera(r.headers));
        setFechas({ esXlsx: esLibroConSeriales(elArchivo.name), date1904 });
        setDonde(r.donde);
        setFraseDonde(r.frase);
        if (r.vacio) setError(fraseDelArchivoVacio(elArchivo.name, r.vacio, "cartera"));
      } catch (e) {
        limpiar();
        setError(mensajeParaLaPersona(e, { porDefecto: tc("errorLeer") }));
      } finally {
        setLeyendo(false);
      }
    },
    [limpiar, tc],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: (aceptados: File[]) => {
      const elegido = aceptados[0];
      if (!elegido) return;
      setArchivo(elegido);
      void leer(elegido);
    },
    maxFiles: 1,
    multiple: false,
    disabled: bloqueada,
  });

  const faltan = useMemo(() => columnasQueFaltan(mapeo), [mapeo]);
  const lectura = useMemo(
    () =>
      filas.length > 0 && mapeo.length > 0 && faltan.length === 0
        ? leerLineasDeCartera(filas, mapeo, fechas)
        : null,
    [filas, mapeo, faltan, fechas],
  );

  /** Un error de la llamada: el 409 del corte vuelve a pedir la fecha; el resto se dice. */
  const decirElFallo = useCallback(
    (e: unknown, porDefecto: string, accion: string) => {
      if (e instanceof ApiError && e.status === 409 && e.code === "SIN_FECHA_DE_CORTE") {
        setFechaDeCorte(null);
      }
      setError(mensajeParaLaPersona(e, { porDefecto, accion }));
    },
    [],
  );

  // La vista previa: el back dice qué contrato toma cada inquilino. Se vuelve a
  // pedir sólo si cambia lo que se lee del archivo.
  useEffect(() => {
    setVista(null);
    if (!lectura || lectura.demasiadas || lectura.lineas.length === 0) return;
    let vigente = true;
    setPidiendo(true);
    contractsApi.migracion
      .carteraPorFactura(lectura.lineas, true)
      .then((r) => {
        if (vigente) setVista(r);
      })
      .catch((e: unknown) => {
        if (vigente) decirElFallo(e, tc("errorVista"), "revisar la cartera");
      })
      .finally(() => {
        if (vigente) setPidiendo(false);
      });
    return () => {
      vigente = false;
    };
    // `decirElFallo` y `tc` cambian de identidad con `t`; lo que dispara es la lectura.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lectura]);

  async function cargar() {
    if (!lectura) return;
    setPidiendo(true);
    setError(null);
    try {
      setCargado(await contractsApi.migracion.carteraPorFactura(lectura.lineas, false));
    } catch (e) {
      decirElFallo(e, tc("errorCargar"), "cargar la cartera");
    } finally {
      setPidiendo(false);
    }
  }

  const resultado = cargado ?? vista;
  const seCargan = resultado?.inquilinos.filter((i) => i.estado === "SE_CARGA" || i.estado === "CARGADO") ?? [];
  const deudaQueSeCarga = seCargan.reduce((total, i) => total + i.deudaCop, 0);
  const paraCargar = vista?.inquilinos.filter((i) => i.estado === "SE_CARGA").length ?? 0;

  return (
    <section
      className="space-y-4 rounded-lg border border-border-faint bg-surface p-6 shadow-sm"
      data-testid="cartera-del-sistema-anterior"
    >
      <div>
        <h2 className="text-sm font-medium text-fg">{tc("titulo")}</h2>
        <p className="mt-1 max-w-2xl text-sm text-fg-muted">
          {tc("descripcion")}
        </p>
        <p className="mt-1 max-w-2xl text-caption text-fg-subtle">{tc("columnas")}</p>
        {fechaDeCorte ? (
          <p className="mt-1 text-caption text-fg-muted">
            {tc("corte", { fecha: diaLegible(fechaDeCorte) })}
          </p>
        ) : null}
      </div>

      {!fechaDeCorte ? (
        <p className="flex items-start gap-2 rounded-md bg-warning-soft p-3 text-sm text-fg" data-testid="cartera-sin-corte">
          <Warning className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          {tc("sinCorte")}
        </p>
      ) : archivo ? (
        <TarjetaDeArchivo
          nombre={archivo.name}
          peso={archivo.size}
          detalle={leyendo ? tc("leyendo") : tc("filas", { n: numero(filas.length) })}
          inputProps={getInputProps()}
          onSubirOtro={open}
          onDescartar={() => {
            setArchivo(null);
            limpiar();
          }}
          ocupado={leyendo || pidiendo || bloqueada}
          testid="archivo-de-la-cartera"
        />
      ) : (
        <ZonaDeArchivo
          rootProps={getRootProps()}
          inputProps={getInputProps()}
          activo={isDragActive}
          bloqueada={bloqueada}
          testid="dropzone-cartera"
          inputTestid="input-cartera"
          titulo={tc("zonaTitulo")}
          detalle={bloqueada ? tc("zonaBloqueada") : tc("zonaDetalle")}
        />
      )}

      {error ? (
        <p className="flex items-start gap-2 rounded-md bg-danger-soft p-3 text-sm text-fg" role="alert">
          <Warning className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          {error}
        </p>
      ) : null}

      {archivo && donde ? (
        <HojaDelLibro donde={donde} frase={fraseDonde} ocupado={leyendo} onElegir={(hoja) => void leer(archivo, hoja)} />
      ) : null}

      {encabezados.length > 0 ? (
        <div className="space-y-2" data-testid="mapeo-cartera">
          <p className="text-sm text-fg">
            {faltan.length > 0
              ? tc("mapeoFalta", { lista: faltan.map((f) => tc(`faltan.${f}`)).join(", ") })
              : tc("mapeoTitulo")}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {CAMPOS_DE_CARTERA.map((campo) => (
              <SelectorDelCampo
                key={campo}
                campo={campo}
                titulo={tc(`campos.${campo}`)}
                ayuda={campo in AYUDAS ? tc(`camposAyuda.${campo}`) : null}
                elegida={mapeo.find((m) => m.campo === campo)?.columna ?? null}
                opciones={encabezadosParaElCampo(encabezados, campo)}
                ariaLabel={tc("mapeoAria", { campo: tc(`campos.${campo}`) })}
                ninguna={tc("mapeoNinguna")}
                elegir={tc("mapeoElegir")}
                onElegir={(columna) => setMapeo((actual) => elegirColumnaDelCampo(actual, campo, columna))}
              />
            ))}
          </div>
        </div>
      ) : null}

      {lectura && lectura.conFechaDeFactura > 0 ? (
        <p className="text-caption text-fg-muted" data-testid="cartera-con-fecha-de-factura">
          {tn("conFechaDeFactura", lectura.conFechaDeFactura)}
        </p>
      ) : null}
      {lectura?.fraseDeFechas ? (
        <p className="text-caption text-fg-muted" data-testid="cartera-fechas">
          {lectura.fraseDeFechas}
        </p>
      ) : null}

      {lectura?.demasiadas ? (
        <p className="flex items-start gap-2 rounded-md bg-warning-soft p-3 text-sm text-fg" data-testid="cartera-demasiadas">
          <Warning className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          {tc("demasiadas", { n: numero(lectura.mandables), max: numero(MAX_LINEAS_DE_CARTERA) })}
        </p>
      ) : null}

      {lectura && lectura.problemas.length > 0 ? (
        <div className="space-y-1" data-testid="cartera-sin-enviar">
          <p className="text-sm font-medium text-fg">{tn("sinEnviarTitulo", lectura.problemas.length)}</p>
          <ul className="space-y-0.5 text-caption text-fg-muted">
            {lectura.problemas.slice(0, MAX_PROBLEMAS_A_LA_VISTA).map((p, i) => (
              <li key={i}>
                {p.fila === null
                  ? tc("sinEnviarItemSinNumero", { motivo: p.motivo })
                  : tc("sinEnviarItem", { fila: p.fila, motivo: p.motivo })}
              </li>
            ))}
          </ul>
          {lectura.problemas.length > MAX_PROBLEMAS_A_LA_VISTA ? (
            <p className="text-caption text-fg-muted">
              {tc("verMas", { max: MAX_PROBLEMAS_A_LA_VISTA, n: numero(lectura.problemas.length) })}
            </p>
          ) : null}
        </div>
      ) : null}

      {pidiendo && !resultado ? (
        <p className="text-sm text-fg-muted" role="status">
          {tc("buscando")}
        </p>
      ) : null}

      {resultado ? (
        <div className="space-y-3" data-testid="vista-de-la-cartera">
          {cargado ? (
            <p className="flex items-start gap-2 rounded-md bg-success-soft p-3 text-sm text-fg" data-testid="cartera-cargada">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-success" weight="fill" />
              {tn("cargada", seCargan.length, { deuda: formatCurrency(deudaQueSeCarga) })}
            </p>
          ) : (
            <div className="space-y-1" data-testid="resumen-de-la-cartera">
              <p className="text-sm text-fg">
                {tn("resumen", resultado.totales.conContrato, { deuda: formatCurrency(resultado.totales.deudaCop) })}
                {resultado.totales.aFavorCop > 0
                  ? tc("resumenAFavor", { monto: formatCurrency(resultado.totales.aFavorCop) })
                  : ""}
                {resultado.totales.sinContrato > 0
                  ? tc("resumenSinContrato", { n: numero(resultado.totales.sinContrato) })
                  : ""}
              </p>
              <p className="text-caption text-fg-muted">
                {tc("resumenLineas", {
                  validas: numero(resultado.totales.lineasValidas),
                  recibidas: numero(resultado.totales.lineasRecibidas),
                })}
              </p>
            </div>
          )}

          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tc("tabla.documento")}</TableHead>
                  <TableHead>{tc("tabla.inquilino")}</TableHead>
                  <TableHead>{tc("tabla.contrato")}</TableHead>
                  <TableHead className="text-right">{tc("tabla.lineas")}</TableHead>
                  <TableHead>{tc("tabla.desde")}</TableHead>
                  <TableHead className="text-right">{tc("tabla.deuda")}</TableHead>
                  <TableHead className="text-right">{tc("tabla.aFavor")}</TableHead>
                  <TableHead>{tc("tabla.queSePasa")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resultado.inquilinos.slice(0, MAX_INQUILINOS_A_LA_VISTA).map((i) => (
                  <TableRow key={i.documento} data-testid={`inquilino-${i.documento}`}>
                    <TableCell className="font-mono text-caption">{i.documento}</TableCell>
                    <TableCell>{i.contrato?.inquilino ?? i.nombre ?? "—"}</TableCell>
                    <TableCell className="text-caption text-fg-muted">
                      {i.contrato ? (
                        <>
                          #{i.contrato.numero}
                          {i.contrato.inmueble ? ` · ${i.contrato.inmueble}` : ""}
                          {i.otrosContratos > 0 ? ` (${tc("contratoConMas", { n: i.otrosContratos })})` : ""}
                        </>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{numero(i.lineas)}</TableCell>
                    <TableCell className="font-mono text-caption tabular-nums">
                      {i.desde ? diaLegible(i.desde) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatCurrency(i.deudaCop)}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {i.aFavorCop > 0 ? formatCurrency(i.aFavorCop) : "—"}
                    </TableCell>
                    <TableCell className="text-caption">
                      <span className={ESTADOS_SIN_ALARMA.has(i.estado) ? "text-fg" : "text-warning"}>
                        {ESTADOS_CONOCIDOS.has(i.estado) ? tc(`estado.${i.estado}`) : tc("estado.otro")}
                      </span>
                      {i.aFavorCop > 0 && i.contrato ? (
                        <span className="block text-fg-muted">{tc("aFavorNota")}</span>
                      ) : null}
                      {i.motivo ? <span className="block text-fg-muted">{i.motivo}</span> : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {resultado.inquilinos.length > MAX_INQUILINOS_A_LA_VISTA ? (
            <p className="text-caption text-fg-muted">
              {tc("verMas", { max: MAX_INQUILINOS_A_LA_VISTA, n: numero(resultado.inquilinos.length) })}
            </p>
          ) : null}

          {resultado.lineasConProblema.length > 0 ? (
            <div className="space-y-1" data-testid="lineas-con-problema">
              <p className="text-sm font-medium text-fg">
                {tn("problemasTitulo", resultado.lineasConProblema.length)}
              </p>
              <ul className="space-y-0.5 text-caption text-fg-muted">
                {resultado.lineasConProblema.slice(0, MAX_PROBLEMAS_A_LA_VISTA).map((p, k) => (
                  <li key={k}>
                    {p.fila === null
                      ? tc("problemasItemSinNumero", { documento: p.documento, motivo: p.motivo })
                      : tc("problemasItem", { fila: p.fila, documento: p.documento, motivo: p.motivo })}
                  </li>
                ))}
              </ul>
              {resultado.lineasConProblema.length > MAX_PROBLEMAS_A_LA_VISTA ? (
                <p className="text-caption text-fg-muted">
                  {tc("verMas", {
                    max: MAX_PROBLEMAS_A_LA_VISTA,
                    n: numero(resultado.lineasConProblema.length),
                  })}
                </p>
              ) : null}
            </div>
          ) : null}

          {!cargado ? (
            <div className="space-y-2">
              <Button
                hideArrow
                disabled={pidiendo || paraCargar === 0}
                onClick={() => void cargar()}
                data-testid="cargar-la-cartera"
              >
                {pidiendo ? tc("cargando") : tn("cargar", paraCargar)}
              </Button>
              <p className="text-caption text-fg-muted">{tc("reemplaza")}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

/** Los campos que llevan una línea de ayuda debajo. */
const AYUDAS: Partial<Record<CampoDeCartera, true>> = {
  fechaVencimiento: true,
  fechaFactura: true,
  valor: true,
};

function SelectorDelCampo({
  campo,
  titulo,
  ayuda,
  elegida,
  opciones,
  ariaLabel,
  ninguna,
  elegir,
  onElegir,
}: {
  campo: CampoDeCartera;
  titulo: string;
  ayuda: string | null;
  elegida: string | null;
  opciones: string[];
  ariaLabel: string;
  ninguna: string;
  elegir: string;
  onElegir: (columna: string | null) => void;
}) {
  return (
    <div className="space-y-1" data-testid={`campo-de-cartera-${campo}`}>
      <span className="block text-caption text-fg">{titulo}</span>
      <Select value={elegida ?? NINGUNA} onValueChange={(v) => onElegir(v === NINGUNA ? null : v)}>
        <SelectTrigger className="w-full" aria-label={ariaLabel}>
          <SelectValue placeholder={elegir} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NINGUNA}>{ninguna}</SelectItem>
          {opciones.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {ayuda ? <span className="block text-caption text-fg-subtle">{ayuda}</span> : null}
    </div>
  );
}
