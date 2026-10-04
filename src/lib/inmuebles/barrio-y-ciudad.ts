/**
 * «Barrio, Ciudad» sin la coma huérfana cuando falta uno de los dos.
 *
 * QA-IA-A (04-10-2026): la ficha pública, la tarjeta y la postulación del
 * inquilino decían «, Medellín» (y el mapa buscaba «, Medellín, Colombia»)
 * cuando el inmueble no tiene barrio, que es lo normal en lo migrado.
 */
export function barrioYCiudad(barrio?: string | null, ciudad?: string | null): string {
  return [barrio, ciudad]
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter(Boolean)
    .join(', ')
}
