/**
 * idempotencia — una clave por archivo leído, no por click.
 *
 * `POST /contracts/migrar/preparar` encola un job (contrato §3.2.A). Un
 * doble click o un reintento tras una conexión caída mandan la MISMA fila
 * dos veces; sin una clave que los identifique como el mismo intento, el
 * back crearía dos lotes con las mismas 1.200 filas duplicadas.
 *
 * Mismo patrón que `generateId` en `src/lib/hooks/useBetaChat.ts`:
 * `crypto.randomUUID()` cuando existe, con un fallback que no depende de él.
 */
export function generarIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `mig-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
