"use client";

/**
 * Elegir el propietario de una fila de migración.
 *
 * Es el `Combobox` de cadence, el mismo control con el que se elige una cuenta
 * del PUC (`SelectorDeCuenta`). La primera versión de esta pantalla traía un
 * buscador hecho a mano —un `<button>` con dos líneas adentro— que quedaba
 * **más alto que el campo de comisión de al lado**: dos controles en la misma
 * fila, con la misma jerarquía, y distinta altura. El DS ya resuelve eso: su
 * disparador y su `Input` miden los mismos 44 px.
 *
 * ── Dos decisiones ──────────────────────────────────────────────────────────
 *
 * 1. **La lista se carga UNA vez para toda la pantalla**, no por fila ni por
 *    tecla. `GET /inmobiliaria/propietarios` devuelve todos los de la agencia
 *    (el back no pagina ese endpoint), así que veinticinco filas comparten una
 *    sola petición en vez de disparar una por cada letra que alguien escribe.
 *    El filtrado es local, y por eso es instantáneo.
 * 2. **El documento va DENTRO de la etiqueta.** El filtro del `Combobox` mira
 *    `label`, así que pegarle el documento ahí es lo que hace que se pueda
 *    buscar por cédula o NIT — que es como una inmobiliaria distingue a dos
 *    personas con el mismo nombre.
 */

import { useMemo } from "react";

import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import type { Propietario } from "@/lib/types/inmobiliaria";

export interface SelectorDePropietarioProps {
  /** Todos los de la agencia, cargados una vez por la pantalla. */
  propietarios: readonly Propietario[];
  /** El que está consignado hoy, para mostrarlo cerrado. */
  actualId?: string | null;
  onElegir: (p: Propietario) => void;
  disabled?: boolean;
  /** Para distinguirlo en una lista con veinticinco de estos. */
  testId?: string;
}

/** Nombre y documento juntos: es lo que hace buscable la cédula. */
export function etiquetaDePropietario(p: Propietario) {
  return `${p.name} · ${p.documentNumber}`;
}

export function SelectorDePropietario({
  propietarios,
  actualId,
  onElegir,
  disabled,
  testId = "selector-propietario",
}: SelectorDePropietarioProps) {
  const opciones = useMemo<ComboboxOption[]>(
    () =>
      propietarios.map((p) => ({
        value: p.id,
        label: etiquetaDePropietario(p),
      })),
    [propietarios],
  );

  return (
    <div data-testid={testId}>
      <Combobox
        value={actualId ?? undefined}
        /*
         * El `Combobox` alterna: volver a elegir el que ya está seleccionado
         * devuelve `undefined`. Acá eso no significa nada —desde esta pantalla
         * no se puede DES-consignar un inmueble— así que se ignora en vez de
         * mandar una petición que el back rechazaría.
         */
        onChange={(id) => {
          if (!id) return;
          const elegido = propietarios.find((p) => p.id === id);
          if (elegido) onElegir(elegido);
        }}
        options={opciones}
        placeholder="Elegir propietario…"
        searchPlaceholder="Nombre o documento…"
        disabled={disabled || opciones.length === 0}
      />
    </div>
  );
}
