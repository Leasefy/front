'use client'

/**
 * use-lectura-de-naira.ts — el hook BASE de toda lectura de Naira (Fase 13, plan 13-01).
 *
 * Los hooks por superficie (`use-naira-<superficie>.ts`, planes 13-03..13-07) lo envuelven: arman `leer` con una función
 * de src/lib/api/naira/cliente.ts y la MISMA agencia (`useAuth().agency?.id`).
 *
 * Regla (D13-4, UI-03): el estado se REEMPLAZA ENTERO. Jamás `data` + error a la vez: un 403 después de un 200 deja
 * exactamente `{ kind: 'sin_permiso' }` y nada del 200 queda en memoria ni en el DOM. El antipatrón medido es
 * use-piloto-briefing.ts:59-61, cuyo `catch` guarda el error y deja `data` de la lectura anterior.
 *
 *   · Cambio de agencia, de `deps` o de `leer === null` ⇒ `cargando` inmediato; la respuesta vieja se descarta
 *     (generación numérica: `leer` no recibe una señal de aborto, P8).
 *   · `leer = null` ⇒ `sin_permiso` sin tocar la red (una lectura secundaria sin su acción, UI-SPEC §8.2).
 *   · Sin agencia ⇒ `cargando` sin tocar la red.
 *   · `recargar()` conserva lo vigente mientras llega lo nuevo y después lo reemplaza entero (sin pasar por `cargando`).
 *     Un refresco que falla deja su estado de fallo, no lo anterior + un aviso (D13-4 manda sobre UI-SPEC §8.5).
 *
 * No persiste nada y no habla con la red por su cuenta: solo llama a `leer`.
 */

import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react'

import { useAuth } from '@/lib/auth'
import type { EstadoNaira } from '@/lib/api/naira/cliente'

export type LecturaDeNaira<T> = { readonly kind: 'cargando' } | EstadoNaira<T>

const CARGANDO = { kind: 'cargando' } as const
const SIN_PERMISO = { kind: 'sin_permiso' } as const
const NO_DISPONIBLE = { kind: 'no_disponible' } as const

export function useLecturaDeNaira<T>(
  leer: (() => Promise<EstadoNaira<T>>) | null,
  deps: DependencyList,
): { readonly estado: LecturaDeNaira<T>; readonly recargar: () => void } {
  const agencyId = useAuth().agency?.id ?? null
  const [estado, setEstado] = useState<LecturaDeNaira<T>>(leer === null ? SIN_PERMISO : CARGANDO)

  // El cierre del llamador cambia de identidad en cada render: se guarda el último para el efecto y para recargar.
  const leerRef = useRef(leer)
  const agenciaRef = useRef(agencyId)
  const generacion = useRef(0)

  /** La ÚNICA escritura de un resultado: solo si nadie la volvió vieja. */
  const aplicar = useCallback((mia: number, nuevo: LecturaDeNaira<T>) => {
    if (generacion.current === mia) setEstado(nuevo)
  }, [])

  const leerYAplicar = useCallback(
    (mia: number, lectura: () => Promise<EstadoNaira<T>>) => {
      // El cliente nunca rechaza; si alguien le pasa otra cosa que sí, el estado igual queda cerrado.
      lectura().then(
        (nuevo) => aplicar(mia, nuevo),
        () => aplicar(mia, NO_DISPONIBLE),
      )
    },
    [aplicar],
  )

  // Declarado ANTES del efecto de la lectura: los efectos corren en orden, así éste ya ve el `leer` de este render.
  useEffect(() => {
    leerRef.current = leer
    agenciaRef.current = agencyId
  })

  useEffect(() => {
    generacion.current += 1
    const mia = generacion.current
    const lectura = leerRef.current
    if (lectura === null) {
      setEstado(SIN_PERMISO)
      return
    }
    setEstado(CARGANDO)
    if (agencyId === null) return
    leerYAplicar(mia, lectura)
    return () => {
      generacion.current += 1
    }
    // `deps` es la lista del llamador (lo que cambia la lectura); `leer === null` porque su identidad cambia en cada
    // render y solo importa si hay o no hay lectura. `leerYAplicar` es estable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agencyId, leer === null, ...deps])

  const recargar = useCallback(() => {
    generacion.current += 1
    const mia = generacion.current
    const lectura = leerRef.current
    if (lectura === null || agenciaRef.current === null) return
    leerYAplicar(mia, lectura)
  }, [leerYAplicar])

  return { estado, recargar }
}
