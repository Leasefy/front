'use client';

/**
 * El aviso fijo debajo de la caja del chat: Leasefy revisa las preguntas.
 *
 * Decisión de Nico (04-10-2026 00:27): Leasefy ve las preguntas al chat (sin el
 * correo de quién preguntó), se guardan 12 meses y «borrar conversación» borra
 * también el servidor. La cláusula de la política que lo permite
 * (`memory/archivos/noche/clausula-preguntas-del-chat.md`) propone esta línea
 * fija debajo de la caja de texto — un aviso, no una casilla.
 *
 * 🔴 PRENDIDO desde el 04-10-2026: Nico aprobó la cláusula tal cual y salió la
 * política v4.0 (§13 y §16). La pantalla de Leasefy (`/admin/chat-preguntas`)
 * quedó en el menú del admin el mismo día.
 *
 * «Más información» abre la §16 de la política en OTRA pestaña: ningún botón
 * del chat saca a la persona del chat. (La cláusula decía
 * `/legal/privacidad#16`; la política vive en `/privacidad` y su §16 en el
 * ancla `#seccion-16`, que es a donde lleva.)
 */

/** Prendido: la cláusula está aprobada y publicada (política v4.0). */
export const AVISO_DE_PREGUNTAS_ENCENDIDO = true;

/** La §16 de la política publicada («Qué hacemos con la información de la plataforma»). */
export const ENLACE_DE_LA_CLAUSULA = '/privacidad#seccion-16';

export const TEXTO_DEL_AVISO_DE_PREGUNTAS =
  'Leasefy revisa las preguntas, sin tu nombre, para mejorar el asistente. Se guardan 12 meses.';

export function AvisoDePreguntas({ encendido = AVISO_DE_PREGUNTAS_ENCENDIDO }: { encendido?: boolean }) {
  if (!encendido) return null;
  return (
    <p className="mt-1.5 px-1 text-center text-[11px] leading-snug text-fg-subtle" data-testid="aviso-de-preguntas">
      {TEXTO_DEL_AVISO_DE_PREGUNTAS}{' '}
      <a
        href={ENLACE_DE_LA_CLAUSULA}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 hover:text-fg"
      >
        Más información
      </a>
    </p>
  );
}
