"use client";

/**
 * 🔴 La cartera que traían los inquilinos (Juan, Portofino, 15-10-2026: «la
 * migración debería traer la cartera antigua»; Nico eligió «Saldo anterior por
 * inquilino»).
 *
 * Del balance de prueba por tercero A LA FECHA DE CORTE se toma la cuenta de
 * cartera y, por documento, lo que debía cada inquilino. Eso entra a su
 * contrato como «Saldo del sistema anterior»: una cuota con mora desde el
 * corte, como la columna «Saldo» del archivo de contratos (Nico, 10-10). La
 * apertura contable (al 31 de diciembre) no sirve para esto: es otra fecha.
 *
 * Nada se escribe hasta «Cargar»: antes, la vista previa dice qué contrato
 * toma cada saldo y cuáles no tienen contrato.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { CheckCircle, Warning } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { contractsApi, type CargaDeSaldosAnteriores } from "@/lib/api/contracts.service";
import { mensajeParaLaPersona } from "@/lib/errores/traductor-de-errores";
import {
  COLUMNAS_DE_BALANCE,
  formaDelSaldo,
  leerRenglones,
} from "@/lib/migracion/balance-de-apertura";
import {
  cuentasDeCartera,
  cuentasSugeridas,
  saldosPorDocumento,
} from "@/lib/migracion/cartera-del-sistema-anterior";
import { mapearColumnas, remapear, type MapeoDeColumna } from "@/lib/migracion/columnas-de-tercero";
import { formatCurrency } from "@/lib/format";
import { diaLegible } from "@/lib/mandato/textos";

import { fraseDelArchivoVacio, leerTablaDelArchivo, type HojaYEncabezado } from "./encabezado-del-archivo";
import { HojaDelLibro } from "./ImportarCuentas";

const IGNORAR = "__ignorar__";
const numero = (n: number) => n.toLocaleString("es-CO");
const MAX_FILAS_A_LA_VISTA = 50;

const NOMBRE_DEL_ESTADO: Record<CargaDeSaldosAnteriores["filas"][number]["estado"], string> = {
  SE_CARGA: "Se carga",
  CARGADO: "Cargado",
  IGUAL: "Ya estaba",
  CON_PAGOS: "Ya tiene pagos",
  SIN_CONTRATO: "Sin contrato",
  NO_SE_SABE: "No se pudo revisar",
};

export function CarteraDelSistemaAnterior() {
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
  const [mapeo, setMapeo] = useState<MapeoDeColumna[]>([]);
  const [donde, setDonde] = useState<HojaYEncabezado | null>(null);
  const [fraseDonde, setFraseDonde] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elegidas, setElegidas] = useState<Set<string> | null>(null);
  const [vista, setVista] = useState<CargaDeSaldosAnteriores | null>(null);
  const [pidiendo, setPidiendo] = useState(false);
  const [cargado, setCargado] = useState<CargaDeSaldosAnteriores | null>(null);

  const leer = useCallback(async (elArchivo: File, hoja?: string) => {
    setError(null);
    setVista(null);
    setCargado(null);
    setElegidas(null);
    setLeyendo(true);
    try {
      const r = await leerTablaDelArchivo(elArchivo, COLUMNAS_DE_BALANCE, hoja);
      setFilas(r.rows);
      setEncabezados(r.headers);
      setMapeo(mapearColumnas(COLUMNAS_DE_BALANCE, r.headers));
      setDonde(r.donde);
      setFraseDonde(r.frase);
      if (r.vacio) setError(fraseDelArchivoVacio(elArchivo.name, r.vacio, "saldos"));
    } catch (e) {
      setFilas([]);
      setEncabezados([]);
      setMapeo([]);
      setError(mensajeParaLaPersona(e, { porDefecto: "No pudimos leer el archivo. ¿Es Excel o CSV?" }));
    } finally {
      setLeyendo(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: (aceptados: File[]) => {
      const elegido = aceptados[0];
      if (!elegido) return;
      setArchivo(elegido);
      void leer(elegido);
    },
    maxFiles: 1,
    multiple: false,
  });

  const forma = useMemo(() => formaDelSaldo(mapeo), [mapeo]);
  const conCodigoYDocumento =
    mapeo.some((m) => m.campo === "codigoCuenta") && mapeo.some((m) => m.campo === "terceroDocumento");
  const renglones = useMemo(
    () => (filas.length > 0 && conCodigoYDocumento ? leerRenglones(filas, mapeo) : []),
    [filas, mapeo, conCodigoYDocumento],
  );
  const cuentas = useMemo(() => (forma ? cuentasDeCartera(renglones, forma) : []), [renglones, forma]);
  // La sugerencia mientras la persona no toque nada.
  const codigos = useMemo(() => elegidas ?? new Set(cuentasSugeridas(cuentas)), [elegidas, cuentas]);
  const saldos = useMemo(
    () => (forma ? saldosPorDocumento(renglones, forma, codigos) : []),
    [renglones, forma, codigos],
  );
  const claveDeLosSaldos = saldos.map((s) => `${s.documento}:${s.saldoCop}`).join("|");

  // La vista previa: qué contrato toma cada saldo. Se vuelve a pedir si cambian.
  useEffect(() => {
    setVista(null);
    if (saldos.length === 0) return;
    let vigente = true;
    setPidiendo(true);
    contractsApi.migracion
      .saldosDelSistemaAnterior(saldos, true)
      .then((r) => {
        if (vigente) setVista(r);
      })
      .catch((e: unknown) => {
        if (vigente) {
          setError(mensajeParaLaPersona(e, { porDefecto: "No pudimos buscar los contratos.", accion: "revisar la cartera" }));
        }
      })
      .finally(() => {
        if (vigente) setPidiendo(false);
      });
    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveDeLosSaldos]);

  async function cargar() {
    setPidiendo(true);
    setError(null);
    try {
      setCargado(await contractsApi.migracion.saldosDelSistemaAnterior(saldos, false));
    } catch (e) {
      setError(mensajeParaLaPersona(e, { porDefecto: "No se pudo cargar la cartera.", accion: "cargar la cartera" }));
    } finally {
      setPidiendo(false);
    }
  }

  const resultado = cargado ?? vista;
  const seCargan = resultado?.filas.filter((f) => f.estado === "SE_CARGA" || f.estado === "CARGADO") ?? [];
  const totalQueSeCarga = seCargan.reduce((t, f) => t + f.saldoCop, 0);

  return (
    <section
      className="space-y-4 rounded-lg border border-border-faint bg-surface p-6 shadow-sm"
      data-testid="cartera-del-sistema-anterior"
    >
      <div>
        <h2 className="text-sm font-medium text-fg">La cartera que traían los inquilinos</h2>
        <p className="mt-1 max-w-2xl text-sm text-fg-muted">
          Sube el balance de prueba por tercero{" "}
          {fechaDeCorte ? (
            <>
              <strong className="text-fg">a la fecha de corte ({diaLegible(fechaDeCorte)})</strong>
            </>
          ) : (
            "a la fecha de corte"
          )}
          . De la cuenta de cartera sale lo que debía cada inquilino, y entra a su contrato como
          «Saldo del sistema anterior», con mora desde el corte. El balance de los saldos
          iniciales (al 31 de diciembre) no sirve para esto: es otra fecha.
        </p>
      </div>

      {!fechaDeCorte ? (
        <p className="flex items-start gap-2 rounded-md bg-warning-soft p-3 text-sm text-fg" data-testid="cartera-sin-corte">
          <Warning className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          Primero la fecha de corte (paso Contratos): la cartera es lo que cada inquilino debía ese día.
        </p>
      ) : archivo ? (
        <TarjetaDeArchivo
          nombre={archivo.name}
          peso={archivo.size}
          detalle={leyendo ? "Leyendo…" : `${numero(filas.length)} renglones`}
          inputProps={getInputProps()}
          onSubirOtro={open}
          onDescartar={() => {
            setArchivo(null);
            setFilas([]);
            setEncabezados([]);
            setMapeo([]);
            setVista(null);
            setCargado(null);
            setError(null);
          }}
          ocupado={leyendo || pidiendo}
          testid="archivo-de-la-cartera"
        />
      ) : (
        <ZonaDeArchivo
          rootProps={getRootProps()}
          inputProps={getInputProps()}
          activo={isDragActive}
          testid="dropzone-cartera"
          inputTestid="input-cartera"
          titulo="Arrastra el balance por tercero a la fecha de corte"
          detalle="Excel o CSV, tal como lo exporta tu sistema."
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

      {encabezados.length > 0 && (!conCodigoYDocumento || !forma) ? (
        <div className="space-y-2" data-testid="mapeo-cartera">
          <p className="text-sm text-fg">
            Señala la cuenta, el documento del tercero y de dónde sale el saldo («Saldo final», o
            «Saldo débito» y «Saldo crédito»).
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {mapeo.map((m) => (
              <label key={m.columna} className="flex items-center justify-between gap-2 text-caption text-fg-muted">
                <span className="truncate font-mono">{m.columna}</span>
                <Select
                  value={m.campo ?? IGNORAR}
                  onValueChange={(v) => setMapeo((actual) => remapear(actual, m.columna, v === IGNORAR ? null : v))}
                >
                  <SelectTrigger className="w-48" aria-label={`Qué es la columna ${m.columna}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={IGNORAR}>Ignorar</SelectItem>
                    {COLUMNAS_DE_BALANCE.map((c) => (
                      <SelectItem key={c.campo} value={c.campo}>
                        {c.titulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {cuentas.length > 0 ? (
        <fieldset className="space-y-2" data-testid="cuentas-de-cartera">
          <legend className="text-sm font-medium text-fg">Cuál es la cuenta de cartera</legend>
          {cuentas.map((c) => (
            <label key={c.codigo} className="flex items-center gap-2 text-sm text-fg">
              <Checkbox
                checked={codigos.has(c.codigo)}
                disabled={cargado !== null}
                onCheckedChange={(v) => {
                  const siguiente = new Set(codigos);
                  if (v === true) siguiente.add(c.codigo);
                  else siguiente.delete(c.codigo);
                  setElegidas(siguiente);
                }}
                data-testid={`cuenta-de-cartera-${c.codigo}`}
              />
              <span className="font-mono">{c.codigo}</span>
              <span className="text-fg-muted">
                {c.nombre || "Sin nombre"} · {numero(c.terceros)} {c.terceros === 1 ? "tercero" : "terceros"} ·{" "}
                {formatCurrency(c.totalCentavos / 100)}
              </span>
            </label>
          ))}
        </fieldset>
      ) : encabezados.length > 0 && conCodigoYDocumento && forma ? (
        <p className="text-sm text-fg-muted" data-testid="cartera-sin-cuentas-13">
          Este balance no trae cuentas por cobrar (las que empiezan por 13) con terceros.
        </p>
      ) : null}

      {pidiendo && !resultado ? (
        <p className="text-sm text-fg-muted" role="status">
          Buscando el contrato de cada inquilino…
        </p>
      ) : null}

      {resultado ? (
        <div className="space-y-3" data-testid="vista-de-la-cartera">
          {cargado ? (
            <p className="flex items-start gap-2 rounded-md bg-success-soft p-3 text-sm text-fg" data-testid="cartera-cargada">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-success" weight="fill" />
              Listo: {numero(seCargan.length)} {seCargan.length === 1 ? "inquilino quedó" : "inquilinos quedaron"} con su
              saldo del sistema anterior ({formatCurrency(totalQueSeCarga)}). Ya se ve en Cartera y en el estado de
              cuenta de cada contrato.
            </p>
          ) : (
            <p className="text-sm text-fg">
              <strong>{numero(seCargan.length)}</strong>{" "}
              {seCargan.length === 1 ? "inquilino toma" : "inquilinos toman"} su saldo ·{" "}
              <span className="font-mono tabular-nums">{formatCurrency(totalQueSeCarga)}</span>
              {resultado.totales.sinContrato > 0
                ? ` · ${numero(resultado.totales.sinContrato)} sin contrato en Leasefy (no se cargan)`
                : ""}
            </p>
          )}
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Documento</TableHead>
                  <TableHead>Inquilino</TableHead>
                  <TableHead>Contrato</TableHead>
                  <TableHead className="text-right">Debía al corte</TableHead>
                  <TableHead>Qué pasa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resultado.filas.slice(0, MAX_FILAS_A_LA_VISTA).map((f) => (
                  <TableRow key={f.documento} data-testid={`saldo-${f.documento}`}>
                    <TableCell className="font-mono text-caption">{f.documento}</TableCell>
                    <TableCell>{f.contrato?.inquilino ?? f.nombre ?? "—"}</TableCell>
                    <TableCell className="text-caption text-fg-muted">
                      {f.contrato ? (
                        <>
                          #{f.contrato.numero}
                          {f.contrato.inmueble ? ` · ${f.contrato.inmueble}` : ""}
                          {f.otrosContratos > 0 ? ` (tiene ${f.otrosContratos} más: va al vigente)` : ""}
                        </>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatCurrency(f.saldoCop)}</TableCell>
                    <TableCell className="text-caption">
                      <span className={f.estado === "SIN_CONTRATO" || f.estado === "CON_PAGOS" ? "text-warning" : "text-fg"}>
                        {NOMBRE_DEL_ESTADO[f.estado]}
                      </span>
                      {f.saldoCop < 0 && f.contrato ? (
                        <span className="block text-fg-muted">A favor del inquilino: va a su saldo a favor.</span>
                      ) : null}
                      {f.motivo ? <span className="block text-fg-muted">{f.motivo}</span> : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {resultado.filas.length > MAX_FILAS_A_LA_VISTA ? (
            <p className="text-caption text-fg-muted">
              Se muestran {MAX_FILAS_A_LA_VISTA} de {numero(resultado.filas.length)}.
            </p>
          ) : null}
          {!cargado ? (
            <Button
              hideArrow
              disabled={pidiendo || seCargan.length === 0}
              onClick={() => void cargar()}
              data-testid="cargar-la-cartera"
            >
              {pidiendo ? "Cargando…" : `Cargar el saldo de ${numero(seCargan.length)} ${seCargan.length === 1 ? "inquilino" : "inquilinos"}`}
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
