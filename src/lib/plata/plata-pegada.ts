import { ESPACIO_DE_LA_PLATA } from './escribir-plata'

/**
 * QA-IA-95 (05-10-2026, IA95-05): los textos que arma el back o el micro («Generar 5 facturas de
 * octubre de 2026 por $ 6.185.000…») traen la plata con un espacio NORMAL, y en una fila angosta el
 * «$» quedaba solo al final del renglón. Al pintarlos se pega el «$» a su cifra con el mismo espacio
 * duro de `formatCurrency` (`ESPACIO_DE_LA_PLATA`). No toca nada más del texto.
 */
export function conLaPlataPegada(texto: string): string
export function conLaPlataPegada(texto: string | null | undefined): string | null | undefined
export function conLaPlataPegada(texto: string | null | undefined): string | null | undefined {
  if (!texto) return texto
  // PI-16: también la plata que el micro escribe pegada («$5.750.000»): la casa la escribe «$ 5.750.000».
  return texto.replace(/(-?\$) ?(?=-?\d)/g, `$1${ESPACIO_DE_LA_PLATA}`)
}
