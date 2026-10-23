/**
 * 🔴 Las mayúsculas de énfasis que llegan escritas por el back («Esa plata la
 * inmobiliaria NO la recibió», «SÓLO el canon») se pintan en minúscula: la voz
 * de Leasefy no grita (VOZ; revisora r25, C6). PURA.
 *
 * Sólo cambia las palabras de la lista: una sigla (IVA, DIAN, PQRS, NIT, PUC,
 * ICA) o un nombre en mayúsculas queda como viene. Al principio de una frase,
 * la palabra conserva su mayúscula inicial («NO se cobra» → «No se cobra»).
 * El texto del back no cambia: esto es sólo cómo se lee en pantalla (el arreglo
 * de fondo, que el back no las escriba, es para Víctor).
 */

const DE_ENFASIS = new Set([
  'NO', 'SÍ', 'SÓLO', 'SOLO', 'SIN', 'UNA', 'UN', 'NI', 'NUNCA', 'SIEMPRE', 'NADA', 'TODO', 'TODA', 'TODOS',
  'TODAS', 'FUERA', 'DENTRO', 'EXCLUYE', 'INCLUYE', 'ANTES', 'DESPUÉS', 'LEY', 'CAPITAL', 'CANON',
  'BENEFICIARIO', 'APAGADA', 'APAGADO', 'PRENDIDA', 'PRENDIDO', 'SUGERENCIAS', 'MISMA', 'MISMO', 'NINGUNA',
  'NINGÚN', 'NINGUNO', 'DOS', 'VECES', 'YA', 'AÚN', 'TAMBIÉN',
]);

const PALABRA_EN_MAYUSCULAS = /(?<![A-Za-zÁÉÍÓÚÑÜáéíóúñü])[A-ZÁÉÍÓÚÑÜ]{2,}(?![A-Za-zÁÉÍÓÚÑÜáéíóúñü])/g;

export function sinMayusculasDeEnfasis(texto: string): string {
  return texto.replace(PALABRA_EN_MAYUSCULAS, (palabra, desde: number) => {
    if (!DE_ENFASIS.has(palabra)) return palabra;
    const antes = texto.slice(0, desde);
    const empiezaFrase = /^\s*$/.test(antes) || /[.!?:;¿¡]\s*$/.test(antes);
    const minuscula = palabra.toLowerCase();
    return empiezaFrase ? minuscula.charAt(0).toUpperCase() + minuscula.slice(1) : minuscula;
  });
}
