/**
 * Un nombre o una dirección que llegó del archivo de la inmobiliaria en
 * MAYÚSCULAS sostenidas («JESUS DAVID RODRIGUEZ RODRIGUEZ», «CALLE 10 # 43-12
 * APTO 301») se lee en tipo oración, como en la lista de Contratos (revisora
 * r25: Renovaciones y Cartas del incremento gritaban lo que Contratos dice
 * normal). Sólo se toca lo que viene TODO en mayúsculas: «María de los
 * Ángeles» o «Edificio BBVA» quedan como los escribieron.
 */
const MENORES = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e', 'en']);

export function textoLegible(texto: string | null | undefined): string {
  if (!texto) return '';
  const letras = texto.replace(/[^\p{L}]/gu, '');
  if (letras.length < 2 || letras !== letras.toLocaleUpperCase('es')) return texto;
  return texto
    .toLocaleLowerCase('es')
    .split(/(\s+)/)
    .map((palabra, i) => {
      if (/^\s+$/.test(palabra) || palabra === '') return palabra;
      if (i > 0 && MENORES.has(palabra)) return palabra;
      return palabra.charAt(0).toLocaleUpperCase('es') + palabra.slice(1);
    })
    .join('');
}
