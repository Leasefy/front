/**
 * Portal del Propietario — contrato de tipos del lado front (v8-01, frontend-first).
 *
 * El back del Portal del Propietario (repo `Leasefy/agent`, rama `project/portal-propietario`,
 * v1 completo pero **flag-OFF**, cero-LLM determinístico) expone 18 endpoints owner-facing bajo
 * `/api/portal/{agencyId}/propietario/*`. Su schema todavía NO está en `./generated/agent`
 * (vive en una rama sin mergear), así que acá se declaran los shapes **frontend-first**
 * documentando el contrato real de los route files del back. Cuando el schema generado incluya
 * `PortalPropietario*`, migrar a `components['schemas'][...]` — una sola fuente de verdad
 * (mismo patrón que v7 acuerdos).
 *
 * ⚠️ Mientras el back esté flag-OFF, todos los endpoints devuelven 404/403/401 → el servicio
 * degrada a `null` (no-disponible) y la UI muestra "Próximamente" honesto. NUNCA data falsa.
 *
 * Contrato por pilar (fuente: route files del back — se implementan en las olas v8-02..v8-05):
 *   F1 Perfil          GET /perfil                                 → OwnerPerfil  (esta ola)
 *   F3 Ver mi plata    GET /portafolio | /inmuebles | /inmuebles/{ref}
 *                          | /inmuebles/{ref}/pagos | /recaudo | /recaudo/anual
 *                          | /proyeccion | /informe.pdf            → v8-02
 *   F2 Elegir inquilino GET /procesos | /procesos/{id}/comparacion
 *                          | POST /procesos/{id}/eleccion          → v8-03
 *   F4 Solicitudes     GET/POST /solicitudes | GET /solicitudes/{id} → v8-04
 *   F5 Daños + digest  GET /danos | /digest/{periodo} | /digests   → v8-05
 */

/**
 * Perfil mínimo del propietario autenticado.
 * Shape del back: `PortalPropietarioPerfil` (portal-propietario-perfil.ts) —
 * `{ ownerRef, displayName, propertiesCount }`. Se lee verbatim, sin recomputar.
 */
export interface OwnerPerfil {
  /** UUID natural del propietario (ref del monolito, proyectado en agent.portal_owners). */
  ownerRef: string;
  /** Nombre visible; puede venir null si el ingest no lo trajo. */
  displayName: string | null;
  /** Cantidad de inmuebles proyectados del propietario (scoped por agencia). */
  propertiesCount: number;
}
