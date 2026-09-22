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

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  contractsApi,
  type FechaDeCorteDeLaMigracion as Estado,
} from "@/lib/api/contracts.service";

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
            e instanceof Error
              ? e.message
              : "No pudimos leer la fecha de corte.",
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
    setGuardando(true);
    setError(null);
    try {
      aplicar(await contractsApi.migracion.fijarFechaDeCorte(borrador));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No pudimos guardar la fecha de corte.",
      );
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
          ¿Desde qué día cobras con Leasefy?
        </p>
        <p className="text-caption text-muted-foreground">
          Es la fecha de corte de la migración. Lo que venció antes de ese día
          lo gestionó tu sistema anterior: queda en el estado de cuenta como
          historia, no como deuda, y los contratos terminados no generan
          ningún cobro. Desde ese día, cada contrato vigente cobra con
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
          <label className="flex flex-col gap-1 text-caption text-muted-foreground">
            Fecha de corte
            <Input
              type="date"
              value={borrador}
              onChange={(e) => setBorrador(e.target.value)}
              className="w-44"
              data-testid="fecha-de-corte-input"
            />
          </label>
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

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
