"use client";

/**
 * Camino A del paso 5: el asiento de apertura.
 *
 * Es lo que hace cualquier contador al estrenar un sistema: un solo asiento
 * con la fecha de corte y el saldo de cada cuenta —lo que había en bancos,
 * lo que los inquilinos debían, lo que se les debía a los propietarios—. Si
 * cuadra, existe; si no, no. Por eso los totales están siempre a la vista y
 * el botón no se prende hasta que la diferencia sea cero.
 *
 * Las reglas viven en `@/lib/migracion/asiento-de-apertura.ts` (puras, con
 * test). Acá sólo se pintan.
 */

import { fechaLarga } from "@/lib/fechas/fecha-de-la-casa";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle, FileArrowUp, Info, Plus, Warning, X } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
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
import { ApiError } from "@/lib/api/client";
import { generarIdempotencyKey } from "@/lib/contratos/idempotencia";
import {
  contabilidadApi,
  LARGO_MAXIMO_DE_DESCRIPCION,
  type AsientoContable,
  type AsientoRegistrado,
  type CuentaPuc,
} from "@/lib/api/contabilidad.service";
import {
  descripcionSugerida,
  esCuentaDeTerceros,
  esFechaContable,
  filaVacia,
  hoyContable,
  movimientosDeApertura,
  problemasDeApertura,
  puedeEnviarApertura,
  totalesDeApertura,
  fraseDelDescuadre,
  type FilaDeApertura,
  type ProblemaDeApertura,
} from "@/lib/migracion/asiento-de-apertura";
import { formatCurrencyEnDocumento } from "@/lib/format";
import { cierreDelAnioAnterior } from "@/lib/migracion/balance-de-apertura";
import { TablePagination } from "@/components/ui/pagination";
import { PAGE_SIZE_OPTIONS, useTablePagination } from "@/lib/hooks/use-table-pagination";
import { localeDeLasCifras } from "@/lib/i18n/idioma-de-las-cifras";

/** La plata de los saldos: con sus centavos si los trae, nunca redondeada. */
const plataDeLosSaldos = (valor: number) => formatCurrencyEnDocumento(valor, false);
import { CampoDePlata } from "@/components/ui/campo-de-plata";

import { mensajeDeContabilidad } from "./contabilidad-errores";
import { TerceroDeApertura } from "./TerceroDeApertura";
import { CampoDeDia } from "@/components/contabilidad/CampoDeDia";
import { BalanceDeApertura } from "./BalanceDeApertura";

/** Con más líneas que esto el formulario se pagina (un balance trae miles). */
const LINEAS_SIN_PAGINAR = 25;

/** Sentinel: Radix `Select` no admite `value=""`. */
const SIN_CUENTA = "__sin_cuenta__";

const TEXTO_DEL_PROBLEMA: Record<ProblemaDeApertura, string> = {
  SIN_FECHA: "Falta la fecha de corte (un día real, AAAA-MM-DD).",
  POCAS_LINEAS: "Un asiento necesita al menos dos líneas con cuenta y monto.",
  SIN_CUENTA: "Hay una línea con monto pero sin cuenta.",
  SIN_MONTO: "Hay una línea con cuenta pero sin monto.",
  AMBIGUA: "Una línea tiene débito y crédito a la vez: elige uno.",
  FUERA_DE_RANGO:
    "Un monto es demasiado grande para una sola línea: pártelo en dos líneas.",
  CUENTA_REPETIDA:
    "La misma cuenta aparece dos veces: suma los saldos en una línea.",
  DESCUADRADO: "No cuadra: los débitos tienen que ser iguales a los créditos.",
};

