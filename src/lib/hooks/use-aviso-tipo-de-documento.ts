'use client'

/**
 * AVISO-TIPO-DOC (05-10-2026): el aviso de los propietarios cuyo documento frena
 * la factura por mandato, para quien puede arreglarlo.
 *
 * Pregunta SÓLO si la persona lo puede ver (`puedeVerElAviso`: el back lo niega
 * igual, esto evita un 403 seguro en cada pantalla del asesor). Se vuelve a
 * pedir solo cuando alguien toca un propietario o la facturación
 * (`useRefrescoAutomatico`) y al volver a la pestaña: así desaparece apenas se
 * completa la última ficha, sin un «cerrar» que mienta. Cargando, con un fallo
 * o sin propietarios: `null` (no se avisa sobre un supuesto).
 */
import { useCallback, useEffect, useState } from 'react'
import { usePermissionsContextSafe } from '@/lib/context/PermissionsContext'
import { useRefrescoAutomatico } from '@/lib/hooks/use-refresco-automatico'
import { avisoTipoDeDocumentoApi } from '@/lib/api/aviso-tipo-de-documento.service'
import {
  hayAviso,
  puedeVerElAviso,
  type AvisoDeTipoDeDocumento,
} from '@/lib/propietarios/aviso-tipo-de-documento'

export interface EstadoDelAviso {
  /** El aviso para pintar, o `null`. */
  aviso: (AvisoDeTipoDeDocumento & { titulo: string }) | null
  recargar: () => Promise<void>
}

export function useAvisoTipoDeDocumento(): EstadoDelAviso {
  // Fuera del panel (sin el proveedor de permisos) no hay a quién avisar: nada.
  const permisos = usePermissionsContextSafe()
  const habilitado = Boolean(
    permisos &&
      !permisos.isLoading &&
      puedeVerElAviso({
        isAdmin: permisos.isAdmin === true,
        agencyRole: permisos.agencyRole ?? null,
        canAccess: permisos.canAccess,
      }),
  )
  const [aviso, setAviso] = useState<EstadoDelAviso['aviso']>(null)

  const recargar = useCallback(async () => {
    if (!habilitado) {
      setAviso(null)
      return
    }
    try {
      const leido = await avisoTipoDeDocumentoApi.delMes()
      setAviso(hayAviso(leido) ? leido : null)
    } catch {
      // Un fallo no es «ya no hay ninguno», pero tampoco se inventa: se calla.
      setAviso(null)
    }
  }, [habilitado])

  useEffect(() => {
    void recargar()
  }, [recargar])

  useRefrescoAutomatico(['propietarios', 'facturacion'], recargar)

  useEffect(() => {
    if (!habilitado || typeof document === 'undefined') return
    const alVolver = () => {
      if (document.visibilityState === 'visible') void recargar()
    }
    document.addEventListener('visibilitychange', alVolver)
    return () => document.removeEventListener('visibilitychange', alVolver)
  }, [habilitado, recargar])

  return { aviso, recargar }
}
