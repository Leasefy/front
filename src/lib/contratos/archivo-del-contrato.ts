/**
 * QA-CONT-95 C-09 (ronda 3): qué archivo se acepta como «PDF del contrato» y
 * qué se le dice a la persona cuando no — en palabras y con el nombre y el
 * peso de SU archivo, para que sepa qué cambiar.
 */

/** El tope del back para `POST /contracts/upload-pdf`. */
export const MAXIMO_DEL_PDF_EN_BYTES = 10 * 1024 * 1024;

function esPdf(file: Pick<File, 'type' | 'name'>): boolean {
  if (file.type === 'application/pdf') return true;
  // Algunos navegadores entregan el tipo vacío al arrastrar: manda la extensión.
  return file.type === '' && /\.pdf$/i.test(file.name);
}

function megas(bytes: number): string {
  return (bytes / (1024 * 1024)).toLocaleString('es-CO', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  });
}

/** `null` si el archivo sirve; si no, la frase para poner junto al campo. */
export function errorDelArchivoDelContrato(
  file: Pick<File, 'type' | 'name' | 'size'>,
): string | null {
  if (!esPdf(file)) {
    return `«${file.name}» no es un PDF. Sube el contrato en PDF (si lo tienes en Word, guárdalo como PDF primero).`;
  }
  if (file.size > MAXIMO_DEL_PDF_EN_BYTES) {
    return `«${file.name}» pesa ${megas(file.size)} MB y el máximo es 10 MB. Comprímelo o escanéalo con menos resolución.`;
  }
  return null;
}
