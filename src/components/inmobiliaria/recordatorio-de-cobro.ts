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
import { ApiError } from '@/lib/api/client';

/** Por qué no salió, en palabras de quien lo lee (nunca «Forbidden resource»). */
export function motivoDelFalloDelRecordatorio(error: unknown): string {
  if (!(error instanceof ApiError) || error.status === 0) {
    return 'No pudimos conectarnos. Revisa tu conexión e intenta de nuevo.';
  }
  if (error.status === 401) return 'Tu sesión se cerró. Vuelve a entrar e intenta de nuevo.';
  if (error.status === 403) return 'No tienes permiso para enviar recordatorios.';
  // Un 4xx con mensaje es la razón concreta (sin datos de contacto, ya se
  // mandó hoy…): se muestra tal cual.
  if (error.status < 500 && error.message) return error.message;
  return 'Tuvimos un problema de nuestro lado. Intenta de nuevo en unos minutos.';
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
