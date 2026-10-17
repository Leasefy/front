"use client";

/**
 * «Subir el balance»: los saldos iniciales desde el archivo del sistema
 * anterior.
 *
 * 🔴 8.ª tanda de la migración de Portofino (14-10-2026). Nico eligió «saldos
 * al cierre + movimientos del año»: el balance de prueba POR TERCERO al
 * cierre del año anterior es la apertura. Esto lo lee, deja ver qué es cada
 * columna, busca a cada tercero por su documento y dice todo lo que apartó y
 * por qué. «Usar estas líneas» llena el formulario de siempre: el cuadre y el
 * registro siguen siendo los de `AsientoDeApertura`.
 *
 * Las reglas viven en `@/lib/migracion/balance-de-apertura.ts` (puras, con
 * test). Acá sólo se pintan.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useDropzone } from "react-dropzone";
import { CheckCircle, Info, Warning, X } from "@phosphor-icons/react";

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
import {
  contabilidadApi,
  type CuentaPuc,
  type TerceroDelBalance,
} from "@/lib/api/contabilidad.service";
import { mensajeParaLaPersona } from "@/lib/errores/traductor-de-errores";
import {
  fraseDelDescuadre,
  totalesDeApertura,
  type FilaDeApertura,
} from "@/lib/migracion/asiento-de-apertura";
import {
  armarApertura,
  COLUMNAS_DE_BALANCE,
  documentosDelBalance,
  formaDelSaldo,
  leerRenglones,
  sugerirCreditoEnPositivo,
  type PersonaDelBalance,
} from "@/lib/migracion/balance-de-apertura";
import {
  mapearColumnas,
  remapear,
  type MapeoDeColumna,
} from "@/lib/migracion/columnas-de-tercero";
import { porQueDelMapeo } from "@/lib/migracion/por-que-del-mapeo";
import { formatCurrencyEnDocumento } from "@/lib/format";

import {
  fraseDelArchivoVacio,
  leerTablaDelArchivo,
  type HojaYEncabezado,
} from "./encabezado-del-archivo";
import { HojaDelLibro } from "./ImportarCuentas";
import { mensajeDeContabilidad } from "./contabilidad-errores";
import { localeDeLasCifras } from "@/lib/i18n/idioma-de-las-cifras";

const IGNORAR = "__ignorar__";

/** `MAX_LINEAS_POR_ASIENTO` del back: un asiento admite hasta 5.000 líneas. */
export const MAX_LINEAS_DE_LA_APERTURA = 5_000;

const plata = (valor: number) => formatCurrencyEnDocumento(valor, false);
const numero = (n: number) => n.toLocaleString(localeDeLasCifras());
/** «1 inquilino no tiene» / «3 inquilinos no tienen». */
const segun = (n: number, uno: string, varios: string) => `${numero(n)} ${n === 1 ? uno : varios}`;

/** «Ana, Pedro y 3 más». */
function algunos(personas: readonly PersonaDelBalance[], cuantos = 4): string {
  const nombres = personas.map((p) => (p.nombre ? `${p.nombre} (${p.documento})` : p.documento));
  if (nombres.length <= cuantos) return nombres.join(", ");
  return `${nombres.slice(0, cuantos).join(", ")} y ${numero(nombres.length - cuantos)} más`;
}

