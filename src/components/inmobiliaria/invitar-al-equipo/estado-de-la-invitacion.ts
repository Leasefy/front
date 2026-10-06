import type { AgencyInviteResult } from '@/lib/types/inmobiliaria';

/**
 * Qué decir de una invitación pendiente y del correo que la acompañó.
 *
 * Los cuatro estados del correo los manda el back al invitar o reenviar
 * (`emailStatus`, ver `AgencyService.estadoDelCorreo`). NO se guardan en
 * ningún lado: la lista del equipo no los trae. Por eso una invitación hecha
 * en esta visita dice «Correo no enviado» y una de ayer dice «Invitación
 * pendiente · vence el …».
 *
 * Los textos siguen los de Configuración → Equipo (`SeccionEquipo.tsx`,
 * commit `e8938ef6`): cuando el correo no sale, el consejo depende de por qué.
 */

export type EstadoDelCorreo = NonNullable<AgencyInviteResult['emailStatus']>;

export type TonoDelEstado = 'enviada' | 'pendiente' | 'aviso' | 'peligro';

export interface EstadoParaMostrar {
  texto: string;
  tono: TonoDelEstado;
}

/** El estado del correo según la respuesta; un back viejo sólo trae `emailDelivered`. */
export function estadoDelCorreo(respuesta: Pick<AgencyInviteResult, 'emailStatus' | 'emailDelivered'>): EstadoDelCorreo {
  if (respuesta.emailStatus) return respuesta.emailStatus;
  return respuesta.emailDelivered === false ? 'failed' : 'sent';
}

function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'long' });
}

/** La línea de estado de una invitación pendiente en «Con acceso». */
export function estadoDeLaInvitacion({
  correo,
  venceEl,
  ahora = new Date(),
}: {
  correo?: EstadoDelCorreo;
  venceEl?: string | null;
  ahora?: Date;
}): EstadoParaMostrar {
  if (venceEl && new Date(venceEl).getTime() < ahora.getTime()) {
    return { texto: 'Invitación vencida: reenvíala para darle un enlace nuevo', tono: 'peligro' };
  }
  switch (correo) {
    case 'sent':
      return { texto: 'Invitación enviada', tono: 'enviada' };
    case 'suppressed':
      return { texto: 'Correo retenido: este entorno es de pruebas', tono: 'aviso' };
    case 'not_configured':
      return { texto: 'Correo no enviado: el servidor no manda correos', tono: 'aviso' };
    case 'failed':
      return { texto: 'Correo no enviado', tono: 'peligro' };
    default:
      return {
        texto: venceEl ? `Invitación pendiente · vence el ${fechaCorta(venceEl)}` : 'Invitación pendiente',
        tono: 'pendiente',
      };
  }
}

/** Qué pasó con el correo, para el bloque del enlace recién creado. */
export function queDecirDelCorreo(correo: EstadoDelCorreo, email: string): EstadoParaMostrar {
  switch (correo) {
    case 'sent':
      return { texto: `Le enviamos la invitación a ${email}.`, tono: 'enviada' };
    case 'suppressed':
      return { texto: 'Este entorno es de pruebas y no manda correos: pásale tú el enlace.', tono: 'aviso' };
    case 'not_configured':
      return { texto: 'El servidor todavía no manda correos: pásale tú el enlace.', tono: 'aviso' };
    case 'failed':
    default:
      return { texto: 'El correo no salió: pásale tú el enlace.', tono: 'peligro' };
  }
}
