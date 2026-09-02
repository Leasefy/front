'use client'

/**
 * Contratos migrados que existen y no cobran: sin inmueble, o con inmueble
 * pero sin propietario (el inmueble no está consignado a nadie).
 *
 * Sale de `GET /contracts/migrar/resumen` sin lote — la agencia entera —, que
 * es el mismo número que la pantalla de migración usa por lote. `null`
 * mientras no se sabe, o si falló, o si es cero: las tres se pintan igual
 * (nada), porque un aviso en rojo sobre un dato que no llegó es peor que
 * ninguno.
 */

import { useEffect, useState } from 'react'
import { contractsApi } from '@/lib/api/contracts.service'

export interface MigracionConDeuda {
  sinInmueble: number
  sinPropietario: number
}

export function useMigracionConDeuda(): MigracionConDeuda | null {
  const [deuda, setDeuda] = useState<MigracionConDeuda | null>(null)

  useEffect(() => {
    let vigente = true
    contractsApi.migracion
      .resumen()
      .then((r) => {
        if (!vigente) return
        const sinInmueble = r.activadosSinInmueble ?? 0
        const sinPropietario = r.activadosSinPropietario ?? 0
        setDeuda(sinInmueble + sinPropietario > 0 ? { sinInmueble, sinPropietario } : null)
      })
      .catch(() => {
        // Sin permiso o sin back: no se afirma nada.
        if (vigente) setDeuda(null)
      })
    return () => {
      vigente = false
    }
  }, [])

  return deuda
}
