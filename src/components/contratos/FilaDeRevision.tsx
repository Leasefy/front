"use client";

/**
 * Una fila del archivo, como se REVISA antes de activarla.
 *
 * ── Por qué existe ──────────────────────────────────────────────────────────
 *
 * Antes, la migración de contratos asociaba los propietarios sola —una barrita
 * que contaba «13 de 90»— y cuando terminaba aparecía un botón que decía
 * «Activar 90 contratos». Nunca se veía QUÉ se estaba por activar: ni a quién
 * quedó consignado cada contrato, ni con qué porcentaje. El pedido fue
 * literal: que cuando aparezca el resultado, cada contrato ya tenga su
 * propietario y su porcentaje a la vista, y se puedan cambiar si la
 * asociación salió mal.
 *
 * Así que esta fila muestra las cuatro cosas que hay que mirar antes de que
 * exista un contrato: **quién arrienda, dónde, a quién se le consigna y
 * cuánto se le cobra**. Las dos últimas se editan acá mismo.
 *
 * ── Tres decisiones ─────────────────────────────────────────────────────────
 *
 * 1. **El propietario se ELIGE de una lista, no se escribe.** Escribir un
 *    nombre encima de uno equivocado crea una tercera ficha y parte la plata
 *    en tres. El back tiene dos caminos y esta fila elige el correcto sola:
 *    consignar por primera vez (`registrarPropietario`, que crea o reusa la
 *    ficha) o corregir uno ya consignado (`corregirPropietario`, que reapunta
 *    la consignación) — porque re-registrar sobre un inmueble ya consignado
 *    NO cambia el propietario, a propósito.
 * 2. **La comisión no se puede tocar antes de consignar.** El porcentaje vive
 *    en la consignación; sin ella no hay dónde escribirlo. El campo queda
 *    apagado y lo dice, en vez de aceptar un número que se pierde.
 * 3. **Lo que quedó mal se dice en la fila, no en un toast.** Un error de
 *    guardado que se va solo en tres segundos, en una tabla de noventa
 *    filas, es un error que nadie vio.
 */

import { useEffect, useRef, useState } from "react";
import { CheckCircle, Warning } from "@phosphor-icons/react";

import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { PercentInput } from "@/components/ui/percent-input";
import { formatCurrency } from "@/lib/format";
import {
  contractsApi,
  type FilaDeMigracion,
} from "@/lib/api/contracts.service";
import type { Propietario } from "@/lib/types/inmobiliaria";
import { FaltantesDeFila } from "./FaltantesDeFila";
import { SelectorDePropietario } from "./SelectorDePropietario";

/**
 * El propietario ya tiene su propio control en esta fila; volver a pintarlo
 * abajo, con otro formulario y otra forma, es la duplicación que hacía la
 * pantalla ilegible.
 */
const YA_RESUELTOS_ACA = ["propietario"];

export interface FilaDeRevisionProps {
  fila: FilaDeMigracion;
  /** Todos los propietarios de la agencia, cargados una vez por la pantalla. */
  propietarios: readonly Propietario[];
  seleccionada: boolean;
  onSeleccion: (v: boolean) => void;
  /** La fila ya actualizada, para que el padre la refleje sin refetch. */
  onActualizada: (f: FilaDeMigracion) => void;
  /** Refrescar los contadores del lote (estado, listos, activables). */
  onCambio: () => void;
}

