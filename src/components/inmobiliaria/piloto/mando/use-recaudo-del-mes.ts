'use client'

/**
 * La tasa de recaudo del MES para el centro de mando (MANDO-DATOS, 05-10-2026):
 * `GET /inmobiliaria/dashboard/tasa-de-recaudo` del back, la MISMA lectura del
 * Resumen del negocio y de Configuración. Mide con la base que eligió la
 * inmobiliaria (sobre lo causado por defecto: lo que entró a las cuotas del mes
 * ÷ lo que los contratos cobran ese mes; la deuda nace con el contrato). Aquí no
 * se divide nada: la pantalla pinta el `pct` con su rótulo.
 *
 * Sin `dashboard:view` (la asesora) no se pide: la pieza queda «no disponible»
 * y la tarjeta no muestra el recaudo (no es suyo de ver).
 */

import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

import { inmobiliariaDashboardApi } from '@/lib/api/inmobiliaria.service'
import { AuthContext } from '@/lib/auth/auth-context'
import { usePermissionsContextSafe } from '@/lib/context/PermissionsContext'
import type { ComoSeMideLaTasa } from '@/lib/tasa-de-recaudo'

import type { Pieza } from './tipos'

export function useRecaudoDelMes(): Pieza<ComoSeMideLaTasa> {
  // Sin proveedor de sesión (una prueba que monta la pantalla sola) no se pide nada, en vez de reventar.
  const agencyId = useContext(AuthContext)?.agency?.id ?? null
  const permisos = usePermissionsContextSafe()
  // Sin el contexto (una prueba) se pide; con él, sólo con permiso del tablero.
  const puedeVerlo = !permisos || permisos.isLoading || permisos.canAccess('dashboard', 'view')
  const [data, setData] = useState<ComoSeMideLaTasa | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const vivo = useRef(true)

  const leer = useCallback(async () => {
    if (!agencyId || !puedeVerlo) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    try {
      const r = await inmobiliariaDashboardApi.getTasaDeRecaudo()
      if (!vivo.current) return
      setData(r)
      setError(null)
    } catch (err) {
      if (!vivo.current) return
      setError(err)
    } finally {
      if (vivo.current) setIsLoading(false)
    }
  }, [agencyId, puedeVerlo])

  useEffect(() => {
    vivo.current = true
    void leer()
    return () => {
      vivo.current = false
    }
  }, [leer])

  // Un objeto estable: la pantalla memoriza sus datos con él.
  return useMemo(
    () => ({ data: puedeVerlo ? data : null, isLoading: puedeVerlo && isLoading, error: puedeVerlo ? error : null, notAvailable: !puedeVerlo, reintentar: leer }),
    [data, isLoading, error, leer, puedeVerlo],
  )
}
