/**
 * Pure helpers for the public `/aprobacion` page (the free document study,
 * T-0193). The old Wompi form logic (cédula, ciudad, tipo, canon validation)
 * is gone: the canon is now the study's OUTPUT, not an input.
 */

/** ¿Llegó de «Verificar» en la ficha con un ingreso que alcanza? Entonces el estudio es el paso 2. */
export function vieneDelPaso1(params: URLSearchParams): boolean {
  return params.get('paso') === '2'
}
