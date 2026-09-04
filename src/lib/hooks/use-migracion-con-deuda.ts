'use client'

/**
 * Qué quedó a medias después de migrar, para toda la inmobiliaria.
 *
 * ── Lo que pasó (dev, 2026-09-03) ─────────────────────────────────────────
 * 91 contratos migrados · 89 sin inmueble y sin propietario · el muro cerró
 * diciendo «todo listo» y la lista de faltantes vacía. Sin inmueble no hay
 * consignación, sin consignación no hay cobro, y sin cobro no aparece ni el
 * inquilino ni la cartera: la inmobiliaria sube todo, entra, y encuentra
 * contratos pelados. Nico: «imaginate subir todo y esperar que ya todo quede
 * listo, y va y ve y sólo existen los contratos pero sin nada asociado».
 *
 * Este hook es la única fuente de ese número en el front. Lo consumen el
 * veredicto del muro, la alerta de Contratos y los vacíos de Inquilinos,
 * Propietarios y Cobros — todos dicen lo mismo porque leen lo mismo.
 *
 * ── La regla ──────────────────────────────────────────────────────────────
 * Sale de `GET /contracts/migrar/resumen` sin lote (la agencia entera).
 * `null` mientras no se sabe, si falló, o si no hay deuda: las tres se
 * pintan igual (nada). **Ningún número se inventa** — la normalización vive
 * en `leerDeuda()`, que es pura y está probada.
 */

import { useCallback, useEffect, useState } from 'react'
import { contractsApi } from '@/lib/api/contracts.service'
import {
  hayDeuda,
  leerDeuda,
  type DeudaDeMigracion,
} from '@/components/migracion/muro-reglas'

export type { DeudaDeMigracion } from '@/components/migracion/muro-reglas'

export interface EstadoDeLaDeuda {
  deuda: DeudaDeMigracion | null
  /** Volver a preguntar — después de resolver algo, el número cambió. */
  recargar: () => Promise<void>
}

/** Lee la deuda una vez y la deja recargable. */
export function useDeudaDeMigracion(): EstadoDeLaDeuda {
  const [deuda, setDeuda] = useState<DeudaDeMigracion | null>(null)

  const recargar = useCallback(async () => {
    try {
      const bruto: unknown = await contractsApi.migracion.resumen()
      const leida = leerDeuda(bruto)
      setDeuda(hayDeuda(leida) ? leida : null)
    } catch {
      // Sin permiso o sin back: no se afirma nada.
      setDeuda(null)
    }
  }, [])

  useEffect(() => {
    void recargar()
  }, [recargar])

  return { deuda, recargar }
}

/**
 * La forma corta, para quien sólo quiere mostrar la alerta y no tiene nada
 * que recargar. Mismo dato, misma regla.
 */
export function useMigracionConDeuda(): DeudaDeMigracion | null {
  return useDeudaDeMigracion().deuda
}
