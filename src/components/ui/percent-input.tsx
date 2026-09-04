"use client"

/**
 * Re-export del `PercentInput` de @leasefy/cadence — un campo numérico con el
 * `%` anclado adentro, clamp a 0–100 y flechas del teclado, con la misma
 * altura (44 px) que `Input` y que el disparador del `Combobox`.
 *
 * Vive acá por lo mismo que `combobox.tsx`: el código de features importa las
 * primitivas desde `@/components/ui/*`, aunque hoy no haga falta ninguna
 * personalización local. Existía en el DS y no se estaba usando — la migración
 * de contratos pintaba un `<input type="number">` pelado con la unidad sólo en
 * la etiqueta de arriba.
 */
export { PercentInput } from "@leasefy/cadence"
export type { PercentInputProps } from "@leasefy/cadence"
