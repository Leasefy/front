import { ApiError } from '@/lib/api/client';

/**
 * ¿El endpoint todavía no está, o de verdad se rompió algo?
 *
 * Mismo criterio que `isEndpointUnavailable` en `messages.service.ts` (404 =
 * la ruta no existe, 403 = no está cableada para esta inmobiliaria, 0 = no
 * pudimos ni preguntar). Está repetido acá y no importado porque allá es
 * privado del módulo y ese archivo está congelado.
 *
 * 🔴 Para qué sirve la distinción: las plantillas y los pendientes se están
 * construyendo en el back AHORA. Mientras la ruta no exista, la pantalla tiene
 * que decir «todavía no está disponible» —que es la verdad— y no «no tiene
 * ninguna plantilla», que es una afirmación sobre datos que nadie leyó.
 */
export function endpointNoDisponible(err: unknown): boolean {
  return (
    err instanceof ApiError &&
    (err.status === 404 || err.status === 403 || err.status === 0)
  );
}
