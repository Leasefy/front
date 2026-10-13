"use client";

/**
 * 🔴 LA FECHA DE CORTE DE LA MIGRACIÓN, pedida antes de activar (QA 22-09).
 *
 * Nada en el producto la preguntaba. Sin ella, la tabla de cuotas de un
 * contrato de 2022 nacía con cuatro años de deuda: la inmobiliaria del QA
 * amaneció con $5.216 M de «cartera» —incluidos contratos TERMINADOS que esta
 * misma pantalla promete que «no generan cobros»— y con el canon del archivo
 * inflado por los IPC de 2023 a 2026.
 *
 * Sin valor por defecto, a propósito: cualquier día que la pantalla eligiera
 * decidiría cuánta plata debe cada inquilino. La escribe la persona, y hasta
 * que la guarde el botón «Activar» no se enciende (el back además responde
 * 409 `FALTA_FECHA_DE_CORTE`).
 */

import { useCallback, useEffect, useState } from "react";
import { Presence } from "@leasefy/cadence";

import { Button } from "@/components/ui/button";
import { ErrorDelCampo } from "@/components/estado/ErrorDelCampo";
import { leerFallo, mensajeParaLaPersona } from "@/lib/errores/traductor-de-errores";
import { errorDeLaFechaDeCorte } from "@/components/migracion/limites-de-la-migracion";
import {
  contractsApi,
  type FechaDeCorteDeLaMigracion as Estado,
} from "@/lib/api/contracts.service";
import { CampoDeDia } from "@/components/contabilidad/CampoDeDia";

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/** `2026-09-01` → «1 de septiembre de 2026», sin pasar por la zona horaria. */
export function fechaEnPalabras(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const mes = MESES[Number(m[2]) - 1];
  if (!mes) return iso;
  return `${Number(m[3])} de ${mes} de ${m[1]}`;
}

interface Props {
  /** Avisa hacia arriba cuándo hay fecha guardada (y cuál). */
  onCambio: (fecha: string | null) => void;
}

export function FechaDeCorteDeLaMigracion({ onCambio }: Props) {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [borrador, setBorrador] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /**
   * El error DE LA FECHA (el cliente con las reglas del back, o un 400 del
   * back): va debajo del campo. `error` queda para lo que no es de la fecha
   * —un 409 porque ya hay cuotas, un 5xx, la red—.
   */
  const [errorDeLaFecha, setErrorDeLaFecha] = useState<string | null>(null);
  const idDelCampo = "fecha-de-corte-campo";

  const aplicar = useCallback(
    (e: Estado) => {
      setEstado(e);
      setBorrador(e.fecha ?? "");
      onCambio(e.fecha);
    },
    [onCambio],
  );

  useEffect(() => {
    let vivo = true;
    contractsApi.migracion
      .fechaDeCorte()
      .then((e) => {
        if (vivo) aplicar(e);
      })
      .catch((e: unknown) => {
        if (vivo) {
          setError(
            mensajeParaLaPersona(e, {
              porDefecto: "No pudimos leer la fecha de corte.",
              accion: "leer la fecha de corte",
            }),
          );
          onCambio(null);
        }
      })
      .finally(() => {
        if (vivo) setCargando(false);
      });
    return () => {
      vivo = false;
    };
  }, [aplicar, onCambio]);

  const guardar = async () => {
    if (!borrador) return;
    setError(null);
    // Las mismas reglas y frases que el back, antes de mandar nada.
    const delCliente = errorDeLaFechaDeCorte(borrador);
    if (delCliente) {
      setErrorDeLaFecha(delCliente);
      document.getElementById(idDelCampo)?.focus();
      return;
    }
    setErrorDeLaFecha(null);
    setGuardando(true);
    try {
      aplicar(await contractsApi.migracion.fijarFechaDeCorte(borrador));
    } catch (e) {
      const mensaje = mensajeParaLaPersona(e, {
        porDefecto: "No pudimos guardar la fecha de corte.",
        accion: "guardar la fecha de corte",
      });
      // Un 400 es de la fecha (`FECHA_DE_CORTE_INVALIDA`, `…_FUERA_DE_RANGO`,
      // o `campos` en `fecha`): va al campo y le da el foco.
      if (leerFallo(e).tipo === "datos") {
        setErrorDeLaFecha(mensaje);
        document.getElementById(idDelCampo)?.focus();
      } else {
        setError(mensaje);
      }
    } finally {
      setGuardando(false);
    }
  };

  const guardada = estado?.fecha ?? null;
  const cambiada = borrador !== (guardada ?? "");

  return (
    <div
      className="space-y-3 rounded-md border border-border p-3"
      data-testid="fecha-de-corte"
    >
      <div>
        <p className="text-sm font-medium text-foreground">
          ¿Desde qué fecha empieza Leasefy a cobrar esta cartera?
        </p>
        <p className="text-caption text-muted-foreground">
          Es la fecha de corte de la migración, no el día de pago de tus
          inquilinos: cada contrato conserva su propio día de pago, el de su
          fecha de cartera. Las cuotas que vencieron antes de la fecha de corte
          las gestionó tu sistema anterior: quedan en el estado de cuenta como
          historia, no como deuda, y los contratos terminados no generan
          ningún cobro. Desde esa fecha, cada contrato vigente cobra con
          Leasefy con el canon que trae el archivo, sin subirlo por los años
          anteriores. No tiene un valor por defecto: escríbela tú.
        </p>
      </div>

      {cargando ? (
        <p className="text-caption text-muted-foreground">Leyendo…</p>
      ) : estado && !estado.editable && guardada ? (
        <p className="text-sm text-foreground" data-testid="fecha-de-corte-fija">
          Fecha de corte: <strong>{fechaEnPalabras(guardada)}</strong>.{" "}
          <span className="text-muted-foreground">{estado.motivo}</span>
        </p>
      ) : (
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label
              htmlFor={idDelCampo}
              className="text-caption text-muted-foreground"
            >
              Fecha de corte
            </label>
            <CampoDeDia
              id={idDelCampo}
              value={borrador}
              onChange={(v) => {
                setBorrador(v);
                setErrorDeLaFecha(null);
              }}
              invalido={Boolean(Boolean(errorDeLaFecha))}
              describedBy={errorDeLaFecha ? `${idDelCampo}-error` : undefined}
              className="w-44"
              testid="fecha-de-corte-input"
            />
          </div>
          <Button
            type="button"
            size="sm"
            hideArrow
            onClick={() => void guardar()}
            disabled={!borrador || !cambiada || guardando}
            isLoading={guardando}
            data-testid="fecha-de-corte-guardar"
          >
            {guardada ? "Cambiar la fecha" : "Guardar la fecha de corte"}
          </Button>
          {guardada && !cambiada ? (
            <p className="text-sm text-foreground" data-testid="fecha-de-corte-guardada">
              Guardada: <strong>{fechaEnPalabras(guardada)}</strong>.
            </p>
          ) : borrador ? (
            <p className="text-caption text-muted-foreground">
              {fechaEnPalabras(borrador)}
            </p>
          ) : null}
        </div>
      )}

      {/* El error de la fecha va debajo de la fila del campo y su botón. */}
      <ErrorDelCampo id={`${idDelCampo}-error`} mensaje={errorDeLaFecha} />

      {/* Lo que no es de la fecha: un aviso del bloque, no de un campo. */}
      <Presence show={Boolean(error)} initial={false} distance="xs" as="p" className="text-sm text-danger" role="alert" data-testid="fecha-de-corte-error">
        {error}
      </Presence>
    </div>
  );
}
