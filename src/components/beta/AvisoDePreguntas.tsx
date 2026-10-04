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
 * 🔴 APAGADO hasta que Nico / legal aprueben la cláusula (y salga la política
 * v4). Para prenderlo: `AVISO_DE_PREGUNTAS_ENCENDIDO = true`. Mientras tanto la
 * pantalla de Leasefy (`/admin/chat-preguntas`) tampoco está en el menú.
 *
 * «Más información» abre la política en OTRA pestaña: ningún botón del chat
 * saca a la persona del chat.
 */

/** 🔴 Apagado hasta la aprobación de la cláusula (§13 y §16 de la política). */
export const AVISO_DE_PREGUNTAS_ENCENDIDO = false;

export const TEXTO_DEL_AVISO_DE_PREGUNTAS =
  'Leasefy revisa las preguntas, sin tu nombre, para mejorar el asistente. Se guardan 12 meses.';

export function AvisoDePreguntas({ encendido = AVISO_DE_PREGUNTAS_ENCENDIDO }: { encendido?: boolean }) {
  if (!encendido) return null;
  return (
    <p className="mt-1.5 px-1 text-center text-[11px] leading-snug text-fg-subtle" data-testid="aviso-de-preguntas">
      {TEXTO_DEL_AVISO_DE_PREGUNTAS}{' '}
      <a
        href="/privacidad"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 hover:text-fg"
      >
        Más información
      </a>
    </p>
  );
}
