/**
 * Las frases del Cuadre que arma el back, dichas como las dice la casa (revisora r24, Cuadre #4 y #5).
 *
 * El back escribe la fórmula entera de «lo tuyo que entró» —«comisión $ 200.000 + IVA de la comisión
 * $ 38.000 − retenciones de la comisión $ 0 + intereses de mora cobrados $ 0…»— y algunas palabras en
 * mayúscula para dar énfasis («plata TUYA», «EXACTAMENTE»). En pantalla:
 *   · un término en cero no se nombra en la fórmula (no suma ni resta nada);
 *   · las mayúsculas de énfasis van en minúscula (VOZ §4: «Mayúsculas: sólo la inicial»).
 * Sólo cambia cómo se lee: las cifras y el orden de la frase son los del back.
 */

/** «− retenciones de la comisión $ 0», «+ intereses de mora cobrados $0»: un término en cero de la fórmula. */
const TERMINO_EN_CERO = /\s*[+−-]\s+[a-záéíóúñü ]+?\s\$[\s ]?0(?![\d.,]*\d)/giu;

export function sinTerminosEnCero(frase: string): string {
  return frase.replace(TERMINO_EN_CERO, '');
}

/** Las palabras que el back escribe en mayúscula sólo para dar énfasis. */
const ENFASIS = ['NO', 'TUYA', 'TUYO', 'TUYOS', 'EXACTAMENTE', 'MENOS', 'MÁS', 'SÓLO', 'SOLO', 'TODOS', 'NUNCA'];
const PALABRA_DE_ENFASIS = new RegExp(`(?<![\\p{L}\\d])(${ENFASIS.join('|')})(?![\\p{L}\\d])`, 'gu');

export function sinMayusculasDeEnfasis(frase: string): string {
  return frase.replace(PALABRA_DE_ENFASIS, (palabra) => palabra.toLowerCase());
}

/** Las dos cosas a la vez: así se pinta una explicación del back en el Cuadre. */
export function explicacionEnLimpio(frase: string): string {
  return sinMayusculasDeEnfasis(sinTerminosEnCero(frase));
}
