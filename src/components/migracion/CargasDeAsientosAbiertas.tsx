"use client";

/**
 * Las cargas de asientos que quedaron a medias — y la salida de cada una.
 *
 * T-0125. El libro diario lo escribe el NAVEGADOR, tanda por tanda: si se
 * cierra la pestaña o se cae la red a mitad, lo escrito ya está en el back y la
 * carga queda ABIERTA. Esta franja la muestra con su avance y ofrece las dos
 * cosas que una persona puede querer:
 *
 *   · «Continuar» — sube el MISMO archivo con el MISMO nombre de lote. Lo que
 *     ya entró se reconoce (no se duplica) y se sigue donde quedó.
 *   · «Descartar» — no voy a seguir con esta carga. NO borra ningún asiento.
 *
 * 🔴 Vive en el paso `contables` y no adentro de «Subir el libro diario»: el
 * back deja ese paso en «pendiente» mientras haya una carga abierta, y quien
 * está detrás del muro llega a la pestaña de saldos iniciales, no a la del
 * libro diario. La salida tiene que estar a la vista sin buscarla.
 *
 * Leer la lista nunca bloquea nada: un fallo se dice y se puede reintentar; un
 * 403 (el rol no maneja la contabilidad) calla, porque para esa persona no es
 * un fallo — no tiene cargas que ver.
 */

import { useCallback, useEffect, useState } from "react";
import { Info, Trash, Warning } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { contabilidadApi, type CargaAbierta } from "@/lib/api/contabilidad.service";
import { REGLA_DE_CORRECCION } from "@/lib/migracion/regla-de-correccion";

import { mensajeDeContabilidad } from "./contabilidad-errores";

const numero = (n: number) => n.toLocaleString("es-CO");

function fechaDeCarga(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "desconocida";
  return d.toLocaleDateString("es-CO", { day: "numeric", month: "long" });
}

export function CargasDeAsientosAbiertas({
  onContinuar,
  version = 0,
  ocupado = false,
}: {
  /** El padre abre el camino del libro diario con el lote de esta carga. */
  onContinuar: (carga: CargaAbierta) => void;
  /** Cambia cuando algo pudo mover las cargas (terminó o se cortó una aplicación): se vuelve a leer. */
  version?: number;
  /** Una aplicación está corriendo: ni continuar ni descartar hasta que termine. */
  ocupado?: boolean;
}) {
  const [cargas, setCargas] = useState<CargaAbierta[] | null>(null);
  const [fallo, setFallo] = useState(false);
  const [porDescartar, setPorDescartar] = useState<string | null>(null);
  const [descartando, setDescartando] = useState(false);
  const [errorDeDescarte, setErrorDeDescarte] = useState<string | null>(null);

  const leer = useCallback(async () => {
    try {
      const abiertas = await contabilidadApi.migracion.cargas();
      setCargas(abiertas);
      setFallo(false);
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        // Un rol que no maneja la contabilidad no tiene cargas que ver.
        setCargas([]);
        setFallo(false);
        return;
      }
      setFallo(true);
    }
  }, []);

  useEffect(() => {
    void leer();
  }, [leer, version]);

  const descartar = async (lote: string) => {
    setDescartando(true);
    setErrorDeDescarte(null);
    try {
      await contabilidadApi.migracion.descartarCarga(lote);
      setPorDescartar(null);
      await leer();
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        // Otra pestaña (u otra persona) ya la descartó: no hay nada que mostrar.
        setPorDescartar(null);
        await leer();
      } else {
        setErrorDeDescarte(
          mensajeDeContabilidad(e, "No pudimos descartar esa carga. Intenta de nuevo."),
        );
      }
    } finally {
      setDescartando(false);
    }
  };

  if (fallo) {
    return (
      <section
        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-warning-soft p-4"
        data-testid="cargas-de-asientos-fallo"
      >
        <div className="flex items-start gap-2">
          <Warning className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <p className="text-sm text-fg">
            No pudimos verificar si tienes un archivo de asientos a medias. Puedes
            seguir igual: subir el mismo archivo no duplica lo que ya entró. Si
            prefieres ver tu avance antes, reintenta.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          hideArrow
          onClick={() => void leer()}
          data-testid="cargas-de-asientos-reintentar"
        >
          Reintentar
        </Button>
      </section>
    );
  }

  if (!cargas || cargas.length === 0) return null;

  return (
    <section
      className="space-y-3 rounded-lg border border-primary/30 bg-surface p-5 shadow-sm"
      data-testid="cargas-de-asientos"
      aria-live="polite"
    >
      <div className="flex items-start gap-2">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-fg">
            {cargas.length === 1
              ? "Tienes un archivo de asientos a medias"
              : `Tienes ${cargas.length} archivos de asientos a medias`}
          </p>
          <p className="text-sm text-fg-muted">
            Tu avance está guardado: lo que ya entró no se pierde. Para
            continuar, sube el mismo archivo — lo que ya está cargado se
            reconoce y no se duplica. {REGLA_DE_CORRECCION}
          </p>
        </div>
      </div>

      {cargas.map((c) => {
        const confirmando = porDescartar === c.lote;
        return (
          <div
            key={c.lote}
            className="space-y-2 rounded-md border border-border p-3"
            data-testid={`carga-${c.lote}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm text-fg">
                  <span className="font-medium">{c.lote}</span>
                  {" · "}
                  <span className="font-mono tabular-nums">
                    {numero(c.procesados)} de {numero(c.esperados)}
                  </span>{" "}
                  asientos
                </p>
                <p className="text-caption text-fg-subtle">
                  Última actividad: {fechaDeCarga(c.actualizadaAt)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  hideArrow
                  disabled={ocupado || descartando}
                  onClick={() => onContinuar(c)}
                  data-testid={`continuar-carga-${c.lote}`}
                >
                  Continuar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  hideArrow
                  disabled={ocupado || descartando}
                  onClick={() => {
                    setErrorDeDescarte(null);
                    setPorDescartar(c.lote);
                  }}
                  data-testid={`descartar-carga-${c.lote}`}
                >
                  <Trash className="h-4 w-4" />
                  Descartar
                </Button>
              </div>
            </div>

            {confirmando ? (
              <div
                className="space-y-2 rounded-md bg-surface-muted p-3"
                data-testid="descartar-carga-confirmar"
              >
                <p className="text-sm text-fg-muted">
                  Descartar esta carga no borra ningún asiento: los que ya se
                  escribieron siguen en tu libro diario. Sólo deja de contarse
                  como pendiente. Si más adelante subes el mismo archivo con este
                  nombre de lote, la carga se vuelve a abrir desde el principio y
                  lo ya cargado se reconoce.
                </p>
                {errorDeDescarte ? (
                  <div
                    className="flex items-start gap-2 rounded-md border border-border bg-danger-soft p-3"
                    role="alert"
                  >
                    <Warning className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                    <p className="text-sm text-fg">{errorDeDescarte}</p>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    hideArrow
                    isLoading={descartando}
                    onClick={() => void descartar(c.lote)}
                    data-testid="descartar-carga-si"
                  >
                    Sí, descartar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    hideArrow
                    disabled={descartando}
                    onClick={() => {
                      setErrorDeDescarte(null);
                      setPorDescartar(null);
                    }}
                    data-testid="descartar-carga-no"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </section>
  );
}
