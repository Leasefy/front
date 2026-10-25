'use client'

/**
 * Ronda 30 (Nico, 23-10): el «Equipo IA» vive plegado en el «Cómo funciona» de Asegurabilidad
 * (components/inmobiliaria/cotizador/EquipoDeAsegurabilidad). La redirección real está en next.config.mjs;
 * esto es el respaldo del lado del cliente.
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function EquipoAsegurabilidadPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/panel/inmobiliaria/postulaciones/asegurabilidad')
  }, [router])
  return null
}
