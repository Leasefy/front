/**
 * Lo que dice una ACCIÓN del chat cuando falla (02-10-2026, ola de seguimiento
 * de la tanda de errores; la A6 dejó fuera las acciones del chat).
 *
 * Confirmar una acción, ejecutar una propuesta, registrar una aprobación, el
 * pulgar, «¿Aprendo esto?», detener un proceso y certificar una lección
 * decían «403», «approve 500», «execute action 409», «ai-hub approval 403»,
 * «ai-hub chat lessons certify 403», el `error` en inglés del micro
 * («Forbidden — …»), o se tragaban el error. Ahora todas pasan por acá, que es
 * el traductor (`mensajeParaLaPersona`) con la regla de oro:
 *
 *  · «conexión» SÓLO si no hubo respuesta (el `fetch` no salió);
 *  · un 4xx dice qué está mal (el `message` del sobre, en español);
 *  · un 5xx dice que falló DE NUESTRO LADO, con la referencia;
 *  · un error que no vino de una respuesta (un `Error` del front, el micro sin
 *    configurar) tiene un texto técnico: se dice `porDefecto`, nunca el texto.
 *
 * Para que el traductor sepa qué pasó, el cliente tiene que tirar el error
 * ENTERO: `if (!res.ok) throw await falloDelMicro(res)` (un `ApiError` con su
 * status, su `code` y el cuerpo; el `error` del cuerpo viejo nunca se muestra).
 */

import { clasificarFallo } from '@/lib/errores/clasificar';
import { leerFallo, mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';

export interface TextosDelFallo {
  /**
   * Lo que se estaba haciendo, en infinitivo: «confirmar la acción». Un 5xx
   * dice «No pudimos confirmar la acción: algo falló de nuestro lado…».
   */
  accion: string;
  /** Lo que se dice si el error no trae nada legible (un 4xx sin `message`, un fallo del front). */
  porDefecto: string;
  /**
   * Un 403 sin `message` legible (el micro manda `{ error: 'Forbidden — …',
   * code }`, que no se muestra): quién sí puede. Sin esto, `porDefecto`.
   */
  sinPermiso?: string;
}

/** Un 401 sin `message` legible. */
export const SESION_VENCIDA = 'Tu sesión se venció. Vuelve a entrar para seguir.';

export function mensajeDelFalloDeLaAccion(error: unknown, { accion, porDefecto, sinPermiso }: TextosDelFallo): string {
  const fallo = leerFallo(error);
  // No vino de una respuesta HTTP: su texto es técnico («Proposal not found»,
  // «NEXT_PUBLIC_AGENT_URL not configured»), no para la persona.
  if (fallo.tipo === 'desconocido') return porDefecto;
  // El 403 del segundo factor no es «no tienes permiso»: le falta un paso que
  // puede dar ella misma (misma frase que el resto del panel).
  const clasificado = clasificarFallo(error);
  if (clasificado.tipo === 'sinSegundoFactor' || clasificado.tipo === 'segundoFactorPendiente') {
    return `${clasificado.titulo}. ${clasificado.descripcion}`;
  }
  const defecto =
    fallo.status === 403 && sinPermiso ? sinPermiso : fallo.tipo === 'sesion' ? SESION_VENCIDA : porDefecto;
  return mensajeParaLaPersona(error, { accion, porDefecto: defecto });
}
