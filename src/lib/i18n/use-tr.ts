'use client'

/**
 * useTr — el panel en inglés escribiendo el español tal cual (16-10-2026).
 *
 * Nico pidió la landing en inglés con el producto real en inglés, y casi todo
 * el texto de las pantallas estaba escrito en español directo en el código.
 * Con `tr('Lo que llegó')` el español queda en su lugar, idéntico, y el inglés
 * vive en `frases-en.ts`, buscado por la frase en español. Una constante
 * (`{ k: 'Se debe' }`) se traduce donde se pinta: `tr(c.k)`.
 *
 * - Sigue el idioma del panel (`leasefy-locale`, el de `I18nProvider`).
 * - Si la frase no está en el diccionario, sale el español: la pantalla nunca
 *   se rompe. El guardián (`frases-en.guardian.test.ts`) avisa lo que falta.
 * - Variables con llaves: `tr('{n} cuotas', { n: 12 })`.
 * - Sin provider (rutas públicas, pruebas), español.
 */

import { useOptionalI18n } from './i18n-context'
import type { Locale } from './types'
import { FRASES_EN } from './frases-en'

export type Tr = (es: string, vars?: Record<string, string | number>) => string

function llenar(texto: string, vars?: Record<string, string | number>): string {
  if (!vars) return texto
  return texto.replace(/\{(\w+)\}/g, (todo, k: string) => (k in vars ? String(vars[k]) : todo))
}

const TR_ES: Tr = (es, vars) => llenar(es, vars)
const TR_EN: Tr = (es, vars) => llenar(FRASES_EN[es] ?? es, vars)

/** Lo mismo que `tr`, fuera de un componente (con el idioma a mano). */
export function traducir(es: string, locale: Locale, vars?: Record<string, string | number>): string {
  return (locale === 'en' ? TR_EN : TR_ES)(es, vars)
}

/**
 * Sólo lee el contexto (sin `useState`/`useCallback`): no ocupa lugar en la
 * lista de hooks del componente, y las dos funciones son fijas por idioma.
 */
export function useTr(): Tr {
  return useOptionalI18n()?.locale === 'en' ? TR_EN : TR_ES
}

/** El idioma del panel, para las oraciones que se arman distinto en cada idioma. */
export function useLocaleDelPanel(): Locale {
  return useOptionalI18n()?.locale ?? 'es'
}

/** El `locale` de las fechas y cifras con el idioma del panel: «4 de octubre de 2026» / «October 4, 2026». */
export function useLocaleDeFechas(): 'es-CO' | 'en-US' {
  return useOptionalI18n()?.locale === 'en' ? 'en-US' : 'es-CO'
}
