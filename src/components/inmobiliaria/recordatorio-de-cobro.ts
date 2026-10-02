/**
 * Mandar el recordatorio de un cobro y decir la verdad sobre cómo salió.
 *
 * 🔴 Antes (C1 de la auditoría del 13-09): el cajón esperaba un `setTimeout`
 * de un segundo que no esperaba nada, llamaba al envío SIN esperarlo y
 * mostraba «Recordatorio enviado» siempre. La página, por su lado, atrapaba el
 * error con un `console.error`. Resultado: sobre un 500 la persona leía que el
 * recordatorio había salido.
 *
 * Acá se espera la promesa de verdad: el toast de éxito sólo aparece si el
 * envío volvió bien, y si falló se dice por qué.
 */

import { toast } from '@/components/ui/toast';
import { leerFallo, mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';

/** El 403 genérico de Nest, en inglés: no le dice nada a nadie. */
const PERMISO_SIN_EXPLICAR = /^forbidden( resource)?\.?$/i;

/**
 * Por qué no salió, en palabras de quien lo lee (nunca «Forbidden resource»).
 *
 * 02-10-2026 · Delega en el traductor (la regla de oro): «conexión» SÓLO
 * cuando no hubo respuesta —antes cualquier error que no fuera un `ApiError`
 * (un `TypeError` del código, por ejemplo) se leía como «revisa tu conexión»—;
 * un 4xx dice la razón concreta del back; un 5xx dice que fue nuestro, con la
 * referencia. Se quedan las dos frases propias: la sesión vencida y el 403 sin
 * explicación.
 */
export function motivoDelFalloDelRecordatorio(error: unknown): string {
  const fallo = leerFallo(error);
  if (fallo.status === 401) return 'Tu sesión se cerró. Vuelve a entrar e intenta de nuevo.';
  if (fallo.status === 403) {
    const legible = fallo.mensajes.find((m) => m.trim() && !PERMISO_SIN_EXPLICAR.test(m.trim()));
    if (!legible) return 'No tienes permiso para enviar recordatorios.';
  }
  return mensajeParaLaPersona(error, {
    porDefecto: 'No pudimos enviar el recordatorio. Intenta de nuevo en unos minutos.',
    accion: 'enviar el recordatorio',
  });
}

/**
 * Espera el envío. Devuelve `true` sólo si salió; nunca relanza, porque el
 * fallo ya quedó dicho en pantalla.
 */
export async function enviarRecordatorio({
  enviar,
  exito,
}: {
  enviar: () => Promise<unknown> | unknown;
  exito: { titulo: string; descripcion: string };
}): Promise<boolean> {
  try {
    await enviar();
  } catch (error) {
    toast.error('No se pudo enviar el recordatorio', {
      description: motivoDelFalloDelRecordatorio(error),
    });
    return false;
  }
  toast.success(exito.titulo, { description: exito.descripcion });
  return true;
}
