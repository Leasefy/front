/**
 * Los topes del borrador del contrato desde la plantilla, con las MISMAS
 * frases que el back (02-10-2026, Nico, hueco 4 de S2-B2).
 *
 * `reajustePorcentaje` (el reajuste anual pactado) ya tenía `@Min(0)
 * @Max(100)` en el back, sin frase; ahora dice lo suyo. El tope LEGAL (el IPC
 * del año anterior, art. 20) lo sigue midiendo el validador del back.
 *
 * Hoy ninguna pantalla manda `reajustePorcentaje` (`BorradorDeContrato` lo
 * declara y `contratos-plantilla.service.ts` lo pasa si viene): esto queda
 * listo, con su prueba, para la que lo pida.
 *
 * 🔁 Espejo de `back/src/inmobiliaria/contratos-plantilla/dto/limites-del-borrador.ts`.
 * Si cambia uno, cambia el otro.
 */

export const REAJUSTE_MAXIMO_DEL_BORRADOR = 100

export const MENSAJES_DEL_BORRADOR = {
  reajusteNumero: 'El reajuste anual debe ser un número, por ejemplo 5,2.',
  reajusteNegativo: 'El reajuste anual no puede ser negativo.',
  reajusteMaximo: 'El reajuste anual no puede pasar de 100 %. Revisa que no sobre una cifra.',
} as const

/**
 * El reajuste anual revisado como lo revisa el back, o `null` si sirve (o si
 * no viene: vacío no se manda).
 */
export function errorDelReajuste(valor: number | null | undefined): string | null {
  if (valor === null || valor === undefined) return null
  if (!Number.isFinite(valor)) return MENSAJES_DEL_BORRADOR.reajusteNumero
  if (valor < 0) return MENSAJES_DEL_BORRADOR.reajusteNegativo
  if (valor > REAJUSTE_MAXIMO_DEL_BORRADOR) return MENSAJES_DEL_BORRADOR.reajusteMaximo
  return null
}
