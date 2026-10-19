import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// Los tamaños de letra de Cadence (`cadence/tailwind.preset.ts`) y los del
// panel admin (`tailwind.config.ts`). tailwind-merge no los conoce: sin esta
// lista cree que `text-caption` es un COLOR y lo borra cuando va junto a un
// `text-fg-muted` (FRONT-1, QA de agentes 16-10).
export const TAMANOS_DE_LETRA_DEL_DS = [
  "label",
  "caption",
  "body-sm",
  "body",
  "body-lg",
  "subtitle",
  "stat",
  "h3",
  "h2",
  "h1",
  "display",
  "display-lg",
  "display-xl",
] as const

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: [...TAMANOS_DE_LETRA_DEL_DS] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Re-export utilities for convenience
export * from './utils/storage'
export * from './utils/logger'
export * from './utils/safe-redirect'
