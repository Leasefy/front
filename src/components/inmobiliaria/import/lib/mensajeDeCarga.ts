/**
 * mensajeDeCarga — qué se le dice a la persona cuando una llamada de la carga
 * de inmuebles falla (T-0130).
 *
 * El back marca con `code` los 409/400 que significan algo concreto sobre el
 * LOTE, y la mayoría no son un fallo de la persona: son «esperá», «seguí
 * subiendo» o «esa carga ya no recibe». Mostrar el `message` crudo del back, o
 * un «No pudimos…» genérico, la dejaba sin saber qué botón tocar.
 */

import { ApiError, esCodigoDeSesionMuerta } from '@/lib/api/client';

const MENSAJES: Record<string, string> = {
  // Dos causas con el mismo código: todavía llegan filas, o faltan direcciones
  // por ubicar. La salida de las dos es la misma: seguir con esa etapa.
  LOTE_INCOMPLETO:
    'Faltan direcciones por ubicar o filas por subir: continúa ubicando (o subiendo) o sigue sin ubicar en el mapa.',
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
  return e instanceof ApiError && e.code && e.code in MENSAJES ? e.code : null;
}

export function mensajeDeCarga(e: unknown, porDefecto: string): string {
  if (esSesionMuerta(e)) return MENSAJE_SESION_TERMINADA;
  if (e instanceof ApiError) {
    if (e.code && MENSAJES[e.code]) return MENSAJES[e.code];
    if (e.messages && e.messages.length > 0) return e.messages.join(' · ');
  }
  return e instanceof Error && e.message ? e.message : porDefecto;
}
