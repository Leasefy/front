'use client'

/**
 * use-aplicacion-propiedad — ¿el inquilino ya tiene una postulación ACTIVA para
 * esta propiedad?
 *
 * Existe para prevenir la mala UX del 409: hoy el back rechaza el POST recién al
 * enviar el wizard, cuando ya hay una aplicación activa (ver el guard
 * anti-duplicados). Con esto el front lo sabe ANTES: el CTA "Postularme" se
 * cambia por "Ir a mi postulación".
 *
 * Fuente: `GET /applications/mine` (Bearer del inquilino), consultado vía
 * `getMineStatuses` que preserva el status crudo del back. La regla de "activa"
 * vive en `isActiveApplicationStatus` — un solo lugar, espeja el guard del back.
 *
 * Igual que `use-aprobacion`: sin sesión no pega a nada (un anónimo no tiene
 * postulaciones) y un fallo de red NO bloquea — se devuelve `activa: null` y el
 * 409 del back queda como red de seguridad. Nunca se inventa un bloqueo por una
 * consulta que falló.
 */

import { useCallback, useEffect, useState } from 'react'

import { getAccessToken } from '@/lib/api/client'
import { applicationsApi } from '@/lib/api/applications.service'
import { isActiveApplicationStatus } from '@/lib/api/application-active'

/** La postulación activa encontrada para la propiedad, o null si no hay. */
export interface AplicacionActiva {
  id: string
  status: string
}

export interface UseAplicacionParaPropiedadResult {
  activa: AplicacionActiva | null
  cargando: boolean
  recargar: () => void
}

export function useAplicacionParaPropiedad(
  propertyId: string,
): UseAplicacionParaPropiedadResult {
  const [activa, setActiva] = useState<AplicacionActiva | null>(null)
  const [cargando, setCargando] = useState(true)

  const cargar = useCallback(async () => {
    setCargando(true)
    // Sin sesión no hay postulaciones que consultar.
    if (!getAccessToken()) {
      setActiva(null)
      setCargando(false)
      return
    }
    try {
      const mias = await applicationsApi.getMineStatuses()
      const encontrada = mias.find(
        (a) => a.propertyId === propertyId && isActiveApplicationStatus(a.status),
      )
      setActiva(encontrada ? { id: encontrada.id, status: encontrada.status } : null)
    } catch {
      // Un fallo de red no debe bloquear ni forzar un bloqueo falso: se deja
      // pasar y el back valida con su 409 al enviar.
      setActiva(null)
    } finally {
      setCargando(false)
    }
  }, [propertyId])

  useEffect(() => {
    void cargar()
  }, [cargar])

  return { activa, cargando, recargar: () => void cargar() }
}
