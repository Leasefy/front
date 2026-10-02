/**
 * El enlace personal de UNA invitación (02-10-2026, decisión de Nico: «el
 * enlace de cada invitación, no uno abierto»).
 *
 * Es el MISMO que lleva el correo: `/registro?invitationToken=…`. El back lo
 * arma con la misma función que el correo y lo manda en la respuesta de
 * invitar y de reenviar (`invitationLink`), que sólo recibe quien invita.
 *
 * Sirve para lo que le pasó a Alexis: el correo no llegó y la persona quedó
 * sin cómo entrar. Quien invitó lo copia y se lo manda por WhatsApp.
 *
 * 🔒 El enlace vive sólo en la memoria de la pantalla: nunca en
 * `localStorage`, nunca en la URL de la app, nunca en un log.
 */

export interface RespuestaConEnlace {
  invitationLink?: string;
  invitationToken?: string;
}

const ES_LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/;

function origenActual(): string {
  return typeof window !== 'undefined' ? window.location.origin : '';
}

/**
 * El enlace para mostrar y copiar, o `null` si la respuesta no trae con qué
 * armarlo (un back viejo que recortó la respuesta).
 *
 * Una salvedad: si el back no tiene `FRONTEND_URL`, su enlace apunta a
 * `localhost:3001`, que fuera de esta máquina no abre nada (el del correo
 * tampoco: es la misma configuración que falta). Si el panel NO está en local,
 * se usa la dirección del panel con la misma ruta y el mismo token, que es la
 * que de verdad abre.
 */
export function enlaceDeLaInvitacion(
  respuesta: RespuestaConEnlace,
  origen: string = origenActual(),
): string | null {
  const delBack = respuesta.invitationLink?.trim();
  if (delBack) {
    try {
      const url = new URL(delBack);
      if (url.protocol === 'https:' || url.protocol === 'http:') {
        const origenDelPanel = origen ? new URL(origen) : null;
        if (origenDelPanel && ES_LOCAL.test(url.hostname) && !ES_LOCAL.test(origenDelPanel.hostname)) {
          return `${origenDelPanel.origin}${url.pathname}${url.search}`;
        }
        return url.toString();
      }
    } catch {
      // Un enlace que no se puede leer no se muestra: se arma con el token.
    }
  }
  const token = respuesta.invitationToken?.trim();
  if (token && origen) {
    return `${origen.replace(/\/+$/, '')}/registro?invitationToken=${encodeURIComponent(token)}`;
  }
  return null;
}

/**
 * Copia al portapapeles. `false` si el navegador no dejó (permiso negado, sin
 * HTTPS, Safari después de una espera): quien llama ofrece copiarlo a mano.
 */
export async function copiarAlPortapapeles(texto: string): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return false;
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    return false;
  }
}
