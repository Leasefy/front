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
 * Lo que contesta `PUT /inmobiliaria/cobros/:id/send-reminder`.
 *
 * 🔴 PG-R01 (QA de Pagos, 03-10-2026): el back sumaba `remindersSent` y NO
 * mandaba nada, y la pantalla decía «Recordatorio enviado · Se envió un
 * recordatorio a X». Decisión de Nico: que salga de verdad, y si el aviso
 * está apagado, que lo diga. Del lado del front eso es UNA regla: «se envió»
 * sólo cuando el back CONFIRMA que salió (`enviado: true`). Una respuesta sin
 * esa confirmación —el back de antes, que no manda nada— no es un envío.
 */
export interface RespuestaDelRecordatorio {
  enviado?: boolean;
  /** Por dónde salió: `EMAIL`, `WHATSAPP`… */
  canal?: string | null;
  /** Por qué no salió (el aviso apagado, sin correo ni teléfono…). */
  motivo?: string | null;
}

/** Lo que se dice cuando el servidor contestó bien pero no confirmó el envío. */
export const NO_CONFIRMO_EL_ENVIO =
  'El servidor no confirmó que el recordatorio haya salido, así que no lo damos por enviado.';

const CANAL_LEGIBLE: Record<string, string> = {
  EMAIL: 'correo',
  CORREO: 'correo',
  WHATSAPP: 'WhatsApp',
  SMS: 'SMS',
};

/** ¿Salió? Lee la respuesta con desconfianza: sólo `enviado: true` es un sí. */
export function loQueDijoElServidor(respuesta: unknown): {
  salio: boolean;
  canal: string | null;
  motivo: string | null;
} {
  const r = (respuesta && typeof respuesta === 'object' ? respuesta : {}) as RespuestaDelRecordatorio;
  const texto = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
  const canal = texto(r.canal);
  return {
    salio: r.enviado === true,
    canal: canal ? (CANAL_LEGIBLE[canal.toUpperCase()] ?? canal) : null,
    motivo: texto(r.motivo),
  };
}

/**
 * Espera el envío. Devuelve `true` sólo si el servidor confirmó que salió;
 * nunca relanza, porque el fallo ya quedó dicho en pantalla.
 */
export async function enviarRecordatorio({
  enviar,
  exito,
}: {
  enviar: () => Promise<unknown> | unknown;
  exito: { titulo: string; descripcion: string };
}): Promise<boolean> {
  let respuesta: unknown;
  try {
    respuesta = await enviar();
  } catch (error) {
    toast.error('No se pudo enviar el recordatorio', {
      description: motivoDelFalloDelRecordatorio(error),
    });
    return false;
  }
  const dicho = loQueDijoElServidor(respuesta);
  if (!dicho.salio) {
    toast.warning('El recordatorio no salió', { description: dicho.motivo ?? NO_CONFIRMO_EL_ENVIO });
    return false;
  }
  toast.success(exito.titulo, {
    description: dicho.canal ? `${exito.descripcion} por ${dicho.canal}.` : exito.descripcion,
  });
  return true;
}