export function FilaDeRevision({
  fila,
  propietarios,
  seleccionada,
  onSeleccion,
  onActualizada,
  onCambio,
}: FilaDeRevisionProps) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const yaActivada = fila.estado === "ACTIVADO";
  const descartada = fila.estado === "DESCARTADO";
  const editable = !yaActivada && !descartada;
  const sinInmueble = !fila.propertyId;
  /** Sin consignación no hay dónde escribir el porcentaje. */
  const consignada = Boolean(fila.propietario);
  /**
   * Una fila YA activada con inmueble y sin propietario (2026-09-02): el
   * contrato existe, tiene inquilino, y no cobra — el cobro sale de la
   * consignación y nadie dijo de quién es el inmueble. Es lo que deja «Crear
   * los N inmuebles que faltan» sobre un archivo sin propietario. Acá se le
   * da su PRIMER propietario; cambiar uno que ya está sigue siendo cosa del
   * inmueble, así que el selector se apaga apenas queda consignada.
   */
  const activadaSinPropietario = yaActivada && !sinInmueble && !consignada;
  const puedeElegirPropietario = editable || activadaSinPropietario;
  const seleccionable = editable || activadaSinPropietario;
  const otrosFaltantes = fila.faltantes.filter(
    (f) => !YA_RESUELTOS_ACA.includes(f),
  );

  async function correr(accion: () => Promise<FilaDeMigracion>) {
    setGuardando(true);
    setError(null);
    try {
      onActualizada(await accion());
      onCambio();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos guardar el cambio.");
    } finally {
      setGuardando(false);
    }
  }

  async function elegirPropietario(p: Propietario) {
    await correr(async () => {
      const actualizada = consignada
        ? await contractsApi.migracion.corregirPropietario(fila.id, {
            propietarioId: p.id,
          })
        : await contractsApi.migracion.registrarPropietario(fila.id, {
            nombre: p.name,
            documento: p.documentNumber,
            correo: p.email ?? undefined,
            telefono: p.phone ?? undefined,
            comisionPorcentaje:
              fila.comisionPorcentaje ??
              fila.datos.comisionPorcentaje ??
              undefined,
          });
      /*
       * El back devuelve la fila recalculada (estado, faltantes), pero sin el
       * bloque enriquecido de propietario — lo arma sólo el listado. Se pega
       * acá el que la persona ACABA de elegir: es exactamente lo que se
       * escribió, y así la tabla no necesita otro viaje para mostrarlo.
       */
      return {
        ...actualizada,
        propietario: {
          id: p.id,
          nombre: p.name,
          documento: p.documentNumber,
        },
        /*
         * `?? 0` y no `?? null`: al consignar por primera vez el back escribe
         * `comisionPorcentaje ?? contrato.comisionPorcentaje ?? 0`, así que
         * una fila del archivo sin comisión queda en CERO en la consignación.
         * Mostrar el campo vacío diría «no hay dato» sobre un dato que sí
         * existe — y es justo el que se está por revisar.
         */
        comisionPorcentaje:
          fila.comisionPorcentaje ?? fila.datos.comisionPorcentaje ?? 0,
      };
    });
  }

  async function guardarComision(valor: number) {
    await correr(async () => {
      const actualizada = await contractsApi.migracion.corregirPropietario(
        fila.id,
        { comisionPorcentaje: valor },
      );
      return {
        ...actualizada,
        propietario: fila.propietario,
        comisionPorcentaje: valor,
      };
    });
  }

  return (
    <Card
      className={`space-y-3 p-4 ${descartada ? "opacity-60" : ""}`}
      data-testid={`fila-revision-${fila.fila}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
          {seleccionable ? (
            <Checkbox
              checked={seleccionada}
              onCheckedChange={(c) => onSeleccion(c === true)}
            />
          ) : null}
          {/* +2: en el archivo la primera fila de datos es la 2. */}
          Fila {fila.fila + 2} ·{" "}
          {fila.datos.inquilino?.nombre || "inquilino sin nombre"}
        </label>
        <div className="flex items-center gap-3">
          {/* `formatCurrency(undefined)` pinta «$ 0», que acá se leería como
              un canon de cero en vez de un canon que el archivo no traía. */}
          <p className="font-mono text-xs tabular-nums text-fg-subtle">
            {fila.datos.monthlyRent
              ? formatCurrency(fila.datos.monthlyRent)
              : "Sin canon"}
          </p>
          <EstadoDeLaFila fila={fila} />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {fila.datos.direccion || "Sin dirección en el archivo"}
      </p>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div>
          <p className="mb-1 text-xs text-muted-foreground">Propietario</p>
          {sinInmueble ? (
            /*
             * La consignación es del INMUEBLE. Sin inmueble resuelto no hay a
             * qué consignar, y ofrecer el selector sería ofrecer un botón que
             * siempre falla — se manda a resolver lo de abajo, que es lo que
             * de verdad desbloquea.
             */
            <p
              className="rounded-md border border-dashed border-border px-2.5 py-1.5 text-xs text-muted-foreground"
              data-testid="propietario-sin-inmueble"
            >
              Primero hay que resolver el inmueble — la consignación es del
              inmueble, no del contrato.
            </p>
          ) : (
            <SelectorDePropietario
              propietarios={propietarios}
              actualId={fila.propietario?.id ?? null}
              disabled={!puedeElegirPropietario || guardando}
              onElegir={(p) => void elegirPropietario(p)}
              testId={`propietario-fila-${fila.fila}`}
            />
          )}
        </div>

        <div className="w-28">
          <p className="mb-1 text-xs text-muted-foreground">Comisión %</p>
          <CampoComision
            valor={fila.comisionPorcentaje ?? null}
            deshabilitado={!editable || !consignada || guardando}
            onGuardar={(v) => void guardarComision(v)}
            testId={`comision-fila-${fila.fila}`}
          />
        </div>
      </div>

      {!consignada && !sinInmueble && editable ? (
        <p className="text-xs text-muted-foreground">
          El porcentaje se puede poner cuando el inmueble esté consignado.
        </p>
      ) : null}

      {activadaSinPropietario ? (
        <p
          className="text-xs text-warning"
          data-testid="activada-sin-propietario"
        >
          Este contrato ya está activo y no tiene propietario: no genera cobros
          hasta que el inmueble quede consignado. Elegilo acá, o seleccioná
          varias filas y usá «Mismo propietario».
        </p>
      ) : null}

      {error ? (
        <p className="text-xs text-destructive" data-testid="error-de-fila">
          {error}
        </p>
      ) : null}

      {editable && otrosFaltantes.length > 0 ? (
        <FaltantesDeFila
          fila={fila}
          omitir={YA_RESUELTOS_ACA}
          onResuelta={(f) => {
            onActualizada({
              ...f,
              propietario: fila.propietario,
              comisionPorcentaje: fila.comisionPorcentaje,
            });
            onCambio();
          }}
        />
      ) : null}
    </Card>
  );
}

/**
 * El campo del porcentaje.
 *
 * Es el `PercentInput` de cadence, que ancla el `%` adentro del campo y mide
 * lo mismo que el disparador del `Combobox` de al lado (44 px). Antes era un
 * `<input type="number">` pelado: la unidad quedaba sólo en la etiqueta de
 * arriba, y un porcentaje sin su signo es exactamente el número que alguien
 * lee como pesos.
 *
 * Guarda al SALIR del campo, no en cada tecla: el `PercentInput` dispara
 * `onChange` por tecla —lo cual está bien, es el borrador— pero mandarlo al
 * back así haría una petición por dígito, y «12» pasaría por «1»: un uno por
 * ciento escrito de verdad en la consignación, aunque sea por un instante.
 *
 * El último valor se lee de un `ref` y no del estado: en el `onBlur` del
 * render actual, el `setBorrador` de la última tecla todavía no se aplicó.
 *
 * 🔴 **El clamp del DS NO corre acá.** `PercentInput` hace el spread de
 * `...props` DESPUÉS de sus propios manejadores, así que el `onBlur` que se le
 * pasa reemplaza al suyo — y con él, el topado a 0–100. Verificado con un
 * test: escribir 150 mandaba 150. El rango se valida de este lado, y un valor
 * imposible se DESCARTA en vez de topárse: convertir un 150 mal tecleado en un
 * 100% de comisión es peor que no guardar nada.
 */
function CampoComision({
  valor,
  deshabilitado,
  onGuardar,
  testId,
}: {
  valor: number | null;
  deshabilitado: boolean;
  onGuardar: (v: number) => void;
  testId: string;
}) {
  const [borrador, setBorrador] = useState<number | undefined>(
    valor ?? undefined,
  );
  const ultimo = useRef<number | undefined>(valor ?? undefined);

  // El valor puede cambiar por afuera (se consignó recién, o se corrigió en
  // masiva): el borrador tiene que seguirlo mientras nadie lo esté editando.
  useEffect(() => {
    setBorrador(valor ?? undefined);
    ultimo.current = valor ?? undefined;
  }, [valor]);

  return (
    <PercentInput
      value={borrador}
      disabled={deshabilitado}
      /*
       * Sin placeholder. El del DS es «0», y en un campo apagado —el de una
       * fila que todavía no está consignada— un cero gris se lee como una
       * comisión del cero por ciento, que es un dato, no un campo vacío.
       */
      placeholder=""
      onChange={(n) => {
        const v = Number.isNaN(n) ? undefined : n;
        ultimo.current = v;
        setBorrador(v);
      }}
      onBlur={() => {
        const v = ultimo.current;
        const imposible = v === undefined || v < 0 || v > 100;
        if (imposible || v === valor) {
          setBorrador(valor ?? undefined);
          ultimo.current = valor ?? undefined;
          return;
        }
        onGuardar(v);
      }}
      data-testid={testId}
    />
  );
}

function EstadoDeLaFila({ fila }: { fila: FilaDeMigracion }) {
  if (fila.estado === "ACTIVADO" && fila.propertyId && !fila.propietario)
    return (
      <span
        className="inline-flex items-center gap-1 text-[11px] text-warning"
        data-testid="pastilla-sin-propietario"
      >
        <Warning className="h-3.5 w-3.5" />
        Activado · sin propietario
      </span>
    );
  if (fila.estado === "ACTIVADO")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5 text-[11px] text-fg-muted">
        Ya activado
      </span>
    );
  if (fila.estado === "DESCARTADO")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5 text-[11px] text-fg-muted">
        Descartada
      </span>
    );
  if (fila.faltantes.length === 0)
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-success">
        <CheckCircle className="h-3.5 w-3.5" weight="fill" />
        Listo
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-warning">
      <Warning className="h-3.5 w-3.5" />
      {fila.faltantes.length === 1
        ? "Le falta 1 dato"
        : `Le faltan ${fila.faltantes.length} datos`}
    </span>
  );
}
