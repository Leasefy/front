/**
 * i18n-test-stub — vitest replacement for '@/lib/i18n'.
 *
 * Usage (in a *.test.tsx file):
 *   vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))
 *
 * Unlike the common `t: (k) => k` mock, this stub resolves keys against the
 * REAL es.json (default locale), so tests asserting Spanish literals keep
 * verifying the byte-identical es output of extracted chrome strings. It
 * avoids mounting the real I18nProvider, whose localStorage effect is not
 * available under happy-dom unit tests.
 */

import * as React from 'react'

import es from './locales/es.json'
import type { I18nContextValue, Locale, TranslationParams } from './types'

function getNested(obj: unknown, path: string): string | undefined {
  let current: unknown = obj
  for (const key of path.split('.')) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key]
    } else {
      return undefined
    }
  }
  return typeof current === 'string' ? current : undefined
}

function interpolate(text: string, params?: TranslationParams): string {
  if (!params) return text
  return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = params[key]
    return value !== undefined ? String(value) : `{{${key}}}`
  })
}

/** Same contract as the real t(): es.json lookup, key-path echo on a miss. */
export function t(key: string, params?: TranslationParams): string {
  const translation = getNested(es, key)
  return translation === undefined ? key : interpolate(translation, params)
}

const contextValue: I18nContextValue = {
  locale: 'es' as Locale,
  setLocale: () => {},
  t,
  formatCurrency: (amount) => String(amount ?? ''),
  formatNumber: (value) => String(value ?? ''),
  formatDate: (date) => String(date),
  formatRelativeDate: (date) => String(date),
}

export function useI18n(): I18nContextValue {
  return contextValue
}

export function useOptionalI18n(): I18nContextValue {
  return contextValue
}

/** Pass-through provider so tests can keep the <I18nProvider> wrapper. */
export function I18nProvider({ children }: { children: React.ReactNode }) {
  return React.createElement(React.Fragment, null, children)
}
