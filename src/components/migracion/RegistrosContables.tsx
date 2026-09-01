"use client";

/**
 * Paso 5 de la migración: los registros contables.
 *
 * Dos caminos, los dos válidos para dejar el paso listo:
 *
 *   A. Saldos iniciales — UN asiento de apertura con los saldos a la fecha
 *      de corte. Es lo que hace cualquier contador al estrenar un sistema y
 *      alcanza para operar desde mañana.
 *   B. Migrar el histórico — el libro diario del sistema anterior, desde un
 *      archivo. Más trabajo, más trazabilidad.
 *
 * Arriba de los dos, lo que ya está cargado: nadie debería cargar la
 * apertura dos veces porque no vio que ya existía.
 *
 * Sin plan de cuentas no hay dónde imputar: en ese caso no se ofrece ningún
 * camino, se manda al paso 4.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Scales, Warning } from "@phosphor-icons/react";
import { SegmentedControl } from "@leasefy/cadence";

import { Button } from "@/components/ui/button";
import {
  contabilidadApi,
  MAX_LIMITE_DE_ASIENTOS,
  type CuentaPuc,
} from "@/lib/api/contabilidad.service";
import { formatDate } from "@/lib/format";

import { AsientoDeApertura } from "./AsientoDeApertura";
import { MigrarAsientos } from "./MigrarAsientos";
import { mensajeDeContabilidad } from "./contabilidad-errores";

const RUTA_DEL_PASO_4 = "/panel/inmobiliaria/migracion/puc";

type Camino = "apertura" | "historico";

interface ResumenDeCargado {
  total: number;
  desde: string | null;
  hasta: string | null;
  /** El rango se midió sobre una página: con más de 200, es parcial. */
  parcial: boolean;
}

/**
 * `onIrAlPuc`: adentro del muro el paso 4 se abre en el mismo muro, no en
 * otra ruta. Sin el callback queda el enlace de siempre.
 */
export function RegistrosContables({
  onIrAlPuc,
}: { onIrAlPuc?: () => void } = {}) {
  const [camino, setCamino] = useState<Camino>("apertura");
  const [cuentas, setCuentas] = useState<CuentaPuc[] | null>(null);
  const [resumen, setResumen] = useState<ResumenDeCargado | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const [c, a] = await Promise.allSettled([
      contabilidadApi.puc.listar({ soloActivas: true, soloImputables: true }),
      contabilidadApi.asientos.listar({ limite: MAX_LIMITE_DE_ASIENTOS }),
    ]);
    if (c.status === "fulfilled") setCuentas(c.value);
    else {
      setCuentas([]);
      setError(
        mensajeDeContabilidad(c.reason, "No pudimos leer el plan de cuentas."),
      );
    }
    if (a.status === "fulfilled") {
      const fechas = a.value.asientos.map((x) => x.fecha.slice(0, 10)).sort();
      setResumen({
        total: a.value.total,
        desde: fechas[0] ?? null,
        hasta: fechas[fechas.length - 1] ?? null,
        parcial: a.value.total > a.value.asientos.length,
      });
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (cuentas === null) {
    return (
      <p className="text-sm text-fg-muted" role="status">
        Leyendo lo que ya tenés cargado…
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div
          className="flex items-start gap-2 rounded-md border border-border bg-danger-soft p-3"
          role="alert"
        >
          <Warning className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          <p className="text-sm text-fg">{error}</p>
        </div>
      ) : null}

      {resumen ? (
        <section
          className="rounded-lg border border-border bg-surface p-4"
          data-testid="contables-resumen"
          aria-live="polite"
        >
          {resumen.total === 0 ? (
            <p className="text-sm text-fg-muted">
              Todavía no hay registros contables.
            </p>
          ) : (
            <p className="text-sm text-fg">
              Ya cargados:{" "}
              <span className="font-mono font-semibold tabular-nums">
                {resumen.total}
              </span>{" "}
              {resumen.total === 1 ? "asiento" : "asientos"}
              {resumen.desde && resumen.hasta ? (
                <span className="text-fg-muted">
                  {" "}
                  · del {formatDate(resumen.desde)} al{" "}
                  {formatDate(resumen.hasta)}
                  {resumen.parcial
                    ? ` (fechas de los ${MAX_LIMITE_DE_ASIENTOS} más recientes)`
                    : ""}
                </span>
              ) : null}
            </p>
          )}
        </section>
      ) : null}

      {cuentas.length === 0 ? (
        <section
          className="rounded-lg border border-warning bg-warning-soft p-5"
          data-testid="contables-sin-puc"
        >
          <div className="flex items-start gap-2">
            <Warning className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <div>
              <h2 className="font-medium text-fg">
                Primero el plan de cuentas
              </h2>
              <p className="mt-0.5 text-sm text-fg-muted">
                Un asiento se imputa a cuentas, y todavía no hay ninguna que
                reciba movimientos. Cargá el plan en el paso 4 y volvé.
              </p>
            </div>
          </div>
          {onIrAlPuc ? (
            <Button
              size="sm"
              className="mt-4"
              hideArrow
              onClick={onIrAlPuc}
              data-testid="contables-ir-al-puc"
            >
              Ir al paso 4
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button asChild size="sm" className="mt-4" hideArrow>
              <Link href={RUTA_DEL_PASO_4} data-testid="contables-ir-al-puc">
                Ir al paso 4
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
        </section>
      ) : (
        <>
          <div className="space-y-3">
            <SegmentedControl<Camino>
              value={camino}
              onChange={setCamino}
              aria-label="Cómo cargar los registros"
              options={[
                {
                  value: "apertura",
                  label: (
                    <span className="flex items-center gap-2">
                      <Scales className="h-4 w-4" />
                      Saldos iniciales
                    </span>
                  ),
                },
                {
                  value: "historico",
                  label: (
                    <span className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      Migrar el histórico
                    </span>
                  ),
                },
              ]}
            />
            <p className="max-w-2xl text-sm text-fg-muted">
              {camino === "apertura"
                ? "Lo más rápido: un asiento con los saldos a la fecha de corte y desde mañana operás acá. El detalle histórico queda en tu sistema anterior."
                : "Todo el libro diario desde un archivo. Más trabajo, pero cada movimiento viejo queda acá, con su comprobante."}
            </p>
          </div>

          {camino === "apertura" ? (
            <AsientoDeApertura
              cuentas={cuentas}
              onCreado={() => void cargar()}
              enElMuro={Boolean(onIrAlPuc)}
            />
          ) : (
            <MigrarAsientos
              onAplicado={() => void cargar()}
              onIrAlPuc={onIrAlPuc}
              enElMuro={Boolean(onIrAlPuc)}
            />
          )}
        </>
      )}
    </div>
  );
}
