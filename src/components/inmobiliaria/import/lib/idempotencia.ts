/**
 * Una clave por lote preparado, no por click — mismo patrón que
 * `src/lib/contratos/idempotencia.ts`. Un doble click en "Importar" no debe
 * encolar dos lotes con las mismas filas.
 */
export function generarIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `imp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
