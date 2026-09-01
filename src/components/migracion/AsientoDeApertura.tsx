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

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle, Plus, Warning, X } from "@phosphor-icons/react";
import { CurrencyInput } from "@leasefy/cadence";

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
import {
  contabilidadApi,
  LARGO_MAXIMO_DE_DESCRIPCION,
  type AsientoContable,
  type CuentaPuc,
} from "@/lib/api/contabilidad.service";
import {
  descripcionSugerida,
  filaVacia,
  hoyContable,
  movimientosDeApertura,
  problemasDeApertura,
  puedeEnviarApertura,
  totalesDeApertura,
  type FilaDeApertura,
  type ProblemaDeApertura,
} from "@/lib/migracion/asiento-de-apertura";
import { formatCurrency } from "@/lib/format";

import { mensajeDeContabilidad } from "./contabilidad-errores";

/** Sentinel: Radix `Select` no admite `value=""`. */
const SIN_CUENTA = "__sin_cuenta__";

const TEXTO_DEL_PROBLEMA: Record<ProblemaDeApertura, string> = {
  SIN_FECHA: "Falta la fecha de corte (un día real, AAAA-MM-DD).",
  POCAS_LINEAS: "Un asiento necesita al menos dos líneas con cuenta y monto.",
  SIN_CUENTA: "Hay una línea con monto pero sin cuenta.",
  SIN_MONTO: "Hay una línea con cuenta pero sin monto.",
  AMBIGUA: "Una línea tiene débito y crédito a la vez: elegí uno.",
  FUERA_DE_RANGO:
    "Un monto es demasiado grande para una sola línea: partilo en dos.",
  CUENTA_REPETIDA:
    "La misma cuenta aparece dos veces: sumá los saldos en una línea.",
  DESCUADRADO: "No cuadra: los débitos tienen que ser iguales a los créditos.",
};

