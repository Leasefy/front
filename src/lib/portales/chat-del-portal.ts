/**
 * El chat de Ori DENTRO del portal (inquilino y propietario) — sin modelo.
 *
 * No es el chat del panel: no ve nada de la inmobiliaria. El micro reconoce el
 * pedido con reglas (`POST /api/portal/chat/pedido`) y lee SÓLO lo de la
 * persona, con SU sesión de Supabase (el back ya filtra por persona). El clic
 * en «Sí, hazlo» va a `POST /api/portal/chat/hacer`, que vuelve a validar lo
 * que llega. Lo ajeno («¿cuánto debe mi vecino?») el micro lo niega sin
 * consultar nada.
 *
 * Mismo camino que el chat del panel: `agentFetch` (Authorization + reintento
 * ante 401) contra `NEXT_PUBLIC_AGENT_URL`.
 */
import type { components } from '@/lib/api/generated/agent';
import { agentFetch } from '@/lib/api/agent-fetch';
import { cabecerasDeLaCuenta } from '@/lib/auth/cuenta-activa';

export type PortalDelChat = components['schemas']['PortalChatPedidoBody']['portal'];
export type RespuestaDelChatDelPortal = components['schemas']['PortalChatPedidoResponse'];
export type TarjetaDelChatDelPortal = NonNullable<RespuestaDelChatDelPortal['tarjeta']>;
export type ResultadoDelChatDelPortal = components['schemas']['PortalChatHacerResponse'];
export type OpcionDeLaTarjetaDelPortal = components['schemas']['PortalChatOpcion'];

/**
 * La cuenta del portal desde el que pregunta, para quien tiene más de un papel
 * (inquilino y propietario con el mismo correo): la misma `x-cuenta` que el
 * front ya manda al back en ese portal. El micro la pasa al back en cada
 * llamada; quien tiene una sola cuenta no la manda (todo como antes).
 */
export function cuentaDelPortal(portal: PortalDelChat): PortalDelChat | undefined {
  return cabecerasDeLaCuenta()['x-cuenta'] === portal ? portal : undefined;
}

/** Lo que se le dice a la persona cuando el micro no contesta: nunca un código. */
export const NO_PUDE_RESPONDER = 'No pude responderte en este momento. Inténtalo de nuevo en unos minutos.';
export const SESION_VENCIDA = 'Tu sesión se venció. Vuelve a entrar y me lo preguntas otra vez.';

function urlDelMicro(ruta: string): string | null {
  const base = process.env.NEXT_PUBLIC_AGENT_URL;
  return base ? `${base.replace(/\/+$/, '')}${ruta}` : null;
}

async function postAlMicro<T>(ruta: string, cuerpo: unknown): Promise<{ ok: true; doc: T } | { ok: false; texto: string }> {
  const url = urlDelMicro(ruta);
  if (!url) return { ok: false, texto: NO_PUDE_RESPONDER };
  try {
    const res = await agentFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
    });
    if (res.status === 401) return { ok: false, texto: SESION_VENCIDA };
    if (!res.ok) return { ok: false, texto: NO_PUDE_RESPONDER };
    return { ok: true, doc: (await res.json()) as T };
  } catch {
    return { ok: false, texto: NO_PUDE_RESPONDER };
  }
}

/** Lo que la persona escribió → respuesta (y, si aplica, la tarjeta con «Sí, hazlo»). */
export async function preguntarAlChatDelPortal(
  texto: string,
  portal: PortalDelChat,
): Promise<{ ok: true; respuesta: RespuestaDelChatDelPortal } | { ok: false; texto: string }> {
  const limpio = texto.trim().slice(0, 2000);
  if (!limpio) return { ok: false, texto: 'Escríbeme qué necesitas.' };
  const r = await postAlMicro<RespuestaDelChatDelPortal>('/api/portal/chat/pedido', { texto: limpio, portal, cuenta: cuentaDelPortal(portal) });
  return r.ok ? { ok: true, respuesta: r.doc } : r;
}

/**
 * El clic: «Sí, hazlo» (la acción de la tarjeta) o una de sus decisiones
 * («Aprobar», «Rechazar» con su motivo, «La hago yo»). El micro lo vuelve a
 * validar y lo hace con la sesión de la persona.
 */
export async function hacerEnElChatDelPortal(
  tarjeta: TarjetaDelChatDelPortal,
  portal: PortalDelChat,
  decision?: { accion: OpcionDeLaTarjetaDelPortal['accion']; motivo?: string },
): Promise<ResultadoDelChatDelPortal> {
  const motivo = decision?.motivo?.trim();
  const r = await postAlMicro<ResultadoDelChatDelPortal>('/api/portal/chat/hacer', {
    accion: decision?.accion ?? tarjeta.accion,
    datos: motivo ? { ...tarjeta.datos, motivo: motivo.slice(0, 500) } : tarjeta.datos,
    cuenta: cuentaDelPortal(portal),
  });
  return r.ok ? r.doc : { hecho: false, texto: r.texto };
}

/** Lo que se puede pedir, para empezar sin pensar qué escribir. */
export const SUGERENCIAS_DEL_PORTAL: Record<PortalDelChat, readonly string[]> = {
  inquilino: ['¿Cuánto debo?', 'Mándame el link de pago', 'Necesito el certificado de arrendamiento', 'Se dañó algo en el apartamento', '¿Qué me respondieron?'],
  propietario: [
    '¿Cuándo y cuánto me giran?',
    'Mándame el extracto',
    '¿Qué reparaciones tengo por aprobar?',
    'Quiero cambiar mi cuenta',
    'Necesito un certificado',
    '¿Qué me respondieron?',
  ],
};
