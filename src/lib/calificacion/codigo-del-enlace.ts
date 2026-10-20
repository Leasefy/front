/**
 * El código del certificado tal como llega en el enlace de la página pública.
 *
 * El segmento de la ruta llega CODIFICADO («4PHV-32YE%20» si el enlace pegado
 * trae un espacio): se decodifica una vez y se recorta antes de pedirlo, o el
 * servicio lo volvía a codificar («%2520») y un certificado bueno salía «no
 * encontrado» (QA del 19-10-2026). Un `%` suelto no rompe la página: se usa
 * tal cual.
 */
export function codigoDelEnlace(segmento: string): string {
  try {
    return decodeURIComponent(segmento).trim();
  } catch {
    return segmento.trim();
  }
}
