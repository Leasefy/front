import type * as React from "react"

/**
 * ¿`aria-invalid` dice que el campo tiene un error? (ARREGLOS-4, 03-10-2026)
 *
 * El borde rojo del DS sale de `invalid` (→ `data-invalid`), no de
 * `aria-invalid`. 131 formularios ponían `aria-invalid` en su campo y 36 nunca
 * pasaban `invalid`: el lector de pantalla anunciaba el error y el campo se veía
 * igual que uno bueno (Nico eligió la A de PRUEBAS-RESTO Q2: que el adaptador
 * pinte el borde con `aria-invalid`). Así lo que se anuncia y lo que se ve son
 * una sola cosa.
 *
 * Vale lo que ARIA llama inválido: `true`, `"true"`, `"grammar"` y
 * `"spelling"`. `false`, `"false"` y la ausencia, no.
 */
export function ariaDiceInvalido(valor: React.AriaAttributes["aria-invalid"]): boolean {
  return valor !== undefined && valor !== null && valor !== false && valor !== "false"
}
