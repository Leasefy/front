"use client"

/**
 * SHIM — Checkbox del mvp = Checkbox de @leasefy/ui.
 * API superset (mismo passthrough de Radix + prop `indeterminate`);
 * `checked="indeterminate"` de los call sites resuelve igual en el DS.
 */
export { Checkbox } from "@leasefy/ui"
export type { CheckboxProps } from "@leasefy/ui"
