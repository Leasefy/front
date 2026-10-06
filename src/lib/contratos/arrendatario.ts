/**
 * Quién es el arrendatario de un contrato que todavía no existe.
 *
 * Dos cosas viven acá porque las dos tuvieron el mismo origen: la pantalla
 * «Crear contrato» daba por hecho un `tenantName` que `GET
 * /landlord/applications/:id` no manda. El detalle trae el inquilino en
 * `tenant: { firstName, lastName, … }`; el `tenantName` sólo existe en las
 * tarjetas de la lista de candidatos. Resultado: el encabezado «Candidato:»
 * salía vacío y el borrador viajaba sin nombre.
 */

import type { MotivoDeRechazo } from '@/lib/api/contratos-plantilla.service';

/** Lo que se muestra cuando la cuenta del inquilino no tiene nombre cargado. */
export const NOMBRE_DEL_CANDIDATO_SIN_REGISTRAR = 'Sin nombre registrado';

interface PostulacionConNombre {
  tenantName?: string | null;
  tenant?: { firstName?: string | null; lastName?: string | null } | null;
}

function limpio(texto: string | null | undefined): string {
  return (texto ?? '').trim().replace(/\s+/g, ' ');
}

/**
 * El nombre del candidato, o `null` si no hay ninguno. Nunca una cadena vacía:
 * quien lo pinta decide qué decir (`NOMBRE_DEL_CANDIDATO_SIN_REGISTRAR`) y quien
 * lo manda al back omite la clave.
 */
export function nombreDelCandidato(
  postulacion: PostulacionConNombre | null | undefined,
): string | null {
  if (!postulacion) return null;
  const directo = limpio(postulacion.tenantName);
  if (directo) return directo;
  const armado = limpio(
    `${limpio(postulacion.tenant?.firstName)} ${limpio(postulacion.tenant?.lastName)}`,
  );
  return armado || null;
}

/**
 * ¿El validador dice que falta identificar al arrendatario?
 *
 * Es el literal a) del art. 3.º de la Ley 820 (`ARTICULO_3_INCOMPLETO` con
 * `donde: 'art. 3 literal a'`): pide identificar a las DOS partes, y le basta
 * que falte el nombre o el documento del arrendatario.
 */
export function faltaIdentificarAlArrendatario(
  motivos: readonly Pick<MotivoDeRechazo, 'codigo' | 'donde'>[],
): boolean {
  return motivos.some(
    (m) => m.codigo === 'ARTICULO_3_INCOMPLETO' && /literal a\b/i.test(m.donde),
  );
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * ¿Es un UUID de verdad?
 *
 * El back valida `tenantId` con `@IsUUID`, y la lista de «inquilino existente»
 * puede traer llaves sintéticas (`doc:<documento>`, `correo:<correo>`) para
 * quien no tiene cuenta ni ficha. Esas NO se mandan como `tenantId`: serían un
 * 400 que el usuario no sabe leer. Se manda lo que la lista sabe de la persona.
 */
export function esUuid(valor: string | null | undefined): boolean {
  return typeof valor === 'string' && UUID.test(valor);
}
