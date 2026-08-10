'use client'

/**
 * useTf — traducir con respaldo.
 *
 * `t(key)` devuelve la clave misma cuando falta la traducción, así que una
 * pantalla nueva se llena de `aprobacion.resultado.titulo` en vez de texto. Con
 * respaldo eso no puede pasar: si la clave falta, se lee el español.
 *
 * Sirve para dos cosas a la vez: la pantalla nunca se rompe, y traducir deja de
 * ser un requisito previo para construir — se agregan las claves después, sin
 * que nadie vea una pantalla rota mientras tanto.
 *
 * El patrón ya existía a mano en `/inquilino/aprobacion`; acá se comparte para
 * no repetirlo en cada archivo.
 *
 * ⚠️ **Usa `useOptionalI18n`, no `useI18n`.** Estos componentes también viven en
 * rutas públicas (`/aprobacion`, el catálogo) que están fuera del provider, y
 * `useI18n` **lanza** cuando no lo encuentra: la pantalla entera se cae en
 * blanco. Un helper cuyo trabajo es "traducí con respaldo" no puede ser la
 * causa de una pantalla vacía — sin provider simplemente se lee el respaldo.
 */

import { useCallback } from 'react'

import { useOptionalI18n } from '@/lib/i18n'

export type Tf = (key: string, fallback: string) => string

export function useTf(): Tf {
  const i18n = useOptionalI18n()
  const t = i18n?.t
  return useCallback(
    (key: string, fallback: string): string => {
      if (!t) return fallback
      const v = t(key)
      return !v || v === key ? fallback : v
    },
    [t],
  )
}
