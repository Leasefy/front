/**
 * mensajeDeCarga — qué se le dice a la persona cuando una llamada de la carga
 * de inmuebles falla (T-0130).
 *
 * El back marca con `code` los 409/400 que significan algo concreto sobre el
 * LOTE, y la mayoría no son un fallo de la persona: son «esperá», «seguí
 * subiendo» o «esa carga ya no recibe». Mostrar el `message` crudo del back, o
 * un «No pudimos…» genérico, la dejaba sin saber qué botón tocar.
 *
 * Todo lo que NO es un código del lote pasa por el traductor de la
 * plataforma (02-10-2026, `mensajeParaLaPersona`), con su regla de oro:
 * «conexión» SÓLO sin respuesta; un 4xx dice qué está mal; un 5xx dice que
 * falló de nuestro lado, con la referencia; un volcado o un texto en inglés
 * no llega a la pantalla. Antes un 500 mostraba su `message` tal cual.
 */

import { ApiError, esCodigoDeSesionMuerta } from '@/lib/api/client';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';

const MENSAJES: Record<string, string> = {
  // Dos causas con el mismo código: todavía llegan filas, o faltan direcciones
  // por ubicar. La salida de las dos es la misma: seguir con esa etapa.
  LOTE_INCOMPLETO:
    'Todavía no se puede crear: faltan filas por subir, direcciones por ubicar o la revisión de las filas no terminó. Espera a que termine esa etapa (o sigue sin ubicar en el mapa).',
  NADA_PARA_CREAR:
    'No hay inmuebles listos para crear. Corrige o completa las filas que faltan, o descarta las que no vas a cargar.',
  LOTE_EN_PROCESO:
    'Esta carga se está procesando en este momento. Espera a que termine y vuelve a intentarlo.',
  LOTE_FALLIDO:
    'Esta carga se detuvo por un error. Toca «Reintentar» para que siga donde quedó.',
  LOTE_NO_REINTENTABLE:
    'Esta carga quedó incompleta y no se puede retomar: descártala y sube el archivo de nuevo.',
  LOTE_YA_CERRADO:
    'Esta carga ya no recibe más filas. Revisa lo que llegó o descártala y sube el archivo otra vez.',
  TOTAL_DEL_ARCHIVO_DISTINTO:
    'El archivo que elegiste no tiene las mismas filas que la carga que dejaste a medias. Sube el mismo archivo para continuar.',
  ARCHIVO_DISTINTO:
    'Este archivo no es el mismo de la carga que estabas subiendo. Elige el archivo original o descarta esa carga.',
  CLAVE_REQUERIDA: 'No pudimos identificar esta carga. Vuelve a intentarlo.',
  TOTAL_REQUERIDO: 'No pudimos identificar esta carga. Vuelve a intentarlo.',
  TANDA_FUERA_DE_RANGO:
    'Una parte del archivo no coincide con la carga. Sube el mismo archivo para continuar.',
};

export const MENSAJE_SESION_TERMINADA =
  'Tu sesión terminó. Lo que ya llegó al servidor está guardado: cuando vuelvas a entrar te mostramos esta carga para que sigas donde quedó.';

/** ¿El error es de una sesión que no vuelve? (hay que parar, no reintentar) */
export function esSesionMuerta(e: unknown): boolean {
  return (
    e instanceof ApiError &&
    e.status === 401 &&
    (e.code === 'SESSION_TERMINATED' || esCodigoDeSesionMuerta(e.code))
  );
}

/** El `code` del lote, si el error trae uno de los que sabemos explicar. */
export function codigoDeLote(e: unknown): string | null {
  return e instanceof ApiError && e.code && Object.prototype.hasOwnProperty.call(MENSAJES, e.code)
    ? e.code
    : null;
}

/**
 * @param porDefecto lo que se dice si el error no trae nada legible.
 * @param accion lo que se estaba haciendo, en infinitivo («subir el archivo»):
 *   un 5xx dice «No pudimos subir el archivo: algo falló de nuestro lado…».
 */
export function mensajeDeCarga(e: unknown, porDefecto: string, accion?: string): string {
  if (esSesionMuerta(e)) return MENSAJE_SESION_TERMINADA;
  const codigo = codigoDeLote(e);
  if (codigo) return MENSAJES[codigo];
  return mensajeParaLaPersona(e, { porDefecto, accion });
}
