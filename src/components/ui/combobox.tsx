"use client"

/**
 * Re-export of the @leasefy/cadence Combobox — a single-select control with a
 * built-in search box (`searchPlaceholder`), keyboard nav and A11y handled by
 * the DS. Kept here so feature code imports from `@/components/ui/*` like every
 * other primitive (select, input, popover), even though no local customization
 * is needed today.
 */
export { Combobox } from "@leasefy/cadence"
export type { ComboboxOption, ComboboxProps } from "@leasefy/cadence"
