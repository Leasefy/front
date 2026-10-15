'use client'

/**
 * El catálogo de conceptos de la inmobiliaria para elegir (Nico, 13-10-2026:
 * «Base de Leasefy + lo suyo»). Lo sirve el back con sus nombres, sin los que
 * apagó y con los propios. Si el back todavía no lo tiene (un back viejo, o la
 * red), se usa la base de siempre (`CONCEPTOS`): nunca un selector vacío.
 */
import { useCallback, useEffect, useState } from 'react'

import { conceptosApi, type ConceptoDelCatalogo } from '@/lib/api/conceptos.service'
import { CONCEPTOS } from '@/lib/contratos/conceptos'

/** La base de siempre con la forma del catálogo, para cuando el back no responde. */
export const CATALOGO_DE_RESPALDO: ConceptoDelCatalogo[] = CONCEPTOS.map((c) => ({
  clave: c.id,
  nombre: c.nombre,
  base: c.base,
  paga: c.paga,
  recibe: c.recibe,
  activo: true,
  origen: 'LEASEFY',
  nombreDeLeasefy: null,
  nombresDelSistemaAnterior: [],
}))

export function useCatalogoDeConceptos(): {
  /** Todos, apagados incluidos (para Configuración). */
  conceptos: ConceptoDelCatalogo[]
  /** Sólo los activos: los que se ofrecen para elegir. */
  activos: ConceptoDelCatalogo[]
  /** `false` = la base no tiene el catálogo propio todavía (sólo lectura). */
  disponible: boolean
  cargando: boolean
  /** El back no respondió: se está mostrando la base de siempre. */
  deRespaldo: boolean
  recargar: () => Promise<void>
} {
  const [conceptos, setConceptos] = useState<ConceptoDelCatalogo[]>(CATALOGO_DE_RESPALDO)
  const [disponible, setDisponible] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [deRespaldo, setDeRespaldo] = useState(false)

  const recargar = useCallback(async () => {
    try {
      const r = await conceptosApi.catalogo()
      setConceptos(r.conceptos.length > 0 ? r.conceptos : CATALOGO_DE_RESPALDO)
      setDisponible(r.disponible)
      setDeRespaldo(false)
    } catch {
      setConceptos(CATALOGO_DE_RESPALDO)
      setDisponible(false)
      setDeRespaldo(true)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void recargar()
  }, [recargar])

  return {
    conceptos,
    activos: conceptos.filter((c) => c.activo),
    disponible,
    cargando,
    deRespaldo,
    recargar,
  }
}
