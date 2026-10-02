'use client'

/**
 * Las cargas de inmuebles sin terminar de la agencia (`GET .../lotes`), para la
 * tarjeta de «tienes una carga a medias» (T-0130).
 *
 * Se vuelve a leer cuando cambia `clave` (el asistente pasa su paso actual: la
 * tarjeta se muestra en CUALQUIER paso, y entre pasos el lote pudo avanzar) y,
 * mientras haya un job del servidor trabajando alguna, cada 10 s. No poder
 * listarlas NUNCA frena empezar de cero: el fallo es mudo.
 */

import { useCallback, useEffect, useState } from 'react'
import { asegurarSesionVigente } from '@/lib/api/client'
import {
  inmueblesImportacionApi,
  type EstadoDeLoteInmuebles,
} from '@/lib/api/inmuebles-importacion.service'
import { etapaDeLaCarga } from '@/components/inmobiliaria/import/lib/describirCargaAbierta'
import { lotesParaRetomar } from '@/components/inmobiliaria/import/lib/lotesParaRetomar'

const INTERVALO_MS = 10_000

export function useCargasAbiertasDeInmuebles(clave: unknown): {
  lotes: EstadoDeLoteInmuebles[]
  recargar: () => void
  quitar: (lote: string) => void
} {
  const [lotes, setLotes] = useState<EstadoDeLoteInmuebles[]>([])
  const [recarga, setRecarga] = useState(0)

  const recargar = useCallback(() => setRecarga((n) => n + 1), [])
  const quitar = useCallback(
    (lote: string) => setLotes((prev) => prev.filter((l) => l.lote !== lote)),
    [],
  )

  useEffect(() => {
    let vigente = true
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    ;(async () => {
      try {
        await asegurarSesionVigente()
        const ls = await inmueblesImportacionApi.lotesAbiertos()
        if (!vigente) return
        const ordenados = lotesParaRetomar(ls)
        setLotes(ordenados)
        // T-0131: también mientras el servidor CREA (el avance cambia solo).
        const hayJob = ordenados.some(
          (l) =>
            ((l.estado === 'ENCOLADO' || l.estado === 'PROCESANDO') &&
              etapaDeLaCarga(l) === 'revision') ||
            etapaDeLaCarga(l) === 'creando',
        )
        if (hayJob) timeoutId = setTimeout(() => setRecarga((n) => n + 1), INTERVALO_MS)
      } catch {
        // Sin lista no hay tarjeta, y empezar de nuevo sigue abierto. Con la
        // sesión muerta no se insiste: al volver a entrar se lee de cero.
      }
    })()
    return () => {
      vigente = false
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [clave, recarga])

  return { lotes, recargar, quitar }
}
