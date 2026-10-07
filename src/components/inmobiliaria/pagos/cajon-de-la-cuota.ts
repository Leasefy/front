/**
 * Cómo se lee el cajón de una cuota: su nombre, su color y su fecha.
 *
 * Vivía dentro de `CuotasDelMesTabla`. Salió acá cuando la fila pasó a abrir un
 * cajón con el detalle (Nico, 21-09: «cuando se dé clic que me muestre todo en
 * un drawer»): la tabla y el cajón tienen que nombrar y pintar el mismo hecho
 * igual, y con las constantes en la tabla el cajón habría tenido que
 * importarla —o, peor, copiarlas.
 *
 * 🔴 Las palabras son las de «Cartera por concepto» (`CarteraPorConcepto.tsx`),
 * no unas nuevas. Pintar «vencido dentro del plazo» igual que «cartera» es cómo
 * se termina llamando a alguien que está usando el plazo que la inmobiliaria
 * misma le dio, con la Ley 2300 de por medio.
 */

import type { CajonDeLaCuota, SaldadaPorNota } from '@/lib/api/cartera.types'

export const NOMBRE_DEL_CAJON: Record<CajonDeLaCuota, string> = {
  CARTERA: 'Cartera',
  VENCIDA_EN_PLAZO: 'Vencido, en plazo',
  POR_VENCER: 'Por vencer',
  SIN_DEUDA: 'Pagada',
}

export const VARIANTE_DEL_CAJON: Record<
  CajonDeLaCuota,
  'destructive' | 'warning' | 'secondary' | 'success'
> = {
  CARTERA: 'destructive',
  VENCIDA_EN_PLAZO: 'warning',
  POR_VENCER: 'secondary',
  SIN_DEUDA: 'success',
}

/**
 * 🔴 CR-31 (Nico, 03-10-2026: «Sin plazo… avisar en notificaciones»): una cuota
 * vencida cuando la inmobiliaria todavía no fijó sus días de plazo no es
 * cartera ni está «en plazo» —no hay plazo—: es «Vencida», sin mora.
 */
export const VENCIDA_SIN_PLAZO = 'Vencida'

/** «Saldada por nota crédito NC-12» (sin número si la nota todavía no lo tiene). */
export function saldadaPorNotaEnPalabras(nota: SaldadaPorNota): string {
  return nota.numero
    ? `Saldada por nota crédito ${nota.numero}`
    : 'Saldada por nota crédito'
}

/** Lo que hace falta de una fila para nombrar su cajón. */
export interface FilaConCajon {
  cajon: CajonDeLaCuota
  enSiniestro?: boolean
  plazoSinFijar?: true
  saldadaPorNota?: SaldadaPorNota | null
}

/**
 * El rótulo de UNA fila: el de su cajón, salvo las tres excepciones que el
 * back marca —siniestro, saldada por nota crédito (aunque `estado` siga
 * `PENDIENTE`) y vencida sin plazo fijado—. La tabla y el cajón lo leen de acá.
 */
export function nombreDeLaFila(f: FilaConCajon): string {
  if (f.enSiniestro) return 'En siniestro'
  if (f.saldadaPorNota) return saldadaPorNotaEnPalabras(f.saldadaPorNota)
  if (f.plazoSinFijar && f.cajon === 'VENCIDA_EN_PLAZO') return VENCIDA_SIN_PLAZO
  return NOMBRE_DEL_CAJON[f.cajon]
}

/** El color de esa misma fila (la saldada por nota no se pinta «Pagada» en verde). */
export function varianteDeLaFila(
  f: FilaConCajon,
): 'destructive' | 'warning' | 'secondary' | 'success' {
  if (f.saldadaPorNota) return 'secondary'
  return VARIANTE_DEL_CAJON[f.cajon]
}

/**
 * `vence` llega como 'YYYY-MM-DD' (el back ya lo recortó del `@db.Date`).
 * Se construye en hora LOCAL a partir de sus tres componentes: pasarlo por
 * `new Date(iso)` y formatearlo en Colombia (UTC-5) lo corre al día anterior.
 */
export function fechaLocal(iso: string, locale: 'es' | 'en'): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return iso
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return d.toLocaleDateString(locale === 'es' ? 'es-CO' : 'en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}
