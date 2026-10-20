/**
 * El tipo de inmueble del cotizador (QA de los agentes, 19-10-2026).
 *
 * 🔴 COTIZ-5 (Nico: «Local u oficina»): la base del micro sólo conoce
 * `apartamento | casa | local` y «Oficina» daba un 500. Lo comercial va en una
 * sola opción, como lo tratan las pólizas: «Local u oficina» (`local`). Una
 * cotización vieja con `oficina` se lee igual.
 *
 * COTIZ-7: la revisión, el encabezado del detalle y el «¿Qué pasaría si…?»
 * mostraban el código en minúscula («apartamento»).
 */

export const TIPOS_DE_INMUEBLE_DEL_COTIZADOR = ['apartamento', 'casa', 'local'] as const
export type TipoDeInmuebleDelCotizador = (typeof TIPOS_DE_INMUEBLE_DEL_COTIZADOR)[number]

const EN_PALABRAS: Readonly<Record<string, string>> = {
  apartamento: 'Apartamento',
  casa: 'Casa',
  local: 'Local u oficina',
  oficina: 'Local u oficina',
}

/** `apartamento` → «Apartamento»; `local` y `oficina` → «Local u oficina». */
export function tipoDeInmuebleEnPalabras(tipo: string | null | undefined): string {
  const t = (tipo ?? '').trim().toLowerCase()
  if (!t) return ''
  return EN_PALABRAS[t] ?? t.charAt(0).toUpperCase() + t.slice(1)
}

/** El valor que viaja al micro: `oficina` (de una cotización vieja) va como `local`. */
export function tipoQueViaja(tipo: string): string {
  return tipo === 'oficina' ? 'local' : tipo
}
