/**
 * 🔁 Espejo de `agent/src/mastra/agents/cotizador/nombre-de-la-aseguradora.ts`.
 *
 * QA de los agentes (19-10-2026): la matriz, las tarjetas, Insights y el
 * asistente pintaban el CÓDIGO de la aseguradora («bolivar», «BOLIVAR»). A una
 * persona se le muestra su nombre («Bolívar»). El código sigue siendo el que
 * viaja y se guarda.
 */

const NOMBRES: Readonly<Record<string, string>> = {
  sura: 'Sura',
  solidaria: 'Solidaria',
  mapfre: 'Mapfre',
  bolivar: 'Bolívar',
  estado: 'Seguros del Estado',
  equidad: 'La Equidad',
  mundial: 'Seguros Mundial',
  zurich: 'Zurich',
  sekure: 'Sekure',
  fianly: 'Fianly',
}

/** `sura` → «Sura»; `bolivar` → «Bolívar». Un código desconocido sale con su primera letra en mayúscula. */
export function nombreDeLaAseguradora(codigo: string | null | undefined): string {
  const limpio = (codigo ?? '').trim()
  if (!limpio) return 'la aseguradora'
  return NOMBRES[limpio.toLowerCase()] ?? limpio.charAt(0).toUpperCase() + limpio.slice(1)
}
