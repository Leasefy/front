'use client';

/**
 * ai-hub-feedback — el pulgar arriba / abajo del chat, ahora con destino.
 *
 *   POST /api/agency/:agencyId/ai-hub/chat/feedback
 *
 * Los pulgares del chat existían desde el 27 de agosto y morían en el
 * `localStorage`: nadie los veía. Ahora el micro los guarda por inmobiliaria,
 * y de un pulgar abajo con comentario sale una LECCIÓN que el chat usa en la
 * siguiente pregunta.
 *
 * Auth = bearer de Supabase (`agentAuthHeaders`); base = `NEXT_PUBLIC_AGENT_URL`.
 * Mismas convenciones de red/errores que `ai-hub-lessons.ts`.
 *
 * 🔴 El `agencyId` de la URL lo valida el micro contra el TOKEN; lo que viaja en
 * el cuerpo es sólo lo que el usuario tuvo en pantalla.
 */

import { agentAuthHeaders } from '@/lib/api/agent-auth';

export type VeredictoFeedback = 'up' | 'down';

export interface FeedbackDeRespuesta {
  /** Id del mensaje del asistente: la llave de idempotencia (uno por turno). */
  turnId: string;
  pregunta: string;
  respuesta: string;
  veredicto: VeredictoFeedback;
  /** «¿Qué esperabas?» — lo único que puede convertirse en lección. */
  comentario?: string;
  /** «La cifra está mal». */
  cifraMal?: boolean;
  /** Especialistas que corrieron en ese turno. */
  herramientas?: string[];
}

export interface RespuestaDeFeedback {
  guardado: boolean;
  /** Ya había una valoración de ese turno: se actualizó, no se duplicó. */
  yaRegistrado: boolean;
  /** Id de la lección creada a partir del comentario, o null. */
  leccionId: string | null;
  /** Por qué no hubo lección — para no prometer lo que no pasó. */
  motivo: string;
  registradoEn: string;
}

function agentBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_AGENT_URL;
  if (!base) throw new Error('NEXT_PUBLIC_AGENT_URL not configured');
  return base;
}

/** Manda la valoración. Lanza en no-OK (el llamador lo muestra). */
export async function enviarFeedbackDeChat(args: {
  agencyId: string;
  feedback: FeedbackDeRespuesta;
  signal?: AbortSignal;
}): Promise<RespuestaDeFeedback> {
  const url = `${agentBaseUrl()}/api/agency/${args.agencyId}/ai-hub/chat/feedback`;
  const res = await fetch(url, {
    method: 'POST',
    headers: agentAuthHeaders({ 'content-type': 'application/json' }),
    body: JSON.stringify(args.feedback),
    ...(args.signal ? { signal: args.signal } : {}),
  });
  if (!res.ok) throw new Error(`ai-hub chat feedback ${res.status}`);
  return (await res.json()) as RespuestaDeFeedback;
}
