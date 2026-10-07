/**
 * ¿Este valor trae CENTAVOS GUARDADOS? («centavos en todo», C4, 03-10-2026).
 *
 * Q3 a de C3-CONTABLE (decidido en modo autónomo): un documento o un PDF con
 * la llave de su área APAGADA escribe la plata al peso, como siempre, SALVO
 * que el valor traiga centavos de verdad —sólo pasa si alguien apagó la llave
 * después de prenderla y quedó plata guardada con centavos—: esos se escriben
 * con sus dos decimales, porque redondearlos sería escribir otra cifra.
 *
 * «Centavos de verdad» = un número con hasta dos decimales y que no es entero
 * (`1500000.29`). Un valor con MÁS de dos decimales es una cuenta a medias
 * (`2350000.29 × 0,19`), no plata guardada: ése se sigue escribiendo al peso,
 * exactamente como hoy. Con los enteros de hoy la respuesta es siempre `false`.
 */
import { aCentavos } from './plata';

export function traeCentavosGuardados(valor: unknown): boolean {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) return false;
  if (Number.isInteger(valor)) return false;
  try {
    return aCentavos(valor, { talCual: true }) % 100 !== 0;
  } catch {
    return false;
  }
}