export function BalanceDeApertura({
  cuentas,
  archivoInicial = null,
  onUsar,
  onCancelar,
}: {
  /** Las imputables y activas: las únicas que reciben saldos. */
  cuentas: CuentaPuc[];
  /** El archivo que «Sube tu archivo contable» reconoció como balance. */
  archivoInicial?: File | null;
  onUsar: (filas: FilaDeApertura[], archivo: string) => void;
  onCancelar: () => void;
}) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [filas, setFilas] = useState<Record<string, unknown>[]>([]);
  const [encabezados, setEncabezados] = useState<string[]>([]);
  const [mapeo, setMapeo] = useState<MapeoDeColumna[]>([]);
  const [donde, setDonde] = useState<HojaYEncabezado | null>(null);
  const [fraseDonde, setFraseDonde] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** `null` = la sugerencia (la convención con la que el balance cuadra). */
  const [creditoElegido, setCreditoElegido] = useState<boolean | null>(null);
  const [terceros, setTerceros] = useState<{ clave: string; lista: TerceroDelBalance[] } | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [errorDeTerceros, setErrorDeTerceros] = useState<string | null>(null);
  const [sinTerceros, setSinTerceros] = useState(false);
  const [intento, setIntento] = useState(0);

  const leer = useCallback(async (elArchivo: File, hoja?: string) => {
    setError(null);
    setCreditoElegido(null);
    setSinTerceros(false);
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
      setDonde(null);
      setFraseDonde(null);
      setError(mensajeParaLaPersona(e, { porDefecto: "No pudimos leer el archivo. ¿Es Excel o CSV?" }));
    } finally {
      setLeyendo(false);
    }
  }, []);

  const onDrop = useCallback(
    async (aceptados: File[]) => {
      const elegido = aceptados[0];
      if (!elegido) return;
      setArchivo(elegido);
      await leer(elegido);
    },
    [leer],
  );
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    maxFiles: 1,
    multiple: false,
  });

  const archivoYaLeido = useRef<File | null>(null);
  useEffect(() => {
    if (!archivoInicial || archivoYaLeido.current === archivoInicial) return;
    archivoYaLeido.current = archivoInicial;
    void onDrop([archivoInicial]);
  }, [archivoInicial, onDrop]);

  const forma = useMemo(() => formaDelSaldo(mapeo), [mapeo]);
  const conCodigo = mapeo.some((m) => m.campo === "codigoCuenta");
  const renglones = useMemo(
    () => (filas.length > 0 && conCodigo ? leerRenglones(filas, mapeo) : []),
    [filas, mapeo, conCodigo],
  );
  const sugerido = useMemo(
    () => sugerirCreditoEnPositivo(renglones, cuentas, forma),
    [renglones, cuentas, forma],
  );
  const creditoEnPositivo = creditoElegido ?? sugerido;

  /*
   * Los terceros, por documento, al back: con las mismas reglas con que el
   * libro diario los enlaza. Se vuelve a preguntar si cambia la columna del
   * documento (cambia la lista).
   */
  const documentos = useMemo(() => documentosDelBalance(renglones), [renglones]);
  const claveDeDocumentos = documentos.join("|");
  useEffect(() => {
    if (!forma || renglones.length === 0) return;
    if (documentos.length === 0) {
      setTerceros({ clave: "", lista: [] });
      return;
    }
    let vigente = true;
    setBuscando(true);
    setErrorDeTerceros(null);
    contabilidadApi.migracion
      .tercerosPorDocumento(documentos)
      .then((lista) => {
        if (vigente) setTerceros({ clave: claveDeDocumentos, lista });
      })
      .catch((e: unknown) => {
        if (vigente) {
          setErrorDeTerceros(
            mensajeDeContabilidad(e, "No pudimos buscar a los propietarios e inquilinos por su documento."),
          );
        }
      })
      .finally(() => {
        if (vigente) setBuscando(false);
      });
    return () => {
      vigente = false;
    };
    // `documentos` cambia con `claveDeDocumentos`; `intento` es «Reintentar».
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveDeDocumentos, forma, renglones.length, intento]);

  const tercerosListos =
    sinTerceros ? [] : terceros && terceros.clave === claveDeDocumentos ? terceros.lista : null;
  const resultado = useMemo(
    () =>
      forma && tercerosListos
        ? armarApertura(renglones, cuentas, forma, tercerosListos, { creditoEnPositivo })
        : null,
    [forma, tercerosListos, renglones, cuentas, creditoEnPositivo],
  );
  const totales = resultado ? totalesDeApertura(resultado.filas) : null;
  const demasiadas = (resultado?.filas.length ?? 0) > MAX_LINEAS_DE_LA_APERTURA;

  const soltar = () => {
    setArchivo(null);
    setFilas([]);
    setEncabezados([]);
    setMapeo([]);
    setDonde(null);
    setFraseDonde(null);
    setError(null);
    setTerceros(null);
    setErrorDeTerceros(null);
  };

  return (
    <section
      className="space-y-4 rounded-lg border border-border-faint bg-surface-muted/40 p-5"
      data-testid="balance-de-apertura"
      aria-labelledby="balance-titulo"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 id="balance-titulo" className="text-sm font-medium text-fg">
            Subir el balance
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-fg-muted">
            El balance de prueba por tercero de tu sistema anterior, al cierre del
            año anterior (por ejemplo, al 31 de diciembre). Tomamos el saldo de
            cada cuenta que recibe movimientos y, en cartera y terceros, lo
            ponemos a nombre de cada propietario o inquilino por su documento.
            Nada se registra hasta que revises y toques «Registrar».
          </p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          hideArrow
          onClick={onCancelar}
          aria-label="Cerrar «Subir el balance»"
          data-testid="balance-cerrar"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {archivo ? (
        <TarjetaDeArchivo
          nombre={archivo.name}
          peso={archivo.size}
          detalle={leyendo ? "Leyendo…" : `${numero(filas.length)} renglones`}
          inputProps={getInputProps()}
          onSubirOtro={open}
          onDescartar={soltar}
          ocupado={leyendo || buscando}
          testid="archivo-del-balance"
        />
      ) : (
        <ZonaDeArchivo
          rootProps={getRootProps()}
          inputProps={getInputProps()}
          activo={isDragActive}
          testid="dropzone-balance"
          inputTestid="input-balance"
          titulo="Arrastra el balance o haz clic para elegirlo"
          detalle="Excel o CSV, tal como lo exporta tu sistema."
        />
      )}

      {error ? (
        <div className="flex items-start gap-2 rounded-md bg-danger-soft p-3" role="alert">
          <Warning className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          <p className="text-sm text-fg">{error}</p>
        </div>
      ) : null}

      {archivo && donde ? (
        <HojaDelLibro
          donde={donde}
          frase={fraseDonde}
          ocupado={leyendo}
          onElegir={(hoja) => void leer(archivo, hoja)}
        />
      ) : null}

      {encabezados.length > 0 ? (
        <div data-testid="mapeo-balance">
          <p className="text-sm font-medium text-fg">Qué es cada columna</p>
          <div className="mt-2 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Columna del archivo</TableHead>
                  <TableHead>Es…</TableHead>
                  <TableHead>Por qué</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mapeo.map((m) => (
                  <TableRow key={m.columna}>
                    <TableCell className="font-mono text-caption">{m.columna}</TableCell>
                    <TableCell>
                      <Select
                        value={m.campo ?? IGNORAR}
                        onValueChange={(v) =>
                          setMapeo((actual) => remapear(actual, m.columna, v === IGNORAR ? null : v))
                        }
                      >
                        <SelectTrigger
                          className="w-56"
                          aria-label={`Qué es la columna ${m.columna}`}
                          data-testid={`balance-mapeo-${m.columna}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={IGNORAR}>Ignorar</SelectItem>
                          {COLUMNAS_DE_BALANCE.map((c) => (
                            <SelectItem key={c.campo} value={c.campo}>
                              {c.titulo}
                              {c.obligatoria ? " *" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-caption text-fg-muted">{porQueDelMapeo(m)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : null}

      {encabezados.length > 0 && !conCodigo ? (
        <Aviso tono="mal" testid="balance-sin-codigo">
          Falta la columna del código de cuenta: señálala arriba.
        </Aviso>
      ) : null}
      {encabezados.length > 0 && conCodigo && !forma ? (
        <Aviso tono="mal" testid="balance-sin-saldo">
          Falta de dónde sale el saldo: señala «Saldo final», o «Saldo débito» y
          «Saldo crédito», o «Saldo anterior» con «Débitos del período» y
          «Créditos del período».
        </Aviso>
      ) : null}

      {forma && forma !== "debito-y-credito" && renglones.length > 0 ? (
        <label className="flex items-start gap-2 text-sm text-fg" data-testid="balance-signo">
          <Checkbox
            checked={creditoEnPositivo}
            onCheckedChange={(v) => setCreditoElegido(v === true)}
            className="mt-0.5"
            data-testid="balance-credito-en-positivo"
          />
          <span>
            Los saldos crédito vienen en positivo (según la naturaleza de la cuenta)
            <span className="block text-caption text-fg-muted">
              {creditoEnPositivo === sugerido
                ? "Así lo sugerimos: con esta forma de leer el signo, el balance cuadra."
                : "Ojo: con la otra forma de leer el signo el balance cuadra mejor."}
            </span>
          </span>
        </label>
      ) : null}

      {buscando ? (
        <p className="text-sm text-fg-muted" role="status">
          Buscando a cada propietario e inquilino por su documento…
        </p>
      ) : null}
      {errorDeTerceros && !sinTerceros ? (
        <div className="flex flex-wrap items-start gap-2 rounded-md bg-warning-soft p-3" role="alert">
          <Warning className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <p className="min-w-0 flex-1 text-sm text-fg">{errorDeTerceros}</p>
          <Button size="sm" variant="outline" hideArrow onClick={() => setIntento((n) => n + 1)}>
            Reintentar
          </Button>
          <Button size="sm" variant="ghost" hideArrow onClick={() => setSinTerceros(true)}>
            Seguir sin nombres
          </Button>
        </div>
      ) : null}

      {resultado && totales ? (
        <div className="space-y-3 rounded-md bg-surface p-4" data-testid="balance-resumen">
          <p className="text-sm text-fg">
            <span className="font-medium">
              {numero(resultado.filas.length)} {resultado.filas.length === 1 ? "línea" : "líneas"} para los saldos iniciales
            </span>{" "}
            · débitos <span className="font-mono tabular-nums">{plata(totales.debitos)}</span> · créditos{" "}
            <span className="font-mono tabular-nums">{plata(totales.creditos)}</span>
          </p>
          {totales.diferencia === 0 && totales.debitos > 0 ? (
            <Aviso tono="bien" testid="balance-cuadra">
              Cuadra: los débitos son iguales a los créditos.
            </Aviso>
          ) : (
            <Aviso tono="mal" testid="balance-no-cuadra">
              {fraseDelDescuadre(totales) ?? "No cuadra."} Revisa la casilla del signo y
              las cuentas que no entraron.
            </Aviso>
          )}

          <ul className="space-y-2 text-sm text-fg-muted" data-testid="balance-lo-que-paso">
            {resultado.totales + resultado.subtotales > 0 ? (
              <Punto>
                Apartamos {segun(resultado.totales, "renglón de totales de grupo", "renglones de totales de grupo")}
                {resultado.subtotales > 0
                  ? ` y ${segun(resultado.subtotales, "subtotal de cuenta", "subtotales de cuenta")}`
                  : ""}
                : ya están sumados en su detalle.
              </Punto>
            ) : null}
            {resultado.terceros.conFicha > 0 ? (
              <Punto>
                {segun(
                  resultado.terceros.conFicha,
                  "propietario o inquilino queda",
                  "propietarios e inquilinos quedan",
                )}{" "}
                con su saldo a su nombre.
              </Punto>
            ) : null}
            {resultado.sumadas.length > 0 ? (
              <Punto testid="balance-sumadas">
                {numero(resultado.sumadas.length)}{" "}
                {resultado.sumadas.length === 1 ? "subcuenta de tu sistema que acá no existe se sumó" : "subcuentas de tu sistema que acá no existen se sumaron"}{" "}
                a su cuenta del plan:{" "}
                {resultado.sumadas
                  .slice(0, 3)
                  .map((s) => `${s.codigo} → ${s.cuenta}`)
                  .join("; ")}
                {resultado.sumadas.length > 3 ? ` y ${numero(resultado.sumadas.length - 3)} más` : ""}.
              </Punto>
            ) : null}
            {resultado.terceros.sinCuenta.length > 0 ? (
              <Punto testid="balance-sin-cuenta">
                {segun(resultado.terceros.sinCuenta.length, "inquilino no tiene", "inquilinos no tienen")} cuenta del
                portal y la contabilidad no tiene a quién imputarle: su saldo entra en la cuenta, sin nombre:{" "}
                {algunos(resultado.terceros.sinCuenta)}.
              </Punto>
            ) : null}
            {resultado.terceros.sinContrato.length > 0 ? (
              <Punto testid="balance-sin-contrato">
                {segun(resultado.terceros.sinContrato.length, "inquilino todavía no tiene", "inquilinos todavía no tienen")}{" "}
                contrato en Leasefy y la contabilidad imputa al inquilino de un contrato: su saldo entra en la cuenta,
                sin nombre. Si migras los contratos antes, entra a su nombre: {algunos(resultado.terceros.sinContrato)}.
              </Punto>
            ) : null}
            {resultado.terceros.noEstan.length > 0 ? (
              <Punto testid="balance-no-estan">
                {segun(resultado.terceros.noEstan.length, "tercero no está", "terceros no están")} en Leasefy
                (proveedores, bancos…): su saldo entra en la cuenta, sin nombre: {algunos(resultado.terceros.noEstan)}.
              </Punto>
            ) : null}
            {resultado.terceros.varios.length > 0 ? (
              <Punto testid="balance-varios">
                {segun(resultado.terceros.varios.length, "documento es", "documentos son")} de dos fichas a la vez y no
                adivinamos cuál; su saldo entra sin nombre: {algunos(resultado.terceros.varios)}.
              </Punto>
            ) : null}
            {resultado.enCero > 0 ? (
              <Punto>{segun(resultado.enCero, "saldo en cero no entra", "saldos en cero no entran")}.</Punto>
            ) : null}
          </ul>

          {resultado.fueraDelPlan.length > 0 ? (
            <div className="rounded-md bg-warning-soft p-3" data-testid="balance-fuera-del-plan">
              <p className="text-sm font-medium text-fg">
                {numero(resultado.fueraDelPlan.length)}{" "}
                {resultado.fueraDelPlan.length === 1 ? "cuenta con saldo no entra" : "cuentas con saldo no entran"}
              </p>
              <p className="mt-1 text-sm text-fg-muted">
                No están en tu plan de cuentas, o en tu plan tienen subcuentas y el saldo no dice a cuál va. Agrégalas
                (o corrige el código en el archivo) y vuelve a subirlo: sin ellas, la apertura no cuadra.
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                {resultado.fueraDelPlan.slice(0, 8).map((f) => (
                  <li key={f.codigo} className="flex flex-wrap gap-x-2">
                    <span className="font-mono">{f.codigo}</span>
                    <span className="text-fg-muted">{f.nombre || "Sin nombre"}</span>
                    <span className="font-mono tabular-nums">
                      {plata(Math.abs(f.saldo))} {f.saldo > 0 ? "débito" : "crédito"}
                    </span>
                    <span className="text-caption text-fg-muted">
                      {f.motivo === "tiene-subcuentas" ? "· en tu plan tiene subcuentas" : "· no está en tu plan"}
                    </span>
                  </li>
                ))}
              </ul>
              {resultado.fueraDelPlan.length > 8 ? (
                <p className="mt-1 text-caption text-fg-muted">
                  Y {numero(resultado.fueraDelPlan.length - 8)} más.
                </p>
              ) : null}
            </div>
          ) : null}

          {resultado.ilegibles.length > 0 ? (
            <Aviso tono="mal" testid="balance-ilegibles">
              {segun(
                resultado.ilegibles.length,
                "renglón trae una cifra que no se puede leer y no entra (fila",
                "renglones traen una cifra que no se puede leer y no entran (filas",
              )}{" "}
              {resultado.ilegibles
                .slice(0, 6)
                .map((r) => r.fila)
                .join(", ")}
              {resultado.ilegibles.length > 6 ? "…" : ""}).
            </Aviso>
          ) : null}

          {demasiadas ? (
            <Aviso tono="mal" testid="balance-demasiadas">
              Son {numero(resultado.filas.length)} líneas y un asiento admite hasta{" "}
              {numero(MAX_LINEAS_DE_LA_APERTURA)}. Exporta el balance por tercero sólo de las cuentas de cartera y
              terceros, y registra las demás en otro asiento.
            </Aviso>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              hideArrow
              disabled={resultado.filas.length === 0 || demasiadas}
              onClick={() => onUsar(resultado.filas, archivo?.name ?? "")}
              data-testid="balance-usar"
            >
              Usar estas {numero(resultado.filas.length)} líneas
            </Button>
            <Button variant="ghost" hideArrow onClick={onCancelar}>
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
  testid,
  children,
}: {
  tono: "bien" | "mal";
  testid?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`flex items-start gap-2 rounded-md p-3 ${tono === "bien" ? "bg-success-soft" : "bg-warning-soft"}`}
      data-testid={testid}
    >
      {tono === "bien" ? (
        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-success" weight="fill" />
      ) : (
        <Warning className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      )}
      <p className="text-sm text-fg">{children}</p>
    </div>
  );
}

function Punto({ testid, children }: { testid?: string; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2" data-testid={testid}>
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" />
      <span>{children}</span>
    </li>
  );
}
