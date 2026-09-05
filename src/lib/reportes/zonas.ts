/**
 * Las zonas del filtro de reportes.
 *
 * ── Por qué existe este archivo ──────────────────────────────────────────
 * En `/panel/inmobiliaria/reportes` la lista de zonas estaba escrita a mano:
 *
 *     // Get available zones (from mock data)
 *     const zones = useMemo(() => {
 *       return ['Zona Norte', 'Chapinero', 'Usaquen', 'El Poblado', 'Zona Centro', 'Suba'];
 *     }, []);
 *
 * Seis nombres fijos, iguales para toda agencia que abriera la pantalla —
 * barrios de Bogotá mezclados con uno de Medellín. En una pantalla de
 * REPORTES, que es justo donde un dato se vuelve una decisión.
 *
 * La única fuente real es el reporte de ocupación: el back agrupa los
 * inmuebles por zona y devuelve `zones[].zone`. Cuando todavía no llegó, o la
 * agencia no tiene zonas, esto devuelve una lista vacía a propósito — quien
 * la reciba tiene que dejar de ofrecer el filtro, no rellenarlo.
 */

import type { OcupacionReport } from '@/lib/types/inmobiliaria'

export function zonasDelReporte(report: OcupacionReport | null | undefined): string[] {
  if (!report?.zones) return []

  const vistas = new Set<string>()
  const zonas: string[] = []

  for (const fila of report.zones) {
    const nombre = typeof fila?.zone === 'string' ? fila.zone.trim() : ''
    // Una zona sin nombre no es una zona: en el desplegable saldría como una
    // opción en blanco que no se puede distinguir de las demás.
    if (!nombre || vistas.has(nombre)) continue
    vistas.add(nombre)
    zonas.push(nombre)
  }

  return zonas
}
