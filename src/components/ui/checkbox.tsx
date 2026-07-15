"use client"

/**
 * SHIM — Checkbox del mvp = Checkbox de @leasefy/cadence.
 * API superset (mismo passthrough de Radix + prop `indeterminate`);
 * `checked="indeterminate"` de los call sites resuelve igual en el DS.
 */
export { Checkbox } from "@leasefy/cadence"
export type { CheckboxProps } from "@leasefy/cadence"
