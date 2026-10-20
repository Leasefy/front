/**
 * 🔴 COTIZ-PASO-3 (QA de los agentes, 19-10-2026; Nico: «construirlo de verdad»).
 *
 * «Sólo las que elijo» del asistente listaba el registro GLOBAL de Leasefy
 * (con Sura dos veces: directa y por Sekure) y no lo que consulta ESTA
 * inmobiliaria. Ahora: las habilitadas para la inmobiliaria (su ajuste en
 * «Aseguradoras» o, si no tiene, el global), una vez por aseguradora, con su
 * nombre. Es el mismo filtro que aplica el micro (`enabled` del registro
 * efectivo).
 */

import type { RegistryResponse } from '@/lib/hooks/cotizador/use-carrier-registry'
import { nombreDeLaAseguradora } from './nombre-de-la-aseguradora'

export interface AseguradoraParaElegir {
  /** El código que viaja al micro (`sura`, `bolivar`…). */
  codigo: string
  nombre: string
}

export function aseguradorasQueSePuedenElegir(registro: RegistryResponse | null | undefined): AseguradoraParaElegir[] {
  if (!registro) return []
  const ajustes = new Map(registro.overrides.map((o) => [`${o.name}|${o.route}`, o]))
  const habilitadas = new Set<string>()
  for (const g of registro.global) {
    const ajuste = ajustes.get(`${g.name}|${g.route}`)
    const prendida = ajuste?.enabled ?? g.enabled
    if (prendida) habilitadas.add(g.name.toLowerCase())
  }
  return [...habilitadas]
    .map((codigo) => ({ codigo, nombre: nombreDeLaAseguradora(codigo) }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}
