/**
 * ¿Este identificador se puede pegar en una ruta del back sin cambiarla?
 *
 * Las rutas de `src/app/api/**` arman `${BACKEND_URL}/leases/${leaseId}/…` con
 * lo que manda el navegador. Con `leaseId = "../../otra/ruta?"`, `fetch`
 * normaliza la URL y la petición llega a OTRA ruta del back —con el token de
 * quien la pide— y lo que esa ruta devuelva se usa como si fuera el recurso
 * esperado (un monto, o la URL de un archivo que después se baja y se sirve
 * desde nuestro origen). Auditoría de seguridad 23-09.
 *
 * No se exige UUID a propósito: los ids del back lo son, pero los del micro y
 * los de las pruebas no siempre. Lo que importa es que no traiga nada que
 * cambie la forma de la URL: `/`, `.`, `?`, `#`, `%`, espacios.
 */
const IDENTIFICADOR = /^[A-Za-z0-9_-]{1,100}$/;

export function esIdentificadorSeguro(valor: unknown): valor is string {
  return typeof valor === 'string' && IDENTIFICADOR.test(valor);
}
