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

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Receipt, Scales, Warning } from "@phosphor-icons/react";
import { SegmentedControl } from "@leasefy/cadence";

import { Button } from "@/components/ui/button";
import {
  contabilidadApi,
  MAX_LIMITE_DE_ASIENTOS,
  type CargaAbierta,
  type CuentaPuc,
} from "@/lib/api/contabilidad.service";
import { formatDate } from "@/lib/format";

import { AsientoDeApertura } from "./AsientoDeApertura";
import { CargasDeAsientosAbiertas } from "./CargasDeAsientosAbiertas";
import { DocumentosContables } from "./DocumentosContables";
import { MigrarAsientos } from "./MigrarAsientos";
import { mensajeDeContabilidad } from "./contabilidad-errores";

const RUTA_DEL_PASO_4 = "/panel/inmobiliaria/migracion/puc";

type Camino = "apertura" | "historico" | "documentos";

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
  onOcupado,
}: {
  onIrAlPuc?: () => void;
  /** Aviso al muro mientras se aplican los asientos: el pie espera. */
  onOcupado?: (ocupado: boolean, cancelar?: () => void) => void;
} = {}) {
  const [camino, setCamino] = useState<Camino>("apertura");
  /*
   * T-0125 · la carga de asientos que se está CONTINUANDO (viene de la franja
   * de cargas a medias) y el contador que la franja usa para volver a leer.
   * `ocupado` espeja lo que los caminos le avisan al muro: mientras algo
   * corre, la franja no deja continuar ni descartar.
   */
  const [continuar, setContinuar] = useState<CargaAbierta | null>(null);
  const [versionDeCargas, setVersionDeCargas] = useState(0);
  const [ocupado, setOcupado] = useState(false);
  const estabaOcupado = useRef(false);
  const marcarOcupado = useCallback(
    (hayTrabajo: boolean, cancelar?: () => void) => {
      setOcupado(hayTrabajo);
      // Al soltarse —terminó o se cortó— las cargas pudieron cambiar: se relee.
      // Sólo en la transición ocupado → libre, no en cada aviso de «libre».
      if (!hayTrabajo && estabaOcupado.current) setVersionDeCargas((v) => v + 1);
      estabaOcupado.current = hayTrabajo;
      onOcupado?.(hayTrabajo, cancelar);
    },
    [onOcupado],
  );
  const [cuentas, setCuentas] = useState<CuentaPuc[] | null>(null);
  const [resumen, setResumen] = useState<ResumenDeCargado | null>(null);
  const [error, setError] = useState<string | null>(null);
  /*
   * 🔴 «No pude leer el plan» NO es «no hay plan»: sin la distinción, una
   * caída de red mandaba al paso 4 a «cargar el PUC» a quien ya lo tiene.
   */
  const [falloDeCuentas, setFalloDeCuentas] = useState(false);
  /*
   * Y «no pude leer lo cargado» NO puede ser silencio: la franja de «ya
   * cargados» es el guard contra registrar la apertura DOS veces. Si la
   * lectura falla, se dice y se ofrece reintentar antes de registrar nada.
   */
  const [falloDeAsientos, setFalloDeAsientos] = useState(false);

  const cargar = useCallback(async () => {
    const [c, a] = await Promise.allSettled([
      contabilidadApi.puc.listar({ soloActivas: true, soloImputables: true }),
      contabilidadApi.asientos.listar({ limite: MAX_LIMITE_DE_ASIENTOS }),
    ]);
    if (c.status === "fulfilled") {
      setCuentas(c.value);
      setFalloDeCuentas(false);
      setError(null);
    } else {
      // Se conservan las cuentas del último éxito: un refresco caído no puede
      // vaciarle el selector de cuentas a un formulario a medio llenar.
      setCuentas((previo) => previo ?? []);
      setFalloDeCuentas(true);
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
      setFalloDeAsientos(false);
    } else {
      setFalloDeAsientos(true);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (cuentas === null) {
    return (
      <p className="text-sm text-fg-muted" role="status">
        Leyendo lo que ya tienes cargado…
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div
          className="flex flex-wrap items-start gap-2 rounded-md bg-danger-soft p-3"
          role="alert"
        >
          <Warning className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          <p className="min-w-0 flex-1 text-sm text-fg">{error}</p>
          {falloDeCuentas ? (
            <Button
              size="sm"
              variant="outline"
              hideArrow
              onClick={() => void cargar()}
              data-testid="contables-reintentar"
            >
              Reintentar
            </Button>
          ) : null}
        </div>
      ) : null}

      {falloDeAsientos ? (
        <section
          className="rounded-lg bg-warning-soft p-4"
          data-testid="contables-cargado-fallo"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2">
              <Warning className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <p className="text-sm text-fg">
                No pudimos leer lo que ya está cargado. Reintenta antes de
                registrar nada: sin esa lista podrías cargar dos veces la misma
                apertura.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              hideArrow
              onClick={() => void cargar()}
            >
              Reintentar
            </Button>
          </div>
        </section>
      ) : null}

      {/* El resumen de lo ya cargado baja a la tarjeta del camino (abajo):
          era una isla de una sola línea flotando arriba de todo. */}

      {cuentas.length === 0 && !falloDeCuentas ? (
        <section
          className="rounded-lg bg-warning-soft p-5"
          data-testid="contables-sin-puc"
        >
          <div className="flex items-start gap-2">
            <Warning className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <div>
              <h2 className="text-sm font-medium text-fg">
                Primero el plan de cuentas
              </h2>
              <p className="mt-0.5 text-sm text-fg-muted">
                Un asiento se imputa a cuentas, y todavía no hay ninguna que
                reciba movimientos. Carga el plan en el paso 4 y vuelve.
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
      ) : cuentas.length === 0 ? null : (
        // La tercera pata del if: lectura caída y sin cuentas del último
        // éxito. No sabemos si hay plan — ni «ve al paso 4» ni un selector
        // de cuentas vacío; queda el cartel de arriba con su Reintentar.
        <>
          {/* La salida de una carga a medias va ANTES de los caminos: la pestaña
              de por defecto es la de saldos iniciales, no la del libro diario. */}
          <CargasDeAsientosAbiertas
            version={versionDeCargas}
            ocupado={ocupado}
            onContinuar={(carga) => {
              setContinuar(carga);
              setCamino("historico");
            }}
          />

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
                  // «Subir» y no «migrar»: Nico pasó por acá y no vio que
                  // el archivo se podía subir. El sustantivo del botón tiene
                  // que ser el objeto que la persona tiene en la mano.
                  label: (
                    <span className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      Subir el libro diario
                    </span>
                  ),
                },
                {
                  // El tercer camino, y el que el archivo real de la
                  // inmobiliaria necesita: comprobantes SIN líneas por cuenta.
                  // Va aparte del libro diario a propósito — meterlos ahí
                  // serían 116 mil asientos descuadrados.
                  value: "documentos",
                  label: (
                    <span className="flex items-center gap-2">
                      <Receipt className="h-4 w-4" />
                      Subir los comprobantes
                    </span>
                  ),
                },
              ]}
            />
            <p className="max-w-2xl text-sm text-fg-muted">
              {camino === "apertura"
                ? "Lo más rápido: un asiento con los saldos a la fecha de corte y desde mañana operás acá. El detalle histórico queda en tu sistema anterior."
                : camino === "historico"
                  ? "El libro diario exportado de tu sistema actual, en Excel o CSV. Más trabajo, pero cada movimiento viejo queda acá, con su comprobante."
                  : "El export de comprobantes: facturas, comprobantes de ingreso y de egreso, con su fecha y su concepto. No son asientos —no traen cuenta por línea— y por eso van a la ficha del contrato, no al libro diario."}
            </p>
          </section>

          {camino === "apertura" ? (
            <AsientoDeApertura
              cuentas={cuentas}
              onCreado={() => void cargar()}
              onRevisarCargado={() => void cargar()}
              enElMuro={Boolean(onIrAlPuc)}
              onOcupado={marcarOcupado}
            />
          ) : camino === "historico" ? (
            <MigrarAsientos
              onAplicado={() => {
                void cargar();
                setVersionDeCargas((v) => v + 1);
              }}
              continuar={continuar}
              onDejarDeContinuar={() => setContinuar(null)}
              onIrAlPuc={onIrAlPuc}
              /* El archivo de comprobantes metido en el libro diario tiene su
                 puerta acá al lado: el aviso la abre en vez de nombrarla. */
              onIrAComprobantes={() => setCamino("documentos")}
              enElMuro={Boolean(onIrAlPuc)}
              onOcupado={marcarOcupado}
            />
          ) : (
            <DocumentosContables onOcupado={marcarOcupado} />
          )}
        </>
      )}
    </div>
  );
}
