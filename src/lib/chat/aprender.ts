/**
 * El «¿Aprendo esto?» del chat: el administrador decide, debajo de una
 * respuesta, si el chat aprende algo de ella.
 *
 *   GET  {NEXT_PUBLIC_AGENT_URL}/api/agency/:agencyId/ai-hub/chat/aprender/:turnoId[?propuestaId=]
 *   POST {NEXT_PUBLIC_AGENT_URL}/api/agency/:agencyId/ai-hub/chat/aprender/:turnoId
 *        { id, decision: 'aprender' | 'descartar', propuestaId? }
 *
 * ── Por qué (arquitectura del piloto §10.3.4, 24-09) ────────────────────────
 * El chat ya anota TODO lo que pasa en la conversación (señales del cerebro).
 * De ahí salen candidatos: la acción que alguien deshizo, la tarjeta que eligió
 * entre varias con el mismo nombre, cómo le dicen aquí a algo («giro» = lote de
 * dispersión). Ninguno entra solo: lo certifica el ADMINISTRADOR, en el mismo
 * chat, leyendo el texto exacto. Nada de enlaces a otra pantalla.
 *
 * Reglas:
 *  1. Sólo el administrador ve el botón (`isAdmin` del ERP, el mismo permiso
 *     del panel); el micro lo vuelve a exigir (403 `SOLO_ADMINISTRADOR`).
 *  2. El cuerpo es EXACTAMENTE el de la ruta del micro (su esquema real está en
 *     `src/lib/api/contrato-del-chat-del-micro.json`): el micro valida con zod no
 *     estricto y borraría en silencio una llave que no conoce.
 *  3. La agencia y la persona las pone el micro desde el token.
 */

import { agentAuthHeaders } from '@/lib/api/agent-auth';
import type { ChatMessage } from '@/lib/types/beta-chat';

export type OrigenDelAprendizaje = 'accion_deshecha' | 'ambiguedad' | 'definicion' | 'apodo';
export type EstadoDelAprendizaje = 'nuevo' | 'aprendido' | 'descartado';

export interface Aprendizaje {
  id: string;
  clase: 'leccion' | 'preferencia';
  origen: OrigenDelAprendizaje;
  /** Lo que se aprendería, tal cual entraría al chat (lo escribe el micro). */
  texto: string;
  estado: EstadoDelAprendizaje;
}

export interface LecturaDelAprendizaje {
  disponible: boolean;
  aprendizajes: Aprendizaje[];
  /** Por qué no hay nada, en español (lo escribe el micro). */
  motivo: string;
  /** Si lo certificado ya se usa en las respuestas (`CHAT_LESSONS_ENABLED`). */
  leccionesEnUso: boolean;
}

export interface ResultadoDelAprendizaje {
  aplicado: boolean;
  estado: EstadoDelAprendizaje | null;
  motivo: string;
  leccionesEnUso: boolean;
}

export interface CuerpoDeLaDecision {
  id: string;
  decision: 'aprender' | 'descartar';
  propuestaId?: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** La URL de la ruta, o `null` si falta algo (sin micro, sin agencia, turno inválido). */
export function urlDeAprender(
  agencyId: string | null | undefined,
  turnoId: string | null | undefined,
  propuestaId?: string | null,
): string | null {
  const base = process.env.NEXT_PUBLIC_AGENT_URL;
  const turno = typeof turnoId === 'string' ? turnoId.trim() : '';
  if (!base || !agencyId || !UUID.test(turno)) return null;
  const url = `${base}/api/agency/${agencyId}/ai-hub/chat/aprender/${turno}`;
  const propuesta = typeof propuestaId === 'string' ? propuestaId.trim() : '';
  return propuesta && propuesta.length <= 80 ? `${url}?propuestaId=${encodeURIComponent(propuesta)}` : url;
}

/**
 * Si la respuesta es un «Deshacer», la propuesta que se deshizo: la lección
 * queda en el turno que la PROPUSO, y el micro lo busca por ella.
 */
export function propuestaDeshecha(message: Pick<ChatMessage, 'resultado'>): string | null {
  const r = message.resultado;
  return r?.estado === 'deshecha' && r.propuestaId ? r.propuestaId : null;
}

const DEFINE_ALGO =
  /\b(cuando\s+(digo|decimos|hablo\s+de|hablamos\s+de|escribo|pongo)|(le|les)\s+(decimos|llamamos)|quiere\s+decir|significa|es\s+lo\s+mismo\s+que)\b/i;

/**
 * ¿Vale la pena ofrecer el «¿Aprendo esto?» en esta respuesta? Es sólo para no
 * llenar el chat de botones: quien decide qué se aprende es el micro.
 *   - trajo tarjetas (pudo elegir una entre varias, o usar un apodo);
 *   - es el resultado de un «Deshacer»;
 *   - la pregunta definió una palabra («cuando digo giro me refiero a…»).
 */
export function valeLaPenaOfrecer(
  message: Pick<ChatMessage, 'role' | 'status' | 'turnoId' | 'entidades' | 'resultado'>,
  preguntaAnterior: string | null | undefined,
): boolean {
  if (message.role !== 'assistant' || message.status !== 'complete' || !message.turnoId) return false;
  if ((message.entidades?.length ?? 0) >= 1) return true;
  if (propuestaDeshecha(message)) return true;
  return DEFINE_ALGO.test(preguntaAnterior ?? '');
}

async function leerJson<T>(res: Response): Promise<T | null> {
  if (!res.ok) return null;
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Qué aprendería el chat de esa respuesta. `null` si no se pudo preguntar. */
export async function leerAprendizaje(
  agencyId: string | null | undefined,
  turnoId: string | null | undefined,
  propuestaId?: string | null,
): Promise<LecturaDelAprendizaje | null> {
  const url = urlDeAprender(agencyId, turnoId, propuestaId);
  if (!url) return null;
  try {
    const res = await fetch(url, { headers: agentAuthHeaders() });
    const r = await leerJson<LecturaDelAprendizaje>(res);
    return r && Array.isArray(r.aprendizajes) ? r : null;
  } catch {
    return null;
  }
}

/** El administrador decide. `null` si no llegó. */
export async function decidirAprendizaje(
  agencyId: string | null | undefined,
  turnoId: string | null | undefined,
  pedido: { id: string; decision: 'aprender' | 'descartar'; propuestaId?: string | null },
): Promise<ResultadoDelAprendizaje | null> {
  const url = urlDeAprender(agencyId, turnoId);
  if (!url || !pedido.id) return null;
  // Llave por llave (ver la regla 2).
  const cuerpo: CuerpoDeLaDecision = { id: pedido.id, decision: pedido.decision };
  if (pedido.propuestaId) cuerpo.propuestaId = pedido.propuestaId;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: agentAuthHeaders({ 'content-type': 'application/json' }),
      body: JSON.stringify(cuerpo),
    });
    return await leerJson<ResultadoDelAprendizaje>(res);
  } catch {
    return null;
  }
}
