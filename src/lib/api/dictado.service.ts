/**
 * El dictado por voz por el micro (Nico, 12-10-2026: «en arc enserio no se
 * puede hacer dictado de voz?»). Donde el navegador no dicta (Arc, Brave,
 * Firefox), `useDictadoPorVoz` graba y manda el audio a `POST /api/dictado`
 * del micro, que lo pasa a texto con Deepgram. Es pública: el marketplace la
 * usa sin sesión.
 */
import { ApiError } from './client';
import { agentFetch } from './agent-fetch';
import { falloDelMicro } from './fallo-del-micro';

export const CODIGO_DICTADO_NO_DISPONIBLE = 'DICTADO_NO_DISPONIBLE';

/** ¿Hay a dónde mandar el audio? Sin la URL del micro no se ofrece grabar. */
export function dictadoPorElMicroDisponible(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_AGENT_URL);
}

/**
 * Manda lo grabado y devuelve el texto. Un fallo sube como `ApiError` con su
 * status (429 = dictó demasiadas veces, 503 = sin dictado, 422 = no se entendió).
 */
export async function transcribirElDictado(audio: Blob): Promise<string> {
  const base = process.env.NEXT_PUBLIC_AGENT_URL;
  if (!base) {
    throw new ApiError(503, 'El dictado por voz no está disponible.', CODIGO_DICTADO_NO_DISPONIBLE);
  }
  const res = await agentFetch(`${base}/api/dictado`, {
    method: 'POST',
    // `audio/webm;codecs=opus` → `audio/webm`: el micro admite el tipo base.
    headers: { 'Content-Type': audio.type.split(';')[0] || 'audio/webm' },
    body: audio,
  });
  if (!res.ok) throw await falloDelMicro(res);
  const { texto } = (await res.json()) as { texto?: string };
  return (texto ?? '').trim();
}