export function AsientoDeApertura({
  cuentas,
  onCreado,
  onRevisarCargado,
  enElMuro = false,
  onOcupado,
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
  onOcupado?: (ocupado: boolean) => void;
}) {
  const [fecha, setFecha] = useState(hoyContable());
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
  const [creado, setCreado] = useState<AsientoContable | null>(null);

  const ordenadas = useMemo(
    () => [...cuentas].sort((a, b) => a.codigo.localeCompare(b.codigo)),
    [cuentas],
  );
  const totales = totalesDeApertura(filas);
  const problemas = problemasDeApertura(filas, fecha);
  const puedeEnviar = puedeEnviarApertura(filas, fecha) && !enviando;

  const cambiarFecha = (v: string) => {
    setFecha(v);
    if (!descripcionTocada) setDescripcion(descripcionSugerida(v));
  };

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
      });
      setCreado(asiento);
      onCreado(asiento);
    } catch (e) {
      if (e instanceof ApiError && e.status === 0) {
        /*
         * Corte de red EN VUELO: el asiento pudo haber llegado a escribirse
         * sin que la respuesta volviera. Reintentar a ciegas es el camino a
         * una apertura doble (el back no tiene llave de idempotencia acá),
         * así que se refresca la lista de lo cargado y se pide MIRARLA.
         */
        onRevisarCargado?.();
        setError(
          "Se cortó la conexión al enviar y no sabemos si el asiento alcanzó a registrarse. " +
            "Mirá arriba lo ya cargado —recién lo actualizamos—: si el asiento aparece, no lo registres de nuevo; si no aparece, intentá otra vez.",
        );
      } else {
        setError(
          mensajeDeContabilidad(
            e,
            "No pudimos registrar el asiento. Intentá de nuevo.",
          ),
        );
      }
    } finally {
      setEnviando(false);
      onOcupado?.(false);
    }
  };

  if (creado) {
    return (
      <section
        className="rounded-lg border border-border bg-surface p-6 shadow-sm"
        data-testid="apertura-creado"
      >
        <div className="flex items-start gap-3">
          <CheckCircle
            className="mt-0.5 h-5 w-5 shrink-0 text-success"
            weight="fill"
          />
          <div>
            <h2 className="font-medium text-fg">
              Asiento N.º {creado.numero} registrado con fecha{" "}
              {creado.fecha.slice(0, 10)}
            </h2>
            <p className="mt-1 text-sm text-fg-muted">
              {creado.movimientos.length} líneas por{" "}
              {formatCurrency(totales.debitos)}. Los asientos no se editan: si
              algo quedó mal, se reversa y se registra de nuevo.
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {/* Adentro del muro no hay secuencia a la que volver: el muro es la secuencia. */}
          {enElMuro ? null : (
            <Button asChild hideArrow>
              <Link href="/panel/inmobiliaria/migracion">
                Volver a la secuencia
              </Link>
            </Button>
          )}
          <Button
            variant="outline"
            hideArrow
            onClick={() => {
              setCreado(null);
              setFilas([filaVacia(), filaVacia()]);
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
      className="rounded-lg border border-border bg-surface p-6 shadow-sm"
      aria-labelledby="apertura-titulo"
      data-testid="asiento-de-apertura"
    >
      <h2 id="apertura-titulo" className="font-medium text-fg">
        Saldos iniciales
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-fg-muted">
        Un solo asiento con la fecha de corte y el saldo de cada cuenta a esa
        fecha: bancos, lo que te deben los inquilinos, lo que les debés a los
        propietarios, el patrimonio. Los saldos deudores van en débito y los
        acreedores en crédito, y los dos totales tienen que ser iguales.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-[12rem_1fr]">
        <div className="space-y-1">
          <label
            htmlFor="apertura-fecha"
            className="text-sm font-medium text-fg"
          >
            Fecha de corte
          </label>
          <Input
            id="apertura-fecha"
            type="date"
            value={fecha}
            onChange={(e) => cambiarFecha(e.target.value)}
            data-testid="apertura-fecha"
          />
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

      <div className="mt-5 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cuenta</TableHead>
              <TableHead className="w-44 text-right">Débito</TableHead>
              <TableHead className="w-44 text-right">Crédito</TableHead>
              <TableHead className="w-10">
                <span className="sr-only">Quitar</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.map((fila, i) => (
              <TableRow key={fila.id} data-testid={`apertura-fila-${i}`}>
                <TableCell>
                  <Select
                    value={fila.cuentaId ?? SIN_CUENTA}
                    onValueChange={(v) =>
                      editar(fila.id, { cuentaId: v === SIN_CUENTA ? null : v })
                    }
                  >
                    <SelectTrigger
                      aria-label={`Cuenta de la línea ${i + 1}`}
                      data-testid={`apertura-cuenta-${i}`}
                    >
                      <SelectValue placeholder="Elegí la cuenta" />
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
                </TableCell>
                <TableCell>
                  <CurrencyInput
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
                <TableCell>
                  <CurrencyInput
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
                <TableCell>
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
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="mt-2">
        <Button
          size="sm"
          variant="ghost"
          hideArrow
          onClick={() => setFilas((previas) => [...previas, filaVacia()])}
          data-testid="apertura-agregar-fila"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Agregar línea
        </Button>
      </div>

      <div
        className="mt-4 grid gap-3 rounded-md border border-border bg-surface-muted p-4 sm:grid-cols-3"
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

      {problemas.length > 0 && totales.debitos + totales.creditos > 0 ? (
        <ul
          className="mt-3 space-y-1 text-sm text-fg-muted"
          data-testid="apertura-problemas"
        >
          {problemas.map((p) => (
            <li key={p} className="flex items-start gap-2">
              <Warning className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              {TEXTO_DEL_PROBLEMA[p]}
            </li>
          ))}
        </ul>
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
      <p className="text-xs text-fg-muted">{etiqueta}</p>
      <p
        className={`font-mono text-lg font-semibold tabular-nums ${
          tono === "ok"
            ? "text-success"
            : tono === "mal"
              ? "text-danger"
              : "text-fg"
        }`}
      >
        {formatCurrency(valor)}
      </p>
      {nota ? (
        <p
          className={`text-xs ${tono === "ok" ? "text-success" : "text-fg-muted"}`}
        >
          {nota}
        </p>
      ) : null}
    </div>
  );
}