export function AsientoDeApertura({
  cuentas,
  onCreado,
  onRevisarCargado,
  enElMuro = false,
  onOcupado,
  archivoInicial = null,
}: {
  /** Sólo las imputables y activas: las únicas que reciben movimientos. */
  cuentas: CuentaPuc[];
  onCreado: (asiento: AsientoContable) => void;
  /**
   * Con la conexión cortada al enviar no sabemos si el asiento entró. Esto
   * refresca la franja de «ya cargados» del padre para que la persona MIRE
   * antes de reintentar, en vez de registrar la apertura dos veces.
   */
  onRevisarCargado?: () => void;
  /** Adentro del muro no se ofrece «volver a la secuencia»: el muro es la secuencia. */
  enElMuro?: boolean;
  /** Aviso al muro mientras el asiento viaja: el pie espera. */
  onOcupado?: (ocupado: boolean, cancelar?: () => void) => void;
  /**
   * 8.ª tanda (14-10): el balance que «Sube tu archivo contable» reconoció.
   * Abre «Subir el balance» con ese archivo.
   */
  archivoInicial?: File | null;
}) {
  const [fecha, setFecha] = useState(hoyContable());
  /*
   * 8.ª tanda (14-10): «Subir el balance». La fecha que se sugiere al usar el
   * balance es el cierre del año anterior, salvo que la persona ya haya
   * escrito la suya.
   */
  const [subiendoBalance, setSubiendoBalance] = useState(Boolean(archivoInicial));
  const [delBalance, setDelBalance] = useState<{ archivo: string; lineas: number } | null>(null);
  const [fechaTocada, setFechaTocada] = useState(false);
  useEffect(() => {
    if (archivoInicial) setSubiendoBalance(true);
  }, [archivoInicial]);
  const [descripcion, setDescripcion] = useState(() =>
    descripcionSugerida(hoyContable()),
  );
  const [descripcionTocada, setDescripcionTocada] = useState(false);
  const [filas, setFilas] = useState<FilaDeApertura[]>(() => [
    filaVacia(),
    filaVacia(),
  ]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrado, setRegistrado] = useState<AsientoRegistrado | null>(null);
  /*
   * La llave del intento: UNA por formulario, no por clic.
   *
   * Es lo que vuelve seguro el reintento después de un corte de red. Si la
   * petición alcanzó a escribirse, el segundo envío con la misma llave
   * devuelve ESE asiento en vez de registrar la apertura dos veces. Por eso
   * se genera al montar y no dentro de `enviar()`: una llave nueva por clic
   * no protegería de nada.
   *
   * 🔴 «Un formulario» NO es «un montaje»: «Registrar otro asiento» limpia las
   * filas sin desmontar nada, y ese es un formulario NUEVO. Con la llave vieja
   * el back devolvía el asiento anterior —el segundo asiento no se escribía
   * jamás— y la pantalla lo anunciaba como registrado. Por eso hay setter.
   */
  const [claveIdempotencia, setClaveIdempotencia] = useState(() =>
    generarIdempotencyKey(),
  );

  const ordenadas = useMemo(
    () => [...cuentas].sort((a, b) => a.codigo.localeCompare(b.codigo)),
    [cuentas],
  );
  const porId = useMemo(() => new Map(cuentas.map((c) => [c.id, c])), [cuentas]);
  const totales = totalesDeApertura(filas);
  const problemas = problemasDeApertura(filas, fecha);
  const puedeEnviar = puedeEnviarApertura(filas, fecha) && !enviando;

  const cambiarFecha = (v: string) => {
    setFecha(v);
    if (!descripcionTocada) setDescripcion(descripcionSugerida(v));
  };

  const usarElBalance = (lineas: FilaDeApertura[], archivo: string) => {
    // Un asiento necesita dos líneas: si el balance trae una, la otra queda vacía.
    setFilas(lineas.length >= 2 ? lineas : [...lineas, filaVacia()]);
    if (!fechaTocada) cambiarFecha(cierreDelAnioAnterior(hoyContable()));
    setDelBalance({ archivo, lineas: lineas.length });
    setSubiendoBalance(false);
    setError(null);
  };

  /*
   * Un balance por tercero trae miles de líneas: con más de 25 el formulario
   * se pagina (los totales y los problemas miran TODAS).
   */
  const pag = useTablePagination(filas, { initialPageSize: 50 });
  const paginado = filas.length > LINEAS_SIN_PAGINAR;
  const visibles = paginado ? pag.pageItems : filas;
  const indiceDe = useMemo(() => new Map(filas.map((f, i) => [f.id, i])), [filas]);

  const editar = (id: string, cambio: Partial<FilaDeApertura>) =>
    setFilas((previas) =>
      previas.map((f) => (f.id === id ? { ...f, ...cambio } : f)),
    );

  const quitar = (id: string) =>
    setFilas((previas) =>
      previas.length > 2 ? previas.filter((f) => f.id !== id) : previas,
    );

  const enviar = async () => {
    setEnviando(true);
    onOcupado?.(true);
    setError(null);
    try {
      const asiento = await contabilidadApi.asientos.crear({
        fecha,
        descripcion: descripcion.trim() || descripcionSugerida(fecha),
        movimientos: movimientosDeApertura(filas),
        claveIdempotencia,
        /*
         * T-0125 · todo lo que sale de esta pantalla ES la apertura de una
         * fecha de corte. Con la bandera el back identifica el asiento por
         * agencia + fecha y ya no depende de que la llave de arriba sobreviva:
         * cerrar la pestaña, recargar o mandarlo desde otro navegador no puede
         * contar los saldos iniciales dos veces. La llave se sigue mandando —un
         * back anterior la usa y el nuevo la ignora—. Un asiento manual que NO
         * es apertura (`AsientoManual`) no manda la bandera.
         */
        esApertura: true,
      });
      setRegistrado(asiento);
      onCreado(asiento);
    } catch (e) {
      if (e instanceof ApiError && e.status === 0) {
        /*
         * Corte de red EN VUELO: el asiento pudo haber llegado a escribirse
         * sin que la respuesta volviera. Reintentar ES seguro —la llave del
         * intento hace que el back devuelva el asiento que ya escribió en vez
         * de crear otro—, así que el copy lo dice en vez de mandar a auditar a
         * mano. Igual se refresca lo cargado: si ya está, se ve arriba.
         */
        onRevisarCargado?.();
        setError(
          "Se cortó la conexión al enviar. Vuelve a tocar «Registrar»: si el asiento alcanzó a guardarse, " +
            "lo vas a ver tal cual quedó — no se registra dos veces.",
        );
      } else {
        setError(
          mensajeDeContabilidad(
            e,
            "No pudimos registrar el asiento. Intenta de nuevo.",
          ),
        );
      }
    } finally {
      setEnviando(false);
      onOcupado?.(false);
    }
  };

  if (registrado) {
    /*
     * 🔴 La pantalla no afirma un hecho que no ocurrió.
     *
     * `yaExistia` viene del back y es lo único que distingue «lo acabo de
     * registrar» de «la llave del intento ya tenía asiento y me devolvió ESE».
     * Las dos respuestas son un 201 con el mismo cuerpo; sin este dato el
     * cartel anunciaba un registro que nunca pasó.
     */
    const yaEstaba = registrado.yaExistia;
    // El monto sale del asiento GUARDADO, no de las filas que hay en pantalla:
    // en el caso «ya estaba» el formulario puede haber cambiado desde entonces.
    const montoDelAsiento = registrado.movimientos.reduce(
      (suma, m) => suma + m.debitoCop,
      0,
    );
    return (
      <section
        className="rounded-lg border border-border-faint bg-surface p-6 shadow-sm"
        data-testid="apertura-creado"
        data-ya-existia={yaEstaba ? "si" : "no"}
      >
        <div className="flex items-start gap-3">
          {yaEstaba ? (
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-fg-muted" />
          ) : (
            <CheckCircle
              className="mt-0.5 h-5 w-5 shrink-0 text-success"
              weight="fill"
            />
          )}
          <div>
            <h2 className="text-sm font-medium text-fg">
              {yaEstaba
                ? `Este asiento ya estaba registrado: es el N.º ${registrado.numero}`
                : `Asiento N.º ${registrado.numero} registrado con fecha del ${fechaLarga(registrado.fecha)}`}
            </h2>
            <p className="mt-1 text-sm text-fg-muted">
              {yaEstaba
                ? `No se creó ninguno nuevo: este envío devolvió el que ya había quedado, ` +
                  `con fecha del ${fechaLarga(registrado.fecha)} y ${registrado.movimientos.length} líneas por ` +
                  `${plataDeLosSaldos(montoDelAsiento)}. Los saldos iniciales están contados una sola vez.`
                : `${registrado.movimientos.length} líneas por ${plataDeLosSaldos(montoDelAsiento)}. ` +
                  `Los asientos no se editan: si algo quedó mal, se reversa y se registra de nuevo.`}
            </p>
          </div>
        </div>
        {!yaEstaba && (registrado.asientosMigradosHastaElCorte ?? 0) > 0 ? (
          <div
            className="mt-4 flex items-start gap-2 rounded-md bg-warning-soft p-3"
            data-testid="apertura-migrados-antes"
          >
            <Warning className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <p className="text-sm text-fg">
              Ya había {(registrado.asientosMigradosHastaElCorte ?? 0).toLocaleString(localeDeLasCifras())}{" "}
              {registrado.asientosMigradosHastaElCorte === 1 ? "asiento" : "asientos"} del libro
              diario migrado con fecha hasta el {fechaLarga(registrado.fecha)}. Esos movimientos
              ya están dentro de estos saldos: revísalos en Contabilidad y reversa los que
              sobren, o los saldos quedan contados dos veces.
            </p>
          </div>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-2">
          {/* Adentro del muro no hay a dónde ir: el muro es la migración. */}
          {enElMuro ? null : (
            <Button asChild hideArrow>
              <Link href="/panel/inmobiliaria/contabilidad">
                Ir a Contabilidad
              </Link>
            </Button>
          )}
          <Button
            variant="outline"
            hideArrow
            onClick={() => {
              setRegistrado(null);
              setFilas([filaVacia(), filaVacia()]);
              setDelBalance(null);
              // Formulario nuevo, llave nueva: con la vieja el back devolvería
              // el asiento anterior y el siguiente no se escribiría nunca.
              setClaveIdempotencia(generarIdempotencyKey());
            }}
          >
            Registrar otro asiento
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section
      className="rounded-lg border border-border-faint bg-surface p-6 shadow-sm"
      aria-labelledby="apertura-titulo"
      data-testid="asiento-de-apertura"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 id="apertura-titulo" className="text-sm font-medium text-fg">
          Saldos iniciales
        </h2>
        {subiendoBalance ? null : (
          <Button
            size="sm"
            variant="outline"
            hideArrow
            onClick={() => setSubiendoBalance(true)}
            data-testid="apertura-subir-balance"
          >
            <FileArrowUp className="mr-1.5 h-4 w-4" />
            Subir el balance
          </Button>
        )}
      </div>
      <p className="mt-1 max-w-2xl text-sm text-fg-muted">
        Un solo asiento con la fecha de corte y el saldo de cada cuenta a esa
        fecha: bancos, lo que te deben los inquilinos, lo que les debes a los
        propietarios, el patrimonio. Los saldos deudores van en débito y los
        acreedores en crédito, y los dos totales tienen que ser iguales. Lo más
        fácil: sube el balance de prueba por tercero de tu sistema anterior y
        las líneas se llenan solas.
      </p>

      {subiendoBalance ? (
        <div className="mt-5">
          <BalanceDeApertura
            cuentas={cuentas}
            archivoInicial={archivoInicial}
            onUsar={usarElBalance}
            onCancelar={() => setSubiendoBalance(false)}
          />
        </div>
      ) : null}

      {delBalance ? (
        <div
          className="mt-5 flex flex-wrap items-start gap-2 rounded-md bg-surface-muted p-3"
          data-testid="apertura-del-balance"
        >
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" />
          <p className="min-w-0 flex-1 text-sm text-fg">
            {delBalance.lineas.toLocaleString(localeDeLasCifras())} líneas del balance
            {delBalance.archivo ? ` «${delBalance.archivo}»` : ""}. Revisa que la fecha de
            corte sea la del balance: {esFechaContable(fecha) ? fechaLarga(fecha) : "sin fecha"}.
          </p>
          <Button
            size="sm"
            variant="ghost"
            hideArrow
            onClick={() => {
              setFilas([filaVacia(), filaVacia()]);
              setDelBalance(null);
            }}
            data-testid="apertura-vaciar"
          >
            Vaciar las líneas
          </Button>
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 sm:grid-cols-[12rem_1fr]">
        <div className="space-y-1">
          <label
            htmlFor="apertura-fecha"
            className="text-sm font-medium text-fg"
          >
            {/* Ronda 30 (Nico): las dos fechas se quedan, con nombre claro: ésta es la de los saldos; la de
                la cartera es el «Corte de movimientos». */}
            Corte de saldos
          </label>
          <CampoDeDia
            id="apertura-fecha"
            value={fecha}
            onChange={(v) => {
              setFechaTocada(true);
              cambiarFecha(v);
            }}
            testid="apertura-fecha"
          />
          <p className="text-caption text-fg-muted" data-testid="que-mide-el-corte-de-saldos">
            El día de tu balance: lo que había en cada cuenta al cierre de ese día.
          </p>
        </div>
        <div className="space-y-1">
          <label
            htmlFor="apertura-descripcion"
            className="text-sm font-medium text-fg"
          >
            Descripción
          </label>
          <Input
            id="apertura-descripcion"
            value={descripcion}
            maxLength={LARGO_MAXIMO_DE_DESCRIPCION}
            onChange={(e) => {
              setDescripcionTocada(true);
              setDescripcion(e.target.value);
            }}
          />
        </div>
      </div>

      {/* Revisora r25: a 390 la tabla se corría dentro de su caja y «Sin cuenta» se partía. Bajo md, una
          tarjeta por línea: la cuenta a lo ancho (con quitar al lado) y débito y crédito debajo, con su rótulo. */}
      <div className="mt-5 overflow-x-auto max-md:overflow-visible">
        <Table className="max-md:block">
          <TableHeader className="max-md:hidden">
            <TableRow>
              <TableHead>Cuenta</TableHead>
              <TableHead className="w-44 text-right">Débito</TableHead>
              <TableHead className="w-44 text-right">Crédito</TableHead>
              <TableHead className="w-10">
                <span className="sr-only">Quitar</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="max-md:block">
            {visibles.map((fila) => {
              const i = indiceDe.get(fila.id) ?? 0;
              return (
              <TableRow
                key={fila.id}
                data-testid={`apertura-fila-${i}`}
                className="max-md:grid max-md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] max-md:gap-x-3 max-md:gap-y-2 max-md:border-b max-md:border-border max-md:py-3"
              >
                <TableCell className="max-md:col-span-2 max-md:col-start-1 max-md:row-start-1 max-md:block max-md:p-0">
                  <Select
                    value={fila.cuentaId ?? SIN_CUENTA}
                    onValueChange={(v) => {
                      const cuentaId = v === SIN_CUENTA ? null : v;
                      const codigo = cuentaId ? (porId.get(cuentaId)?.codigo ?? "") : "";
                      editar(fila.id, {
                        cuentaId,
                        // Bancos o patrimonio no llevan tercero: se limpia.
                        ...(esCuentaDeTerceros(codigo) ? {} : { tercero: null }),
                      });
                    }}
                  >
                    <SelectTrigger
                      aria-label={`Cuenta de la línea ${i + 1}`}
                      data-testid={`apertura-cuenta-${i}`}
                    >
                      <SelectValue placeholder="Elige la cuenta" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SIN_CUENTA}>Sin cuenta</SelectItem>
                      {ordenadas.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.codigo} · {c.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {/* Cartera y terceros llevan nombre: una línea por
                      propietario o inquilino, opcional. */}
                  {fila.cuentaId && esCuentaDeTerceros(porId.get(fila.cuentaId)?.codigo ?? "") ? (
                    <TerceroDeApertura
                      valor={fila.tercero}
                      onCambio={(tercero) => editar(fila.id, { tercero })}
                      testId={`apertura-tercero-${i}`}
                    />
                  ) : null}
                </TableCell>
                <TableCell className="max-md:col-start-1 max-md:row-start-2 max-md:block max-md:p-0">
                  <span className="mb-1 block text-caption text-fg-muted md:hidden" aria-hidden="true">Débito</span>
                  <CampoDePlata
                    areas="contabilidad_facturacion_y_exogena"
                    // Los saldos iniciales guardan sus centavos (Nico, 04-10-2026).
                    siempreConCentavos
                    aria-label={`Débito de la línea ${i + 1}`}
                    value={fila.debitoCop > 0 ? fila.debitoCop : undefined}
                    onChange={(v) =>
                      editar(fila.id, { debitoCop: Number.isFinite(v) ? v : 0 })
                    }
                    invalid={fila.debitoCop > 0 && fila.creditoCop > 0}
                    className="text-right"
                    data-testid={`apertura-debito-${i}`}
                  />
                </TableCell>
                <TableCell className="max-md:col-start-2 max-md:row-start-2 max-md:block max-md:p-0">
                  <span className="mb-1 block text-caption text-fg-muted md:hidden" aria-hidden="true">Crédito</span>
                  <CampoDePlata
                    areas="contabilidad_facturacion_y_exogena"
                    // Los saldos iniciales guardan sus centavos (Nico, 04-10-2026).
                    siempreConCentavos
                    aria-label={`Crédito de la línea ${i + 1}`}
                    value={fila.creditoCop > 0 ? fila.creditoCop : undefined}
                    onChange={(v) =>
                      editar(fila.id, {
                        creditoCop: Number.isFinite(v) ? v : 0,
                      })
                    }
                    invalid={fila.debitoCop > 0 && fila.creditoCop > 0}
                    className="text-right"
                    data-testid={`apertura-credito-${i}`}
                  />
                </TableCell>
                <TableCell className="max-md:col-start-3 max-md:row-start-1 max-md:block max-md:p-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    hideArrow
                    disabled={filas.length <= 2}
                    onClick={() => quitar(fila.id)}
                    aria-label={`Quitar la línea ${i + 1}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {paginado ? (
        <div className="mt-2" data-testid="apertura-paginas">
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

      <div className="mt-2">
        <Button
          size="sm"
          variant="ghost"
          hideArrow
          onClick={() => {
            setFilas((previas) => [...previas, filaVacia()]);
            // Paginado, la línea nueva queda en la última página: se va allá.
            if (paginado) pag.setPage(Math.ceil((filas.length + 1) / pag.pageSize));
          }}
          data-testid="apertura-agregar-fila"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Agregar línea
        </Button>
      </div>

      {/* Revisora r25: con todo en cero, una línea que dice qué hacer (antes tres «$ 0» en negrilla). */}
      {totales.debitos + totales.creditos === 0 ? (
        <p className="mt-4 rounded-md bg-surface-muted p-4 text-sm text-fg-muted" data-testid="apertura-totales" aria-live="polite">
          Escribe las líneas o sube el balance: aquí se ve si los débitos y los créditos cuadran.
        </p>
      ) : (
      <div
        className="mt-4 grid gap-3 rounded-md bg-surface-muted p-4 sm:grid-cols-3"
        data-testid="apertura-totales"
        aria-live="polite"
      >
        <Total etiqueta="Total débitos" valor={totales.debitos} />
        <Total etiqueta="Total créditos" valor={totales.creditos} />
        <Total
          etiqueta="Diferencia"
          valor={Math.abs(totales.diferencia)}
          tono={
            totales.diferencia === 0 && totales.debitos > 0
              ? "ok"
              : totales.diferencia !== 0
                ? "mal"
                : undefined
          }
          nota={
            totales.diferencia === 0
              ? totales.debitos > 0
                ? "Cuadra"
                : undefined
              : totales.diferencia > 0
                ? "Faltan créditos"
                : "Faltan débitos"
          }
        />
      </div>
      )}

      {problemas.length > 0 && totales.debitos + totales.creditos > 0 ? (
        <ul
          className="mt-3 space-y-1 text-sm text-fg-muted"
          data-testid="apertura-problemas"
        >
          {problemas.map((p) => (
            <li key={p} className="flex items-start gap-2">
              <Warning className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              {p === "DESCUADRADO" ? (fraseDelDescuadre(totales) ?? TEXTO_DEL_PROBLEMA[p]) : TEXTO_DEL_PROBLEMA[p]}
            </li>
          ))}
        </ul>
      ) : null}

      {error ? (
        <div
          className="mt-4 flex items-start gap-2 rounded-md bg-danger-soft p-3"
          role="alert"
        >
          <Warning className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          <p className="text-sm text-fg">{error}</p>
        </div>
      ) : null}

      <div className="mt-5">
        <Button
          onClick={enviar}
          disabled={!puedeEnviar}
          isLoading={enviando}
          hideArrow
          data-testid="apertura-enviar"
        >
          Registrar el asiento de apertura
        </Button>
      </div>
    </section>
  );
}

function Total({
  etiqueta,
  valor,
  tono,
  nota,
}: {
  etiqueta: string;
  valor: number;
  tono?: "ok" | "mal";
  nota?: string;
}) {
  return (
    <div>
      <p className="text-caption text-fg-muted">{etiqueta}</p>
      <p
        className={`font-mono text-lg tabular-nums ${
          tono === "ok"
            ? "text-success"
            : tono === "mal"
              ? "text-danger"
              : "text-fg"
        }`}
      >
        {plataDeLosSaldos(valor)}
      </p>
      {nota ? (
        <p
          className={`text-caption ${tono === "ok" ? "text-success" : "text-fg-muted"}`}
        >
          {nota}
        </p>
      ) : null}
    </div>
  );
}
