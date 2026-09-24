"use client"

/**
 * Combobox — el del DS (`@leasefy/cadence`), envuelto para que acepte
 * `data-testid`.
 *
 * ── 🔴 21-09 · Por qué deja de ser un re-export pelado ──────────────────────
 *
 * El `Combobox` del DS no reenvía `data-testid` a ningún nodo: se lo come. Con
 * 77 usos en el producto, eso significa que ninguna prueba puede apuntarle a
 * UNO en una pantalla que tiene varios (el buscador de cuentas del asiento, el
 * de terceros, el de inmuebles), y hay que localizarlo por el texto del
 * placeholder — que cambia con el copy y se rompe sin que nadie lo note.
 *
 * El arreglo de fondo va en el DS, pero el DS es una dependencia `file:` que
 * el front consume COPIADA (no enlazada): cambiarlo obliga a reinstalar, y acá
 * no se instala nada. Así que el reenvío vive en el shim del producto, que es
 * justo para lo que existe un shim.
 *
 * `display: contents` en la envoltura: el div no dibuja caja, así que el
 * layout del Combobox —que se apoya en el flex o el grid de quien lo pone— no
 * cambia en absoluto. Sin eso, envolver rompería alineaciones en 77 lugares.
 */

import * as React from "react"

import { Combobox as ComboboxDelDS } from "@leasefy/cadence"
import type { ComboboxOption, ComboboxProps } from "@leasefy/cadence"

export type { ComboboxOption, ComboboxProps }

export interface ComboboxConTestIdProps extends ComboboxProps {
  /** Para poder apuntarle a ESTE combobox y no al de al lado. */
  "data-testid"?: string
}

export function Combobox({
  "data-testid": testId,
  ...props
}: ComboboxConTestIdProps) {
  if (!testId) return <ComboboxDelDS {...props} />
  return (
    <div data-testid={testId} className="contents">
      <ComboboxDelDS {...props} />
    </div>
  )
}
